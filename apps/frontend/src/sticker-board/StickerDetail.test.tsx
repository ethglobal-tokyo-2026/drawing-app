// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../api/apiClient";
import { ApiProvider } from "../api/ApiProvider";
import type { StickerDetail as StickerDetailResponse } from "@drawing-app/api/client";
import { gratitude, people, sticker as apiSticker, trailEntry } from "../api/testFixtures";
import { emptyApi } from "../api/testing";
import type { BoardSticker } from "./boardSticker";
import { StickerDetail } from "./StickerDetail";
import { yoursHeld } from "./testBoardSticker";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Midday, so the day reads the same in every time zone. */
const day = (d: number) => new Date(2026, 8, d, 12).getTime();

const sticker = (no: number, createdAt: number): BoardSticker => ({
  id: `s-${no}`,
  no,
  createdAt,
  arrivedAt: createdAt,
  timeUsed: 292,
  ...yoursHeld,
  width: 120,
  height: 100,
  urls: { png: `blob:${no}` },
  placement: { on: true, x: 0.5, y: 0.5, s: 0.3, r: 0, z: no },
});
const stickers = [sticker(147, day(20)), sticker(133, day(14)), sticker(117, day(9))];

let host: HTMLDivElement;
let root: Root;
const onClose = vi.fn();
const onGive = vi.fn();
const onSendGratitude = vi.fn();

const open = (
  props: Partial<ComponentProps<typeof StickerDetail>> = {},
  api: ApiClient = emptyApi(),
) =>
  act(() =>
    root.render(
      <ApiProvider client={api}>
        <StickerDetail
          stickers={stickers}
          startId="s-133"
          mode="yours"
          onClose={onClose}
          onGive={onGive}
          onSendGratitude={onSendGratitude}
          viewerId="me"
          {...props}
        />
      </ApiProvider>,
    ),
  );

/** A client whose sticker details have Transfer Trails: `trail` for s-133, empty for the rest. */
const withTrail = (trail: StickerDetailResponse["transferTrail"]) =>
  emptyApi({
    stickerDetail: (id) =>
      Promise.resolve({
        sticker: apiSticker({ id, number: 133 }),
        owner: me,
        transferTrail: id === "s-133" ? trail : [],
      }),
  });
const me = { id: "me", handle: "me", lineDisplayName: "Me", linePictureUrl: null };
const settle = () => act(async () => {});
const acts = () => document.querySelector(".sticker-detail__acts")?.textContent;
const rows = () => [...document.querySelectorAll(".transfer-trail__row")];
const openRow = () => document.querySelector(".transfer-trail__row.is-open")?.textContent;
const closedRows = () =>
  [
    ...document.querySelectorAll<HTMLButtonElement>(
      '.transfer-trail__row:not(.is-open) button[aria-expanded="false"]',
    ),
  ].filter((b) => !b.textContent?.includes("earlier"));

const heading = () => document.querySelector("h2 .sticker-detail__no")?.textContent;
const button = (name: string) =>
  [...document.querySelectorAll("button")].find(
    (b) => (b.getAttribute("aria-label") ?? b.textContent?.trim()) === name,
  );
const press = (name: string) =>
  act(() => {
    const target = button(name);
    if (!target) throw new Error(`no "${name}" button; the heading is "${heading()}"`);
    target.click();
  });
