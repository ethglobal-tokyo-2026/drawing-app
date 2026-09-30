// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as notices from "./noticedGifts";

const received = (stickerId: string, receivedAt: number) => ({ stickerId, receivedAt });

beforeEach(() => notices.forgetNoticedHere());

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("noticed gifts", () => {
  it("picks the newest received gift until it's marked, and marks the rest with it", () => {
    notices.noticeReceivesFromNow([]);
    const gifts = [received("a", 1), received("b", 3), received("c", 2)];
    expect(notices.newestUnnoticed(gifts)).toBe(gifts[1]);
    expect(notices.newestUnnoticed(gifts)).toBe(gifts[1]);
    notices.markNoticed(gifts);
    expect(notices.newestUnnoticed(gifts)).toBeNull();
  });

  it("counts what a device with no record finds as noticed, and shows only later receives", () => {
    const before = [received("a", 1), received("b", 2)];
    expect(notices.newestUnnoticed(before)).toBeNull();
    notices.noticeReceivesFromNow(before);
    expect(notices.newestUnnoticed(before)).toBeNull();
    const after = received("c", 3);
    expect(notices.newestUnnoticed([...before, after])).toBe(after);
  });

  it("starts a device's record once, so a later board's receives still show", () => {
    notices.noticeReceivesFromNow([]);
    const later = received("a", 1);
    notices.noticeReceivesFromNow([later]);
    expect(notices.newestUnnoticed([later])).toBe(later);
  });

  it("picks a gift received after the last notice", () => {
    notices.markNoticed([received("a", 1)]);
    const later = received("b", 2);
    expect(notices.newestUnnoticed([received("a", 1), later])).toBe(later);
  });

  it("remembers a notice for the session when this device can't save it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const gifts = [received("unsaved", 1)];
    notices.noticeReceivesFromNow(gifts);
    expect(notices.newestUnnoticed(gifts)).toBeNull();
    const later = received("later", 2);
    expect(notices.newestUnnoticed([...gifts, later])).toBe(later);
  });

  it("picks a sticker again when it's given again", () => {
    notices.markNoticed([received("a", 1)]);
    const again = received("a", 5);
    expect(notices.newestUnnoticed([again])).toBe(again);
  });
});
