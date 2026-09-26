// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { people, sticker } from "../api/testFixtures";
import { toPerson, toSticker, type PersonView } from "../api/views";
import { PendingGiftsNotificationBadge, type PendingGift } from "./PendingGiftsNotificationBadge";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const onOpen = vi.fn();

const gift = (no: number, to?: PersonView): PendingGift => ({
  giftId: `g-${no}`,
  sticker: toSticker(sticker({ id: `s-${no}`, number: no })),
  ...(to && { to }),
});
const show = (gifts: PendingGift[]) =>
  act(() => root.render(<PendingGiftsNotificationBadge gifts={gifts} onOpen={onOpen} />));
const badge = () => host.querySelector("button");
const texts = () =>
  [...host.querySelectorAll(".pending-gifts-badge__text > span")].map((s) => s.textContent);

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onOpen.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("PendingGiftsNotificationBadge", () => {
  it("shows a gift on its way by its number, and opens it", () => {
    show([gift(147)]);
    expect(texts()).toEqual(["On its way", "No.0147"]);
    expect(badge()?.getAttribute("aria-label")).toBe("Gifts on their way: No.0147");
    act(() => badge()?.click());
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("s-147");
  });

  it("names who a gift given in the app went to", () => {
    show([gift(147, toPerson(people.mika))]);
    expect(texts()).toEqual(["On its way", "to @mika"]);
    expect(badge()?.getAttribute("aria-label")).toBe("Gifts on their way: No.0147 to @mika");
  });

  it("counts several, and opens the newest", () => {
    show([gift(147), gift(133), gift(117)]);
    expect(texts()).toEqual(["On their way", "No.0147 and 2 more"]);
    expect(badge()?.getAttribute("aria-label")).toBe("3 gifts on their way");
    expect(host.querySelectorAll(".pending-gifts-badge__sleeve")).toHaveLength(2);
    act(() => badge()?.click());
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("s-147");
  });

  it("shows nothing while no gift is on its way", () => {
    show([]);
    expect(badge()).toBeNull();
  });
});
