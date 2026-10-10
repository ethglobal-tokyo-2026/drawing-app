// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { ApiProvider } from "../api/ApiProvider";
import type {
  Gratitude,
  KyotoSeikaSubject,
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
import { forgetsSoFar, keepBoard, keptBoardFor } from "./lastBoard";
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

const NEXT_STICKER = i18next.t(($) => $.stickerBoard.detail.next);
const PREVIOUS_STICKER = i18next.t(($) => $.stickerBoard.detail.previous);
const GIVE = i18next.t(($) => $.stickerBoard.detail.give);
const SEND_GRATITUDE = i18next.t(($) => $.stickerBoard.detail.sendGratitude);
const TRY_AGAIN = i18next.t(($) => $.ui.errorLine.tryAgain);
/** The fine print of a sticker @bob received from you on 9.23, his handle where the string marks it. */
const YOU_GAVE_IT_TO_BOB = i18next
  .t(($) => $.stickerBoard.detail.youGaveIt, { day: "9.23" })
  .replace("<receiver/>", "@bob");

const you = toPerson(TEST_OWNER);
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
  drawnWidth: 480,
  drawnHeight: 480,
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
  trail: { timesGiven: 0, newestHasGratitude: false },
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

/** Opens the detail; again on the same sticker, it renders the open one with the props given. */
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
            key={props.startId ?? "s-133"}
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

/** No.0133 as the server has it: @ken drew it, and you hold it. */
const byKen = apiSticker({ id: "s-133", artist: people.ken, ownerId: TEST_OWNER.id });
/** No.0133's detail as you read it: @mika gave it to you, with or without gratitude. */
const detailOf = (gratitude: Gratitude | null): StickerDetailResponse => ({
  sticker: byKen,
  owner: TEST_OWNER,
  transferTrail: [trailEntry({ giftId: "gift-133", receiver: TEST_OWNER, gratitude })],
});
/** A server that reads No.0133's detail as `detailOf(gratitude)`. */
const received = (gratitude: Gratitude | null) =>
  emptyApi({ stickerDetail: () => Promise.resolve(detailOf(gratitude)) });
const giveIsTheKey = () => button(GIVE)?.classList.contains("key");

/**
 * A server whose sticker detail reads answer only when told, each with `detail()` as that read went
 * out, so a test sees the detail while a read is going, and what a read from before a change says.
 */
function heldReads(detail: () => StickerDetailResponse) {
  const answers: (() => void)[] = [];
  const stickerDetail = vi.fn(
    () =>
      new Promise<StickerDetailResponse>((resolve) => {
        const asRead = detail();
        answers.push(() => resolve(asRead));
      }),
  );
  return {
    client: emptyApi({ stickerDetail }),
    /** Answers the `n`th read, from zero, and lets it land. */
    answer: async (n = 0) => {
      answers[n]?.();
      await settle();
    },
  };
}

/**
 * Held reads of No.0133's detail, and the `server` that records gratitude for its gift: the reads that
 * go out once it has hold that gratitude.
 */
function recordingServer() {
  let recorded: Gratitude | null = null;
  return {
    reads: heldReads(() => detailOf(recorded)),
    server: {
      recordGratitude: (body: RecordGratitude) => {
        recorded = gratitudeOf(body);
        return Promise.resolve(recorded);
      },
    },
  };
}

/** A client whose sticker details have Transfer Trails: `trail` for s-133, empty for the rest. */
const withTrail = (trail: StickerDetailResponse["transferTrail"]) =>
  emptyApi({
    stickerDetail: (id) =>
      Promise.resolve({
        sticker: apiSticker({ id, number: 133 }),
        owner: TEST_OWNER,
        transferTrail: id === "s-133" ? trail : [],
      }),
  });
const rows = () => [...document.querySelectorAll(".transfer-trail__row")];
const openRow = () => document.querySelector(".transfer-trail__row.is-open")?.textContent;

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

/** Opens the detail on `shown`, as its Original Artist on your board. */
const openAsArtist = (shown: BoardStickerView, client: ApiClient, me?: Me) =>
  open({ ownerId: TEST_OWNER.id, stickers: [shown], startId: shown.id }, client, me);
/** Changes the shown sticker's 18+ mark through its confirm, with Mark 18+'s words or Remove 18+'s. */
async function changeMarkThrough(words: { open: { en: string }; confirm: { en: string } }) {
  press(words.open.en);
  press(words.confirm.en);
  await settle();
}
const confirm = () => document.querySelector(".sticker-detail__confirm");
const figure = () => document.querySelector(".sticker-detail__slide .sticker-figure");
const status = () => document.querySelector('[role="status"]')?.textContent;

/**
 * Hears your board change, with `kept` as the board kept on this device; `expectReloaded` checks the
 * board was told to load again, without the kept one.
 */
function watchBoard(kept?: BoardStickerView[]) {
  if (kept) keepBoard(TEST_OWNER.id, { owner: you, stickers: kept }, forgetsSoFar());
  const changed = vi.fn();
  onTestFinished(onMyStickerBoardChanged(changed));
  return {
    changed,
    expectReloaded: () => {
      expect(changed).toHaveBeenCalledOnce();
      expect(keptBoardFor(TEST_OWNER.id)).toBeNull();
    },
  };
}

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
    press(NEXT_STICKER);
    expect(heading()).toBe("No.0117");
    press(NEXT_STICKER);
    expect(heading()).toBe("No.0117");

    key("ArrowLeft");
    key("ArrowLeft");
    expect(heading()).toBe("No.0147");
    press("No.0133");
    press(GIVE);
    expect(onGive).toHaveBeenCalledExactlyOnceWith(stickers[1]);
  });

  it("keeps showing its sticker when a reload drops it from the list, until it's paged", () => {
    open();
    // The board reloads once a friend received No.0133, which leaves your stickers.
    open({ stickers: [stickers[0], stickers[2]] });
    expect(heading()).toBe("No.0133");
    press(NEXT_STICKER);
    expect(heading()).toBe("No.0117");
    press(PREVIOUS_STICKER);
    expect(heading()).toBe("No.0147");
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
      YOU_GAVE_IT_TO_BOB,
    );
    expect(button(GIVE)).toBeUndefined();
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
    /** The gift state the big sticker's dot badge shows; undefined when it wears none. */
    const giftDot = () =>
      document.querySelector<HTMLElement>(".sticker-detail__slide [data-gift]")?.dataset.gift;

    it("sticks a dot badge on the big sticker that says whether its gift is in the bag or on its way", () => {
      for (const status of ["packed", "sent"] as const) {
        openInFlight(inFlight(133, status));
        expect(giftDot()).toBe(status);
      }
      openInFlight(sticker(133, day(14)));
      expect(giftDot()).toBeUndefined();
      // A sticker you gave shows only where it went.
      open({ mode: "given", stickers: [inFlight(133, "packed")], startId: "s-133" });
      expect(giftDot()).toBeUndefined();
    });

    it("sticks the dot where the sticker's cut line comes nearest its top-right corner", () => {
      const layer = () => document.querySelector<HTMLElement>(".sticker-detail__dot-layer");
      // A diamond leaves its box's corner empty: the nearest point is halfway along its top-right side.
      const diamond = { width: 100, height: 100, outline: "M50 0L100 50L50 100L0 50Z" };
      openInFlight(
        sticker(150, day(14), { openGift: { id: "g-150", status: "packed" }, ...diamond }),
      );
      expect(
        ["--spot-x", "--spot-y"].map((p) => Number(layer()?.style.getPropertyValue(p))),
      ).toEqual([0.75, 0.25]);
    });

    it("says its state only, Take it out under it, and keeps Give the key while it's in the bag", () => {
      openInFlight(inFlight(133, "sent", "bob"));
      expect(note()).toBe(i18next.t(($) => $.stickerBoard.detail.onItsWayTo, { receiver: "@bob" }));
      expect(button(GIVE)).toBeUndefined();
      expect(button(takeOut())).toBeDefined();
      openInFlight(inFlight(133, "sent"));
      expect(note()).toBe(i18next.t(($) => $.stickerBoard.detail.onItsWay));
      const packed = inFlight(133, "packed");
      openInFlight(packed);
      expect(note()).toBe(i18next.t(($) => $.giving.inTheBag.title));
      expect(button(takeOut())).toBeDefined();
      expect(giveIsTheKey()).toBe(true);
      press(GIVE);
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
      press(TRY_AGAIN);
      await settle();
      expect(startTakeOut).toHaveBeenCalledTimes(2);
      expect(alert()).toBeUndefined();
    });

    it("takes its dot off and puts Give back with focus once it's out, and says the sticker is back on the board", async () => {
      openInFlight(inFlight(133, "packed"), landsOut);
      press(takeOut());
      // On its way out, it's still in the gift.
      expect(giftDot()).toBe("packed");
      await settle();
      expect(giftDot()).toBeUndefined();
      expect(document.activeElement?.textContent).toBe(GIVE);
      expect(document.querySelector(".sticker-detail__taken-out")?.textContent).toBe(
        i18next.t(($) => $.stickerBoard.detail.takeOut.backOnBoard, { no: "No.0133" }),
      );
    });
  });

  it("offers Send gratitude over Give for a received sticker with no gratitude yet", async () => {
    const onSendGratitude = vi.fn();
    open({ onSendGratitude }, received(null));
    await settle();
    expect(giveIsTheKey()).toBe(false);
    press(SEND_GRATITUDE);
    expect(onSendGratitude).toHaveBeenCalledExactlyOnceWith(
      { id: "gift-133" },
      toSticker(byKen),
      toPerson(people.mika),
    );
  });

  it("treats gratitude waiting on this phone as sent, and reads the trail again once the server has it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { reads, server } = recordingServer();
    // Played, and kept for want of a connection.
    const offline = { recordGratitude: () => Promise.reject(new TypeError("Failed to fetch")) };
    await sendGratitude(offline, TEST_OWNER.id, recordGratitudeBody({ giftId: "gift-133" }));

    open({ onSendGratitude: vi.fn() }, reads.client);
    await reads.answer(0);
    expect(button(SEND_GRATITUDE)).toBeUndefined();

    // Back online, the server records it, and the trail is read again. What was read before, which
    // has no gratitude, never brings Send gratitude back while it is.
    await act(() => resendPendingGratitude(server, TEST_OWNER.id));
    expect(reads.client.stickerDetail).toHaveBeenCalledTimes(2);
    expect(button(SEND_GRATITUDE)).toBeUndefined();
    await reads.answer(1);
    expect(button(SEND_GRATITUDE)).toBeUndefined();
  });

  it("reads the trail again once its first read lands, when gratitude was recorded while that read was going out", async () => {
    const { reads, server } = recordingServer();
    open({ onSendGratitude: vi.fn() }, reads.client);
    // The first read is out and unanswered when the server records a combo this phone sent.
    const body = recordGratitudeBody({ giftId: "gift-133" });
    await act(() => sendGratitude(server, TEST_OWNER.id, body));
    // That read went out before the record, so it holds no gratitude, and can't bring Send gratitude back.
    await reads.answer(0);
    expect(button(SEND_GRATITUDE)).toBeUndefined();
    expect(reads.client.stickerDetail).toHaveBeenCalledTimes(2);
    await reads.answer(1);
    expect(button(SEND_GRATITUDE)).toBeUndefined();
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
      open({ onSendGratitude: vi.fn() }, received(null));
      await settle();
    };
    open({ onSendGratitude: vi.fn() }, received(null));
    await settle();
    expect(refused()).toBeNull();

    // Kept for want of a connection, then refused as the phone comes back online, with the detail up.
    const offline = { recordGratitude: () => Promise.reject(new TypeError("Failed to fetch")) };
    await sendGratitude(offline, TEST_OWNER.id, recordGratitudeBody({ giftId: "gift-133" }));
    await act(() =>
      resendPendingGratitude({ recordGratitude: () => Promise.reject(refusal) }, TEST_OWNER.id),
    );
    await settle();
    expect(refused()?.querySelector('[role="alert"]')?.textContent).toContain(
      i18next.t(($) => $.gratitude.refusals.alreadyRecorded, { handle: "@mika" }),
    );
    expect(refused()?.textContent).toContain(errorDetail(refusal));

    // It stays until dismissed, across opens.
    await reopen();
    expect(refused()).not.toBeNull();
    press(i18next.t(($) => $.stickerBoard.detail.dismiss));
    expect(refused()).toBeNull();
    await reopen();
    expect(refused()).toBeNull();
  });

  it("says the check failed where the key would be, and Try again asks again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const refusal = new ApiError(503, { error: "unavailable", detail: "database is busy" });
    const stickerDetail = vi.fn<ApiClient["stickerDetail"]>(() => Promise.reject(refusal));
    open({ onSendGratitude: vi.fn() }, emptyApi({ stickerDetail }));
    await settle();
    const note = document.querySelector(".sticker-detail__check-failed");
    expect(note?.querySelector('[role="alert"]')?.textContent).toContain(
      i18next.t(($) => $.stickerBoard.detail.checkFailed, { reason: errorMessage(refusal) }),
    );
    // The server's own words are fine print, apart from the sentence.
    expect(note?.textContent).toContain("database is busy");
    // Ahead of Give, since without the check the call to send gratitude can't show.
    const acts = document.querySelector(".sticker-detail__acts");
    if (!note || !acts) throw new Error("The detail shows no failure line or no Give");
    expect(note.compareDocumentPosition(acts)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    const calls = stickerDetail.mock.calls.length;
    press(TRY_AGAIN);
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
    const sent = gratitudeFixture({ giftId: "gift-133", total: 320 });
    open({ onSendGratitude: vi.fn() }, received(sent));
    await settle();
    expect(button(SEND_GRATITUDE)).toBeUndefined();
    expect(giveIsTheKey()).toBe(true);
  });

  describe("beside Timelapse", () => {
    const openOn = (shown: BoardStickerView) => open({ stickers: [shown], startId: shown.id });
    const thought = () => host.querySelector(".subject-thought");

    it("shows the two Kyoto Seika Subjects a sticker drawn in Kyoto Seika Practice Mode combined, which screen readers hear", async () => {
      openOn(sticker(150, day(20), { kyotoSeikaSubjects: TEST_KYOTO_SEIKA_SUBJECTS }));
      const [first, second] = TEST_KYOTO_SEIKA_SUBJECTS;
      expect(thought()).not.toBeNull();
      // In English, screen readers hear each word's English too.
      const spoken = () => thought()?.nextElementSibling?.textContent;
      const withEnglish = ({ ja, en }: KyotoSeikaSubject) =>
        i18next.t(($) => $.kyotoSeika.pair.subject, { word: ja, english: en });
      expect(spoken()).toBe(
        i18next.t(($) => $.kyotoSeika.thought.spoken, {
          first: withEnglish(first),
          second: withEnglish(second),
        }),
      );
      await act(async () => {
        await i18next.changeLanguage("ja");
      });
      onTestFinished(async () => {
        await i18next.changeLanguage("en");
      });
      expect(spoken()).toBe(
        kyotoSeika.thought.spoken.ja
          .replace("{{first}}", first.ja)
          .replace("{{second}}", second.ja),
      );
    });

    it("thinks of nothing on any other sticker", () => {
      openOn(sticker(151, day(20)));
      expect(thought()).toBeNull();
    });
  });

  it("shows where it's been to its owner as you, with its Original Artist's share", async () => {
    // @ken gave you a sticker @mika drew, so @mika's share comes out of @ken's part.
    const sent = gratitudeFixture({
      giftId: "g-1",
      total: 2946,
      originalArtistGratitudeShare: 589,
    });
    open(
      {
        stickers: [sticker(133, day(14), { artist: toPerson(people.mika) })],
        ownerId: TEST_OWNER.id,
      },
      withTrail([
        trailEntry({ giftId: "g-1", giver: people.ken, receiver: TEST_OWNER, gratitude: sent }),
      ]),
    );
    await settle();
    expect(openRow()).toContain(i18next.t(($) => $.stickerBoard.transferTrail.fromYou));
    expect(document.querySelector(".transfer-trail__split")?.textContent).toContain("@mika");
  });

  it("opens on a detail read ahead with its Transfer Trail in, asking the server nothing more", async () => {
    const stickerDetail = vi.fn((id: string) =>
      Promise.resolve({
        sticker: apiSticker({ id, number: 133 }),
        owner: TEST_OWNER,
        transferTrail: [
          trailEntry({ giftId: "gift-133", giver: TEST_OWNER, receiver: people.mika }),
        ],
      }),
    );
    const client = emptyApi({ stickerDetail });
    const given = stickers.map((s) => ({
      ...s,
      trail: { timesGiven: 1, newestHasGratitude: false },
    }));
    preloadStickerDetails(
      client,
      given.filter((s) => s.id === "s-133"),
    );
    await settle();
    open({ ownerId: TEST_OWNER.id, stickers: given }, client);
    expect(rows()).toHaveLength(1);
    expect(document.querySelector(".sticker-detail__column .skeleton")).toBeNull();
    await settle();
    expect(stickerDetail).toHaveBeenCalledTimes(1);
  });

  it("reads its detail again once the board lists a gift received since the last read", async () => {
    let trail = [trailEntry({ giftId: "g-1", giver: TEST_OWNER, receiver: people.mika })];
    const stickerDetail = vi.fn((id: string) =>
      Promise.resolve({
        sticker: apiSticker({ id, number: 133 }),
        owner: TEST_OWNER,
        transferTrail: trail,
      }),
    );
    const client = emptyApi({ stickerDetail });
    const listed = (timesGiven: number) => [
      sticker(133, day(14), { trail: { timesGiven, newestHasGratitude: false } }),
    ];
    open({ ownerId: TEST_OWNER.id, stickers: listed(1) }, client);
    await settle();
    act(() => root.render(null));

    // Within the minute @mika gives it back, and the board's reload lists that gift.
    trail = [trailEntry({ giftId: "g-2", giver: people.mika, receiver: TEST_OWNER }), ...trail];
    open({ ownerId: TEST_OWNER.id, stickers: listed(2) }, client);
    await settle();
    expect(stickerDetail).toHaveBeenCalledTimes(2);
    expect(rows()).toHaveLength(2);
  });

  describe("while its detail is read", () => {
    const trail = () => document.querySelector(".transfer-trail");
    const skeletons = (within: string) => document.querySelectorAll(`${within} .skeleton`).length;
    /** Each of the trail's rows by the shape that sets its height. */
    const shapes = () =>
      [...(trail()?.querySelectorAll(".transfer-trail__row") ?? [])].map((row) =>
        row.classList.contains("is-open")
          ? "card"
          : row.classList.contains("transfer-trail__row--fold")
            ? "fold"
            : row.querySelector("p.transfer-trail__head")
              ? "line"
              : "closed",
      );

    it("holds the Transfer Trail's place with a skeleton of its rows, shaped as the trail lands", async () => {
      const bob = toPerson(people.bob);
      const given = sticker(133, day(14), {
        held: false,
        givenTo: { receiver: bob, receivedAt: day(23) },
        trail: { timesGiven: 3, newestHasGratitude: true },
      });
      const read = heldReads(() => ({
        sticker: apiSticker({ id: "s-133", number: 133 }),
        owner: people.bob,
        transferTrail: [
          trailEntry({
            giftId: "g-3",
            giver: TEST_OWNER,
            receiver: people.bob,
            gratitude: gratitudeFixture({ giftId: "g-3", total: 300 }),
          }),
          trailEntry({ giftId: "g-2", giver: people.ken, receiver: TEST_OWNER }),
          trailEntry({ giftId: "g-1", giver: TEST_OWNER, receiver: people.ken }),
        ],
      }));
      open(
        { mode: "given", stickers: [given], startId: given.id, ownerId: TEST_OWNER.id },
        read.client,
      );
      const held = shapes();
      expect(skeletons(".transfer-trail")).toBeGreaterThan(0);
      // The line that says who has it is the trail's, so it doesn't show and go as the trail lands.
      const meta = () => document.querySelector(".sticker-detail__meta")?.textContent;
      expect(meta()).not.toContain(YOU_GAVE_IT_TO_BOB);

      await read.answer();
      expect(skeletons(".transfer-trail")).toBe(0);
      expect(shapes()).toEqual(held);
      expect(openRow()).toContain("300");
      expect(meta()).not.toContain(YOU_GAVE_IT_TO_BOB);
    });

    it("lays Give out beside Send gratitude's place while it reads whether gratitude is owed, and keeps it there", async () => {
      const read = heldReads(() => detailOf(null));
      const fromMika = sticker(133, day(14), {
        artist: toPerson(people.ken),
        trail: { timesGiven: 1, newestHasGratitude: false },
      });
      const onSendGratitude = vi.fn();
      open(
        { stickers: [fromMika], startId: fromMika.id, ownerId: TEST_OWNER.id, onSendGratitude },
        read.client,
      );
      const give = button(GIVE);
      expect(give?.classList.contains("key")).toBe(false);
      expect(skeletons(".sticker-detail__acts")).toBe(1);
      const held = shapes();

      await read.answer();
      expect(button(GIVE)).toBe(give);
      expect(button(SEND_GRATITUDE)?.classList.contains("key")).toBe(true);
      expect(skeletons(".sticker-detail__acts")).toBe(0);
      expect(shapes()).toEqual(held);
    });
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
          Promise.resolve({ sticker: apiSticker({ id }), owner: TEST_OWNER, transferTrail: [] }),
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
        press(NEXT_STICKER);
        await settle();
        expect(heading()).toBe("No.0117");
        expect(timelapseButton()).toBeNull();
      },
    );

    it.each([
      ["paging", () => press(NEXT_STICKER)],
      ["the back button", () => press(i18next.t(($) => $.ui.backToBoard))],
      ["Escape", () => key("Escape")],
    ])("stops on %s, lets go of its canvas, and leaves no layer behind", async (_, leave) => {
      const player = await playing();
      leave();
      expect(player.calls).toContain("stop");
      const { canvas } = player.options;
      expect([canvas.width, canvas.height]).toEqual([0, 0]);
      expect(layer()).toBeNull();
    });

    it("shows Timelapse from the board's sticker before its detail is read", () => {
      open(
        { stickers: timelapsed, startId: "s-133" },
        emptyApi({ stickerDetail: () => new Promise(() => {}) }),
      );
      expect(timelapseButton()).not.toBeNull();
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

    it("plays on, with focus where it was, when another sticker's mark lands", async () => {
      let land: () => void = () => {};
      const marked = {
        sticker: apiSticker({ id: "s-147", number: 147, nsfw: true, artist: TEST_OWNER }),
        cdnPurged: true,
      };
      const client = {
        ...withTimelapse(),
        markStickerNsfw: () =>
          new Promise<typeof marked>((resolve) => {
            land = () => resolve(marked);
          }),
      };
      open({ stickers: timelapsed, startId: "s-147", ownerId: TEST_OWNER.id }, client);
      const words = strings.stickerBoard.detail.markNsfw;
      press(words.open.en);
      press(words.confirm.en);
      press(NEXT_STICKER);
      await settle();
      act(() => timelapseButton()?.click());
      await settle();
      const player = players.last();
      player.prepared.resolve();
      await settle();
      const previous = button(PREVIOUS_STICKER);
      act(() => previous?.focus());

      land();
      await settle();
      expect(player.calls).not.toContain("stop");
      expect(layer()).not.toBeNull();
      expect(document.activeElement).toBe(previous);
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
    ) => openAsArtist(shown, emptyApi({ markStickerNsfw }), me);
    const markIt = () => changeMarkThrough(words);
    const showSwitch = strings.stickerBoard.settings.nsfw.show.en;

    it("is offered to its Original Artist only, on a sticker not marked yet, in a section of its own at the foot", async () => {
      const rule = () => document.querySelector(".sticker-detail__main hr");
      const before = (a: Node | null | undefined, b: Node | null | undefined) =>
        Boolean(a && b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      open(
        { ownerId: TEST_OWNER.id, stickers: [sticker(133, day(14))], startId: "s-133" },
        withTrail([trailEntry({ giftId: "g-1", giver: people.mika, receiver: people.ken })]),
      );
      await settle();
      const opener = button(words.open.en);
      // Past a rule that follows Give and the Transfer Trail, so it never reads as Give's alternative.
      expect(rows()).toHaveLength(1);
      for (const earlier of [button(GIVE), ...rows()]) expect(before(earlier, rule())).toBe(true);
      expect(before(rule(), opener)).toBe(true);
      const controls = [...document.querySelectorAll(".sticker-detail__main button")];
      expect(controls.at(-1)).toBe(opener);
      // Regular label stock as wide as the column: not a quiet link, nor Timelapse's small stock.
      const stock = [...(opener?.classList ?? [])].filter((c) => c.startsWith("label-btn"));
      expect(stock).toEqual(["label-btn", "label-btn--block"]);

      // Without it, no rule is left standing over nothing.
      openOn(vi.fn(), sticker(133, day(14), { artist: toPerson(people.mika) }));
      expect(button(words.open.en)).toBeUndefined();
      expect(rule()).toBeNull();
      // An 18+ sticker offers Remove 18+ in its place.
      openOn(vi.fn(), sticker(133, day(14), { nsfw: true }));
      expect(button(words.open.en)).toBeUndefined();
    });

    it("brings its confirm's buttons into view as it opens, with focus on Cancel", () => {
      const scroll = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
      openOn(vi.fn());
      press(words.open.en);
      expect(scroll).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ block: "nearest" }));
      const shown = scroll.mock.contexts[0];
      if (!(shown instanceof Element)) throw new Error("nothing was scrolled into view");
      expect(confirm()?.contains(shown)).toBe(true);
      const cancel = button(words.cancel.en);
      for (const held of [cancel, button(words.confirm.en)])
        expect(held && shown.contains(held)).toBe(true);
      expect(document.activeElement).toBe(cancel);
    });

    it("asks first, saying that a copy may have been kept, and Cancel marks nothing", () => {
      const markStickerNsfw = vi.fn<ApiClient["markStickerNsfw"]>();
      openOn(markStickerNsfw);
      press(words.open.en);
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
      const board = watchBoard([sticker(133, day(14))]);
      openOn(markStickerNsfw);
      await markIt();

      expect(markStickerNsfw).toHaveBeenCalledExactlyOnceWith("s-133");
      board.expectReloaded();
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
      const board = watchBoard();
      openOn(() => Promise.reject(refusal));
      await markIt();

      const failed = document.querySelector(".sticker-detail__mark-failed");
      expect(failed?.querySelector('[role="alert"]')?.textContent).toContain(
        strings.errors.sticker_not_found.en,
      );
      expect(failed?.textContent).toContain(errorDetail(refusal));
      expect(figure()?.classList).not.toContain("is-nsfw");
      expect(board.changed).not.toHaveBeenCalled();
      expect(button(words.confirm.en)).toBeDefined();
    });

    it("keeps a mark that failed after a page turn on its sticker, naming it, until tried again", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      let refuse: (error: unknown) => void = () => {};
      const markStickerNsfw = vi.fn<ApiClient["markStickerNsfw"]>(
        () =>
          new Promise((_, reject) => {
            refuse = reject;
          }),
      );
      open({ ownerId: TEST_OWNER.id }, emptyApi({ markStickerNsfw }));
      press(words.open.en);
      press(words.confirm.en);
      press(NEXT_STICKER);
      const refusal = new ApiError(503, { error: "unavailable", detail: "database is busy" });
      refuse(refusal);
      await settle();
      const failed = () => document.querySelector(".sticker-detail__mark-failed")?.textContent;
      expect(failed()).toBeUndefined();

      // Paging back finds it on its sticker, and paging on and back again leaves it there.
      press(PREVIOUS_STICKER);
      expect(failed()).toContain("No.0133");
      expect(failed()).toContain(errorMessage(refusal));
      press(NEXT_STICKER);
      press(PREVIOUS_STICKER);
      expect(failed()).toContain("No.0133");
    });

    it("closes on Escape while another sticker's mark is on its way", async () => {
      const markStickerNsfw = vi.fn<ApiClient["markStickerNsfw"]>(() => new Promise(() => {}));
      open({ ownerId: TEST_OWNER.id }, emptyApi({ markStickerNsfw }));
      press(words.open.en);
      press(words.confirm.en);
      press(NEXT_STICKER);
      key("Escape");
      await settle();
      expect(onClose).toHaveBeenCalledOnce();
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
        const board = watchBoard([sticker(133, day(14))]);
        // Its earlier mark's answer was lost on its way, or another window marked it first.
        const markStickerNsfw = () =>
          Promise.reject(new ApiError(409, { error: "already_nsfw", detail: "s-133" }));
        const stickerDetail = vi.fn(async () => ({
          sticker: await readBack(),
          owner: TEST_OWNER,
          transferTrail: [],
        }));
        const client = emptyApi({ markStickerNsfw, stickerDetail });
        const onBoard = (shown: BoardStickerView) => openAsArtist(shown, client);
        onBoard(sticker(133, day(14)));
        await settle();
        await markIt();

        expect(confirm()).toBeNull();
        expect(button(words.open.en)).toBeUndefined();
        const shownSrc = () => figure()?.querySelector("img")?.getAttribute("src");
        expect(shownSrc()).toBe(shownUrls?.png);
        expect(figure()?.classList).toContain("is-veiled");
        expect(status()).toContain("No.0133");
        board.expectReloaded();

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

  describe("Remove 18+", () => {
    const words = strings.stickerBoard.detail.unmarkNsfw;
    /** Your 18+ sticker, as your board lists it to you without the NSFW opt-in. */
    const marked = () => sticker(133, day(14), { nsfw: true });
    /** The sticker as the server answers it once its mark is off: as sealed, for everyone. */
    const answer = {
      sticker: apiSticker({ id: "s-133", number: 133, nsfw: false, artist: TEST_OWNER }),
    };
    /** Opens the detail on `shown`, as you on your board, with `unmarkStickerNsfw` as the server's. */
    const openOn = (
      unmarkStickerNsfw: ApiClient["unmarkStickerNsfw"],
      shown: BoardStickerView = marked(),
    ) => openAsArtist(shown, emptyApi({ unmarkStickerNsfw }));
    const unmarkIt = () => changeMarkThrough(words);

    it("is offered in Mark 18+'s place to its Original Artist only, on a sticker marked 18+", () => {
      openOn(vi.fn());
      expect(button(words.open.en)).toBeDefined();
      expect(button(strings.stickerBoard.detail.markNsfw.open.en)).toBeUndefined();
      openOn(vi.fn(), sticker(133, day(14), { nsfw: true, artist: toPerson(people.mika) }));
      expect(button(words.open.en)).toBeUndefined();
      openOn(vi.fn(), sticker(133, day(14)));
      expect(button(words.open.en)).toBeUndefined();
    });

    it("asks first, saying what taking it off does, and Cancel leaves the mark on", () => {
      const unmarkStickerNsfw = vi.fn<ApiClient["unmarkStickerNsfw"]>();
      openOn(unmarkStickerNsfw);
      press(words.open.en);
      expect(confirm()?.textContent).toContain(words.does.en);
      expect(document.activeElement?.textContent).toBe(words.cancel.en);
      press(words.cancel.en);
      expect(confirm()).toBeNull();
      expect(document.activeElement).toBe(button(words.open.en));
      expect(unmarkStickerNsfw).not.toHaveBeenCalled();
    });

    it("takes the mark off on confirm, shows it unblurred without pink foil, and has the board load again without the kept one", async () => {
      const unmarkStickerNsfw = vi.fn<ApiClient["unmarkStickerNsfw"]>(() =>
        Promise.resolve(answer),
      );
      const board = watchBoard([marked()]);
      openOn(unmarkStickerNsfw);
      expect(figure()?.classList).toContain("is-veiled");
      await unmarkIt();

      expect(unmarkStickerNsfw).toHaveBeenCalledExactlyOnceWith("s-133");
      board.expectReloaded();
      expect(figure()?.classList).not.toContain("is-veiled");
      expect(figure()?.classList).not.toContain("is-nsfw");
      expect(figure()?.querySelector("img")?.getAttribute("src")).toBe(
        toSticker(answer.sticker).urls.png,
      );
      expect(status()).toBe(words.done.en.replace("{{no}}", "No.0133"));
      // Mark 18+ is back in its place.
      expect(button(strings.stickerBoard.detail.markNsfw.open.en)).toBeDefined();
    });

    it("says why the removal didn't take, with Try again, and leaves the sticker marked", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const refusal = new ApiError(0, { error: "network" });
      const unmarkStickerNsfw = vi.fn<ApiClient["unmarkStickerNsfw"]>(() =>
        Promise.reject(refusal),
      );
      const board = watchBoard();
      openOn(unmarkStickerNsfw);
      await unmarkIt();

      const failed = document.querySelector(".sticker-detail__mark-failed");
      expect(failed?.querySelector('[role="alert"]')?.textContent).toContain(
        strings.errors.network.en,
      );
      expect(figure()?.classList).toContain("is-nsfw");
      expect(board.changed).not.toHaveBeenCalled();

      unmarkStickerNsfw.mockResolvedValueOnce(answer);
      const tryAgain = failed?.querySelector<HTMLButtonElement>('[role="alert"] button');
      expect(tryAgain?.textContent).toBe(TRY_AGAIN);
      act(() => tryAgain?.click());
      await settle();
      expect(unmarkStickerNsfw).toHaveBeenCalledTimes(2);
      expect(confirm()).toBeNull();
      expect(figure()?.classList).not.toContain("is-nsfw");
    });
  });

  it("titles LINE's header with the shown sticker, and puts the title back when it closes", () => {
    document.title = "Your sticker board";
    open();
    expect(document.title).toBe("No.0133");
    press(PREVIOUS_STICKER);
    expect(document.title).toBe("No.0147");
    act(() => root.render(null));
    expect(document.title).toBe("Your sticker board");
  });
});
