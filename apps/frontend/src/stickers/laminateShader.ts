/** Shared shader: air/film Fresnel, a finite camera, and a nine-tap neutral environment filter. */
export const laminateVertex = `
attribute vec2 position;
varying vec2 uv;
void main() { uv=vec2((position.x+1.0)*.5,(1.0-position.y)*.5); gl_Position=vec4(position,0.,1.); }
`;
export const laminateFragment = `
precision highp float;
varying vec2 uv;
uniform sampler2D printImage;
uniform sampler2D cutImage;
uniform sampler2D normalImage;
uniform vec2 pose;
uniform vec2 size;
uniform float turn;
uniform vec2 flightTilt;
uniform float roughness;
vec3 rz(vec3 n,float a) { return vec3(cos(a)*n.x-sin(a)*n.y,sin(a)*n.x+cos(a)*n.y,n.z); }
vec3 rx(vec3 n,float a) { return vec3(n.x,cos(a)*n.y-sin(a)*n.z,sin(a)*n.y+cos(a)*n.z); }
vec3 ry(vec3 n,float a) { return vec3(cos(a)*n.x+sin(a)*n.z,n.y,-sin(a)*n.x+cos(a)*n.z); }
float scene(vec2 p) {
  vec2 window=1.-smoothstep(vec2(.5,.62)-.045,vec2(.5,.62)+.045,abs(p));
  return .14+1.66*window.x*window.y;
}
float environment(vec3 r) {
  if(r.z<=0.) return .14;
  vec2 p=r.xy/r.z;
  float value=0.;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++) {
    float weight=(x==0?2.:1.)*(y==0?2.:1.)/16.;
    value+=scene(p+vec2(float(x),float(y))*roughness)*weight;
  }
  return value;
}
float linear(float v) { return v<=.04045?v/12.92:pow((v+.055)/1.055,2.4); }
float display(float v) { return v<=.0031308?v*12.92:1.055*pow(v,1./2.4)-.055; }
void main() {
  vec4 art=texture2D(printImage,uv);
  vec3 base=mix(vec3(1.),art.rgb,art.a);
  vec3 n=normalize((texture2D(normalImage,uv).rgb*255.-128.)/127.);
  // CSS rotate(Z) rotateX(X) rotateY(Y) composes Rz * Rx * Ry.
  n=rz(rx(ry(n,flightTilt.y),flightTilt.x),turn);
  n=normalize(ry(rx(n,-pose.y*.38),pose.x*.38));
  vec2 point=rz(vec3((uv-.5)*size/min(size.x,size.y),0.),turn).xy;
  vec3 view=normalize(vec3(-point,2.4));
  float cosine=clamp(dot(n,view),0.,1.);
  float transmitted=sqrt(1.-(1.-cosine*cosine)/2.25);
  float perpendicular=(cosine-1.5*transmitted)/(cosine+1.5*transmitted);
  float parallel=(1.5*cosine-transmitted)/(1.5*cosine+transmitted);
  float fresnel=(perpendicular*perpendicular+parallel*parallel)*.5;
  vec3 reflected=normalize(2.*dot(view,n)*n-view);
  vec3 result=clamp(vec3(linear(base.r),linear(base.g),linear(base.b))*.9*(1.-fresnel)+fresnel*environment(reflected),0.,1.);
  gl_FragColor=vec4(display(result.r),display(result.g),display(result.b),texture2D(cutImage,uv).a);
}
`;
