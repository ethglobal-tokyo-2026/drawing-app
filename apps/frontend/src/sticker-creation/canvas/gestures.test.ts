import { describe, expect, it } from "vitest";
import { TapRecognizer } from "./gestures";

describe("TapRecognizer", () => {
  it("recognizes a two-finger tap as undo", () => {
    const r = new TapRecognizer();
    expect(r.down(1, 100, 100, 0)).toBe("draw");
    expect(r.down(2, 200, 100, 30)).toBe("cancel-stroke");
    expect(r.up(1, 120)).toBeNull();
    expect(r.up(2, 130)).toBe("undo");
  });

  it("recognizes a three-finger tap as redo", () => {
    const r = new TapRecognizer();
    r.down(1, 100, 100, 0);
    r.down(2, 200, 100, 20);
    expect(r.down(3, 300, 100, 40)).toBe("ignore");
    r.up(1, 100);
    r.up(2, 110);
    expect(r.up(3, 120)).toBe("redo");
  });

  it("ignores fingers that move", () => {
    const r = new TapRecognizer();
    r.down(1, 100, 100, 0);
    r.down(2, 200, 100, 20);
    r.move(2, 240, 100);
    r.up(1, 100);
    expect(r.up(2, 110)).toBeNull();
  });

  it("ignores slow taps", () => {
    const r = new TapRecognizer();
    r.down(1, 100, 100, 0);
    r.down(2, 200, 100, 20);
    r.up(1, 500);
    expect(r.up(2, 600)).toBeNull();
  });

  it("lets a stroke continue when a second finger lands late", () => {
    const r = new TapRecognizer();
    r.down(1, 100, 100, 0);
    expect(r.down(2, 200, 100, 800)).toBe("ignore");
    r.up(2, 850);
    expect(r.up(1, 900)).toBeNull();
  });

  it("does nothing for a single-finger tap", () => {
    const r = new TapRecognizer();
    r.down(1, 100, 100, 0);
    expect(r.up(1, 50)).toBeNull();
  });
});
