// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { markNoticed, newestUnnoticed } from "./noticedGifts";

const received = (stickerId: string, receivedAt: number) => ({ stickerId, receivedAt });

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

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

  it("remembers a notice for the session when this device can't save it", () => {
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const gifts = [received("unsaved", 1)];
    markNoticed(gifts);
    expect(newestUnnoticed(gifts)).toBeNull();
  });

  it("picks a sticker again when it's given again", () => {
    markNoticed([received("a", 1)]);
    const again = received("a", 5);
    expect(newestUnnoticed([again])).toBe(again);
  });
});
