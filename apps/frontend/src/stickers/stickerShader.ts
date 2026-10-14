import { foilFragment } from "./foilShader";
/** Shared shader: air/film Fresnel, a finite camera, and a nine-tap neutral environment filter. */
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
${foilFragment}
vec2 windowAxes(vec2 p) {
  return 1.-smoothstep(vec2(.10,.145)-.015,vec2(.10,.145)+.015,abs(p-vec2(.02,-.025)));
}
float environment(vec3 r) {
  if(r.z<=0.) return .14;
  vec2 p=r.xy/r.z;
  // The rectangular source and 1:2:1 filter are separable: three axis samples
  // give the same nine-tap reflection with fewer fragment calculations.
  vec2 filtered=(windowAxes(p-roughness)+2.*windowAxes(p)+windowAxes(p+roughness))*.25;
  return .14+3.06*filtered.x*filtered.y;
}
float linear(float v) { return v<=.04045?v/12.92:pow((v+.055)/1.055,2.4); }
float display(float v) { return v<=.0031308?v*12.92:1.055*pow(v,1./2.4)-.055; }
void main() {
  vec2 sourceUv=sourceBounds.xy+uv*sourceBounds.zw;
  vec4 art=texture2D(printImage,sourceUv);
  vec3 base=mix(vec3(1.),art.rgb,art.a);
  // Frame-constant rotations are composed on the CPU, rather than at every covered fragment.
  vec3 bakedNormal=(texture2D(normalImage,(sourceUv-normalBounds.xy)/normalBounds.zw).rgb*255.-128.)/127.;
  // Flat and bent snapshots share the print and light; their diagonal reveal is composited afterward.
  vec3 n=normalize(normalTransform*mix(vec3(0.,0.,1.),bakedNormal,creaseReveal));
  vec2 localPoint=(sourceUv-.5)*size/min(size.x,size.y);
  vec2 point=vec2(pointTurn.x*localPoint.x-pointTurn.y*localPoint.y,
    pointTurn.y*localPoint.x+pointTurn.x*localPoint.y);
  vec3 view=normalize(vec3(-point,2.4));
  float cosine=clamp(dot(n,view),0.,1.);
  float transmitted=sqrt(1.-(1.-cosine*cosine)/2.25);
  float perpendicular=(cosine-1.5*transmitted)/(cosine+1.5*transmitted);
  float parallel=(1.5*cosine-transmitted)/(1.5*cosine+transmitted);
  float fresnel=(perpendicular*perpendicular+parallel*parallel)*.5;
  vec3 reflected=normalize(2.*dot(view,n)*n-view);
  vec3 result=clamp(vec3(linear(base.r),linear(base.g),linear(base.b))*.9*(1.-fresnel)+fresnel*environment(reflected),0.,1.);
  // Native canvas snapshots use premultiplied display colors; the optical math above stays linear.
  float inSource=step(0.,sourceUv.x)*step(sourceUv.x,1.)*step(0.,sourceUv.y)*step(sourceUv.y,1.);
  float cutAlpha=texture2D(cutImage,sourceUv).a*inSource;
  vec3 paper=vec3(display(result.r),display(result.g),display(result.b));
  // Derivatives are evaluated before material branches, including opaque paper fragments.
  // Screentone tiles are 80 across the short side but never under 3 CSS px, so board dots stay crisp.
  vec2 printCoordinate=sourceUv*size/max(3.,min(size.x,size.y)/80.);
  float printFootprint=max(length(dFdx(printCoordinate)),length(dFdy(printCoordinate)));
  vec3 angular=n+view;
  float angularFootprint=max(length(dFdx(angular)),length(dFdy(angular)));
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
