// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gift, people, sticker } from "../api/testFixtures";
import { formatHandle } from "../stickers/format";
import { inLanguage } from "../ui/testing";
import { GiftsForYouBadge, type GiftForYou } from "./GiftsForYouBadge";

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
const title = () => host.querySelector(".gifts-for-you-badge__title")?.textContent;
const from = () => host.querySelector(".gifts-for-you-badge__from")?.textContent;

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

  it("counts them on its badge alone, names the newest gift's sender, and opens the newest", () => {
    const newest = waiting(people.mika);
    show([newest, waiting(people.ken), waiting(people.bob)]);
    expect(count()).toBe("3");
    expect(title()).not.toContain(count());
    expect(from()).toBe(`from ${formatHandle(people.mika.handle ?? "")}`);
    act(() => badge()?.click());
    expect(onOpen).toHaveBeenCalledWith(newest);
  });

  it("shows no count for a single gift", () => {
    show([waiting()]);
    expect(count()).toBeUndefined();
    expect(badge()?.textContent).toContain("A gift for you");
  });

  it.each([
    ["en", 1, "An 18+ gift for you from @mika. Open it"],
    ["en", 3, "3 gifts for you. Open the newest, an 18+ gift from @mika"],
    ["ja", 1, "ギフトが1件。@mikaさんからの最新の18+ギフトをひらく"],
    ["ja", 3, "ギフトが3件。@mikaさんからの最新の18+ギフトをひらく"],
  ] as const)(
    "names the newest gift's 18+ warning in %s with %i waiting",
    async (language, count, name) => {
      await inLanguage(language);
      const newest = waiting();
      newest.sticker = { ...newest.sticker, nsfw: true };
      show([newest, ...Array.from({ length: count - 1 }, () => waiting(people.ken))]);
      expect(badge()?.getAttribute("aria-label")).toBe(name);
      expect(host.querySelector(".gifts-for-you-badge__nsfw")?.textContent).toBe("18+");
    },
  );

  it("warns about the gift it opens, not an older 18+ gift", () => {
    const older = waiting(people.ken);
    older.sticker = { ...older.sticker, nsfw: true };
    show([waiting(), older]);
    expect(badge()?.getAttribute("aria-label")).toBe(
      "2 gifts for you. Open the newest, from @mika",
    );
    expect(host.querySelector(".gifts-for-you-badge__nsfw")).toBeNull();
  });
});
