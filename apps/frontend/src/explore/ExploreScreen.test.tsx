// @vitest-environment happy-dom
import type { ActivityEntry, Explore, Person } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { people, sticker } from "../api/testFixtures";
import { emptyApi, renderWithApi, TEST_OWNER } from "../api/testing";
import { ExploreScreen } from "./ExploreScreen";

const NOW = Date.parse("2026-09-26T12:00:00.000Z");
const MINUTE = 60_000;
const minutesAgo = (minutes: number) => new Date(NOW - minutes * MINUTE).toISOString();

const exploreWith = (
  activity: ActivityEntry[],
  longestStreak: Explore["leaderboards"]["longestStreak"] = [],
): Explore => ({
  todaysStickers: [],
  activity,
  leaderboards: { weekStart: minutesAgo(0), mostGratitude: [], bestCombo: [], longestStreak },
});

let view: ReturnType<typeof renderWithApi> | undefined;
beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.useRealTimers();
});

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const textsOf = (host: HTMLElement, selector: string) =>
  [...host.querySelectorAll(selector)].map((element) => element.textContent);

/** Explore as you, on `explore`; a search finds everyone whose handle holds it. */
async function openExplore(explore: Explore) {
  const everyone: Person[] = Object.values(people);
  view = renderWithApi(
    <ExploreScreen onOpenArtist={() => {}} onOpenMyBoard={() => {}} />,
    emptyApi({
      explore: () => Promise.resolve(explore),
      searchUsers: (handle) => Promise.resolve(everyone.filter((p) => p.handle?.includes(handle))),
    }),
  );
  await wait(0);
  return view.host;
}

/** Types `text` into the search box and waits out its pause for typing. */
async function searchFor(host: HTMLElement, text: string) {
  const search = host.querySelector<HTMLInputElement>('input[type="search"]');
  if (!search) throw new Error("no search box");
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, text);
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(1000);
}

describe("ExploreScreen", () => {
  it("says who made or gave each sticker, in one sentence with the people in bold", async () => {
    const drawn = sticker();
    const host = await openExplore(
      exploreWith([
        { type: "sealed", at: minutesAgo(5), sticker: drawn },
        {
          type: "received",
          at: minutesAgo(3 * 60),
          sticker: drawn,
          giver: people.mika,
          receiver: people.ken,
        },
        {
          type: "received",
          at: minutesAgo(2 * 24 * 60),
          sticker: drawn,
          giver: people.ken,
          receiver: TEST_OWNER,
        },
      ]),
    );

    expect(textsOf(host, ".feed-head p")).toEqual([
      "@mika made a sticker",
      "@mika gave a sticker to @ken",
      "@ken gave a sticker to you",
    ]);
    expect(textsOf(host, ".feed-head p b")).toEqual(["@mika", "@mika", "@ken", "@ken", "you"]);
    expect(textsOf(host, ".feed-head > .fine")).toEqual(["5 min", "3 hr", "2 d"]);
  });

  it("prints a handle as it is, even one that reads as markup or a variable", async () => {
    const odd = { ...people.bob, handle: "<i>{{bob}}</i>" };
    const host = await openExplore(
      exploreWith([{ type: "sealed", at: minutesAgo(5), sticker: sticker({ artist: odd }) }]),
    );

    expect(textsOf(host, ".feed-head p")).toEqual(["@<i>{{bob}}</i> made a sticker"]);
    expect(host.querySelector(".feed-meta")?.textContent).toMatch(/ · @<i>\{\{bob\}\}<\/i>$/);
  });

  it("counts streak days and found artists in the singular and the plural", async () => {
    const host = await openExplore(
      exploreWith(
        [],
        [
          { person: people.mika, value: 3 },
          { person: people.ken, value: 1 },
        ],
      ),
    );
    const streakTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find(
      (tab) => tab.textContent === "Longest streak",
    );
    act(() => streakTab?.click());
    expect(textsOf(host, ".figure small")).toEqual(["days", "day"]);

    await searchFor(host, "k");
    expect(host.querySelector(".results-count")?.textContent).toBe("2 artists");
    await searchFor(host, "bo");
    expect(host.querySelector(".results-count")?.textContent).toBe("1 artist");
  });
});

describe("a name's link", () => {
  it("opens the board of whoever holds the name, once", async () => {
    const onOpenArtist = vi.fn();
    view = renderWithApi(
      <ExploreScreen boardOf="mika" onOpenArtist={onOpenArtist} onOpenMyBoard={vi.fn()} />,
      emptyApi({
        explore: () => new Promise(() => {}),
        personByEnsLabel: (label) =>
          label === "mika" ? Promise.resolve(people.mika) : Promise.reject(new Error(label)),
      }),
    );
    await wait(0);
    await wait(0);
    expect(onOpenArtist.mock.calls).toEqual([[people.mika]]);
  });

  it("says so when nobody holds the name", async () => {
    view = renderWithApi(
      <ExploreScreen boardOf="nobody" onOpenArtist={vi.fn()} onOpenMyBoard={vi.fn()} />,
      emptyApi({ explore: () => new Promise(() => {}) }),
    );
    await wait(0);
    expect(document.querySelector('[role="alert"] h2')?.textContent).toBe(
      "Couldn’t load nobody.croquis.eth",
    );
  });
});
