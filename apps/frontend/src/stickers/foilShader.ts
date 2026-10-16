import { coatFresnel } from "./coat";
import { srgbToLinear } from "./foilMaterial";
import { glslFloat as f } from "./glsl";
import { LIGHT_RADIANCE } from "./roomIrradiance";
import { SCREENTONE } from "./screentone";

/**
 * Design decision: holo's colored floor holds this fixed level, its two first orders at 0.3 each as the
 * diffraction lookup weighs them, rather than the room's dim real bounce, so a band away from the light
 * keeps the stock's vivid color at every pose.
 */
const HOLO_ROOM_ORDERS = 0.6;

/** The foil's metal square-on: aluminum, a shade cool, in sRGB. */
const METAL = [0.91, 0.92, 0.92].map(srgbToLinear);

/** How far the metal spreads the ceiling light's mirror, as a coat's lobe spreads it. */
const METAL_LOBE = 0.045;

/**
 * Design decision: pink keeps a floor under the room it mirrors, so a dim wall or floor leaves it pink,
 * not dusk. At the floor, seen square-on through the coat, the band shows its tint as the candy pink
 * token draws it, its brightest channel at full level; this is that level before the metal's
 * reflectance.
 */
const PINK_FLOOR = 1 / (1 - coatFresnel(1)) ** 2;

/**
 * The shares of the shared room the foil mirrors: its ceiling light and the room's bounce. The app
 * mirrors all of both; the foil e2e fixture turns either off.
 */
export interface FoilRoom {
  readonly light: number;
  readonly bounce: number;
}

export const FOIL_ROOM: FoilRoom = { light: 1, bounce: 1 };

/**
 * Lookup RGBA8: RGB is linear chromaticity / max channel; A²×8 is integrated Y.
 * Coordinates: u in [−2,2], sigma in [.035,.22], texel-center mapped to 512×32.
 * foilSources[16]: the light's quadrature samples (unit incident xyz, solid angle), from
 * roomFoilSources. Unused entries are zero.
 * foilStyle is the style's index in FOIL_STYLES: holo and pink, the chromatic styles, come first, then
 * Kyoto Seika, whose screentone the shader prints. Tint and ink are linear RGB.
 * shadeFoil receives print coordinates in screentone tiles, shared oriented normal/view/groove
 * direction and pixel footprints. Needs coatFragment (coatFresnel) and toneFragment before it: the
 * laminate over the foil is the paper's, and so is its tone.
 */
