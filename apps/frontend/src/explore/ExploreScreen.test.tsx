// @vitest-environment happy-dom
import type { ActivityEntry, Explore, Person } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { people, sticker } from "../api/testFixtures";
import { emptyApi, renderWithApi, TEST_OWNER } from "../api/testing";
import { i18next } from "../i18n/i18n";
import { ExploreScreen } from "./ExploreScreen";

// 21:00 on 9.26 in Tokyo.
const NOW = Date.parse("2026-09-26T12:00:00.000Z");
const MINUTE = 60_000;
const minutesAgo = (minutes: number) => new Date(NOW - minutes * MINUTE).toISOString();

const exploreWith = (
  activity: ActivityEntry[],
  boards: Partial<Explore["leaderboards"]> = {},
): Explore => ({
  todaysStickers: [],
  activity,
  leaderboards: {
    weekStart: minutesAgo(0),
    mostGratitude: [],
    bestCombo: [],
    longestStreak: [],
    ...boards,
  },
});

let view: ReturnType<typeof renderWithApi> | undefined;
beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  globalThis.ResizeObserver ??= StillResizeObserver;
});

/** happy-dom has no ResizeObserver; the pile's width never changes here. */
class StillResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
afterEach(async () => {
  view?.unmount();
  view = undefined;
  vi.useRealTimers();
  vi.unstubAllEnvs();
  localStorage.clear();
  await i18next.changeLanguage("en");
});

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const textsOf = (host: HTMLElement, selector: string) =>
  [...host.querySelectorAll(selector)].map((element) => element.textContent);
const labelsOf = (host: HTMLElement, selector: string) =>
  [...host.querySelectorAll(selector)].map((element) => element.getAttribute("aria-label"));

