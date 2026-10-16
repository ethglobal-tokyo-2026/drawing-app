import { glslFloat as f } from "./glsl";
import { ROOM } from "./sharedRoom";

const { light } = ROOM;
const bounce = (levels: (typeof ROOM)["glossBounce" | "foilBounce"]) =>
  `vec4(${f(levels.ceiling)},${f(levels.litWall)},${f(levels.walls)},${f(levels.floor)}),${f(levels.litWallFade)}`;

/**
 * The one room every material mirrors, fixed in the world. roomUp, roomToward (the viewer, level),
 * roomLight and its plane's roomAcross (viewer's right) and roomDown axes are in screen axes, y down,
 * from roomFrame; roomEye is in CSS px from the screen's center. A direction's place on the light's
 * plane is on the plane one unit along the light. roomFootprint is the reflection's change across one
 * pixel on that plane, which main sets before any branch.
 */
export const roomFragment = `
uniform vec3 roomUp;
uniform vec3 roomToward;
uniform vec3 roomLight;
uniform vec3 roomAcross;
uniform vec3 roomDown;
uniform vec3 roomEye;
float roomFootprint;
vec2 roomPlane(vec3 r){
 float z=dot(r,roomLight);
 return z>.05?vec2(dot(r,roomAcross),dot(r,roomDown))/z:vec2(1e3);
}
// The ceiling light's disc at distance d from its middle on its plane, through a logistic blur of
// scale b: the exact convolution along its radius, so it fades in and out with no step and no cutoff.
float roomDisc(float d,float b){
 return 1./(1.+exp(clamp((d-${f(light.radius)})/b,-40.,40.)))-1./(1.+exp(clamp((d+${f(light.radius)})/b,-40.,40.)));
}
// The ceiling light seen through a coat whose lobe is spread wide: its edge blurs by the lobe, and by
// a pixel's footprint so a steep crease never aliases it; its halo, the ceiling it lights and the
// eye's veiling glare, brightens before the disc arrives and fades after it leaves.
float roomCeilingLight(vec3 r,float spread){
 float d=length(roomPlane(r));
 float blur=sqrt(${f(light.feather * light.feather)}+${f(0.4 * 0.4)}*spread*spread+roomFootprint*roomFootprint);
 return ${f(light.haloLevel)}*roomDisc(d,${f(light.haloScale)})+roomDisc(d,blur);
}
// The room's bounce: the ceiling, the wall beyond the device, the other walls, a soft horizon, and
// the floor. Levels are ceiling, lit wall, walls, floor. The lit wall fades by litFade toward the
// ceiling, so a flat device mirrors a soft band toward its top edge rather than an even gray over the
// ink.
float roomBounce(vec3 r,vec4 levels,float litFade){
 float rise=dot(r,roomUp);
 float ahead=-dot(r,roomToward)/max(sqrt(max(1.-rise*rise,0.)),.001);
 float lit=levels.y*(1.-litFade*smoothstep(.55,.9,rise));
 float wall=mix(levels.z,lit,smoothstep(-.1,.8,ahead));
 float upper=mix(wall,levels.x,smoothstep(.72,.95,rise));
 return mix(levels.w,upper,smoothstep(-.14,.08,rise));
}
// The one source every coat mirrors: the ceiling light, at its radiance.
float roomSources(vec3 r,float spread){return ${f(light.radiance)}*roomCeilingLight(r,spread);}
float roomGloss(vec3 r){return roomBounce(r,${bounce(ROOM.glossBounce)});}
float roomFoil(vec3 r){return roomBounce(r,${bounce(ROOM.foilBounce)});}
`;
