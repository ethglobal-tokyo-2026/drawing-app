import { glslFloat as f } from "./glsl";
import { ROOM, type RoomFrame } from "./sharedRoom";

/**
 * The room's light falling on a sticker's paper, which shades its creases: the irradiance E(n) on a
 * surface facing n. The bounce surrounds the device, so it is projected once into spherical harmonics
 * in the room's axes (Ramamoorthi and Hanrahan). The ceiling light is small and stays high above
 * every crease's horizon, so it adds exactly its power, radiance times solid angle, times n·its
 * direction.
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

/** roomShader's roomDisc: the ceiling light's body at distance d from its middle on its plane. */
const disc = (d: number, blur: number) =>
  1 / (1 + Math.exp((d - ROOM.light.radius) / blur)) -
  1 / (1 + Math.exp((d + ROOM.light.radius) / blur));

/**
 * The ceiling light's body, edge blur included, summed ring by ring over its plane one unit along it:
 * each ring weighted by `weight` at its distance from the middle and by the solid angle it covers.
 */
export function overLightBody(weight: (d: number) => number) {
  const { radius, feather } = ROOM.light;
  const steps = 512;
  const reach = radius + 12 * feather;
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    const d = ((i + 0.5) / steps) * reach;
    // A ring seen from one unit before the plane: dω = dA / (1 + d²)^(3/2).
    sum += (weight(d) * disc(d, feather) * 2 * Math.PI * d * (reach / steps)) / (1 + d * d) ** 1.5;
  }
  return sum;
}

/**
 * The ceiling light's power: its radiance times the solid angle its body covers, edge blur included,
 * as gloss mirrors it. The halo is the room it lights, which the bounce already holds.
 */
const LIGHT_POWER = ROOM.light.radiance * overLightBody(() => 1);

const c = bounceIrradiance(ROOM.glossBounce);

type Vec3 = readonly [number, number, number];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The shader's roomIrradiance on paper facing n, in screen axes: the ceiling light's part and the whole. */
export function paperIrradiance(frame: RoomFrame, n: Vec3 = [0, 0, 1]) {
  const y = dot(n, frame.up);
  const z = dot(n, frame.toward);
  const x2 = Math.max(1 - y * y - z * z, 0);
  const bounceLight =
    c.c0 + c.cy * y + c.cz * z + c.cyz * y * z + c.czz * (3 * z * z - 1) + c.cxy * (x2 - y * y);
  const light = LIGHT_POWER * Math.max(dot(n, frame.light), 0);
  return { light, total: bounceLight + light };
}

/** roomIrradiance(n): the irradiance on paper facing n, in screen axes. Needs roomFragment first. */
export const roomIrradianceFragment = `
float roomIrradiance(vec3 n){
 float y=dot(n,roomUp);
 float z=dot(n,roomToward);
 float x2=max(1.-y*y-z*z,0.);
 return ${f(c.c0)}+${f(c.cy)}*y+${f(c.cz)}*z+${f(c.cyz)}*y*z+${f(c.czz)}*(3.*z*z-1.)+${f(c.cxy)}*(x2-y*y)
  +${f(LIGHT_POWER)}*max(dot(n,roomLight),0.);
}
`;
