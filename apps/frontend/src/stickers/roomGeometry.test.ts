import { expect, it } from "vitest";
import { STILL_POSE } from "./lightMode";
import { ROOM, roomFrame } from "./sharedRoom";

it("places a compact resting reflection above the phone instead of beside its artwork", () => {
  const frame = roomFrame(STILL_POSE);
  const point = (across: number, down: number) => {
    const direction = frame.light.map(
      (v, i) =>
        v +
        ROOM.light.radius * (across * frame.across[i] + ROOM.light.aspect * down * frame.down[i]),
    );
    return direction.slice(0, 2).map((v, i) => frame.eye[i] + (v * frame.eye[2]) / direction[2]);
  };
  const middle = point(0, 0);
  const rim = Array.from({ length: 360 }, (_, i) =>
    point(Math.cos((i * Math.PI) / 180), Math.sin((i * Math.PI) / 180)),
  );
  const xs = rim.map(([x]) => x);
  expect(Math.abs(middle[0])).toBeLessThan(1);
  expect(Math.max(...rim.map(([, y]) => y))).toBeLessThan(-956 / 2);
  expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(440 * 0.75);
});
