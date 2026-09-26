// @vitest-environment happy-dom
import type { UserStats } from "@drawing-app/api/client";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  gratitude: { inspired: 0, magic: 0, asOriginalArtist: 0, total: 0 },
  bests: { bestCombo: 0, mostGratitudeInADay: 0, longestStreak: 0 },
  streak: 0,
};

let host: HTMLDivElement;
let root: Root;

const render = (stats: UserStats | null) =>
  act(() =>
    root.render(
      <StatCork
        figures={{
          name: "Mika",
          handle: "mika",
          ensName: null,
          own: false,
          failure: null,
          since: null,
          ...statFigures(stats),
        }}
        onFlipBack={() => {}}
        flipBackRef={null}
      />,
    ),
  );

/** Each of the Bests scrap's rows, as its label and what it shows. */
const bests = () =>
  Object.fromEntries(
    [...host.querySelectorAll(".stat-board__scrap-rows > div")].map(
      (row) =>
        [
          row.querySelector("dt")?.firstChild?.textContent ?? "",
          row.querySelector("dd")?.textContent ?? "",
        ] as const,
    ),
  );

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("StatCork's Bests", () => {
  it("says None yet for every best a new artist hasn't set", () => {
    render(NEW_ARTIST);
    expect(bests()).toEqual({
      "Longest streak": "None yet",
      "Best combo": "None yet",
      "Most gratitude in a day": "None yet",
    });
  });

  it("shows the bests someone has set", () => {
    render({
      ...NEW_ARTIST,
      bests: { bestCombo: 64, mostGratitudeInADay: 1210, longestStreak: 9 },
    });
    expect(bests()).toEqual({
      "Longest streak": "9 days",
      "Best combo": "×64",
      "Most gratitude in a day": "1,210",
    });
  });

  it("marks every best as not known when the stats didn't load", () => {
    render(null);
    expect(bests()).toEqual({
      "Longest streak": "–not known",
      "Best combo": "–not known",
      "Most gratitude in a day": "–not known",
    });
  });
});