/** Explore as you, on `explore`; a search finds everyone whose handle holds it. */
async function openExplore(explore: Explore, onOpenArtist: (person: Person) => void = () => {}) {
  const everyone: Person[] = Object.values(people);
  view = renderWithApi(
    <ExploreScreen onOpenArtist={onOpenArtist} onOpenMyBoard={() => {}} />,
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

const tab = (host: HTMLElement, name: string) => {
  const found = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find(
    (element) => element.textContent === name,
  );
  if (!found) throw new Error(`no ${name} tab`);
  return found;
};

describe("ExploreScreen's sticker pile", () => {
  it("names each sticker for screen readers, newest day and newest sticker first", async () => {
    const newest = sticker({ sealedAt: minutesAgo(0.5), artist: people.mika });
    const older = sticker({ sealedAt: minutesAgo(5), artist: people.ken });
    const yesterday = sticker({ sealedAt: minutesAgo(26 * 60), artist: people.bob });
    const host = await openExplore(
      exploreWith([
        { type: "sealed", at: newest.sealedAt, sticker: newest },
        { type: "sealed", at: older.sealedAt, sticker: older },
        { type: "sealed", at: yesterday.sealedAt, sticker: yesterday },
      ]),
    );

    expect(textsOf(host, ".pile-day h2")).toEqual(["Today", "Yesterday"]);
    expect(labelsOf(host, ".pile-sticker__button")).toEqual([
      `No.0${newest.number} by @mika, just now`,
      `No.0${older.number} by @ken, 5 min ago`,
      `No.0${yesterday.number} by @bob, 1 day ago`,
    ]);
    expect(textsOf(host, ".pile-tag__name")).toEqual(["@mika", "@ken", "@bob"]);
  });

  it("tags a given sticker with who it went to, in aqua", async () => {
    const given = sticker({ sealedAt: minutesAgo(30), artist: people.mika });
    const host = await openExplore(
      exploreWith([
        {
          type: "received",
          at: minutesAgo(10),
          sticker: given,
          giver: people.mika,
          receiver: people.ken,
        },
      ]),
    );
    expect(textsOf(host, ".pile-tag--to")).toEqual(["to @ken"]);
    expect(labelsOf(host, ".pile-sticker__button")).toEqual([
      `No.0${given.number} by @mika, 30 min ago, given to @ken`,
    ]);
  });

  it("says just now for anything under a minute ago, in English and Japanese", async () => {
    const drawn = sticker({ sealedAt: new Date(NOW - MINUTE + 1000).toISOString() });
    const host = await openExplore(
      exploreWith([{ type: "sealed", at: drawn.sealedAt, sticker: drawn }]),
    );

    expect(labelsOf(host, ".pile-sticker__button")[0]).toMatch(/, just now$/);
    await act(() => i18next.changeLanguage("ja"));
    expect(labelsOf(host, ".pile-sticker__button")[0]).toMatch(/、たった今$/);
  });

  it("prints a handle as it is, even one that reads as markup or a variable", async () => {
    const odd = { ...people.bob, handle: "<i>{{bob}}</i>" };
    const drawn = sticker({ sealedAt: minutesAgo(5), artist: odd });
    const host = await openExplore(
      exploreWith([
        { type: "received", at: minutesAgo(1), sticker: drawn, giver: odd, receiver: odd },
      ]),
    );
    expect(textsOf(host, ".pile-tag__name")).toEqual(["@<i>{{bob}}</i>", "to @<i>{{bob}}</i>"]);
    expect(labelsOf(host, ".pile-sticker__button")[0]).toContain("by @<i>{{bob}}</i>,");
  });

  it("lifts a tapped sticker off the pile into a sheet", async () => {
    const drawn = sticker({ sealedAt: minutesAgo(5), artist: people.mika });
    const host = await openExplore(
      exploreWith([{ type: "sealed", at: drawn.sealedAt, sticker: drawn }]),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    act(() => host.querySelector<HTMLElement>(".pile-sticker__button")?.click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("shows today's empty floor before anyone seals", async () => {
    const host = await openExplore(exploreWith([]));
    expect(textsOf(host, ".pile-day h2")).toEqual(["Today"]);
    expect(host.querySelector(".pile-day__empty")?.textContent).toBe(
      "The first sticker sealed today lands here.",
    );
  });
});

/** Reduced motion swaps a leaderboard's rows at once, rather than after the old ones fade out. */
function reduceMotion() {
  const matchMedia = window.matchMedia;
  window.matchMedia = (query: string) => {
    const list = matchMedia.call(window, query);
    Object.defineProperty(list, "matches", { value: query.includes("reduce") });
    return list;
  };
  onTestFinished(() => {
    window.matchMedia = matchMedia;
  });
}

/** Opens This week on `boards`, and the leaderboard named `board` on it. */
async function openBoard(board: string, boards: Partial<Explore["leaderboards"]> = {}) {
  reduceMotion();
  const host = await openExplore(exploreWith([], boards));
  act(() => tab(host, "This week").click());
  act(() => tab(host, board).click());
  await wait(500);
  return host;
}

describe("ExploreScreen's This week", () => {
  it("counts streak days and found artists in the singular and the plural", async () => {
    const host = await openBoard("Streak", {
      longestStreak: [
        { person: people.mika, value: 3 },
        { person: people.ken, value: 1 },
      ],
    });
    expect(textsOf(host, ".figure small")).toEqual(["days", "day"]);
    expect(tab(host, "Streak").getAttribute("aria-selected")).toBe("true");
    // The streak's own mark: its fire before each figure, and its tangerine on the tabs' label.
    expect(host.querySelectorAll(".figure--streak svg")).toHaveLength(2);
    expect(host.querySelector(".leaderboard-tabs")?.getAttribute("data-selected")).toBe(
      "longestStreak",
    );

    await searchFor(host, "k");
    expect(host.querySelector(".results-count")?.textContent).toBe("2 artists");
    await searchFor(host, "bo");
    expect(host.querySelector(".results-count")?.textContent).toBe("1 artist");
  });

  it("names a row from what it shows, and says where it goes as its description", async () => {
    const host = await openExplore(
      exploreWith([], {
        mostGratitude: [
          { person: people.mika, value: 1234 },
          { person: TEST_OWNER, value: 12 },
        ],
      }),
    );
    act(() => tab(host, "This week").click());
    const [theirs, yours] = [...host.querySelectorAll<HTMLButtonElement>(".leaderboard button")];
    const descriptionOf = (row: HTMLElement) =>
      document.getElementById(row.getAttribute("aria-describedby") ?? "")?.textContent;

    expect(theirs?.hasAttribute("aria-label")).toBe(false);
    expect(theirs?.textContent).toContain("@mika");
    expect(theirs?.textContent).toContain("1,234 gratitude");
    expect(descriptionOf(theirs)).toBe("@mika's sticker board");
    expect(yours?.hasAttribute("aria-label")).toBe(false);
    expect(yours?.textContent).toContain("You");
    expect(descriptionOf(yours)).toBe("Your sticker board");
  });

  it("gives people on equal figures one rank, and the next place after them", async () => {
    const host = await openBoard("Streak", {
      longestStreak: [
        { person: people.bob, value: 4 },
        { person: people.ken, value: 4 },
        { person: people.mika, value: 1 },
      ],
    });
    expect(textsOf(host, ".rank")).toEqual(["1", "1", "3"]);
  });

  it("tells an empty board how to get on it, each in its own way", async () => {
    reduceMotion();
    const host = await openExplore(exploreWith([]));
    act(() => tab(host, "This week").click());
    const notes = [];
    for (const board of ["Most gratitude", "Best combo", "Streak"]) {
      act(() => tab(host, board).click());
      await wait(500);
      notes.push(host.querySelector(".leaderboard-empty")?.textContent);
    }
    expect(notes.every(Boolean)).toBe(true);
    expect(new Set(notes).size).toBe(notes.length);
  });

  it("says when the weekly boards reset in the person's own time, and not on streaks", async () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    // A week began at 00:00 on Monday 9.21 in Tokyo, so the next begins 8:00 AM Sunday in Los Angeles.
    const host = await openBoard("Best combo", { weekStart: "2026-09-20T15:00:00.000Z" });
    expect(host.querySelector(".week-resets")?.textContent).toBe("Resets Sunday 8:00 AM");

    act(() => tab(host, "Streak").click());
    await wait(500);
    expect(host.querySelector(".week-resets")).toBeNull();
  });

  it("moves between the views with the arrow keys", async () => {
    const host = await openExplore(exploreWith([]));
    act(() => {
      tab(host, "Stickers").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(tab(host, "This week").getAttribute("aria-selected")).toBe("true");
    expect(host.querySelector(".leaderboard")).not.toBeNull();
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

/** A promise and the function that answers it, for a request still in flight. */
function inFlight<T>() {
  let answer: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => (answer = resolve));
  return { promise, answer };
}

const EXPLORE: Explore = exploreWith([
  { type: "sealed", at: minutesAgo(3), sticker: sticker({ sealedAt: minutesAgo(3) }) },
]);

function show(client: Parameters<typeof renderWithApi>[1]) {
  view = renderWithApi(<ExploreScreen onOpenArtist={vi.fn()} onOpenMyBoard={vi.fn()} />, client);
  return view.host;
}

const skeletons = (host: HTMLElement) => host.querySelectorAll(".skeleton").length;
/** The one line a screen reader hears while a view loads. */
const loadingLine = (host: HTMLElement) =>
  host.querySelector('.explore-view [role="status"]')?.textContent;
/** What a search says to screen readers: a line that's in the page before the search starts. */
const searchLine = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('.artist-search + [role="status"]');

describe("ExploreScreen while it loads", () => {
  it("outlines today's floor, then shows the pile once Explore arrives", async () => {
    const explore = inFlight<Explore>();
    const host = show(emptyApi({ explore: () => explore.promise }));
    expect(loadingLine(host)).toBe("Loading Explore");
    expect(skeletons(host)).toBeGreaterThan(0);

    await act(async () => explore.answer(EXPLORE));
    expect(skeletons(host)).toBe(0);
    expect(host.querySelectorAll(".pile-sticker")).toHaveLength(1);
  });

  it("outlines search results while the search is out", async () => {
    const search = inFlight<Person[]>();
    const host = show(
      emptyApi({ explore: () => Promise.resolve(EXPLORE), searchUsers: () => search.promise }),
    );
    await searchFor(host, "ali");
    expect(skeletons(host)).toBeGreaterThan(0);

    await act(async () => search.answer([]));
    expect(skeletons(host)).toBe(0);
  });
});

describe("ExploreScreen's search", () => {
  it("says it's searching, then what it found, on a line that was in the page before", async () => {
    const search = inFlight<Person[]>();
    const host = show(
      emptyApi({ explore: () => Promise.resolve(EXPLORE), searchUsers: () => search.promise }),
    );
    const line = searchLine(host);
    expect(line?.textContent).toBe("");

    await searchFor(host, "ali");
    expect(line?.textContent).toBe("Searching…");
    await act(async () => search.answer([people.mika, people.ken]));
    expect(line?.textContent).toBe("2 artists");
    expect(searchLine(host)).toBe(line);
  });

  it("says when it found no one, and goes quiet once the search is cleared", async () => {
    const host = await openExplore(exploreWith([]));
    await searchFor(host, "zzz");
    expect(searchLine(host)?.textContent).toBe("No one here is @zzz yet");

    await searchFor(host, "");
    expect(searchLine(host)?.textContent).toBe("");
  });

  it("puts focus back in the field when clearing takes the clear button away", async () => {
    const host = await openExplore(exploreWith([]));
    await searchFor(host, "mi");
    const clear = host.querySelector<HTMLButtonElement>(".search-clear");
    clear?.focus();
    act(() => clear?.click());

    expect(host.querySelector(".search-clear")).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('input[type="search"]'));
  });
});
