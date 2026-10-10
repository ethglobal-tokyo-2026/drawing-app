import { describe, expect, it } from "vitest";
import { edgeAt } from "./edgeBands";
import { DEPTH_GAP } from "./trayModel";

const frontFoot = { top: 349, bottom: 364 };
const edges = [
  { top: 364, bottom: 379 },
  { top: 379, bottom: 394 },
  { top: 394, bottom: 409 },
];
const end = 409 + DEPTH_GAP;

describe("edgeAt", () => {
  it("gives every edge an equal share of the room from the front sheet's foot to under the last", () => {
    const share = (end - frontFoot.top) / edges.length;
    edges.forEach((_, i) => {
      const from = frontFoot.top + i * share;
      expect(edgeAt(from + 0.1, frontFoot, edges)).toBe(i);
      expect(edgeAt(from + share - 0.1, frontFoot, edges)).toBe(i);
    });
  });

  it("lends the front sheet's foot to the nearest edge, and the gap under the last to the last", () => {
    expect(edgeAt(frontFoot.top + 1, frontFoot, edges)).toBe(0);
    expect(edgeAt(end - 0.5, frontFoot, edges)).toBe(edges.length - 1);
  });

  it("means no edge above the front sheet's foot, below the gap, or with no edges", () => {
    expect(edgeAt(frontFoot.top - 1, frontFoot, edges)).toBeNull();
    expect(edgeAt(end, frontFoot, edges)).toBeNull();
    expect(edgeAt(360, frontFoot, [])).toBeNull();
  });
});
