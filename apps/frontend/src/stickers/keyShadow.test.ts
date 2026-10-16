// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DevicePose } from "./light";
import { keyShadow, keyShadowLayer, rereadKeyShadowElevation } from "./keyShadow";
import { STILL_POSE } from "./lightMode";

/** The light the layers follow: what it holds and the one listener a mounted layer subscribes. */
const light = vi.hoisted(() => ({
  pose: { beta: 47, gamma: 0, screenAngle: 0 } as DevicePose,
  listener: undefined as ((pose: DevicePose) => void) | undefined,
}));
vi.mock("./light", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./light")>()),
  currentLight: () => ({ ...light.pose }),
  subscribeLight: (listener: (pose: DevicePose) => void) => {
    light.listener = listener;
    return () => {
      light.listener = undefined;
    };
  },
}));

const at = (beta: number, gamma = 0) => keyShadow({ beta, gamma, screenAngle: 0 });
const reach = ({ x, y }: { x: number; y: number }) => Math.hypot(x, y);

describe("keyShadow", () => {
  it("falls down and right from the reading pose, under a light at the top left, and further and softer upright", () => {
    const reading = at(STILL_POSE.beta);
    const upright = at(90);
    expect(reading.y).toBeGreaterThan(0);
    expect(reading.x).toBeGreaterThan(0);
    expect(upright.y).toBeGreaterThan(reading.y);
    expect(upright.soft).toBeGreaterThan(reading.soft);
    expect(upright.sharp + upright.soft).toBeLessThan(reading.sharp + reading.soft);
  });

  it("falls toward the top edge lying flat, where the light comes from the bottom edge", () => {
    expect(at(0).y).toBeLessThan(0);
  });

  it("swings across as the device turns sideways, and never throws past its reach", () => {
    const still = at(STILL_POSE.beta).x;
    const swing = (gamma: number) => at(STILL_POSE.beta, gamma).x - still;
    expect(swing(25) * swing(-25)).toBeLessThan(0);
    for (const beta of [0, 20, 47, 70, 90, 110]) expect(reach(at(beta))).toBeLessThan(1.5 + 1e-9);
  });
});

describe("keyShadowLayer", () => {
  const unmounts: (() => void)[] = [];
  afterEach(() => {
    for (const unmount of unmounts.splice(0)) unmount();
    document.body.replaceChildren();
    light.pose = { beta: 47, gamma: 0, screenAngle: 0 };
  });

  /** A sticker's key shadow layer at `elevation`, as the stickers' CSS sets it, mounted. */
  function mount(elevation: string) {
    const layer = document.body.appendChild(document.createElement("span"));
    layer.style.setProperty("--sticker-elevation", elevation);
    const unmount = keyShadowLayer(layer);
    if (unmount) unmounts.push(unmount);
    return layer;
  }
  const offsets = (layers: HTMLElement[]) =>
    layers.map((layer) => [
      layer.style.getPropertyValue("--key-shadow-x"),
      layer.style.getPropertyValue("--key-shadow-y"),
    ]);
  function publish(pose: DevicePose) {
    light.pose = pose;
    light.listener?.(pose);
  }
  /** A turn whose shadow moves under a quarter pixel at 1 px, and well past it at a hand's 14 px. */
  const NUDGE: DevicePose = { beta: 47, gamma: 10, screenAngle: 0 };
  const nudged = Math.max(Math.abs(at(47, 10).x - at(47).x), Math.abs(at(47, 10).y - at(47).y));

  it("writes no shadow on a stuck board with nothing in hand for a move under a quarter pixel", () => {
    expect(nudged).toBeLessThan(0.25);
    expect(nudged * 14).toBeGreaterThan(0.25);
    const board = Array.from({ length: 3 }, () => mount("1px"));
    const still = offsets(board);
    publish(NUDGE);
    expect(offsets(board)).toEqual(still);
    // The light reaches the layers: upright, the shadow throws a whole unit further.
    publish({ beta: 90, gamma: 0, screenAngle: 0 });
    expect(offsets(board)).not.toEqual(still);
  });

  it("follows a sticker taken into the hand: the same move writes once it lifts", () => {
    const held = mount("1px");
    const board = [held, mount("1px"), mount("1px")];
    const still = offsets(board);
    held.style.setProperty("--sticker-elevation", "14px");
    rereadKeyShadowElevation(held);
    publish(NUDGE);
    expect(offsets(board)).not.toEqual(still);
  });
});
