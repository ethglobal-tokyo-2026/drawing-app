// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gift, people, sticker } from "../api/testFixtures";
import { GiftsForYouBadge, type GiftForYou } from "./GiftsForYouBadge";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const onOpen = vi.fn();

const waiting = (giver = people.mika): GiftForYou => {
  const s = sticker();
  return { gift: gift({ stickerId: s.id, giverId: giver.id }), giver, sticker: s };
};
const show = (gifts: GiftForYou[]) =>
  act(() => root.render(<GiftsForYouBadge gifts={gifts} onOpen={onOpen} />));
const badge = () => host.querySelector("button");
const count = () => host.querySelector(".gifts-for-you-badge__count")?.textContent;

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

describe("GiftsForYouBadge", () => {
  it("shows nothing with no gift waiting", () => {
    show([]);
    expect(badge()).toBeNull();
  });

  it("names the newest gift's sender, counts the rest, and opens the newest", () => {
    const newest = waiting(people.mika);
    show([newest, waiting(), waiting()]);
    expect(count()).toBe("3");
    expect(badge()?.textContent).toContain("and 2 more");
    act(() => badge()?.click());
    expect(onOpen).toHaveBeenCalledWith(newest);
  });

  it("shows no count for a single gift", () => {
    show([waiting()]);
    expect(count()).toBeUndefined();
    expect(badge()?.textContent).toContain("A gift for you");
  });
});
