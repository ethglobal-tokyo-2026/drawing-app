// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../api/apiClient";
import { ApiProvider } from "../api/ApiProvider";
import type {
  Gratitude,
  RecordGratitude,
  StickerDetail as StickerDetailResponse,
} from "@drawing-app/api/client";
import {
  gratitude as gratitudeFixture,
  people,
  sticker as apiSticker,
  trailEntry,
} from "../api/testFixtures";
import { emptyApi, gratitudeOf, recordGratitudeBody, TEST_OWNER } from "../api/testing";
import { toPerson, toSticker } from "../api/views";
import { resendPendingGratitude, sendGratitude } from "../gratitude/gratitudeOutbox";
import type { BoardStickerView } from "./boardSticker";
import { StickerDetail } from "./StickerDetail";
import { fakeTimelapsePlayers, TEST_TIMELAPSE } from "./timelapse/testTimelapse";
import type { CreateTimelapsePlayer } from "./timelapse/useTimelapse";

// The timelapse's player paints on a 2D canvas, which happy-dom lacks, so a fake plays instead.
const timelapsePlayer = vi.hoisted(() => ({ create: vi.fn<CreateTimelapsePlayer>() }));
vi.mock("./timelapse/timelapsePlayer", () => ({ createTimelapsePlayer: timelapsePlayer.create }));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Midday, so the day reads the same in every time zone. */
const day = (d: number) => new Date(2026, 8, d, 12).getTime();

const you = { id: "me", handle: "alice", name: "Alice", ageStatus: "adult" as const };
const sticker = (
  no: number,
  createdAt: number,
  extra: Partial<BoardStickerView> = {},
): BoardStickerView => ({
  id: `s-${no}`,
  no,
  createdAt,
  arrivedAt: createdAt,
  timeUsed: 292,
  width: 120,
  height: 100,
  nsfw: false,
  urls: { png: `blob:${no}` },
  placement: { on: true, x: 0.5, y: 0.5, s: 0.3, r: 0, z: no },
  artist: you,
  held: true,
  givenTo: null,
  openGift: null,
  seenAt: createdAt,
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

/** A sticker @ken drew, received from @mika, with or without gratitude. */
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
      Promise.resolve({
        sticker: drawn,
        owner: TEST_OWNER,
        transferTrail: [entry],
        hasTimelapse: false,
      }),
  });
  return { drawn, client };
}
const giveIsTheKey = () => button("Give")?.classList.contains("key");

const me = { ...TEST_OWNER, handle: "me", lineDisplayName: "Me" };
/** A client whose sticker details have Transfer Trails: `trail` for s-133, empty for the rest. */
const withTrail = (trail: StickerDetailResponse["transferTrail"]) =>
  emptyApi({
    stickerDetail: (id) =>
      Promise.resolve({
        sticker: apiSticker({ id, number: 133 }),
        owner: me,
        transferTrail: id === "s-133" ? trail : [],
        hasTimelapse: false,
      }),
  });
const rows = () => [...document.querySelectorAll(".transfer-trail__row")];
const openRow = () => document.querySelector(".transfer-trail__row.is-open")?.textContent;
const closedRows = () =>
  [
    ...document.querySelectorAll<HTMLButtonElement>(
      '.transfer-trail__row:not(.is-open) button[aria-expanded="false"]',
    ),
  ].filter((b) => !b.textContent?.includes("earlier"));