const key = (name: string) =>
  act(() => {
    document
      .querySelector('[role="dialog"]')
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
  });

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onClose.mockReset();
  onGive.mockReset();
  onSendGratitude.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("StickerDetail", () => {
  it("gives the sticker it shows, after paging by the pager, arrow keys and strip", () => {
    open();
    press("Next sticker");
    expect(heading()).toBe("No.0117");
    press("Next sticker");
    expect(heading()).toBe("No.0117");

    key("ArrowLeft");
    key("ArrowLeft");
    expect(heading()).toBe("No.0147");
    press("No.0133");
    press("Give");
    expect(onGive).toHaveBeenCalledExactlyOnceWith(stickers[1]);
  });

  it("says who received a given sticker and when, and offers no Give", () => {
    const given = stickers.map((s) =>
      s.id === "s-133"
        ? {
            ...s,
            held: false,
            givenTo: { receiver: { id: "bob", handle: "bob", name: "Bob" }, receivedAt: day(23) },
          }
        : s,
    );
    open({ mode: "given", stickers: given });
    expect(document.querySelector(".sticker-detail__meta")?.textContent).toContain(
      "You gave it to @bob · 2026.09.23",
    );
    expect(button("Give")).toBeUndefined();
  });

  it("shows a sticker on its way in place of Give", () => {
    const sent = stickers.map((s) =>
      s.id === "s-133" ? { ...s, openGift: { id: "g-133", status: "sent" as const } } : s,
    );
    open({ stickers: sent });
    expect(document.querySelector(".sticker-detail__on-its-way")?.textContent).toBe("On its way");
    expect(button("Give")).toBeUndefined();
  });

  it("leads with Send gratitude for a received sticker you haven't thanked", async () => {
    open({}, withTrail([trailEntry({ giftId: "g-1", giver: people.mika, receiver: me })]));
    await settle();
    expect(acts()).toBe("Send gratitudeGive");
    press("Send gratitude");
    expect(onSendGratitude).toHaveBeenCalledExactlyOnceWith(
      { id: "g-1" },
      stickers[1],
      expect.objectContaining({ handle: "mika" }),
    );
  });

  it("offers only Give once it's thanked, or when the last gift wasn't to you", async () => {
    const thanked = trailEntry({ giftId: "g-1", receiver: me });
    thanked.gratitude = {
      giftId: "g-1",
      method: "tap",
      hits: 12,
      total: 300,
      peakMult: 2,
      peakTier: 1,
      originalArtistGratitudeShare: 0,
      gameConfigVersion: "1",
      recordedAt: "2026-09-24T00:00:00.000Z",
      seenByGiverAt: null,
    };
    open({}, withTrail([thanked]));
    await settle();
    expect(acts()).toBe("Give");
    act(() => root.render(null));
    open({}, withTrail([trailEntry({ giftId: "g-2", giver: me, receiver: people.bob })]));
    await settle();
    expect(acts()).toBe("Give");
  });

  it("shows where it's been, the most recent thanks open with its artist's share", async () => {
    const thanked = trailEntry({
      giftId: "g-2",
      giver: people.ken,
      receiver: me,
      gratitude: gratitude({ giftId: "g-2", total: 2946, originalArtistGratitudeShare: 589 }),
    });
    // Drawn by @mika, so her share comes out of @ken's part.
    const byMika = stickers.map((s) =>
      s.id === "s-133" ? { ...s, artist: { id: people.mika.id, handle: "mika", name: "Mika" } } : s,
    );
    open(
      { stickers: byMika },
      withTrail([thanked, trailEntry({ giftId: "g-1", giver: people.mika, receiver: people.ken })]),
    );
    await settle();
    expect(rows()).toHaveLength(2);
    expect(openRow()).toContain("2,946");
    expect(openRow()).toContain("From you");
    expect(openRow()).toContain("2,357 to @ken · 589 to @mika, its artist");
  });

  it("folds the rows past the newest, and opens a tapped row in place of the open one", async () => {
    const thanks = (n: number) =>
      trailEntry({
        giftId: `g-${n}`,
        giver: people.ken,
        receiver: people.bob,
        gratitude: gratitude({ giftId: `g-${n}`, total: n * 100 }),
      });
    open({}, withTrail([5, 4, 3, 2, 1].map(thanks)));
    await settle();
    expect(rows()).toHaveLength(2);
    expect(openRow()).toContain("500");
    press("4 earlier gifts");
    expect(rows()).toHaveLength(5);
    act(() => closedRows()[0]?.click());
    expect(openRow()).toContain("400");
    expect(document.querySelectorAll(".transfer-trail__row.is-open")).toHaveLength(1);
  });

  it("asks before taking the original, and keeps the sticker on Keep", () => {
    open();
    press("Take the original");
    expect(document.querySelector(".take-the-original__title")?.textContent).toBe(
      "Take the original of No.0133?",
    );
    press("Keep the sticker");
    expect(document.querySelector(".take-the-original__title")).toBeNull();
  });

  it("offers Take the original only for a sticker you hold here", () => {
    const sent = stickers.map((s) => ({ ...s, openGift: { id: "g", status: "sent" as const } }));
    open({ stickers: sent });
    expect(button("Take the original")).toBeUndefined();
  });

  it("names the sticker's .eth from its number and artist, until the chain gives it one", () => {
    open();
    expect(document.querySelector(".sticker-detail__ens")?.textContent).toBe(
      "sticker-0133.me.sketch.eth",
    );
  });

  it("titles LINE's header with the shown sticker, and puts the title back when it closes", () => {
    document.title = "Your sticker board";
    open();
    expect(document.title).toBe("No.0133");
    press("Previous sticker");
    expect(document.title).toBe("No.0147");
    act(() => root.render(null));
    expect(document.title).toBe("Your sticker board");
  });
});
