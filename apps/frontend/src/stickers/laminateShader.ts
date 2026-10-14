import { FOIL_ROOM } from "./foilMaterial";
import { glslFloat as f } from "./glsl";
import { LAMINATE_FINISHES } from "./laminate";
import { OVERHEAD_WINDOW } from "./overheadWindow";

/**
 * Glitter's flakes. Cells: how many span the sticker's short side, and the CSS px one never shrinks
 * under, so a flake stays a fleck. The share of cells holding a flake, in each of two lattices; the
 * second lattice's pitch over the first's; each flake's radius in first-lattice cells; the spread of
 * their tilts, as a normal offset; the width of the lobe that catches the window; and how far their
 * hue tints the white of the mirror.
 */
const GLITTER = {
  across: 22,
  minPitch: 3.5,
  occupied: 0.42,
  coarser: 1.3,
  radius: { least: 0.24, more: 0.08 },
  tilt: 0.8,
  lobe: 0.14,
  tint: 0.45,
} as const;

/**
 * Prism's fan, clockwise from 12 o'clock and turned by `start` degrees: each facet's index in the holo
 * palette (pink, peach, lemon, aqua, sky, lilac) and the angle where it ends. The order interleaves
 * warm and cool, so most neighbors differ on any print. `center` is the fan's point on the sticker, in
 * short sides from its middle (y down); `follow` is how far the point slides, and `spin` how many
 * turns the fan takes, per unit of the coat normal's tilt.
 */
const PRISM = {
  start: 12,
  facets: [
    [0, 34],
    [2, 70],
    [3, 118],
    [5, 150],
    [1, 196],
    [4, 240],
    [2, 272],
    [0, 318],
    [3, 360],
  ],
  center: [-0.2, -0.28],
  follow: 0.45,
  spin: 0.073,
} as const;

const glitter = f(LAMINATE_FINISHES.indexOf("glitter"));
const prism = f(LAMINATE_FINISHES.indexOf("prism"));

/**
 * The fan's facets as one chain of antialiased steps in turns, starting at a seam in the middle of
 * the last facet, so the wrap from 360 to 0 degrees falls inside one color and never shows.
 */
function prismFacetChain() {
  const { facets } = PRISM;
  const last = facets.at(-1);
  const beforeLast = facets.at(-2);
  if (!last || !beforeLast) throw new Error("Prism needs at least two facets");
  const seam = (beforeLast[1] + last[1]) / 2;
  const turns = (degrees: number) => f(Math.round((degrees / 360) * 1e5) / 1e5);
  const steps = facets.map(([color], i) => {
    const at = turns(((((i === 0 ? 0 : facets[i - 1][1]) - seam) % 360) + 360) % 360);
    return ` c=mix(c,laminatePalette[${color}],smoothstep(${at}-edge,${at}+edge,t));`;
  });
  return {
    seam: turns(PRISM.start + seam),
    body: ` vec3 c=laminatePalette[${last[0]}];\n${steps.join("\n")}`,
  };
}
const facetChain = prismFacetChain();

/**
 * Glitter and prism laminates, which only the Shop previews today. Both read the coat's oriented
 * normal and reflection, so the shared light, pose and crease move them as they move gloss.
 * laminateStyle is the finish's index in LAMINATE_FINISHES; laminatePalette is the holo foil's six
 * palette colors in sRGB. Needs foilFragment (foilAllowedHue, foilRoom, foilCoat), windowAxes,
 * environment, linear, and the size, normalTransform and pointTurn uniforms before it.
 */