export function createFoilFragment({ light, bounce }: FoilRoom) {
  const dot = f(SCREENTONE.dotRadius);
  return `
uniform sampler2D foilLookup;
uniform vec3 foilTint;
uniform vec3 foilInk;
uniform float foilStyle;
uniform vec4 foilSources[16];
float foilY(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec3 foilAllowedHue(vec3 c){
 float peak=max(c.r,max(c.g,c.b));
 // Only a green clearly above both red and blue is grayed; aqua and sky carry green beside blue.
 c=mix(c,vec3(foilY(c)),smoothstep(.02,.08,(c.g-max(c.r,c.b))/max(peak,.000001)));
 // A faint green left over trims to the larger of its neighbors, so no pixel ever shows green.
 return vec3(c.r,min(c.g,max(c.r,c.b)),c.b);
}
// The metal's reflectance at an incidence cosine (Schlick).
vec3 foilMetal(float cosine){
 vec3 f0=vec3(${METAL.map(f).join(",")});
 return f0+(1.-f0)*pow(1.-cosine,5.);
}
float foilDots(vec2 print,float footprint){
 vec2 d=abs(fract(print+.5)-.5);
 float distance=min(length(d),length(.5-d));
 float resolved=smoothstep(-.5,.5,(${dot}-distance)/max(footprint,.0001));
 return mix(resolved,2.*3.14159265359*${dot}*${dot},clamp((footprint-.25)/.75,0.,1.));
}
// The light's quadrature, per unit of its radiance. Shift moves both orders toward longer or shorter
// wavelengths.
vec3 foilDiffraction(vec3 n,vec3 view,vec3 tangent,float footprint,float shift){
 if(dot(n,view)<=0.)return vec3(0.);
 vec3 t=normalize(tangent-dot(tangent,n)*n),b=cross(n,t);
 float sigma=clamp(sqrt(.08*.08+footprint*footprint),.035,.22);
 vec3 sum=vec3(0.);
 for(int i=0;i<16;i++){
  vec4 source=foilSources[i];
  if(source.w<=0.||dot(n,source.xyz)<=0.)continue;
  vec3 s=source.xyz+view;
  float u=dot(s,t),v=dot(s,b);
  u+=sign(u)*shift;
  vec2 coord=vec2((u+2.)*.25,(sigma-.035)/.185);
  vec4 lookup=texture2D(foilLookup,(coord*vec2(511.,31.)+.5)/vec2(512.,32.));
  float energy=lookup.a*lookup.a*8.;
  vec3 color=lookup.rgb/max(foilY(lookup.rgb),.000001)*energy;
  sum+=color*exp(-.5*v*v/(sigma*sigma))/(2.50662827463*sigma)*source.w;
 }
 return sum;
}
// The room's bounce meets the grooves from every side, so each stretch of band sends some first order
// to the eye with the light nowhere in line with it. That floor keeps holo colored at any pose, at a fixed
// level (HOLO_ROOM_ORDERS). Its hues sweep around the band and travel round it as the reflection moves
// through the room, up or across. It reads the second order from aqua through sky, lilac and pink to
// lemon, taking only the hue, so the slots the eye's sensitivity dims in the light's orders still show.
// Its spread is the lookup's narrowest, or aqua and sky blur into the first order's red tail. The sweep
// rests on aqua instead of crossing the gray bridge and green below it, and aqua is lifted so the
// light's lilac doesn't drown it.
vec3 foilRoomOrders(vec3 r,float polar,float footprint){
 float sigma=clamp(sqrt(.035*.035+footprint*footprint),.035,.22);
 float u=max(.62,.85+.27*sin(3.*polar+3.*(dot(r,roomUp)+dot(r,roomAcross))));
 vec3 hue=texture2D(foilLookup,(vec2((u+2.)*.25,(sigma-.035)/.185)*vec2(511.,31.)+.5)/vec2(512.,32.)).rgb;
 return hue/max(foilY(hue),.000001)*${f(HOLO_ROOM_ORDERS * bounce)}*(1.5-.5*smoothstep(.62,.665,u));
}
vec3 shadeFoil(vec2 print,float polar,vec3 n,vec3 view,vec3 tangent,float printFootprint,float angularFootprint){
 float cosine=dot(n,view);
 if(cosine<=0.)return vec3(0.);
 float coat=coatFresnel(cosine);
 vec3 reflected=normalize(2.*cosine*n-view);
 bool chromatic=foilStyle<1.5;
 // Metal mirrors the room and its ceiling light as paper's coat does, at the same radiance.
 float room=roomBounce(reflected)*${f(bounce)};
 float sources=roomSources(reflected,${f(METAL_LOBE)})*${f(light)};
 float environment=room+sources;
 vec3 conductor=foilMetal(cosine);
 vec3 metal;
 vec3 orders=vec3(0.);
 float quiet=1.;
 if(chromatic){
  // A smooth room diffracts back to neutral and the light keeps the zero order's share. Holo's
  // strong orders take the zero order's light, so color isn't washed out by metal; pink keeps the
  // whole room as candy pink metal.
  bool pink=foilStyle>.5;
  vec3 tint=pink?foilTint:vec3(1.);
  // Holo stock's hue bands sweep around the sticker on top of the optics, so the band shows
  // several palette hues at once and tilt still slides them; spreading the orders from their
  // mean keeps that color legible on a narrow band.
  orders=foilDiffraction(n,view,tangent,angularFootprint,pink?0.:.22*sin(3.*polar))*${f(LIGHT_RADIANCE * light)};
  if(!pink){
   orders+=foilRoomOrders(reflected,polar,angularFootprint);
   float strength=foilY(orders);
   orders=max(vec3(strength)+2.2*(orders-vec3(strength)),0.);
   quiet=1./(1.+2.*strength);
  }
  vec3 reflectance=conductor*tint;
  float pinkFloor=${f(PINK_FLOOR * bounce)}/max(reflectance.r,max(reflectance.g,reflectance.b));
  float body=pink?max(room,pinkFloor):.6*room;
  metal=reflectance*(body+.3*sources)*quiet;
  orders*=conductor;
 }else{
  metal=conductor*environment*foilTint;
 }
 if(foilStyle>1.5&&foilStyle<2.5){
  vec3 ink=metal*.04+foilInk*${f(bounce)};
  metal=mix(metal,ink,foilDots(print,printFootprint));
 }
 float through=(1.-coat)*(1.-coat);
 vec3 layered=(metal+orders)*through+vec3(coat*environment*quiet);
 // The orders' share of the light keeps its saturation through the tone, so the rainbow stays a
 // rainbow; the metal's and the coat's mirror of the light go white-hot.
 float colored=clamp(foilY(orders)*through/max(foilY(layered),.000001),0.,1.);
 if(chromatic)layered=foilAllowedHue(layered);
 return mix(highlightCompress(layered),highlightCompressKeepingHue(layered),colored);
}
`;
}

export const foilFragment = createFoilFragment(FOIL_ROOM);
