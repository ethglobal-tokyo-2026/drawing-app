import { glslFloat as f } from "./glsl";
import { lightPower, ROOM, type RoomFrame } from "./sharedRoom";

/**
 * The room's light falling on a sticker's paper, which shades its creases: the irradiance E(n) on a
 * surface facing n. The bounce surrounds the device, so it is projected once into spherical harmonics
 * in the room's axes (Ramamoorthi and Hanrahan). Each source is small and stays high above every
 * crease's horizon, so it adds exactly its power, radiance times solid angle, times n·its direction.
 */

type Levels = (typeof ROOM)["glossBounce"];

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** roomShader's roomBounce, for a direction by its part along up and its part toward the viewer. */
function bounce(rise: number, toward: number, levels: Levels) {
  const ahead = -toward / Math.max(Math.sqrt(Math.max(1 - rise * rise, 0)), 0.001);
  const lit = levels.litWall * (1 - levels.litWallFade * smoothstep(0.55, 0.9, rise));
  const wall = mix(levels.walls, lit, smoothstep(-0.1, 0.8, ahead));
  const upper = mix(wall, levels.ceiling, smoothstep(0.72, 0.95, rise));
  return mix(levels.floor, upper, smoothstep(-0.14, 0.08, rise));
}

/**
 * The bounce's irradiance as a quadratic in a unit normal's parts along up (y) and toward the viewer
 * (z), with x² its part across: E = c0 + cy·y + cz·z + cyz·y·z + czz·(3z² − 1) + cxy·(x² − y²). The
 * bounce mirrors left for right, so every term odd in x vanishes.
 */
function bounceIrradiance(levels: Levels) {
  // Midpoint quadrature over cos θ about up and the azimuth: dω = du·dφ.
  const rows = 64;
  const columns = 128;
  const dw = (2 / rows) * ((2 * Math.PI) / columns);
  const sum = { l00: 0, y: 0, z: 0, yz: 0, zz: 0, xy: 0 };
  for (let i = 0; i < rows; i++) {
    const y = -1 + (2 * (i + 0.5)) / rows;
    const s = Math.sqrt(1 - y * y);
    for (let j = 0; j < columns; j++) {
      const phi = (2 * Math.PI * (j + 0.5)) / columns;
      const x = s * Math.cos(phi);
      const z = s * Math.sin(phi);
      const radiance = bounce(y, z, levels) * dw;
      sum.l00 += radiance * 0.282095;
      sum.y += radiance * 0.488603 * y;
      sum.z += radiance * 0.488603 * z;
      sum.yz += radiance * 1.092548 * y * z;
      sum.zz += radiance * 0.315392 * (3 * z * z - 1);
      sum.xy += radiance * 0.546274 * (x * x - y * y);
    }
  }
  // Each band's cosine convolution: π, 2π/3 and π/4, times its basis function's constant.
  const [a0, a1, a2] = [Math.PI, (2 * Math.PI) / 3, Math.PI / 4];
  return {
    c0: a0 * 0.282095 * sum.l00,
    cy: a1 * 0.488603 * sum.y,
    cz: a1 * 0.488603 * sum.z,
    cyz: a2 * 1.092548 * sum.yz,
    czz: a2 * 0.315392 * sum.zz,
    cxy: a2 * 0.546274 * sum.xy,
  };
}

/** The solid angle of a rectangle centered one unit away, from its half extents on that plane. */
const rectangleSolidAngle = (a: number, b: number) =>
  4 * Math.asin((a * b) / Math.sqrt((1 + a * a) * (1 + b * b)));

/** How many round sources the shader sums; unused ones have no power. */
export const ROUND_SOURCES = 4;

/**
 * The room's sources in screen axes, toward each and its power: the shoji along roomFrame's light,
 * then the round lights, body and core, at the power foil mirrors them with.
 */
function roundSources(frame: RoomFrame) {
  const { shoji } = ROOM;
  return [
    {
      direction: frame.light,
      power: shoji.radiance * rectangleSolidAngle(shoji.halfWidth, shoji.halfHeight),
    },
    ...frame.lights.map((source) => ({ direction: source.direction, power: lightPower(source) })),
  ];
}

/** The round sources' uniform: each one's direction, then its power. */
export function roomIrradianceSources(frame: RoomFrame) {
  const sources = roundSources(frame);
  if (sources.length > ROUND_SOURCES)
    throw new Error(
      `The room has ${sources.length} round sources; the shader sums ${ROUND_SOURCES}`,
    );
  const out = new Float32Array(4 * ROUND_SOURCES);
  sources.forEach(({ direction, power }, i) => out.set([...direction, power], 4 * i));
  return out;
}

const c = bounceIrradiance(ROOM.glossBounce);

type Vec3 = readonly [number, number, number];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The shader's roomIrradiance on paper facing n, in screen axes: the shoji's part and the whole. */
export function paperIrradiance(frame: RoomFrame, n: Vec3 = [0, 0, 1]) {
  const y = dot(n, frame.up);
  const z = dot(n, frame.toward);
  const x2 = Math.max(1 - y * y - z * z, 0);
  const bounceLight =
    c.c0 + c.cy * y + c.cz * z + c.cyz * y * z + c.czz * (3 * z * z - 1) + c.cxy * (x2 - y * y);
  const [shoji, ...lights] = roundSources(frame).map(
    ({ direction, power }) => power * Math.max(dot(n, direction), 0),
  );
  return { shoji, total: lights.reduce((sum, light) => sum + light, bounceLight + shoji) };
}

/** roomIrradiance(n): the irradiance on paper facing n, in screen axes. Needs roomFragment first. */
export const roomIrradianceFragment = `
uniform vec4 irradianceSources[${ROUND_SOURCES}];
float roomIrradiance(vec3 n){
 float y=dot(n,roomUp);
 float z=dot(n,roomToward);
 float x2=max(1.-y*y-z*z,0.);
 float e=${f(c.c0)}+${f(c.cy)}*y+${f(c.cz)}*z+${f(c.cyz)}*y*z+${f(c.czz)}*(3.*z*z-1.)+${f(c.cxy)}*(x2-y*y);
 for(int i=0;i<${ROUND_SOURCES};i++)e+=irradianceSources[i].w*max(dot(n,irradianceSources[i].xyz),0.);
 return e;
}
`;