export const laminateFragment = `
uniform float laminateStyle;
uniform vec3 laminatePalette[6];
// Four hash values per cell, without sin, so every GPU deals the same flakes.
vec4 laminateHash(vec2 p){
 vec4 q=fract(p.xyxy*vec4(.1031,.1030,.0973,.1099));
 q+=dot(q,q.wzxy+33.33);
 return fract((q.xxyz+q.yzzw)*q.zywx);
}
// One of the palette's six colors, picked whole by t in [0,1), so no blend between two turns green.
vec3 laminateHue(float t){
 t*=6.;
 vec3 c=mix(laminatePalette[0],laminatePalette[1],step(1.,t));
 c=mix(c,laminatePalette[2],step(2.,t));
 c=mix(c,laminatePalette[3],step(3.,t));
 c=mix(c,laminatePalette[4],step(4.,t));
 return foilAllowedHue(mix(c,laminatePalette[5],step(5.,t)));
}
// Flakes fixed in the coat, one cell at most each, every flake a tiny mirror at its own tilt: it shows
// its hue lit by the room it reflects, and flashes white where that reflection meets the overhead
// window, so a tilt changes which flakes flash. The coat's own reflection stays over it. Linear RGB.
vec3 laminateGlitter(vec3 coat,vec2 cellPoint,float footprint,float scale,vec3 surfaceNormal,vec3 view){
 vec2 cell=floor(cellPoint);
 vec4 place=laminateHash(cell);
 if(place.w>${f(GLITTER.occupied)})return coat;
 float radius=(${f(GLITTER.radius.least)}+${f(GLITTER.radius.more)}*place.z)*scale;
 float flake=1.-smoothstep(radius-footprint*.5,radius+footprint*.5,
  length(cellPoint-cell-.5-(.5-radius)*(2.*place.xy-1.)));
 if(flake<=0.)return coat;
 vec4 facet=laminateHash(cell+71.);
 vec3 n=normalize(normalTransform*normalize(surfaceNormal+vec3((facet.xy-.5)*${f(GLITTER.tilt)},0.)));
 vec3 r=normalize(2.*dot(view,n)*n-view);
 float flash=0.;
 if(r.z>0.){
  vec2 p=r.xy/r.z;
  vec2 lit=(windowAxes(p-${f(GLITTER.lobe)})+2.*windowAxes(p)+windowAxes(p+${f(GLITTER.lobe)}))*.25;
  flash=lit.x*lit.y;
 }
 vec3 hue=laminateHue(facet.z);
 vec3 tint=mix(vec3(1.),vec3(linear(hue.r),linear(hue.g),linear(hue.b)),${f(GLITTER.tint)});
 vec3 mirror=tint*foilRoom(r)*${f(FOIL_ROOM.level)}+flash*${f(OVERHEAD_WINDOW.radiance)};
 vec3 coatNormal=normalize(normalTransform*surfaceNormal);
 float cosine=clamp(dot(coatNormal,view),0.,1.);
 float sheen=foilCoat(cosine);
 vec3 under=mirror*(1.-sheen)*(1.-sheen)+sheen*environment(2.*cosine*coatNormal-view);
 return mix(coat,under,flake);
}
// Hard-edged facets of the palette fanning from a point in the coat, over the print as CSS soft-light
// blends, so ink stays dark. The point and the fan follow the coat's normal, so a tilt slides and
// turns the facets. sRGB.
vec3 laminatePrism(vec3 paper,vec2 point,vec3 reflected){
 vec2 turned=vec2(pointTurn.x*point.x-pointTurn.y*point.y,pointTurn.y*point.x+pointTurn.x*point.y);
 vec3 n=normalize(reflected+normalize(vec3(-turned,2.4)));
 vec2 fan=point-vec2(${f(PRISM.center[0])},${f(PRISM.center[1])})+${f(PRISM.follow)}*n.xy;
 float t=fract(atan(fan.x,-fan.y)/6.28318530718-${facetChain.seam}+${f(PRISM.spin)}*n.x);
 // Half a pixel, in turns at this distance from the point.
 float edge=.5*max(length(dFdx(point)),length(dFdy(point)))/(6.28318530718*max(length(fan),.0001));
${facetChain.body}
 vec3 hue=foilAllowedHue(c);
 vec3 darker=paper-(1.-2.*hue)*paper*(1.-paper);
 vec3 lift=mix(sqrt(paper),((16.*paper-12.)*paper+4.)*paper,step(paper,vec3(.25)));
 vec3 lighter=paper+(2.*hue-1.)*(lift-paper);
 return mix(darker,lighter,step(.5,hue));
}
// The coat in linear RGB, with glitter's flakes on it; every other finish passes it through.
// surfacePoint and pixelFootprint are in CSS px.
vec3 laminateCoat(vec3 coat,vec2 surfacePoint,float pixelFootprint,vec3 surfaceNormal,vec3 view){
 if(abs(laminateStyle-${glitter})>.5)return coat;
 float pitch=max(${f(GLITTER.minPitch)},min(size.x,size.y)/${f(GLITTER.across)});
 vec2 cells=surfacePoint/pitch;
 float footprint=pixelFootprint/pitch;
 coat=laminateGlitter(coat,cells,footprint,1.,surfaceNormal,view);
 // A coarser lattice at an angle over the first breaks up the rows one lattice alone shows.
 return laminateGlitter(coat,mat2(.8,.6,-.6,.8)*cells/${f(GLITTER.coarser)}+19.,
  footprint/${f(GLITTER.coarser)},${f(1 / GLITTER.coarser)},surfaceNormal,view);
}
// The paper in sRGB, under prism's sheen; every other finish passes it through.
vec3 laminatePaper(vec3 paper,vec2 point,vec3 reflected){
 return abs(laminateStyle-${prism})>.5?paper:laminatePrism(paper,point,reflected);
}
`;
