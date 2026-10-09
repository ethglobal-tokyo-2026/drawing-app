// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { ApiProvider } from "../api/ApiProvider";
import type {
  Gratitude,
  Me,
  RecordGratitude,
  StickerDetail as StickerDetailResponse,
} from "@drawing-app/api/client";
import { MeContext } from "../api/meContext";
import {
  gift,
  gratitude as gratitudeFixture,
  people,
  sticker as apiSticker,
  TEST_KYOTO_SEIKA_SUBJECTS,
  trailEntry,
} from "../api/testFixtures";
import { emptyApi, gratitudeOf, recordGratitudeBody, TEST_ME, TEST_OWNER } from "../api/testing";
import { toPerson, toSticker } from "../api/views";
import { resendPendingGratitude, sendGratitude } from "../gratitude/gratitudeOutbox";
import { errorDetail, errorMessage } from "../i18n/errorMessage";
import { i18next } from "../i18n/i18n";
import { strings } from "../i18n/strings";
import { kyotoSeika } from "../i18n/strings/kyotoSeika";
import { withoutNsfwDrawings } from "../stickers/nsfw";
import { testStickerUrls } from "../stickers/testStickerUrls";
import type { BoardStickerView } from "./boardSticker";
import { keepBoard, keptBoardFor } from "./lastBoard";
import { StickerDetail } from "./StickerDetail";
import { preloadStickerDetails } from "./stickerDetailQuery";
import { onMyStickerBoardChanged } from "./useMyStickerBoard";
import { fakeTimelapsePlayers, TEST_TIMELAPSE } from "./timelapse/testTimelapse";
import type { CreateTimelapsePlayer } from "./timelapse/useTimelapse";

// The timelapse's player paints on a 2D canvas, which happy-dom lacks, so a fake plays instead.
const timelapsePlayer = vi.hoisted(() => ({ create: vi.fn<CreateTimelapsePlayer>() }));
vi.mock("./timelapse/timelapsePlayer", () => ({ createTimelapsePlayer: timelapsePlayer.create }));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Midday in Tokyo, where the app's days turn over, so the day reads the same in any machine's time zone. */
const day = (d: number) => Date.UTC(2026, 8, d, 3);

const you = { id: "me", handle: "alice", name: "Alice", nsfwOptIn: false };
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
  kyotoSeikaSubjects: null,
  urls: testStickerUrls(`blob:${no}`),
  placement: { on: true, x: 0.5, y: 0.5, s: 0.3, r: 0, z: no },
  placements: { phone: { on: true, x: 0.5, y: 0.5, s: 0.3, r: 0, z: no }, large: null },
  artist: you,
  held: true,
  hasTimelapse: false,
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
  me: Me | null = null,
) =>
  act(() =>
    root.render(
      <ApiProvider client={client}>
        <MeContext value={me}>
          <StickerDetail
            stickers={stickers}
            startId="s-133"
            mode="yours"
            onClose={onClose}
            onGive={onGive}
            {...props}
          />
        </MeContext>
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
      }),
  });
  return { drawn, client };
}
const giveIsTheKey = () => button("Give")?.classList.contains("key");

/**
 * A server whose Transfer Trail read answers only when told, with the gratitude it held as that read
 * went out, so a test sees the detail while a read is going and what a read from before a record
 * says. `server` is what takes a combo: once it has, the reads that go out after hold its gratitude.
 */
function heldReads() {
  const giftId = "gift-133";
  const drawn = apiSticker({ id: "s-133", artist: people.ken, ownerId: TEST_OWNER.id });
  let recorded: Gratitude | null = null;
  const answers: (() => void)[] = [];
  const stickerDetail = vi.fn(
    () =>
      new Promise<StickerDetailResponse>((resolve) => {
        const seen = recorded;
        answers.push(() =>
          resolve({
            sticker: drawn,
            owner: TEST_OWNER,
            transferTrail: [
              {
                giftId,
                giver: people.mika,
                receiver: TEST_OWNER,
                receivedAt: "2026-09-23T12:00:00.000Z",
                gratitude: seen,
              },
            ],
          }),
        );
      }),
  );
  return {
    giftId,
    client: emptyApi({ stickerDetail }),
    server: {
      recordGratitude: (body: RecordGratitude) => {
        recorded = gratitudeOf(body);
        return Promise.resolve(recorded);
      },
    },
    /** Answers the `n`th read, from zero. */
    answer: (n: number) => answers[n]?.(),
  };
}

