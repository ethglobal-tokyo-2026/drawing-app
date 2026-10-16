import { COAT, coatFragment, coatFresnel } from "./coat";
import {
  HEIGHT_LEVELS,
  NORMAL_RANGE_LEVELS,
  NORMAL_SLOPE,
  SELF_SHADOW_REACH,
  STICKER_THICKNESS,
} from "./crease";
import { foilFragment } from "./foilShader";
import { glslFloat as f } from "./glsl";
import { laminateFragment } from "./laminateShader";
import { roomIrradianceFragment } from "./roomIrradiance";
import { roomFragment } from "./roomShader";
import { SCREENTONE } from "./screentone";
import { ROOM } from "./sharedRoom";
import { toneFragment } from "./tone";

/** White paper's light under the coat, before it leaves: seen square-on, it shows paper white. */
const PAPER_EXPOSURE = COAT.paperWhite / (1 - coatFresnel(1));

/**
 * How strongly the room's light shades a crease's slopes: 1 is physical, the change in the light
 * falling on the slope against the flat paper's.
 */
const CREASE_SHADING = 1;

/** How many points the drape's self-shadow samples toward the light, evenly out to SELF_SHADOW_REACH. */
const SELF_SHADOW_SAMPLES = 12;

/** The room's light's angular radius, from its radius one unit along it: it softens a shadow's edge. */
export const LIGHT_ANGULAR_RADIUS = Math.atan(ROOM.light.radius);

/**
 * The drape's self-shadow: the share of the room's light that the draped surface toward it hides, from
 * the height image crease.ts bakes. A drape shades itself only once the light stands lower than its
 * slopes, and then far past its foot. The share counts from what the surface's own tilt already turns
 * away, so the slope's shading isn't taken twice. Paper with nothing higher within reach skips the march.
 */
const selfShadowFragment = `
float creaseHeightAt(vec2 heightUv){
  return texture2D(heightImage,heightUv).r*${f((255 / HEIGHT_LEVELS) * STICKER_THICKNESS)};
}
// The share of the light's disc, its center \`elevation\` up, below a horizon \`horizon\` up.
float discBelow(float elevation,float horizon){
  float x=clamp((elevation-horizon)/${f(LIGHT_ANGULAR_RADIUS)},-1.,1.);
  return (acos(x)-x*sqrt(1.-x*x))/${f(Math.PI)};
}
float creaseSelfShadow(vec2 sourceUv,vec2 slope){
  vec2 heightUv=(sourceUv-normalBounds.xy)/normalBounds.zw;
  vec4 here=texture2D(heightImage,heightUv);
  if(here.g<.5)return 0.;
  // The light in the sticker's own axes: normalTransform is a rotation, so its transpose undoes it.
  vec3 light=roomLight*normalTransform;
  float across=length(light.xy);
  if(across<.0001)return 0.;
  vec2 toward=light.xy/across;
  float base=here.r*${f((255 / HEIGHT_LEVELS) * STICKER_THICKNESS)};
  float horizon=0.;
  for(int i=1;i<=${SELF_SHADOW_SAMPLES};i++){
    float t=float(i)*${f(SELF_SHADOW_REACH / SELF_SHADOW_SAMPLES)};
    // Heights are kept to a level, so a rise within one isn't a rise.
    float rise=creaseHeightAt(heightUv+toward*t/(size*normalBounds.zw))-base-${f(STICKER_THICKNESS / HEIGHT_LEVELS)};
    horizon=max(horizon,rise/t);
  }
  if(horizon<=0.)return 0.;
  float elevation=atan(light.z,across);
  // The facet's own horizon can lie below the flat paper's; count only additional obstruction.
  float own=discBelow(elevation,atan(-dot(slope,toward)));
  return max(discBelow(elevation,atan(horizon))-own,0.)/max(1.-own,.0001);
}
`;

