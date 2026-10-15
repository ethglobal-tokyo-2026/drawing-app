import { glslFloat as f } from "./glsl";
import { ROOM } from "./sharedRoom";

const { shoji: s } = ROOM;
const extent = `vec2(${f(s.halfWidth)},${f(s.halfHeight)})`;
const cell = `vec2(${f((2 * s.halfWidth) / s.columns)},${f((2 * s.halfHeight) / s.rows)})`;
// A bar's half width in cells along each axis: its share of a column's width, the same in both directions.
const barHalf = `vec2(${f(s.bar / 2)},${f((s.bar / 2) * (s.halfWidth / s.columns / (s.halfHeight / s.rows)))})`;
const bounce = (levels: (typeof ROOM)["glossBounce" | "foilBounce"]) =>
  `vec4(${f(levels.ceiling)},${f(levels.litWall)},${f(levels.walls)},${f(levels.floor)}),${f(levels.litWallFade)}`;

/**
 * The one room every material mirrors, fixed to gravity (prototype). roomUp, roomToward (the viewer,
 * level), roomLight and the shoji's roomAcross (viewer's right) and roomDown axes are in screen
 * axes, y down, from roomFrame; roomEye is in CSS px from the screen's center. A direction's shoji
 * coordinates are on the plane one unit along the light. roomFootprint is the reflection's change
 * across one pixel on that plane, which main sets before any branch.
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
vec2 roomShojiAxes(vec2 q){return 1.-smoothstep(${extent}-${f(s.feather)},${extent}+${f(s.feather)},abs(q));}
// One bar of half width b at distance d, in cells, softened over w cells.
float roomBar(float d,float b,float w){return 1.-smoothstep(b-w,b+w+.0001,d);}
// Kumiko along one axis: bars at whole cells; once w spans much of a cell, only their average shows,
// so the lattice never aliases.
float roomBars(float u,float b,float w){
 return mix(roomBar(abs(fract(u+.5)-.5),b,w),2.*b,smoothstep(.2,.45,w));
}
// The shoji screen: washi glowing brightest at its middle, darker kumiko over it, and a crisp frame,
// seen through a 1:2:1 filter of the given spread.
float roomShoji(vec3 r,float spread){
 vec2 q=roomPlane(r);
 vec2 f=(roomShojiAxes(q-spread)+2.*roomShojiAxes(q)+roomShojiAxes(q+spread))*.25;
 float frame=f.x*f.y;
 if(frame<=0.)return 0.;
 vec2 local=q/${extent};
 vec2 cells=(local*.5+.5)*${extent}*2./${cell};
 vec2 w=vec2(.7*spread+roomFootprint)/${cell};
 float bars=max(roomBars(cells.x,${barHalf}.x,w.x),roomBars(cells.y,${barHalf}.y,w.y));
 // The bottom rail: one more bar the rail's share of a row above the frame's lower edge.
 bars=max(bars,roomBar(abs(cells.y-${f(s.rows - s.rail)}),${barHalf}.y,w.y)*(1.-smoothstep(.2,.45,w.y)));
 return frame*(1.-${f(s.glow)}*.5*dot(local,local))*(1.-${f(s.barShade)}*bars);
}
// The room's bounce: the ceiling, the wall the shoji lights (beyond the device), the other walls, a
// soft horizon, and the floor. Levels are ceiling, lit wall, walls, floor. The lit wall fades by
// litFade toward the ceiling, so a flat device mirrors a soft band toward its top edge rather than an
// even gray over the ink.
float roomBounce(vec3 r,vec4 levels,float litFade){
 float rise=dot(r,roomUp);
 float ahead=-dot(r,roomToward)/max(sqrt(max(1.-rise*rise,0.)),.001);
 float lit=levels.y*(1.-litFade*smoothstep(.55,.9,rise));
 float wall=mix(levels.z,lit,smoothstep(-.1,.8,ahead));
 float upper=mix(wall,levels.x,smoothstep(.72,.95,rise));
 return mix(levels.w,upper,smoothstep(-.14,.08,rise));
}
float roomGloss(vec3 r){return roomBounce(r,${bounce(ROOM.glossBounce)});}
float roomFoil(vec3 r){return roomBounce(r,${bounce(ROOM.foilBounce)});}
`;
