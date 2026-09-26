// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { markNoticed, newestUnnoticed } from "./noticedGifts";

const received = (stickerId: string, receivedAt: number) => ({ stickerId, receivedAt });

afterEach(() => localStorage.clear());

describe("noticed gifts", () => {
  it("picks the newest received gift until it's marked, and marks the rest with it", () => {
    const gifts = [received("a", 1), received("b", 3), received("c", 2)];
    expect(newestUnnoticed(gifts)).toBe(gifts[1]);
    expect(newestUnnoticed(gifts)).toBe(gifts[1]);
    markNoticed(gifts);
    expect(newestUnnoticed(gifts)).toBeNull();
  });

  it("picks a gift received after the last notice", () => {
    markNoticed([received("a", 1)]);
    const later = received("b", 2);
    expect(newestUnnoticed([received("a", 1), later])).toBe(later);
  });

  it("picks a sticker again when it's given again", () => {
    markNoticed([received("a", 1)]);
    const again = received("a", 5);
    expect(newestUnnoticed([again])).toBe(again);
  });
});