/** Shared shader: air/film Fresnel, one eye in front of the screen, and the shared room. */
export const stickerVertex = `
attribute vec2 position;
varying vec2 uv;
void main() { uv=vec2((position.x+1.0)*.5,(1.0-position.y)*.5); gl_Position=vec4(position,0.,1.); }
`;
export const stickerFragment = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec2 uv;
uniform sampler2D printImage;
uniform sampler2D cutImage;
uniform sampler2D normalImage;
uniform sampler2D heightImage;
uniform vec2 size;
uniform mat3 normalTransform;
uniform vec2 pointTurn;
uniform float roughness;
uniform sampler2D outerImage;
uniform vec4 sourceBounds;
uniform vec4 normalBounds;
uniform vec2 amounts;
uniform float hasFoil;
uniform float opaquePaper;
// The room's light on the flat paper against the still pose's, as paperLight.ts follows it.
uniform float paperLight;
// Where the sticker's center sits on screen, in CSS px from the visual viewport's center (y down),
// and how many CSS px on screen one of its short sides spans.
uniform vec2 screenCenter;
uniform float screenScale;
${roomFragment}
${roomIrradianceFragment}
${coatFragment}
${toneFragment}
${foilFragment}
float environment(vec3 r) {
  return roomBounce(r)+roomSources(r,roughness);
}
float linear(float v) { return v<=.04045?v/12.92:pow((v+.055)/1.055,2.4); }
float display(float v) { return v<=.0031308?v*12.92:1.055*pow(v,1./2.4)-.055; }
${laminateFragment}
${selfShadowFragment}
void main() {
  vec2 sourceUv=sourceBounds.xy+uv*sourceBounds.zw;
  vec4 art=texture2D(printImage,sourceUv);
  vec3 base=mix(vec3(1.),art.rgb,art.a);
  // Frame-constant rotations are composed on the CPU, rather than at every covered fragment.
  // Flat and bent snapshots share the print and light; their diagonal reveal is composited afterward.
  // The crease's true slope, as crease.ts packs it: R and G in NORMAL_SLOPEs, divided by B's range.
  vec3 encoded=texture2D(normalImage,(sourceUv-normalBounds.xy)/normalBounds.zw).rgb*255.;
  vec2 slope=(encoded.rg-128.)/127.*(1.+(255.-encoded.b)/${f(NORMAL_RANGE_LEVELS)})*${f(NORMAL_SLOPE)};
  vec3 surfaceNormal=normalize(vec3(slope,1.));
  vec3 n=normalize(normalTransform*surfaceNormal);
  // The room's light on the slope against the flat paper's shades the crease; flat, it is exactly 1.
  // The drape's self-shadow takes the ceiling light's part out of the slope's.
  float flatLight=roomIrradiance(normalize(normalTransform*vec3(0.,0.,1.)));
  float slopeLight=roomIrradiance(n)-creaseSelfShadow(sourceUv,slope)*roomLightIrradiance(n);
  float creaseLight=1.+${f(CREASE_SHADING)}*(slopeLight-flatLight)/flatLight;
  vec2 localPoint=(sourceUv-.5)*size/min(size.x,size.y);
  vec2 point=vec2(pointTurn.x*localPoint.x-pointTurn.y*localPoint.y,
    pointTurn.y*localPoint.x+pointTurn.x*localPoint.y);
  // One eye in front of the screen: each fragment sees it from where it sits on screen.
  vec3 view=normalize(roomEye-vec3(screenCenter+screenScale*point,0.));
  // Derivatives are evaluated before material branches, including opaque paper fragments.
  float tile=max(${f(SCREENTONE.minPitch)},min(size.x,size.y)/${f(SCREENTONE.tilesAcross)});
  vec2 printCoordinate=sourceUv*size/tile;
  float printFootprint=max(length(dFdx(printCoordinate)),length(dFdy(printCoordinate)));
  vec3 angular=n+view;
  float angularFootprint=max(length(dFdx(angular)),length(dFdy(angular)));
  float cosine=clamp(dot(n,view),0.,1.);
  float fresnel=coatFresnel(cosine);
  vec3 reflected=normalize(2.*dot(view,n)*n-view);
  vec2 lightPlanePoint=roomPlane(reflected);
  roomFootprint=max(length(dFdx(lightPlanePoint)),length(dFdy(lightPlanePoint)));
  vec3 print=coatDarkened(vec3(linear(base.r),linear(base.g),linear(base.b)));
  vec3 coat=laminateCoat(print*creaseLight*paperLight*${f(PAPER_EXPOSURE)}*(1.-fresnel)+fresnel*environment(reflected),
    sourceUv*size,printFootprint*tile,surfaceNormal,view);
  // Paper never clips: the brightest reflection rolls toward white keeping its hue, so it keeps its
  // gradation over the print.
  vec3 result=clamp(highlightCompress(coat),0.,1.);
  // Native canvas snapshots use premultiplied display colors; the optical math above stays linear.
  float inSource=step(0.,sourceUv.x)*step(sourceUv.x,1.)*step(0.,sourceUv.y)*step(sourceUv.y,1.);
  float cutAlpha=texture2D(cutImage,sourceUv).a*inSource;
  vec3 paper=laminatePaper(vec3(display(result.r),display(result.g),display(result.b)),localPoint,reflected,view);
  if(opaquePaper>.5&&cutAlpha<1.)discard;
  float paperAlpha=cutAlpha*amounts.y;
  float foilAlpha=(1.-opaquePaper)*(1.-cutAlpha)*texture2D(outerImage,uv).a*hasFoil*amounts.x;
  vec3 color=paper*paperAlpha;
  if(foilAlpha>0.) {
    // Concentric grooves disperse outward from the center, so each stretch of band takes another light.
    vec3 radial=normalTransform*vec3(localPoint/max(length(localPoint),.0001),0.);
    vec3 metal=shadeFoil(printCoordinate,atan(localPoint.y,localPoint.x),n,view,radial,printFootprint,angularFootprint)*creaseLight*paperLight;
    color+=vec3(display(metal.r),display(metal.g),display(metal.b))*foilAlpha;
  }
  float alpha=paperAlpha+foilAlpha;
  gl_FragColor=vec4(alpha>0.?color:vec3(0.),alpha);
}
`;
