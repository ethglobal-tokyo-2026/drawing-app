import { describe, expect, it } from "vitest";
import { COAT, coatedPaperReflectance } from "./coat";
import { STILL_POSE } from "./lightMode";
import { LIGHT_AZIMUTH, LIGHT_ELEVATION } from "./roomGeometry";
import {
  bounceIrradiance,
  inRoomAxes,
  LIGHT_RADIANCE,
  overRoomLight,
  paperIrradiance,
  ROOM_LIGHT,
} from "./roomIrradiance";
import { roomFrame } from "./sharedRoom";

type Vec3 = readonly [number, number, number];
const RAD = Math.PI / 180;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v);
  return [v[0] / length, v[1] / length, v[2] / length];
};
/** The bounce's irradiance on a surface facing n, integrated over the map itself. */
const mapIrradiance = (n: Vec3) => overRoomLight((d) => Math.max(dot(n, d), 0));

/** The room's share of the light on the screen's paper, with the screen tilted to `beta`. */
const roomShare = (beta: number) => {
  const { light, total } = paperIrradiance(roomFrame({ ...STILL_POSE, beta }));
  return 1 - light / total;
};

/**
 * A row of the map: the azimuth its brightness gathers around, and how far it varies around the
 * azimuth, its darkest against its brightest.
 */
function mapRow(row: number) {
  const { width, pixels } = ROOM_LIGHT;
  const levels = Array.from({ length: width }, (_, column) => pixels[(row * width + column) * 4]);
  const [x, y] = levels.reduce(
    ([sx, sy], level, column) => {
      const phi = (2 * Math.PI * (column + 0.5)) / width;
      return [sx + level * Math.cos(phi), sy + level * Math.sin(phi)];
    },
    [0, 0],
  );
  return { azimuth: Math.atan2(y, x), spread: 1 - Math.min(...levels) / Math.max(...levels) };
}

describe("the room's light", () => {
  it("projects the bounce into harmonics whose irradiance is within 2% of the map's own", () => {
    const normals: Vec3[] = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    for (const n of normals)
      expect(Math.abs(bounceIrradiance(n) / mapIrradiance(n) - 1)).toBeLessThan(0.02);
  });

  it("keeps the difference between a surface facing left and its mirror facing right", () => {
    // Only the terms odd in x carry it, a few percent of the bounce. These facings are where the room
    // makes it largest; elsewhere the bands harmonics drop are a larger part of it.
    for (const facing of [
      [1, 0, 0],
      [1, 1, 0],
      [1, 0, 1],
      [1, 1, 1],
    ] as const) {
      const n = unit(facing);
      const mirrored: Vec3 = [-n[0], n[1], n[2]];
      const harmonics = bounceIrradiance(n) - bounceIrradiance(mirrored);
      const map = mapIrradiance(n) - mapIrradiance(mirrored);
      expect(Math.abs(harmonics / map - 1)).toBeLessThan(0.15);
    }
  });

  it("lays the map in the room's axes: the floor lit most below the light, the ceiling evenly", () => {
    const frame = roomFrame(STILL_POSE);
    const light = inRoomAxes(frame, frame.light);
    const [elevation, azimuth] = [LIGHT_ELEVATION * RAD, LIGHT_AZIMUTH * RAD];
    // x the viewer's left, y toward the viewer, z up.
    const hung = [
      Math.cos(elevation) * Math.sin(azimuth),
      Math.cos(elevation) * Math.cos(azimuth),
      Math.sin(elevation),
    ];
    light.forEach((v, i) => expect(v).toBeCloseTo(hung[i], 9));
    const lightAzimuth = Math.atan2(light[1], light[0]);
    const { height, width } = ROOM_LIGHT;
    for (let row = 0; row < height; row++) {
      // Steeply down, every ray meets the floor, which the light lights most straight below it.
      if ((Math.PI * (row + 0.5)) / height < 140 * RAD) continue;
      const off = Math.abs(
        ((mapRow(row).azimuth - lightAzimuth + 3 * Math.PI) % (2 * Math.PI)) - Math.PI,
      );
      expect(off).toBeLessThan((2 * Math.PI) / width);
    }
    // The light faces away from the ceiling above the device, which only the room lights.
    for (let row = 0; row < 3; row++)
      expect(mapRow(row).spread).toBeLessThan(mapRow(height - 1 - row).spread);
  });

  it("gives paper turned away from the light a larger share from the room", () => {
    // From the still pose on, tilting the screen back turns it away from the light.
    const shares = [STILL_POSE.beta, 70, 90, 110].map(roomShare);
    shares.slice(1).forEach((share, i) => expect(share).toBeGreaterThan(shares[i]));
    // The light lights the still pose; past upright, the room's bounce does.
    expect(roomShare(STILL_POSE.beta)).toBeLessThan(1 / 3);
    expect(roomShare(110)).toBeGreaterThan(1 / 2);
  });

  it("sets the light's radiance so white paper at the still pose, seen square-on, shows paper white", () => {
    const still = roomFrame(STILL_POSE);
    const normal = inRoomAxes(still, [0, 0, 1]);
    // Each direction's light enters the coat at its own cosine.
    const fromLight = coatedPaperReflectance(still.light[2]) * paperIrradiance(still).light;
    const fromRoom =
      LIGHT_RADIANCE *
      overRoomLight((d) => {
        const cosine = dot(normal, d);
        return cosine > 0 ? coatedPaperReflectance(cosine) * cosine : 0;
      });
    expect((fromLight + fromRoom) / Math.PI).toBeCloseTo(COAT.paperWhite, 6);
  });
});
