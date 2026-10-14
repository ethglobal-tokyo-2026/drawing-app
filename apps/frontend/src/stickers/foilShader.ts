import { FOIL_ROOM, type FoilRoom } from "./foilMaterial";
import { glslFloat as f } from "./glsl";
import { SCREENTONE } from "./screentone";

/**
 * Lookup RGBA8: RGB is linear chromaticity / max channel; A²×8 is integrated Y.
 * Coordinates: u in [−2,2], sigma in [.035,.22], texel-center mapped to 512×32.
 * The room's window, light level and quadrature grid are compiled in.
 * foilSources[16]: createFoilSourceSamples for the same room: the window's grid² quadrature samples
 * (unit incident xyz, solid angle), then room lamps (unit incident xyz, solid angle × radiance
 * relative to the room level). Unused entries are zero.
 * foilStyle is the style's index in FOIL_STYLES: holo and pink, the chromatic styles, come first, then
 * Kyoto Seika, whose screentone the shader prints. Tint and ink are linear RGB.
 * shadeFoil receives print coordinates in screentone tiles, shared oriented normal/view/groove
 * direction and pixel footprints.
 */
export function createFoilFragment({ window, level, grid }: FoilRoom) {
  const extent = `vec2(${f(window.halfWidth)},${f(window.halfHeight)})`;
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
vec3 foilShoulder(vec3 c){
 // Identity below the knee keeps room-lit metal bright; only highlights roll toward the display's peak.
 float peak=max(c.r,max(c.g,c.b));
 if(peak<=.75)return c;
 return c*(.75+.25*(1.-exp(-4.*(peak-.75))))/peak;
}
vec2 foilWindow(vec2 p){return 1.-smoothstep(${extent}-${f(window.feather)},${extent}+${f(window.feather)},abs(p-vec2(${f(window.x)},${f(window.y)})));}
float foilPanel(vec2 p,vec2 center,vec2 extent){
 vec2 d=abs(p-center)-extent;
 return 1.-smoothstep(-.07,.07,max(d.x,d.y));
}
// The lit room the foil mirrors, apart from the paper's: a bright ceiling around the overhead window,
// a darker floor toward the viewer's body, and two soft panels that tilting sweeps across the band.
float foilRoom(vec3 r){
 float room=mix(.42,1.,smoothstep(.5,-.4,r.y));
 if(r.z<=.05)return room;
 vec2 p=r.xy/r.z;
 return room+.6*foilPanel(p,vec2(-.46,-.34),vec2(.17,.1))+.45*foilPanel(p,vec2(.55,.04),vec2(.1,.26));
}
float foilWindowLight(vec3 r){
 if(r.z<=0.)return 0.;
 vec2 p=r.xy/r.z;
 vec2 f=(foilWindow(p-.045)+2.*foilWindow(p)+foilWindow(p+.045))*.25;
 return f.x*f.y;
}
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
// The window's quadrature is lit by its radiance; the lamps sample the room's bright features, whose
// mirror image foilRoom already carries, so they add only colored orders. Shift moves both orders
// toward longer or shorter wavelengths.
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
  float light=float(i)<${f(grid * grid)}?${f(window.radiance)}:${f(level)};
  sum+=color*exp(-.5*v*v/(sigma*sigma))/(2.50662827463*sigma)*source.w*light;
 }
 return sum;
}
vec3 shadeFoil(vec2 print,float polar,vec3 n,vec3 view,vec3 tangent,float printFootprint,float angularFootprint){
 float cosine=dot(n,view);
 if(cosine<=0.)return vec3(0.);
 float coat=foilCoat(cosine);
 vec3 reflected=normalize(2.*cosine*n-view);
 bool chromatic=foilStyle<1.5;
 float room=foilRoom(reflected)*${f(level)};
 float sources=foilWindowLight(reflected)*${f(window.radiance)};
 float environment=room+sources;
 vec3 f0=pow((vec3(.91,.92,.92)+.055)/1.055,vec3(2.4));
 vec3 conductor=f0+(1.-f0)*pow(1.-cosine,5.);
 vec3 underlying;
 float quiet=1.;
 if(chromatic){
  // A smooth room diffracts back to neutral and discrete sources keep the zero order's share. Holo
  // gives part of the room's light to its lamps, and its strong orders take the zero order's
  // light, so color isn't washed out by metal; pink keeps the whole room as candy pink metal.
  bool pink=foilStyle>.5;
  vec3 tint=pink?foilTint:vec3(1.);
  // Holo stock's hue bands sweep around the sticker on top of the optics, so the band shows
  // several palette hues at once and tilt still slides them; spreading the orders from their
  // mean keeps that color legible on a narrow band.
  vec3 orders=foilDiffraction(n,view,tangent,angularFootprint,pink?0.:.14*sin(3.*polar));
  if(!pink){
   float strength=foilY(orders);
   orders=max(vec3(strength)+2.2*(orders-vec3(strength)),0.);
   quiet=1./(1.+2.*strength);
  }
  underlying=conductor*(tint*((pink?1.:.6)*room+.3*sources)*quiet+orders);
 }else{
  underlying=conductor*environment*foilTint;
 }
 if(foilStyle>1.5&&foilStyle<2.5){
  vec3 ink=underlying*.04+foilInk*${f(level)};
  underlying=mix(underlying,ink,foilDots(print,printFootprint));
 }
 vec3 layered=underlying*(1.-coat)*(1.-coat)+vec3(coat*environment*quiet);
 if(chromatic)layered=foilAllowedHue(layered);
 return foilShoulder(layered);
}
`;
}

export const foilFragment = createFoilFragment(FOIL_ROOM);
