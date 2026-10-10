// @vitest-environment happy-dom
import type { UserStats } from "@drawing-app/api/client";
import { act, createRef, useState, type Ref } from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { ApiError } from "../../api/apiClient";
import { errorDetail } from "../../i18n/errorMessage";
import { errors } from "../../i18n/strings/errors";
import { formatDay } from "../../stickers/format";
import { buttonNamed, renderInHost, type HostView } from "../../ui/testing";
import { StatCork, type StatCorkHandle } from "./StatCork";
import { statFigures } from "./statFigures";

/** A new artist's stats as the API sends them: zeros, not nulls. */
const NEW_ARTIST: UserStats = {
  since: "2026-09-26T09:00:00.000Z",
  made: 0,
  received: 0,
  given: 0,
  gratitude: { direct: 0, residual: 0, total: 0 },
  bests: { bestCombo: 0, mostGratitudeInADay: 0, longestStreak: 0 },
  streak: 0,
};

const FAILURE = {
  error: new ApiError(0, { error: "network", detail: "GET /api/stats got no answer" }),
  retry: () => {},
};

let view: HostView;

const render = (
  stats: UserStats | null,
  {
    onFlipBack = () => {},
    loading = false,
    cork,
  }: { onFlipBack?: () => void; loading?: boolean; cork?: Ref<StatCorkHandle> } = {},
) =>
  view.rerender(
    <StatCork
      ref={cork}
      figures={{
        name: "Mika",
        handle: "mika",
        own: false,
        loading,
        failure: stats || loading ? null : FAILURE,
        since: null,
        ...statFigures(stats),
      }}
      onFlipBack={onFlipBack}
      flipBackRef={null}
    />,
  );

/** What a screen reader hears from `element`: its text without the parts hidden from it. */
function spoken(element: Element | null) {
  const copy = element?.cloneNode(true);
  if (!(copy instanceof Element)) return "";
  copy.querySelectorAll("[aria-hidden]").forEach((hidden) => hidden.remove());
  return copy.textContent ?? "";
}

/** Rows of term and value, as each reads out. */
const rows = (selector: string) =>
  Object.fromEntries(
    [...view.host.querySelectorAll(selector)].map(
      (row) => [spoken(row.querySelector("dt")), spoken(row.querySelector("dd"))] as const,
    ),
  );

const receipt = () => view.host.querySelector(".stat-board__receipt");

beforeEach(() => {
  view = renderInHost();
});

afterEach(() => {
  view.unmount();
});

describe("StatCork's receipt", () => {
  const total = () => spoken(view.host.querySelector(".stat-board__receipt-total b"));

  it("shows everything received as one total, Direct and Residual together", () => {
    render({ ...NEW_ARTIST, gratitude: { direct: 2460, residual: 395, total: 2855 } });
    expect(total()).toBe("2,855");
  });

  it("says there's no gratitude yet in place of a total of 0", () => {
    render(NEW_ARTIST);
    expect(view.host.querySelector(".stat-board__receipt-total")).toBeNull();
    expect(receipt()?.textContent).toContain("No gratitude yet.");
  });

  it("is dated the day the cork shows, not the day it mounted, unseen, behind the board", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    onTestFinished(() => void vi.useRealTimers());
    const printed = () =>
      view.host.querySelector(".stat-board__receipt-top > :last-child")?.textContent;
    // Just before midnight in Tokyo, where the day turns over.
    vi.setSystemTime(new Date("2026-10-09T14:58:00Z"));
    const cork = createRef<StatCorkHandle>();
    render(NEW_ARTIST, { cork });
    const mounted = printed();

    vi.setSystemTime(new Date("2026-10-09T15:02:00Z"));
    // The board lands on the cork.
    act(() => cork.current?.settle());
    expect(printed()).toBe(formatDay(Date.now()));
    expect(printed()).not.toBe(mounted);
  });

  it("says why the stats didn't load in place of the total", () => {
    render(null);
    expect(receipt()?.textContent).toContain(errors.network.en);
    expect(receipt()?.textContent).toContain(errorDetail(FAILURE.error));
    expect(view.host.querySelector(".stat-board__receipt-total")).toBeNull();
  });
});

describe("StatCork while the stats load", () => {
  it("draws outlines and one status line, not the dashes a failure leaves", () => {
    render(null, { loading: true });
    expect(view.host.textContent).not.toContain("not known");
    expect(view.host.textContent).not.toContain("–");
    expect(view.host.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    expect(view.host.querySelector('[role="status"]')?.textContent).toBe("Loading Mika’s stats");
  });

  it("says nothing more once they've loaded", () => {
    render(NEW_ARTIST);
    expect(view.host.querySelector('[role="status"]')?.textContent).toBe("");
    expect(view.host.querySelector(".skeleton")).toBeNull();
  });
});

/** A stat board whose receipt failed: Try again loads again, which takes the failure off the receipt. */
function Reloading({ onFlipBack }: { onFlipBack: () => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <StatCork
      figures={{
        name: "Mika",
        handle: "mika",
        own: false,
        loading,
        failure: loading ? null : { ...FAILURE, retry: () => setLoading(true) },
        since: null,
        ...statFigures(null),
      }}
      onFlipBack={onFlipBack}
      flipBackRef={null}
    />
  );
}

describe("StatCork's Try again", () => {
  it("keeps focus on the stat board as the failure goes, so Escape still turns it back", () => {
    const onFlipBack = vi.fn();
    view.rerender(<Reloading onFlipBack={onFlipBack} />);
    const tryAgain = buttonNamed(view.host, "Try again");
    act(() => tryAgain.focus());
    act(() => tryAgain.click());

    expect(view.host.querySelector('[role="alert"]')).toBeNull();
    expect(document.activeElement).toBe(view.host.querySelector(".stat-board"));
    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(onFlipBack).toHaveBeenCalledOnce();
  });
});

describe("StatCork's Bests", () => {
  const bests = () => rows(".stat-board__scrap-rows > div");

  it("says None yet for every best a new artist hasn't set", () => {
    render(NEW_ARTIST);
    expect(bests()).toEqual({
      "Longest streak": "None yet",
      "Best combo": "None yet",
      "Best day": "None yet",
    });
  });

  it("shows the bests someone has set, Best combo in hits", () => {
    render({
      ...NEW_ARTIST,
      bests: { bestCombo: 64, mostGratitudeInADay: 1210, longestStreak: 9 },
    });
    expect(bests()).toEqual({
      "Longest streak": "9 days",
      "Best combo": "64 hits",
      "Best day": "1,210",
    });
  });

  it("marks every best as not known when the stats didn't load", () => {
    render(null);
    expect(bests()).toEqual({
      "Longest streak": "not known",
      "Best combo": "not known",
      "Best day": "not known",
    });
  });
});

describe("StatCork's Flip back", () => {
  it("comes first on the stat board, before the papers, for keyboards and screen readers too", () => {
    // The receipt's Try again is a button among the papers.
    render(null);
    const buttons = [...view.host.querySelectorAll(".stat-board__cork button")].map(
      (b) => b.textContent,
    );
    expect(buttons).toContain("Try again");
    expect(buttons[0]).toBe("Flip back");
  });
});

describe("StatCork's bare cork", () => {
  it("turns the board back for a tap on it", () => {
    const onFlipBack = vi.fn();
    render(NEW_ARTIST, { onFlipBack });
    act(() => view.host.querySelector<HTMLElement>(".stat-board__cork")?.click());
    expect(onFlipBack).toHaveBeenCalledOnce();
  });
});
