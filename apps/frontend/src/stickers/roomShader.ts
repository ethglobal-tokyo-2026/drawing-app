import { glslFloat as f } from "./glsl";
import { LIGHT_RADIANCE, LIGHT_REFLECTION_RADIANCE, ROOM_LIGHT } from "./roomIrradiance";
import { ROOM } from "./sharedRoom";

const { light } = ROOM;
const RAD = Math.PI / 180;
/**
 * The eye's veiling glare outside the light's rim against its body, CIE 146:2002's General formula at
 * age 25 fitted to a disc: level·1°/(Δ + offset), Δ the angle outside the rim, here in radians.
 */
export const VEIL = { level: 0.0185 * RAD, offset: 0.32 * RAD };
/** The share of a coat's lobe spread that blurs the light's rim, as the logistic's scale. */
export const RIM_BLUR_SHARE = 0.4;

/**
 * The one room every material mirrors, fixed in the world. roomUp, roomToward (the viewer, level),
 * roomLight and its plane's roomAcross (level, the viewer's right) and roomDown (the plumb line seen on
 * the plane) axes are in screen axes, y down, from roomFrame; roomEye is in CSS px from the screen's
 * center. A direction's place on the light's
 * plane is on the plane one unit along the light. roomFootprint is the reflection's change across one
 * pixel on that plane, which main sets before any branch. roomLightMap is ROOM_LIGHT's map, repeating
 * around the azimuth and clamped at the poles, linearly filtered without mipmaps.
 */
export const roomFragment = `
uniform vec3 roomUp;
uniform vec3 roomToward;
uniform vec3 roomLight;
uniform vec3 roomAcross;
uniform vec3 roomDown;
uniform vec3 roomEye;
uniform sampler2D roomLightMap;
float roomFootprint;
vec2 roomPlane(vec3 r){
 float z=dot(r,roomLight);
 return z>.05?vec2(dot(r,roomAcross),dot(r,roomDown))/z:vec2(1e3);
}
// The ceiling light's body at q, the distance from its middle on its plane with down stretched by its
// aspect, through a logistic blur of scale b: the exact convolution along its radius, so it fades in
// and out with no step and no cutoff.
float roomDisc(float q,float b){
 return 1./(1.+exp(clamp((q-${f(light.radius)})/b,-40.,40.)))-1./(1.+exp(clamp((q+${f(light.radius)})/b,-40.,40.)));
}
// The ceiling light seen through a coat whose lobe is spread wide: its level disc foreshortened to an
// ellipse, its rim blurred by the lobe, and by a pixel's footprint so a steep crease never aliases it;
// outside the rim, the eye's veiling glare.
float roomCeilingLight(vec3 r,float spread){
 vec2 p=roomPlane(r);
 float q=length(vec2(p.x,p.y/${f(light.aspect)}));
 float blur=sqrt(${f(light.feather * light.feather)}+${f(RIM_BLUR_SHARE * RIM_BLUR_SHARE)}*spread*spread+roomFootprint*roomFootprint);
 float body=roomDisc(q,blur);
 return body+(1.-body)*${f(VEIL.level)}/(max(atan(q)-${f(Math.atan(light.radius))},0.)+${f(VEIL.offset)});
}
// The room's bounce along r at the ceiling light's radiance, read from the map by its azimuth from the
// viewer's left toward the viewer and its polar angle down from up. Straight up or down, the azimuth
// has no meaning, so any column serves.
float roomBounce(vec3 r){
 vec3 left=cross(roomUp,roomToward);
 vec2 level=vec2(dot(r,left),dot(r,roomToward));
 float azimuth=dot(level,level)>1e-12?atan(level.y,level.x):0.;
 vec2 at=vec2(azimuth*${f(1 / (2 * Math.PI))},acos(clamp(dot(r,roomUp),-1.,1.))*${f(1 / Math.PI)});
 return texture2D(roomLightMap,at).r*${f(ROOM_LIGHT.scale * LIGHT_RADIANCE)};
}
// Reduce the source before its profile, so reflection headroom never flattens its smooth edge.
float roomSources(vec3 r,float spread){return ${f(LIGHT_REFLECTION_RADIANCE)}*roomCeilingLight(r,spread);}
`;
