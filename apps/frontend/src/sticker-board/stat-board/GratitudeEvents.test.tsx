// @vitest-environment happy-dom
import type { GratitudeEvents, UserStats } from "@drawing-app/api/client";
import { act, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../../api/apiClient";
import { emptyApi, renderWithApi } from "../../api/testing";
import { people, sticker } from "../../api/testFixtures";
import { problemOf } from "../../i18n/errorMessage";
import { i18next } from "../../i18n/i18n";
import { formatHandle } from "../../stickers/format";
import { buttonNamed, dragBy, onLargeScreen } from "../../ui/testing";
import { DISMISS_PX } from "../../ui/useSheetDrag";
import { GratitudeEventsSheet } from "./GratitudeEvents";
import { StatCork } from "./StatCork";
import { statFigures } from "./statFigures";

/** The link under your receipt's total that opens your gratitude events. */
const SEE_WHERE = i18next.t(($) => $.stickerBoard.statBoard.gratitude.events.open);
const TRY_AGAIN = i18next.t(($) => $.ui.errorLine.tryAgain);

const STATS: UserStats = {
  since: "2026-09-26T09:00:00.000Z",
  made: 2,
  received: 1,
  given: 1,
  gratitude: { direct: 480, residual: 120, total: 600 },
  bests: { bestCombo: 12, mostGratitudeInADay: 480, longestStreak: 2 },
  streak: 1,
};

/** Newest first, as the API sends them: your Original Artist Gratitude Share, then a gift you gave. */
const EVENTS: GratitudeEvents = {
  events: [
    {
      giftId: `0x${"b".repeat(64)}`,
      sticker: sticker(),
      from: people.mika,
      part: "residual",
      amount: 120,
      recordedAt: "2026-10-07T03:00:00.000Z",
    },
    {
      giftId: `0x${"a".repeat(64)}`,
      sticker: sticker(),
      from: people.ken,
      part: "direct",
      amount: 480,
      recordedAt: "2026-10-06T03:00:00.000Z",
    },
  ],
  next: null,
};

/** Your receipt and the sheet its link opens, held beside the cork as StatBoard holds them. */
function YourReceipt() {
  const [showing, setShowing] = useState(false);
  return (
    <>
      <StatCork
        figures={{
          name: "Mika",
          handle: "mika",
          own: true,
          loading: false,
          failure: null,
          since: null,
          ...statFigures(STATS),
        }}
        onFlipBack={() => {}}
        flipBackRef={null}
        onShowGratitude={() => setShowing(true)}
      />
      {showing && <GratitudeEventsSheet onClose={() => setShowing(false)} />}
    </>
  );
}

let unmount = () => {};
afterEach(() => {
  unmount();
  vi.restoreAllMocks();
});

/** Your receipt with its link pressed: the sheet, loading through `gratitudeEvents`. */
async function openEvents(gratitudeEvents: ApiClient["gratitudeEvents"]) {
  const view = renderWithApi(<YourReceipt />, emptyApi({ gratitudeEvents }));
  unmount = view.unmount;
  await act(async () => buttonNamed(view.host, SEE_WHERE).click());
  return view.host;
}

const rowsIn = (host: Element) =>
  [...host.querySelectorAll(".gratitude-events__row")].map((row) => row.textContent ?? "");

it("opens your gratitude events from the receipt: who sent each, newest first, Residual on your share", async () => {
  const host = await openEvents(() => Promise.resolve(EVENTS));
  const rows = rowsIn(host);
  const residual = i18next.t(($) => $.stickerBoard.statBoard.gratitude.events.residual);
  expect(rows).toHaveLength(2);
  expect(rows[0]).toContain(formatHandle(people.mika.handle ?? ""));
  expect(rows[0]).toContain(residual);
  expect(rows[0]).toContain("120");
  expect(rows[1]).toContain(formatHandle(people.ken.handle ?? ""));
  expect(rows[1]).not.toContain(residual);
  expect(rows[1]).toContain("480");
});

it("says why your gratitude events didn't load, with Try again, which loads them", async () => {
  const failure = new ApiError(0, {
    error: "network",
    detail: "GET /api/gratitude/events got no answer",
  });
  const gratitudeEvents = vi
    .fn<ApiClient["gratitudeEvents"]>()
    .mockRejectedValueOnce(failure)
    .mockResolvedValueOnce(EVENTS);
  const host = await openEvents(gratitudeEvents);
  const alert = host.querySelector('.gratitude-events [role="alert"]');
  expect(alert?.textContent).toContain(problemOf(failure).message);
  expect(rowsIn(host)).toEqual([]);

  await act(async () => buttonNamed(host, TRY_AGAIN).click());
  expect(gratitudeEvents).toHaveBeenCalledTimes(2);
  expect(host.querySelector('.gratitude-events [role="alert"]')).toBeNull();
  expect(rowsIn(host)).toHaveLength(EVENTS.events.length);
});

it("closes as a card on an iPad at a swipe down its head past the perforation's drag, not a shorter one", async () => {
  onLargeScreen();
  const host = await openEvents(() => Promise.resolve(EVENTS));
  const head = host.querySelector(".gratitude-events .bottom-sheet__head");
  dragBy(head, [0, DISMISS_PX]);
  expect(host.querySelector(".gratitude-events")).not.toBeNull();
  dragBy(head, [0, DISMISS_PX * 2]);
  expect(host.querySelector(".gratitude-events")).toBeNull();
});