const heading = () => document.querySelector("h2 .sticker-detail__no")?.textContent;
/** Whether keyboard focus is in the detail, which hears its keys. */
const focusInDetail = () =>
  document.querySelector('[role="dialog"]')?.contains(document.activeElement) === true;
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
  localStorage.clear();
  vi.restoreAllMocks();
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
    const receiver = {
      id: "artist-bob",
      handle: "bob",
      name: "Bob Tanaka",
      ageStatus: "adult" as const,
    };
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

  it("offers Send gratitude over Give for a received sticker with no gratitude yet", async () => {
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

  it("treats gratitude waiting on this phone as sent, and reads the trail again once the server has it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const giftId = "gift-133";
    let recorded: Gratitude | null = null;
    const { drawn } = received(null);
    const stickerDetail = vi.fn(() =>
      Promise.resolve({
        sticker: drawn,
        owner: TEST_OWNER,
        transferTrail: [
          {
            giftId,
            giver: people.mika,
            receiver: TEST_OWNER,
            receivedAt: "2026-09-23T12:00:00.000Z",
            gratitude: recorded,
          },
        ],
        hasTimelapse: false,
      }),
    );
    // Played, and kept for want of a connection.
    const offline = { recordGratitude: () => Promise.reject(new TypeError("Failed to fetch")) };
    await sendGratitude(offline, TEST_OWNER.id, recordGratitudeBody({ giftId }));

    open({ onSendGratitude: vi.fn() }, emptyApi({ stickerDetail }));
    await settle();
    expect(button("Send gratitude")).toBeUndefined();

    // Back online, the server records it, and the trail shows it.
    const online = {
      recordGratitude: (body: RecordGratitude) => {
        recorded = gratitudeOf(body);
        return Promise.resolve(recorded);
      },
    };
    await act(() => resendPendingGratitude(online, TEST_OWNER.id));
    await settle();
    expect(stickerDetail).toHaveBeenCalledTimes(2);
    expect(button("Send gratitude")).toBeUndefined();
  });

  it("keeps Give as the key once gratitude is sent", async () => {
    const sent: Gratitude = {
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
    open({ onSendGratitude: vi.fn() }, received(sent).client);
    await settle();
    expect(button("Send gratitude")).toBeUndefined();
    expect(giveIsTheKey()).toBe(true);
  });

  it("shows where it's been, the most recent gratitude open with its artist's share", async () => {
    const withGratitude = trailEntry({
      giftId: "g-2",
      giver: people.ken,
      receiver: me,
      gratitude: gratitudeFixture({
        giftId: "g-2",
        total: 2946,
        originalArtistGratitudeShare: 589,
      }),
    });
    // Drawn by @mika, so the artist's share comes out of @ken's part.
    const byMika = stickers.map((s) =>
      s.id === "s-133"
        ? {
            ...s,
            artist: {
              id: people.mika.id,
              handle: "mika",
              name: "Mika",
              ageStatus: "adult" as const,
            },
          }
        : s,
    );
    open(
      { stickers: byMika, ownerId: "me" },
      withTrail([
        withGratitude,
        trailEntry({ giftId: "g-1", giver: people.mika, receiver: people.ken }),
      ]),
    );
    await settle();
    expect(rows()).toHaveLength(2);
    expect(openRow()).toContain("2,946");
    expect(openRow()).toContain("From you");
    expect(openRow()).toContain("2,357 to @ken · 589 to @mika, its artist");
  });

  it("folds the rows past the newest, and opens a tapped row in place of the open one", async () => {
    const given = (n: number) =>
      trailEntry({
        giftId: `g-${n}`,
        giver: people.ken,
        receiver: people.bob,
        gratitude: gratitudeFixture({ giftId: `g-${n}`, total: n * 100 }),
      });
    open({ ownerId: "me" }, withTrail([5, 4, 3, 2, 1].map(given)));
    await settle();
    expect(rows()).toHaveLength(2);
    expect(openRow()).toContain("500");
    press("4 earlier gifts");
    expect(rows()).toHaveLength(5);
    act(() => closedRows()[0]?.click());
    expect(openRow()).toContain("400");
    expect(document.querySelectorAll(".transfer-trail__row.is-open")).toHaveLength(1);
  });

  it("links the sticker's name under croquis.eth to the ENS app once it's onchain", () => {
    const named = sticker(133, day(14), { ensName: "0133.alice.croquis.eth" });
    open({ stickers: [named] });
    const link = document.querySelector<HTMLAnchorElement>(".sticker-detail__ens a");
    expect(link?.textContent).toBe("0133.alice.croquis.eth");
    expect(link?.href).toBe("https://sepolia.app.ens.domains/0133.alice.croquis.eth");

    open({ stickers: [sticker(133, day(14))] });
    expect(document.querySelector(".sticker-detail__ens")).toBeNull();
  });

  it("keeps focus in the detail when Try again goes as it checks the sticker again", async () => {
    open();
    await settle();
    const tryAgain = document.querySelector<HTMLButtonElement>(
      ".sticker-detail__check-failed button",
    );
    act(() => tryAgain?.focus());
    expect(document.activeElement).toBe(tryAgain);
    act(() => tryAgain?.click());
    expect(document.querySelector(".sticker-detail__check-failed")).toBeNull();
    expect(focusInDetail()).toBe(true);
  });

  describe("its timelapse", () => {
    let players: ReturnType<typeof fakeTimelapsePlayers>;
    beforeEach(() => {
      players = fakeTimelapsePlayers();
      timelapsePlayer.create.mockImplementation(players.create);
    });

    /** The stickers with their masks; only No.0133 was sealed with its timelapse. */
    const masked = stickers.map((s) => ({ ...s, urls: { ...s.urls, mask: `blob:${s.no}-mask` } }));
    const withTimelapse = () =>
      emptyApi({
        stickerDetail: (id) =>
          Promise.resolve({
            sticker: apiSticker({ id }),
            owner: me,
            transferTrail: [],
            hasTimelapse: id === "s-133",
          }),
        timelapse: () => Promise.resolve(TEST_TIMELAPSE),
      });
    const timelapseButton = () => document.querySelector<HTMLButtonElement>(".timelapse-button");
    const layer = () => document.querySelector(".timelapse-layer");

    /** Opens No.0133 and plays its timelapse. */
    async function playing() {
      open({ stickers: masked }, withTimelapse());
      await settle();
      act(() => timelapseButton()?.click());
      await settle();
      players.last().prepared.resolve();
      await settle();
      expect(layer()).not.toBeNull();
      return players.last();
    }

    it.each(["yours", "given"] as const)(
      "offers Timelapse in %s mode, only for a sticker sealed with one",
      async (mode) => {
        open({ mode, stickers: masked }, withTimelapse());
        await settle();
        expect(timelapseButton()).not.toBeNull();
        press("Next sticker");
        await settle();
        expect(heading()).toBe("No.0117");
        expect(timelapseButton()).toBeNull();
      },
    );

    it.each([
      ["paging", () => press("Next sticker")],
      ["the Sticker board button", () => press("Sticker board")],
      ["Escape", () => key("Escape")],
    ])("stops on %s, lets go of its canvas, and leaves no layer behind", async (_, leave) => {
      const player = await playing();
      leave();
      expect(player.calls).toContain("stop");
      const { canvas } = player.options;
      expect([canvas.width, canvas.height]).toEqual([0, 0]);
      expect(layer()).toBeNull();
    });

    it("keeps focus in the dialog when paging from Timelapse takes the button away", async () => {
      open({ stickers: masked }, withTimelapse());
      await settle();
      act(() => timelapseButton()?.focus());
      expect(document.activeElement).toBe(timelapseButton());
      key("ArrowRight");
      expect(heading()).toBe("No.0117");
      expect(timelapseButton()).toBeNull();
      expect(focusInDetail()).toBe(true);
    });

    it("stops when Back closes the detail", async () => {
      const player = await playing();
      await act(async () => {
        history.back();
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(player.calls).toContain("stop");
      expect(layer()).toBeNull();
    });
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
