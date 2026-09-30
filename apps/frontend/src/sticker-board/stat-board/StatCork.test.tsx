// @vitest-environment happy-dom
import type { UserStats } from "@drawing-app/api/client";
import { act, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatCork } from "./StatCork";
import { statFigures } from "./statFigures";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

const FAILURE = "Your stats didn’t load: the network is down";

let host: HTMLDivElement;
let root: Root;

const render = (
  stats: UserStats | null,
  { onFlipBack = () => {}, children }: { onFlipBack?: () => void; children?: ReactNode } = {},
) =>
  act(() =>
    root.render(
      <StatCork
        figures={{
          name: "Mika",
          handle: "mika",
          ensName: null,
          own: false,
          failure: stats ? null : FAILURE,
          since: null,
          ...statFigures(stats),
        }}
        onFlipBack={onFlipBack}
        flipBackRef={null}
      >
        {children}
      </StatCork>,
    ),
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
    [...host.querySelectorAll(selector)].map(
      (row) => [spoken(row.querySelector("dt")), spoken(row.querySelector("dd"))] as const,
    ),
  );

const receipt = () => host.querySelector(".stat-board__receipt");

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("StatCork's receipt", () => {
  it("lists Direct and Residual gratitude above the total", () => {
    render({ ...NEW_ARTIST, gratitude: { direct: 2460, residual: 395, total: 2855 } });
    expect(rows(".stat-board__receipt-rows > div")).toEqual({ Direct: "2,460", Residual: "395" });
    expect(spoken(host.querySelector(".stat-board__receipt-total b"))).toBe("2,855");
  });

  it("leaves a kind of gratitude at 0 off", () => {
    render({ ...NEW_ARTIST, gratitude: { direct: 80, residual: 0, total: 80 } });
    expect(rows(".stat-board__receipt-rows > div")).toEqual({ Direct: "80" });
  });

  it("says why the stats didn't load in place of the rows", () => {
    render(null);
    expect(receipt()?.textContent).toContain(FAILURE);
    expect(host.querySelector(".stat-board__receipt-rows")).toBeNull();
  });
});

describe("StatCork's Bests", () => {
  const bests = () => rows(".stat-board__scrap-rows > div");

  it("says None yet for every best a new artist hasn't set", () => {
    render(NEW_ARTIST);
    expect(bests()).toEqual({
      "Longest streak": "None yet",
      "Best combo": "None yet",
      "Most gratitude in a day": "None yet",
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
      "Most gratitude in a day": "1,210",
    });
  });

  it("marks every best as not known when the stats didn't load", () => {
    render(null);
    expect(bests()).toEqual({
      "Longest streak": "not known",
      "Best combo": "not known",
      "Most gratitude in a day": "not known",
    });
  });
});

describe("StatCork's bare cork", () => {
  it("turns the board back, but not for a tap or Escape in a window a paper opened over it", () => {
    const onFlipBack = vi.fn();
    // World ID's window is a paper's, drawn in the page's body rather than on the cork.
    render(NEW_ARTIST, {
      onFlipBack,
      children: createPortal(<div className="window-over-cork" />, document.body),
    });
    const over = document.querySelector(".window-over-cork");
    act(() => {
      over?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      over?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onFlipBack).not.toHaveBeenCalled();

    act(() => host.querySelector<HTMLElement>(".stat-board__cork")?.click());
    expect(onFlipBack).toHaveBeenCalledOnce();
  });
});
