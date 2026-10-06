// @vitest-environment happy-dom
import type { UserStats } from "@drawing-app/api/client";
import { act, useState } from "react";
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

const FAILURE = {
  message: "the network is down",
  detail: "GET /api/stats got no answer",
  retry: () => {},
};

let host: HTMLDivElement;
let root: Root;

const render = (
  stats: UserStats | null,
  { onFlipBack = () => {}, loading = false }: { onFlipBack?: () => void; loading?: boolean } = {},
) =>
  act(() =>
    root.render(
      <StatCork
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

  it("says on each row which gratitude it counts, after its amount", () => {
    render({ ...NEW_ARTIST, gratitude: { direct: 2460, residual: 395, total: 2855 } });
    const glosses = [...host.querySelectorAll(".stat-board__receipt-rows > div")].map((row) => {
      const [, amount, gloss] = [...row.children];
      expect(amount?.tagName).toBe("DD");
      return gloss?.textContent;
    });
    expect(glosses.every(Boolean)).toBe(true);
    expect(new Set(glosses).size).toBe(2);
  });

  it("leaves a kind of gratitude at 0 off", () => {
    render({ ...NEW_ARTIST, gratitude: { direct: 80, residual: 0, total: 80 } });
    expect(rows(".stat-board__receipt-rows > div")).toEqual({ Direct: "80" });
  });

  it("says why the stats didn't load in place of the rows", () => {
    render(null);
    expect(receipt()?.textContent).toContain(`Their stats didn’t load: ${FAILURE.message}`);
    expect(receipt()?.textContent).toContain(FAILURE.detail);
    expect(host.querySelector(".stat-board__receipt-rows")).toBeNull();
  });
});

describe("StatCork while the stats load", () => {
  it("draws outlines and one status line, not the dashes a failure leaves", () => {
    render(null, { loading: true });
    expect(host.textContent).not.toContain("not known");
    expect(host.textContent).not.toContain("–");
    expect(host.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    expect(host.querySelector('[role="status"]')?.textContent).toBe("Loading Mika’s stats");
  });

  it("says nothing more once they've loaded", () => {
    render(NEW_ARTIST);
    expect(host.querySelector('[role="status"]')?.textContent).toBe("");
    expect(host.querySelector(".skeleton")).toBeNull();
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
    act(() => root.render(<Reloading onFlipBack={onFlipBack} />));
    const tryAgain = [...host.querySelectorAll("button")].find(
      (b) => b.textContent === "Try again",
    );
    act(() => tryAgain?.focus());
    act(() => tryAgain?.click());

    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector(".stat-board"));
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
  it("turns the board back for a tap on it", () => {
    const onFlipBack = vi.fn();
    render(NEW_ARTIST, { onFlipBack });
    act(() => host.querySelector<HTMLElement>(".stat-board__cork")?.click());
    expect(onFlipBack).toHaveBeenCalledOnce();
  });
});
