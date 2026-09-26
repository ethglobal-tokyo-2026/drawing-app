// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { nextToNotice } from "./noticedGifts";

const received = (stickerId: string, receivedAt: number) => ({ stickerId, receivedAt });

afterEach(() => localStorage.clear());

describe("nextToNotice", () => {
  it("shows the newest received gift once, and marks the rest as noticed with it", () => {
    const gifts = [received("a", 1), received("b", 3), received("c", 2)];
    expect(nextToNotice(gifts)).toBe(gifts[1]);
    expect(nextToNotice(gifts)).toBeNull();
  });

  it("shows a gift received after the last notice", () => {
    nextToNotice([received("a", 1)]);
    const later = received("b", 2);
    expect(nextToNotice([received("a", 1), later])).toBe(later);
  });

  it("shows a sticker's notice again when it's given again", () => {
    nextToNotice([received("a", 1)]);
    const again = received("a", 5);
    expect(nextToNotice([again])).toBe(again);
  });
});
