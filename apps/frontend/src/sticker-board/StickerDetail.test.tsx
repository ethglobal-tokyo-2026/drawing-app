// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../api/apiClient";
import { ApiProvider } from "../api/ApiProvider";
import type { Gratitude } from "../api/contract";
import { people, sticker as apiSticker } from "../api/mock/fixtures";
import { emptyApi, TEST_OWNER } from "../api/testing";
import { toPerson, toSticker } from "../api/views";
import type { BoardStickerView } from "./boardSticker";
import { StickerDetail } from "./StickerDetail";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Midday, so the day reads the same in every time zone. */
const day = (d: number) => new Date(2026, 8, d, 12).getTime();

const you = { id: "me", handle: "alice", name: "Alice" };
const sticker = (
  no: number,
  createdAt: number,
  extra: Partial<BoardStickerView> = {},
): BoardStickerView => ({
  id: `s-${no}`,
  no,
  createdAt,
  timeUsed: 292,
  width: 120,
  height: 100,
  urls: { png: `blob:${no}` },
  placement: { on: true, x: 0.5, y: 0.5, s: 0.3, r: 0, z: no },
  artist: you,
  held: true,
  givenTo: null,
  openGift: null,
  seenAt: createdAt,
  arrivedAt: createdAt,
  ...extra,
});
const stickers = [sticker(147, day(20)), sticker(133, day(14)), sticker(117, day(9))];

let host: HTMLDivElement;
let root: Root;
const onClose = vi.fn();
const onGive = vi.fn();

const open = (
  props: Partial<ComponentProps<typeof StickerDetail>> = {},
  client: ApiClient = emptyApi(),
) =>
  act(() =>
    root.render(
      <ApiProvider client={client}>
        <StickerDetail
          stickers={stickers}
          startId="s-133"
          mode="yours"
          onClose={onClose}
          onGive={onGive}
          {...props}
        />
      </ApiProvider>,
    ),
  );
/** Lets the detail's check of the Transfer Trail answer. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

/** A sticker @ken drew, received from @mika, thanked or not. */
function received(gratitude: Gratitude | null) {
  const drawn = apiSticker({ id: "s-133", artist: people.ken, ownerId: TEST_OWNER.id });
  const entry = {
    giftId: "gift-133",
    giver: people.mika,
    receiver: TEST_OWNER,
    receivedAt: "2026-09-23T12:00:00.000Z",
    gratitude,
  };
  const client = emptyApi({
    stickerDetail: () =>
      Promise.resolve({ sticker: drawn, owner: TEST_OWNER, transferTrail: [entry] }),
  });
  return { drawn, client };
}
const giveIsTheKey = () => button("Give")?.classList.contains("key");

const heading = () => document.querySelector("h2")?.textContent;
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

  it("says who received a given sticker, and when, and offers no Give", () => {
    const receiver = { id: "artist-bob", handle: "bob", name: "Bob Tanaka" };
    const given = sticker(133, day(14), {
      held: false,
      givenTo: { receiver, receivedAt: day(23) },
    });
    open({ mode: "given", stickers: [given] });
    expect(document.querySelector(".sticker-detail__meta")?.textContent).toContain(
      "You gave it to @bob · 9.23",
    );
    expect(button("Give")).toBeUndefined();
  });

  it("shows a sent sticker on its way in place of Give, and gives a packed one", () => {
    const sent = sticker(133, day(14), { openGift: { id: "g-133", status: "sent" } });
    open({ stickers: [sent] });
    expect(document.querySelector(".sticker-detail__acts")?.textContent).toBe("On its way");
    expect(button("Give")).toBeUndefined();

    const packed = sticker(133, day(14), { openGift: { id: "g-133", status: "packed" } });
    open({ stickers: [packed] });
    press("Give");
    expect(onGive).toHaveBeenCalledExactlyOnceWith(packed);
  });

  it("offers Send gratitude over Give for a received sticker you haven't thanked", async () => {
    const onSendGratitude = vi.fn();
    const { drawn, client } = received(null);
    open({ onSendGratitude }, client);
    await settle();
    expect(giveIsTheKey()).toBe(false);
    press("Send gratitude");
    expect(onSendGratitude).toHaveBeenCalledExactlyOnceWith(
      { id: "gift-133" },
      toSticker(drawn),
      toPerson(people.mika),
    );
  });

  it("keeps Give as the key once you've thanked", async () => {
    const thanked: Gratitude = {
      giftId: "gift-133",
      method: "tap",
      hits: 64,
      total: 320,
      peakMult: 3,
      peakTier: 2,
      originalArtistGratitudeShare: 64,
      gameConfigVersion: "v1",
      recordedAt: "2026-09-23T12:05:00.000Z",
      seenByGiverAt: null,
    };
    open({ onSendGratitude: vi.fn() }, received(thanked).client);
    await settle();
    expect(button("Send gratitude")).toBeUndefined();
    expect(giveIsTheKey()).toBe(true);
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
