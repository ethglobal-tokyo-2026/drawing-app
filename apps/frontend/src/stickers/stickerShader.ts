import { foilFragment } from "./foilShader";
import { glslFloat as f } from "./glsl";
import { laminateFragment } from "./laminateShader";
import { roomFragment } from "./roomShader";
import { ROOM } from "./sharedRoom";
import { SCREENTONE } from "./screentone";

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
uniform vec2 size;
uniform mat3 normalTransform;
uniform vec2 pointTurn;
uniform float roughness;
uniform float creaseReveal;
uniform sampler2D outerImage;
uniform vec4 sourceBounds;
uniform vec4 normalBounds;
uniform vec2 amounts;
uniform float hasFoil;
uniform float opaquePaper;
// Where the sticker's center sits on screen, in CSS px from the visual viewport's center (y down),
// and how many CSS px on screen one of its short sides spans.
uniform vec2 screenCenter;
uniform float screenScale;
${roomFragment}
${foilFragment}
float environment(vec3 r) {
  return roomGloss(r)+${f(ROOM.shoji.radiance)}*roomShoji(r,roughness);
}
float linear(float v) { return v<=.04045?v/12.92:pow((v+.055)/1.055,2.4); }
float display(float v) { return v<=.0031308?v*12.92:1.055*pow(v,1./2.4)-.055; }
${laminateFragment}
void main() {
  vec2 sourceUv=sourceBounds.xy+uv*sourceBounds.zw;
  vec4 art=texture2D(printImage,sourceUv);
  vec3 base=mix(vec3(1.),art.rgb,art.a);
  // Frame-constant rotations are composed on the CPU, rather than at every covered fragment.
  vec3 bakedNormal=(texture2D(normalImage,(sourceUv-normalBounds.xy)/normalBounds.zw).rgb*255.-128.)/127.;
  // Flat and bent snapshots share the print and light; their diagonal reveal is composited afterward.
  vec3 surfaceNormal=mix(vec3(0.,0.,1.),bakedNormal,creaseReveal);
  vec3 n=normalize(normalTransform*surfaceNormal);
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
  float transmitted=sqrt(1.-(1.-cosine*cosine)/2.25);
  float perpendicular=(cosine-1.5*transmitted)/(cosine+1.5*transmitted);
  float parallel=(1.5*cosine-transmitted)/(1.5*cosine+transmitted);
  float fresnel=(perpendicular*perpendicular+parallel*parallel)*.5;
  vec3 reflected=normalize(2.*dot(view,n)*n-view);
  vec2 shojiPoint=roomPlane(reflected);
  roomFootprint=max(length(dFdx(shojiPoint)),length(dFdy(shojiPoint)));
  vec3 coat=laminateCoat(vec3(linear(base.r),linear(base.g),linear(base.b))*.9*(1.-fresnel)+fresnel*environment(reflected),
    sourceUv*size,printFootprint*tile,surfaceNormal,view);
  // Paper never clips: the brightest reflection rolls off, so it keeps its gradation over the print.
  vec3 result=clamp(highlightShoulder(coat,.88),0.,1.);
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
    vec3 metal=shadeFoil(printCoordinate,atan(localPoint.y,localPoint.x),n,view,radial,printFootprint,angularFootprint);
    color+=vec3(display(metal.r),display(metal.g),display(metal.b))*foilAlpha;
  }
  float alpha=paperAlpha+foilAlpha;
  gl_FragColor=vec4(alpha>0.?color:vec3(0.),alpha);
}
`;
