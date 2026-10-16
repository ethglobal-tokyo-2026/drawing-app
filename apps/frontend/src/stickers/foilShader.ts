import { FOIL_ROOM, type FoilRoom } from "./foilMaterial";
import { glslFloat as f } from "./glsl";
import { SCREENTONE } from "./screentone";
import { ROOM } from "./sharedRoom";

/** Holo's colored floor, the room's bounce diffracted, relative to the room's light level. */
const HOLO_ROOM_ORDERS = 0.6;

/**
 * Lookup RGBA8: RGB is linear chromaticity / max channel; A²×8 is integrated Y.
 * Coordinates: u in [−2,2], sigma in [.035,.22], texel-center mapped to 512×32.
 * The room's window radiance and light level are compiled in.
 * foilSources[16]: the light's quadrature samples (unit incident xyz, solid angle), from
 * roomFoilSources or createFoilSourceSamples. Unused entries are zero.
 * foilStyle is the style's index in FOIL_STYLES: holo and pink, the chromatic styles, come first, then
 * Kyoto Seika, whose screentone the shader prints. Tint and ink are linear RGB.
 * shadeFoil receives print coordinates in screentone tiles, shared oriented normal/view/groove
 * direction and pixel footprints.
 */
export function createFoilFragment({ window, level }: FoilRoom) {
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
 return mix(c,vec3(foilY(c)),smoothstep(.02,.08,(c.g-max(c.r,c.b))/max(peak,.000001)));
}
// Paper and metal both: identity below the knee keeps room-lit surfaces bright; only highlights roll
// toward the display's peak. Paper's knee sits higher, so paper under the shoji rises above unlit paper.
vec3 highlightShoulder(vec3 c,float knee){
 float peak=max(c.r,max(c.g,c.b));
 if(peak<=knee)return c;
 return c*(knee+(1.-knee)*(1.-exp(-(peak-knee)/(1.-knee))))/peak;
}
// The room's ceiling light, relative to its radiance, which foil sets as the window's.
float foilWindowLight(vec3 r){return roomSources(r,.045)/${f(ROOM.light.radiance)};}
float foilCoat(float cosine){
 float transmitted=sqrt(1.-(1.-cosine*cosine)/2.25);
 float a=(cosine-1.5*transmitted)/(cosine+1.5*transmitted);
 float b=(1.5*cosine-transmitted)/(1.5*cosine+transmitted);
 return .5*(a*a+b*b);
}
float foilDots(vec2 print,float footprint){
 vec2 d=abs(fract(print+.5)-.5);
 float distance=min(length(d),length(.5-d));
 float resolved=smoothstep(-.5,.5,(${dot}-distance)/max(footprint,.0001));
 return mix(resolved,2.*3.14159265359*${dot}*${dot},clamp((footprint-.25)/.75,0.,1.));
}
// The light's quadrature, lit by the window's radiance. Shift moves both orders toward longer or
// shorter wavelengths.
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
 return sum*${f(window.radiance)};
}
// The room's bounce meets the grooves from every side, so each stretch of band sends some first order
// to the eye with the light nowhere in line with it. That floor keeps holo colored at any pose. Its hues
// sweep around the band and travel round it as the reflection moves through the room, up or across.
// It reads the second order from aqua through sky, lilac and pink to lemon, taking only the hue, so the
// slots the eye's sensitivity dims in the light's orders still show. Its spread is the lookup's
// narrowest, or aqua and sky blur into the first order's red tail. The sweep rests on aqua instead of
// crossing the gray bridge and green below it, and aqua is lifted so the light's lilac doesn't drown it.
vec3 foilRoomOrders(vec3 r,float polar,float footprint){
 float sigma=clamp(sqrt(.035*.035+footprint*footprint),.035,.22);
 float u=max(.62,.85+.27*sin(3.*polar+3.*(dot(r,roomUp)+dot(r,roomAcross))));
 vec3 hue=texture2D(foilLookup,(vec2((u+2.)*.25,(sigma-.035)/.185)*vec2(511.,31.)+.5)/vec2(512.,32.)).rgb;
 return hue/max(foilY(hue),.000001)*${f(HOLO_ROOM_ORDERS * level)}*(1.5-.5*smoothstep(.62,.665,u));
}
vec3 shadeFoil(vec2 print,float polar,vec3 n,vec3 view,vec3 tangent,float printFootprint,float angularFootprint){
 float cosine=dot(n,view);
 if(cosine<=0.)return vec3(0.);
 float coat=foilCoat(cosine);
 vec3 reflected=normalize(2.*cosine*n-view);
 bool chromatic=foilStyle<1.5;
 float room=roomFoil(reflected)*${f(level)};
 float sources=foilWindowLight(reflected)*${f(window.radiance)};
 float environment=room+sources;
 vec3 f0=pow((vec3(.91,.92,.92)+.055)/1.055,vec3(2.4));
 vec3 conductor=f0+(1.-f0)*pow(1.-cosine,5.);
 vec3 underlying;
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
  vec3 orders=foilDiffraction(n,view,tangent,angularFootprint,pink?0.:.22*sin(3.*polar));
  if(!pink){
   orders+=foilRoomOrders(reflected,polar,angularFootprint);
   float strength=foilY(orders);
   orders=max(vec3(strength)+2.2*(orders-vec3(strength)),0.);
   quiet=1./(1.+2.*strength);
  }
  // Pink keeps a floor under the room it mirrors, so a dim wall or floor leaves it pink, not dusk;
  // the floor follows the room's light level, so a dark room still goes dark.
  float body=pink?max(room,${f(level)}):.6*room;
  underlying=conductor*(tint*(body+.3*sources)*quiet+orders);
 }else{
  underlying=conductor*environment*foilTint;
 }
 if(foilStyle>1.5&&foilStyle<2.5){
  vec3 ink=underlying*.04+foilInk*${f(level)};
  underlying=mix(underlying,ink,foilDots(print,printFootprint));
 }
 vec3 layered=underlying*(1.-coat)*(1.-coat)+vec3(coat*environment*quiet);
 if(chromatic)layered=foilAllowedHue(layered);
 return highlightShoulder(layered,.75);
}
`;
}

export const foilFragment = createFoilFragment(FOIL_ROOM);