const me = { ...TEST_OWNER, handle: "me", lineDisplayName: "Me" };
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
      nsfwOptIn: false,
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

  describe("a gift in flight", () => {
    const inFlight = (no: number, status: "packed" | "sent", to?: string) =>
      sticker(no, day(14), { openGift: { id: `g-${no}`, status, ...(to && { to }) } });
    /** The detail of `s`, opened by its owner, whose take-outs go to `startTakeOut`. */
    const openInFlight = (s: BoardStickerView, startTakeOut?: ApiClient["startTakeOut"]) =>
      open(
        { stickers: [s], startId: s.id, ownerId: you.id },
        emptyApi(startTakeOut && { startTakeOut }),
      );
    const takeOut = () => i18next.t(($) => $.giving.inTheBag.takeOut);
    const note = () => document.querySelector(".sticker-detail__on-its-way")?.textContent;
    const alert = () => document.querySelector(".sticker-detail__take-out-failed")?.textContent;
    const landsOut = (giftId: string) =>
      Promise.resolve({ gift: gift({ id: giftId, status: "taken_out" }) });

    it("says its state only, Take it out under it, and keeps Give the key while it's in the bag", () => {
      openInFlight(inFlight(133, "sent", "bob"));
      expect(note()).toBe(i18next.t(($) => $.stickerBoard.detail.onItsWayTo, { receiver: "@bob" }));
      expect(button("Give")).toBeUndefined();
      expect(button(takeOut())).toBeDefined();
      openInFlight(inFlight(133, "sent"));
      expect(note()).toBe(i18next.t(($) => $.stickerBoard.detail.onItsWay));
      const packed = inFlight(133, "packed");
      openInFlight(packed);
      expect(note()).toBe(i18next.t(($) => $.giving.inTheBag.title));
      expect(button(takeOut())).toBeDefined();
      press("Give");
      expect(onGive).toHaveBeenCalledExactlyOnceWith(packed);
    });

    it("takes a gift in the bag out at once, and a sent one only once its confirm says so", async () => {
      const startTakeOut = vi.fn<ApiClient["startTakeOut"]>(landsOut);
      openInFlight(inFlight(133, "packed"), startTakeOut);
      press(takeOut());
      await settle();
      expect(startTakeOut).toHaveBeenCalledExactlyOnceWith("g-133");

      openInFlight(inFlight(147, "sent"), startTakeOut);
      press(takeOut());
      expect(startTakeOut).toHaveBeenCalledOnce();
      // Cancel takes focus first, so Enter alone never takes it back.
      expect(document.activeElement?.textContent).toBe(
        i18next.t(($) => $.stickerBoard.detail.takeOut.cancel),
      );
      press(takeOut());
      await settle();
      expect(startTakeOut).toHaveBeenLastCalledWith("g-147");
    });

    it("goes on once the detail closes, and says why it failed there until tried again", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const refusal = new ApiError(503, { error: "take_out_not_landed", detail: "Not landed yet" });
      let refuse: (error: unknown) => void = () => {};
      const startTakeOut = vi
        .fn<ApiClient["startTakeOut"]>()
        .mockImplementationOnce(
          () =>
            new Promise((_, reject) => {
              refuse = reject;
            }),
        )
        .mockImplementationOnce(landsOut);
      const packed = inFlight(117, "packed");
      openInFlight(packed, startTakeOut);
      press(takeOut());
      act(() => root.render(null));
      refuse(refusal);
      await settle();
      openInFlight(packed, startTakeOut);
      expect(alert()).toContain(
        i18next.t(($) => $.giving.inTheBag.couldntTakeOut, {
          no: "No.0117",
          reason: errorMessage(refusal),
        }),
      );
      press("Try again");
      await settle();
      expect(startTakeOut).toHaveBeenCalledTimes(2);
      expect(alert()).toBeUndefined();
    });

    it("puts Give back with focus once it's out, and says the sticker is back on the board", async () => {
      openInFlight(inFlight(133, "packed"), landsOut);
      press(takeOut());
      await settle();
      expect(document.activeElement?.textContent).toBe("Give");
      expect(document.querySelector(".sticker-detail__taken-out")?.textContent).toBe(
        i18next.t(($) => $.stickerBoard.detail.takeOut.backOnBoard, { no: "No.0133" }),
      );
    });
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
    const reads = heldReads();
    // Played, and kept for want of a connection.
    const offline = { recordGratitude: () => Promise.reject(new TypeError("Failed to fetch")) };
    await sendGratitude(offline, TEST_OWNER.id, recordGratitudeBody({ giftId: reads.giftId }));

    open({ onSendGratitude: vi.fn() }, reads.client);
    reads.answer(0);
    await settle();
    expect(button("Send gratitude")).toBeUndefined();

    // Back online, the server records it, and the trail is read again. What was read before, which
    // has no gratitude, never brings Send gratitude back while it is.
    await act(() => resendPendingGratitude(reads.server, TEST_OWNER.id));
    expect(reads.client.stickerDetail).toHaveBeenCalledTimes(2);
    expect(button("Send gratitude")).toBeUndefined();
    reads.answer(1);
    await settle();
    expect(button("Send gratitude")).toBeUndefined();
  });

  it("reads the trail again once its first read lands, when gratitude was recorded while that read was going out", async () => {
    const reads = heldReads();
    open({ onSendGratitude: vi.fn() }, reads.client);
    // The first read is out and unanswered when the server records a combo this phone sent.
    const body = recordGratitudeBody({ giftId: reads.giftId });
    await act(() => sendGratitude(reads.server, TEST_OWNER.id, body));
    // That read went out before the record, so it holds no gratitude, and can't bring Send gratitude back.
    reads.answer(0);
    await settle();
    expect(button("Send gratitude")).toBeUndefined();
    expect(reads.client.stickerDetail).toHaveBeenCalledTimes(2);
    reads.answer(1);
    await settle();
    expect(button("Send gratitude")).toBeUndefined();
    expect(giveIsTheKey()).toBe(true);
  });

  it("says why the server refused gratitude this phone sent, with its words as details, until it's dismissed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const refusal = new ApiError(409, {
      error: "gratitude_already_recorded",
      detail: "gift-133 has it",
    });
    const refused = () => document.querySelector(".sticker-detail__gratitude-refused");
    /** The page goes and the app opens again on the same detail. */
    const reopen = async () => {
      act(() => root.unmount());
      root = createRoot(host);
      open({ onSendGratitude: vi.fn() }, received(null).client);
      await settle();
    };
    open({ onSendGratitude: vi.fn() }, received(null).client);
    await settle();
    expect(refused()).toBeNull();

    // Kept for want of a connection, then refused as the phone comes back online, with the detail up.
    const offline = { recordGratitude: () => Promise.reject(new TypeError("Failed to fetch")) };
    await sendGratitude(offline, TEST_OWNER.id, recordGratitudeBody({ giftId: "gift-133" }));
    await act(() =>
      resendPendingGratitude({ recordGratitude: () => Promise.reject(refusal) }, TEST_OWNER.id),
    );
    await settle();
    expect(refused()?.querySelector('[role="alert"]')?.textContent).toContain("already with @mika");
    expect(refused()?.textContent).toContain(errorDetail(refusal));

    // It stays until dismissed, across opens.
    await reopen();
    expect(refused()).not.toBeNull();
    press("Dismiss");
    expect(refused()).toBeNull();
    await reopen();
    expect(refused()).toBeNull();
  });

  it("says the check failed where the key would be, and Try again asks again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const stickerDetail = vi.fn<ApiClient["stickerDetail"]>(() =>
      Promise.reject(new ApiError(503, { error: "unavailable", detail: "database is busy" })),
    );
    open({ onSendGratitude: vi.fn() }, emptyApi({ stickerDetail }));
    await settle();
    const note = document.querySelector(".sticker-detail__check-failed");
    expect(note?.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn’t load where it’s been",
    );
    // The server's own words are fine print, apart from the sentence.
    expect(note?.textContent).toContain("database is busy");
    // Ahead of Give, since without the check the call to send gratitude can't show.
    const acts = document.querySelector(".sticker-detail__acts");
    if (!note || !acts) throw new Error("The detail shows no failure line or no Give");
    expect(note.compareDocumentPosition(acts)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    const calls = stickerDetail.mock.calls.length;
    press("Try again");
    expect(stickerDetail.mock.calls.length).toBeGreaterThan(calls);
  });

  it("names someone else's artist on a line of its own, outside the fine print", () => {
    const artist = {
      id: "artist-mika",
      handle: "Mika_draws_every_day_in_tokyo_32",
      name: "Mika",
      nsfwOptIn: false,
    };
    open({ ownerId: TEST_OWNER.id, stickers: [sticker(133, day(14), { artist })] });
    const chip = document.querySelector(".sticker-detail__artist .artist-chip");
    expect(chip?.textContent).toContain("@Mika_draws_every_day_in_tokyo_32");
    expect(chip?.closest(".fine")).toBeNull();
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

  describe("beside Timelapse", () => {
    const openOn = (shown: BoardStickerView) => open({ stickers: [shown], startId: shown.id });
    const tag = () => host.querySelector(".kyoto-seika-tag");

    it("tags a sticker drawn in Kyoto Seika Practice Mode, with its pair and their readings", async () => {
      openOn(sticker(150, day(20), { kyotoSeikaSubjects: TEST_KYOTO_SEIKA_SUBJECTS }));
      const [first, second] = TEST_KYOTO_SEIKA_SUBJECTS;
      expect(tag()?.textContent).toContain(kyotoSeika.tag.label.en);
      expect([...(tag()?.querySelectorAll("rt") ?? [])].map((rt) => rt.textContent)).toEqual([
        first.reading,
        second.reading,
      ]);
      // The pair shows only in Japanese: in English, screen readers hear each word's English too.
      const spoken = () => tag()?.querySelector(".visually-hidden")?.textContent;
      expect(spoken()).toContain(`${first.ja}, ${first.en}, and ${second.ja}, ${second.en}`);
      await act(async () => {
        await i18next.changeLanguage("ja");
      });
      onTestFinished(async () => {
        await i18next.changeLanguage("en");
      });
      expect(spoken()).toBe(
        kyotoSeika.tag.spoken.ja.replace("{{first}}", first.ja).replace("{{second}}", second.ja),
      );
    });

    it("tags no other sticker", () => {
      openOn(sticker(151, day(20)));
      expect(tag()).toBeNull();
    });
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
              nsfwOptIn: false,
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

  it("opens on a detail read ahead with its Transfer Trail in, asking the server nothing more", async () => {
    const stickerDetail = vi.fn((id: string) =>
      Promise.resolve({
        sticker: apiSticker({ id, number: 133 }),
        owner: me,
        transferTrail: [trailEntry({ giftId: "gift-133", giver: me, receiver: people.mika })],
      }),
    );
    const client = emptyApi({ stickerDetail });
    preloadStickerDetails(client, ["s-133"]);
    await settle();
    open({ ownerId: me.id }, client);
    expect(rows()).toHaveLength(1);
    await settle();
    expect(stickerDetail).toHaveBeenCalledTimes(1);
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

    /** Only No.0133 was sealed with its timelapse, as the board lists it. */
    const timelapsed = stickers.map((s) => ({ ...s, hasTimelapse: s.id === "s-133" }));
    const withTimelapse = () =>
      emptyApi({
        stickerDetail: (id) =>
          Promise.resolve({ sticker: apiSticker({ id }), owner: me, transferTrail: [] }),
        timelapse: () => Promise.resolve(TEST_TIMELAPSE),
      });
    const timelapseButton = () => document.querySelector<HTMLButtonElement>(".timelapse-button");
    const layer = () => document.querySelector(".timelapse-layer");

    /** Opens No.0133 and plays its timelapse. */
    async function playing() {
      open({ stickers: timelapsed }, withTimelapse());
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
        open({ mode, stickers: timelapsed }, withTimelapse());
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
      ["the back button", () => press("Back to My board")],
      ["Escape", () => key("Escape")],
    ])("stops on %s, lets go of its canvas, and leaves no layer behind", async (_, leave) => {
      const player = await playing();
      leave();
      expect(player.calls).toContain("stop");
      const { canvas } = player.options;
      expect([canvas.width, canvas.height]).toEqual([0, 0]);
      expect(layer()).toBeNull();
    });

    it("shows Timelapse and the Kyoto Seika pair from the board's sticker before its detail is read", () => {
      const drawn = { ...timelapsed[1], kyotoSeikaSubjects: TEST_KYOTO_SEIKA_SUBJECTS };
      open(
        { stickers: [drawn], startId: drawn.id },
        emptyApi({ stickerDetail: () => new Promise(() => {}) }),
      );
      expect(timelapseButton()).not.toBeNull();
      expect(document.querySelector(".kyoto-seika-tag .subject-pair")).not.toBeNull();
    });

    it("keeps focus in the dialog when paging from Timelapse takes the button away", async () => {
      open({ stickers: timelapsed }, withTimelapse());
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

  describe("Mark 18+", () => {
    const words = strings.stickerBoard.detail.markNsfw;
    /** The marked sticker as the server answers it to you without the NSFW opt-in: veiled. */
    const answer = {
      sticker: apiSticker({ id: "s-133", number: 133, nsfw: true, artist: TEST_OWNER }),
      cdnPurged: true,
    };
    /** Opens the detail on `shown`, as you on your board, with `markStickerNsfw` as the server's. */
    const openOn = (
      markStickerNsfw: ApiClient["markStickerNsfw"],
      shown: BoardStickerView = sticker(133, day(14)),
      me?: Me,
    ) =>
      open(
        { ownerId: TEST_OWNER.id, stickers: [shown], startId: shown.id },
        emptyApi({ markStickerNsfw }),
        me,
      );
    const confirm = () => document.querySelector(".sticker-detail__mark-ask");
    const figure = () => document.querySelector(".sticker-detail__slide .sticker-figure");
    const status = () => document.querySelector('[role="status"]')?.textContent;
    /** Marks the shown sticker, through its confirm. */
    const markIt = async () => {
      press(words.open.en);
      press(words.confirm.en);
      await settle();
    };
    const showSwitch = strings.stickerBoard.settings.nsfw.show.en;

    it("is offered to its Original Artist only, on a sticker not marked yet, as label stock at the foot", () => {
      openOn(vi.fn());
      const opener = button(words.open.en);
      // A quiet link reads as text, not something to press.
      expect(opener?.classList).not.toContain("label-btn--quiet");
      const controls = [...document.querySelectorAll(".sticker-detail__main button")];
      expect(controls.at(-1)).toBe(opener);
      openOn(vi.fn(), sticker(133, day(14), { artist: toPerson(people.mika) }));
      expect(button(words.open.en)).toBeUndefined();
      openOn(vi.fn(), sticker(133, day(14), { nsfw: true }));
      expect(button(words.open.en)).toBeUndefined();
    });

    it("asks first, saying it can't be undone and that a copy may have been kept, and Cancel marks nothing", () => {
      const markStickerNsfw = vi.fn<ApiClient["markStickerNsfw"]>();
      openOn(markStickerNsfw);
      press(words.open.en);
      expect(confirm()?.textContent).toContain(words.cantUndo.en);
      expect(confirm()?.textContent).toContain(words.copies.en);
      expect(document.activeElement?.textContent).toBe(words.cancel.en);

      press(words.cancel.en);
      expect(confirm()).toBeNull();
      expect(document.activeElement).toBe(button(words.open.en));

      // Escape closes the confirm the same way, and leaves the detail open.
      press(words.open.en);
      act(() => {
        document.activeElement?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      });
      expect(confirm()).toBeNull();
      expect(document.activeElement).toBe(button(words.open.en));
      expect(onClose).not.toHaveBeenCalled();
      expect(markStickerNsfw).not.toHaveBeenCalled();
    });

    it("marks it on confirm, shows it as the answer has it, and has the board load again without the kept one", async () => {
      const markStickerNsfw = vi.fn<ApiClient["markStickerNsfw"]>(() => Promise.resolve(answer));
      const boardChanged = vi.fn();
      onTestFinished(onMyStickerBoardChanged(boardChanged));
      keepBoard(TEST_OWNER.id, { owner: you, stickers: [sticker(133, day(14))] });
      openOn(markStickerNsfw);
      await markIt();

      expect(markStickerNsfw).toHaveBeenCalledExactlyOnceWith("s-133");
      expect(boardChanged).toHaveBeenCalledOnce();
      expect(keptBoardFor(TEST_OWNER.id)).toBeNull();
      expect(figure()?.querySelector("img")?.getAttribute("src")).toBe(
        toSticker(answer.sticker).urls.png,
      );
      // Without the NSFW opt-in, you see it veiled now too, and the status line says how to see it.
      expect(figure()?.classList).toContain("is-veiled");
      expect(button(words.open.en)).toBeUndefined();
      expect(status()).toContain("No.0133");
      expect(status()).toContain(showSwitch);
    });

    it("says only that it's marked to someone who sees 18+ stickers unblurred", async () => {
      const opted = { sticker: { ...answer.sticker, artist: { ...TEST_OWNER, nsfwOptIn: true } } };
      openOn(() => Promise.resolve({ ...answer, ...opted }), sticker(133, day(14)), {
        ...TEST_ME,
        nsfwOptIn: true,
      });
      await markIt();
      expect(status()).toContain("No.0133");
      expect(status()).not.toContain(showSwitch);
    });

    it("says why the mark didn't take, and leaves the sticker and the board as they were", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const refusal = new ApiError(404, { error: "sticker_not_found", detail: "s-133" });
      const boardChanged = vi.fn();
      onTestFinished(onMyStickerBoardChanged(boardChanged));
      openOn(() => Promise.reject(refusal));
      await markIt();

      const failed = document.querySelector(".sticker-detail__mark-failed");
      expect(failed?.querySelector('[role="alert"]')?.textContent).toContain(
        strings.errors.sticker_not_found.en,
      );
      expect(failed?.textContent).toContain(errorDetail(refusal));
      expect(figure()?.classList).not.toContain("is-nsfw");
      expect(boardChanged).not.toHaveBeenCalled();
      expect(button(words.confirm.en)).toBeDefined();
    });

    it.each([
      [
        "as the server has it",
        () => Promise.resolve(answer.sticker),
        toSticker(answer.sticker).urls,
      ],
      [
        // As the board shows one whose drawing waits for a load under your opt-in.
        "without its drawing, when it can't be read back",
        () => Promise.reject(new ApiError(0, { error: "network" })),
        withoutNsfwDrawings([{ nsfw: true, urls: testStickerUrls("blob:133") }])[0]?.urls,
      ],
    ])(
      "takes already marked as the mark landing, and shows it marked %s, with the board loading again",
      async (_, readBack, shownUrls) => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        const boardChanged = vi.fn();
        onTestFinished(onMyStickerBoardChanged(boardChanged));
        keepBoard(TEST_OWNER.id, { owner: you, stickers: [sticker(133, day(14))] });
        // Its earlier mark's answer was lost on its way, or another window marked it first.
        const markStickerNsfw = () =>
          Promise.reject(new ApiError(409, { error: "already_nsfw", detail: "s-133" }));
        const stickerDetail = vi.fn(async () => ({
          sticker: await readBack(),
          owner: TEST_OWNER,
          transferTrail: [],
        }));
        const client = emptyApi({ markStickerNsfw, stickerDetail });
        const onBoard = (shown: BoardStickerView) =>
          open({ ownerId: TEST_OWNER.id, stickers: [shown], startId: shown.id }, client);
        onBoard(sticker(133, day(14)));
        await settle();
        await markIt();

        expect(confirm()).toBeNull();
        expect(button(words.open.en)).toBeUndefined();
        const shownSrc = () => figure()?.querySelector("img")?.getAttribute("src");
        expect(shownSrc()).toBe(shownUrls?.png);
        expect(figure()?.classList).toContain("is-veiled");
        expect(status()).toContain("No.0133");
        expect(boardChanged).toHaveBeenCalledOnce();
        expect(keptBoardFor(TEST_OWNER.id)).toBeNull();

        // Once the board's reload lists it marked, the detail shows it as the board has it.
        const reloaded = sticker(133, day(14), {
          nsfw: true,
          urls: testStickerUrls("blob:133-for-you"),
        });
        onBoard(reloaded);
        expect(shownSrc()).toBe(reloaded.urls.png);
      },
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
