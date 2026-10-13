// @vitest-environment happy-dom
import type { Explore, Person, PileSticker, Sticker } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { people, sticker } from "../api/testFixtures";
import { emptyApi, renderWithApi, TEST_ME, TEST_OWNER } from "../api/testing";
import { inLanguage, onLargeScreen, stubResizeObservers } from "../ui/testing";
import { TWO_COLUMNS_MIN_WIDTH } from "./exploreColumns";
import { ExploreScreen } from "./ExploreScreen";

// 21:00 on 9.26 in Tokyo.
const NOW = Date.parse("2026-09-26T12:00:00.000Z");
const MINUTE = 60_000;
const minutesAgo = (minutes: number) => new Date(NOW - minutes * MINUTE).toISOString();

/** Stickers as a page of the pile holds them, none given. */
const unGiven = (...stickers: Sticker[]): PileSticker[] =>
  stickers.map((s) => ({ sticker: s, givenTo: null }));

/** Explore whose pile's first page is `stickers`, newest first, with older pages from `before`. */
const exploreWith = (
  stickers: PileSticker[],
  boards: Partial<Explore["leaderboards"]> = {},
  before: string | null = null,
): Explore => ({
  pile: { stickers, before },
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
  vi.stubGlobal("IntersectionObserver", EndObserver);
});

/** Watches as the pile does; `reachEnd` brings what it watches into view, as scrolling near does. */
class EndObserver implements IntersectionObserver {
  static watching = new Set<EndObserver>();
  readonly root = null;
  readonly rootMargin = "";
  readonly scrollMargin = "";
  readonly thresholds = [];
  private targets: Element[] = [];
  private readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.targets.push(target);
    EndObserver.watching.add(this);
  }
  unobserve() {}
  disconnect() {
    EndObserver.watching.delete(this);
  }
  takeRecords() {
    return [];
  }
  seen() {
    const entries = this.targets.map((target) => {
      const rect = target.getBoundingClientRect();
      return {
        target,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: rect,
        intersectionRect: rect,
        rootBounds: null,
        time: 0,
      };
    });
    this.callback(entries, this);
  }
}

/** Scrolls the pile's end into view, and lets what that asks for land. */
async function reachEnd() {
  for (const observer of [...EndObserver.watching]) act(() => observer.seen());
  await wait(0);
}

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
  vi.unstubAllGlobals();
  EndObserver.watching.clear();
  localStorage.clear();
});

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const textsOf = (host: HTMLElement, selector: string) =>
  [...host.querySelectorAll(selector)].map((element) => element.textContent);
const labelsOf = (host: HTMLElement, selector: string) =>
  [...host.querySelectorAll(selector)].map((element) => element.getAttribute("aria-label"));

/** Explore as you, on `explore`; a search finds everyone whose handle holds it. */
async function openExplore(explore: Explore, api: Partial<ApiClient> = {}) {
  const everyone: Person[] = Object.values(people);
  view = renderWithApi(
    <ExploreScreen onOpenArtist={() => {}} onOpenMyBoard={() => {}} covered={false} />,
    emptyApi({
      explore: () => Promise.resolve(explore),
      searchUsers: (handle) => Promise.resolve(everyone.filter((p) => p.handle?.includes(handle))),
      ...api,
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
    const host = await openExplore(exploreWith(unGiven(newest, older, yesterday)));

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
    const host = await openExplore(exploreWith([{ sticker: given, givenTo: people.ken }]));
    expect(textsOf(host, ".pile-tag--to")).toEqual(["@ken"]);
    expect(labelsOf(host, ".pile-sticker__button")).toEqual([
      `No.0${given.number} by @mika, 30 min ago, given to @ken`,
    ]);
    await inLanguage("ja");
    expect(textsOf(host, ".pile-tag--to")).toEqual(["@ken"]);
  });

  it("says just now for anything under a minute ago, in English and Japanese", async () => {
    const drawn = sticker({ sealedAt: new Date(NOW - MINUTE + 1000).toISOString() });
    const host = await openExplore(exploreWith(unGiven(drawn)));

    expect(labelsOf(host, ".pile-sticker__button")[0]).toMatch(/, just now$/);
    await inLanguage("ja");
    expect(labelsOf(host, ".pile-sticker__button")[0]).toMatch(/、たった今$/);
  });

  it("prints a handle as it is, even one that reads as markup or a variable", async () => {
    const odd = { ...people.bob, handle: "<i>{{bob}}</i>" };
    const drawn = sticker({ sealedAt: minutesAgo(5), artist: odd });
    const host = await openExplore(exploreWith([{ sticker: drawn, givenTo: odd }]));
    expect(textsOf(host, ".pile-tag__name")).toEqual(["@<i>{{bob}}</i>", "@<i>{{bob}}</i>"]);
    expect(labelsOf(host, ".pile-sticker__button")[0]).toContain("by @<i>{{bob}}</i>,");
  });

  it("lifts a tapped sticker off the pile into a sheet", async () => {
    const drawn = sticker({ sealedAt: minutesAgo(5), artist: people.mika });
    const host = await openExplore(exploreWith(unGiven(drawn)));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    act(() => host.querySelector<HTMLElement>(".pile-sticker__button")?.click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("lets go of the fall-in once the stickers have landed", async () => {
    const animate = vi.spyOn(Element.prototype, "animate");
    onTestFinished(() => animate.mockRestore());
    const drawn = sticker({ sealedAt: minutesAgo(5) });
    const host = await openExplore(exploreWith(unGiven(drawn)));
    await wait(1000);
    expect(host.querySelector("[data-falling]")).not.toBeNull();

    // happy-dom ends an animation on a real timer, which fake timers don't move.
    for (const played of animate.mock.results) if (played.type === "return") played.value.finish();
    await wait(0);
    expect(host.querySelector("[data-falling]")).toBeNull();
    expect(host.querySelector(".pile-sticker__air")).toBeNull();
    expect(host.querySelector(".pile-sticker__image")?.getAttribute("loading")).toBe("lazy");
  });

  it("shows today's empty floor before anyone seals", async () => {
    const host = await openExplore(exploreWith([]));
    expect(textsOf(host, ".pile-day h2")).toEqual(["Today"]);
    expect(host.querySelector(".pile-day__empty")?.textContent).toBe(
      "The first sticker sealed today lands here.",
    );
  });
});

/** Each day's heading, and how many stickers lie on it. */
const layersOf = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLElement>(".pile-day")].map((day) => [
    day.querySelector("h2")?.textContent,
    day.querySelectorAll(".pile-sticker").length,
  ]);

/** A cursor, as a page's `before` gives one. */
const CURSOR = "1790000000000-140";

describe("ExploreScreen's older days", () => {
  // 21:00 on 9.26 in Tokyo: yesterday's two are at 20:00 and 15:00, and 9.24's at 19:00.
  const today = sticker({ sealedAt: minutesAgo(5) });
  const yesterdayLate = sticker({ sealedAt: minutesAgo(25 * 60) });
  const yesterdayEarly = sticker({ sealedAt: minutesAgo(30 * 60) });
  const twoDaysAgo = sticker({ sealedAt: minutesAgo(50 * 60) });
  const firstPage = exploreWith(unGiven(today, yesterdayLate), {}, CURSOR);
  const lastPage = { stickers: unGiven(yesterdayEarly, twoDaysAgo), before: null };

  it("lays the next page out under the pile as its end comes near, joining a day split between pages", async () => {
    const explorePile = vi.fn<ApiClient["explorePile"]>(() => Promise.resolve(lastPage));
    const host = await openExplore(firstPage, { explorePile });
    // Yesterday waits for the rest of its stickers, so its heap doesn't shift as they land.
    expect(layersOf(host)).toEqual([["Today", 1]]);
    expect(explorePile).not.toHaveBeenCalled();
    expect(host.querySelector(".pile-floor")).toBeNull();

    await reachEnd();
    expect(explorePile.mock.calls).toEqual([[CURSOR]]);
    expect(layersOf(host)).toEqual([
      ["Today", 1],
      ["Yesterday", 2],
      ["September 24", 1],
    ]);
    expect(host.querySelector('.sticker-pile [aria-live="polite"]')?.textContent).toBe(
      "Older stickers added, back to September 24",
    );
    // Nothing's older: the floor's end, and no more asking.
    expect(host.querySelector(".pile-floor")).not.toBeNull();
    await reachEnd();
    expect(explorePile).toHaveBeenCalledTimes(1);
  });

  it("says so where the next day would be when a page doesn't load, and Try again asks again", async () => {
    const explorePile = vi
      .fn<ApiClient["explorePile"]>()
      .mockRejectedValueOnce(new ApiError(500, { error: "internal_error" }))
      .mockResolvedValueOnce(lastPage);
    const host = await openExplore(firstPage, { explorePile });
    await reachEnd();
    const alert = host.querySelector('.sticker-pile [role="alert"]');
    expect(alert?.textContent).toContain("Couldn’t load older stickers: ");
    expect(layersOf(host)).toEqual([["Today", 1]]);

    const tryAgain = [...(alert?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === "Try again",
    );
    act(() => tryAgain?.click());
    await wait(0);
    expect(explorePile.mock.calls).toEqual([[CURSOR], [CURSOR]]);
    expect(host.querySelector('.sticker-pile [role="alert"]')).toBeNull();
    expect(layersOf(host).map(([heading]) => heading)).toEqual([
      "Today",
      "Yesterday",
      "September 24",
    ]);
  });

  it("starts the pile over from a fresh first page when your NSFW opt-in changes, showing none of it meanwhile", async () => {
    const explore = vi
      .fn<ApiClient["explore"]>()
      .mockResolvedValueOnce(firstPage)
      .mockReturnValue(new Promise(() => {}));
    const host = await openExplore(firstPage, {
      explore,
      explorePile: () => Promise.resolve(lastPage),
    });
    await reachEnd();
    expect(layersOf(host)).toHaveLength(3);
    view?.setMe({ ...TEST_ME, nsfwOptIn: true });
    await wait(0);
    expect(explore).toHaveBeenCalledTimes(2);
    expect(layersOf(host)).toEqual([]);
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
    // The streak's own mark: its fire before each figure and on its category tab.
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
    const dotted = { ...people.mika, handle: "mika.draws" };
    const host = await openExplore(
      exploreWith([], {
        mostGratitude: [
          { person: dotted, value: 1234 },
          { person: TEST_OWNER, value: 12 },
        ],
      }),
    );
    act(() => tab(host, "This week").click());
    const [theirs, yours] = [...host.querySelectorAll<HTMLButtonElement>(".leaderboard button")];
    const descriptionOf = (row: HTMLElement) =>
      document.getElementById(row.getAttribute("aria-describedby") ?? "")?.textContent;

    expect(theirs?.hasAttribute("aria-label")).toBe(false);
    expect(theirs?.textContent).toContain("@mika.draws");
    expect(theirs?.textContent).toContain("1,234 gratitude");
    expect(descriptionOf(theirs)).toBe("@mika.draws’s sticker board");
    // The handle's break marks would put a space in the row's name.
    expect(theirs?.querySelectorAll("wbr:not([aria-hidden=true])")).toHaveLength(0);
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

  it("moves between ranking categories with the keyboard and shows only the selected ranking", async () => {
    const host = await openBoard("Most gratitude", {
      mostGratitude: [{ person: people.mika, value: 1234 }],
      bestCombo: [{ person: people.ken, value: 64 }],
      longestStreak: [{ person: people.bob, value: 3 }],
    });
    const press = async (name: string, key: string, selected: string, artist: string) => {
      act(() => {
        tab(host, name).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      });
      await wait(500);
      expect(tab(host, selected).getAttribute("aria-selected")).toBe("true");
      expect(document.activeElement).toBe(tab(host, selected));
      expect(host.querySelectorAll(".leaderboard")).toHaveLength(1);
      expect(textsOf(host, ".leaderboard .row-names b")).toEqual([artist]);
    };

    await press("Most gratitude", "ArrowRight", "Best combo", "@ken");
    await press("Best combo", "End", "Streak", "@bob");
    await press("Streak", "Home", "Most gratitude", "@mika");
    await press("Most gratitude", "ArrowLeft", "Streak", "@bob");
  });

  it("remembers the selected ranking after returning from Stickers and searching for an artist", async () => {
    const host = await openBoard("Best combo", {
      mostGratitude: [{ person: people.mika, value: 1234 }],
      bestCombo: [{ person: people.ken, value: 64 }],
    });
    act(() => tab(host, "Stickers").click());
    act(() => tab(host, "This week").click());
    await wait(500);
    expect(tab(host, "Best combo").getAttribute("aria-selected")).toBe("true");
    expect(textsOf(host, ".leaderboard .row-names b")).toEqual(["@ken"]);

    await searchFor(host, "mi");
    expect(textsOf(host, ".search-results .row-names b")).toEqual(["@mika"]);
    await searchFor(host, "");
    expect(tab(host, "Best combo").getAttribute("aria-selected")).toBe("true");
    expect(textsOf(host, ".leaderboard .row-names b")).toEqual(["@ken"]);
  });

  it("can change ranking again after its previous fade finishes while Stickers is open", async () => {
    const animate = vi.spyOn(Element.prototype, "animate");
    onTestFinished(() => animate.mockRestore());
    const host = await openExplore(
      exploreWith([], {
        mostGratitude: [{ person: people.mika, value: 1234 }],
        bestCombo: [{ person: people.ken, value: 64 }],
        longestStreak: [{ person: people.bob, value: 3 }],
      }),
    );
    act(() => tab(host, "This week").click());
    expect(textsOf(host, ".leaderboard .row-names b")).toEqual(["@mika"]);

    act(() => tab(host, "Best combo").click());
    const fade = animate.mock.results.at(-1);
    if (fade?.type !== "return") throw new Error("the ranking's fade did not start");
    act(() => tab(host, "Stickers").click());
    expect(host.querySelectorAll(".leaderboard")).toHaveLength(0);
    // happy-dom ends animations on real timers; finish the fade while its list is detached.
    act(() => fade.value.finish());
    await wait(0);

    act(() => tab(host, "This week").click());
    expect(tab(host, "Best combo").getAttribute("aria-selected")).toBe("true");
    expect(textsOf(host, ".leaderboard .row-names b")).toEqual(["@ken"]);

    const beforeStreak = animate.mock.results.length;
    act(() => tab(host, "Streak").click());
    act(() => {
      for (const played of animate.mock.results.slice(beforeStreak))
        if (played.type === "return") played.value.finish();
    });
    await wait(0);
    expect(tab(host, "Streak").getAttribute("aria-selected")).toBe("true");
    expect(textsOf(host, ".leaderboard .row-names b")).toEqual(["@bob"]);
  });
});

/** A promise and the function that answers it, for a request still in flight. */
function inFlight<T>() {
  let answer: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => (answer = resolve));
  return { promise, answer };
}

const EXPLORE: Explore = exploreWith(unGiven(sticker({ sealedAt: minutesAgo(3) })));

function show(client: Parameters<typeof renderWithApi>[1]) {
  view = renderWithApi(
    <ExploreScreen onOpenArtist={vi.fn()} onOpenMyBoard={vi.fn()} covered={false} />,
    client,
  );
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
  it("keeps a phone pile's older pages, cursor, day, and latest scroll through search", async () => {
    const today = sticker({ sealedAt: minutesAgo(5) });
    const yesterday = sticker({ sealedAt: minutesAgo(25 * 60) });
    const older = sticker({ sealedAt: minutesAgo(50 * 60) });
    const next = sticker({ sealedAt: minutesAgo(75 * 60) });
    const nextCursor = "older-after-search";
    const explorePile = vi.fn<ApiClient["explorePile"]>((before) =>
      Promise.resolve(
        before === CURSOR
          ? { stickers: unGiven(older), before: nextCursor }
          : { stickers: unGiven(next), before: null },
      ),
    );
    const host = await openExplore(exploreWith(unGiven(today, yesterday), {}, CURSOR), {
      explorePile,
    });
    await reachEnd();
    const scroller = host.querySelector<HTMLElement>(".explore");
    const pile = host.querySelector<HTMLElement>(".explore-view");
    if (!scroller || !pile) throw new Error("Explore pile missing");
    const ids = () =>
      [...pile.querySelectorAll<HTMLElement>("[data-pile-id]")].map((el) => el.dataset.pileId);
    const beforeSearch = ids();
    const days = layersOf(host);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(700);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const top = this.matches(".pile-sticker")
        ? 100 + beforeSearch.indexOf(this.dataset.pileId) * 200 - scroller.scrollTop
        : 0;
      return new DOMRect(0, top, 0, 150);
    });
    scroller.scrollTop = 350;
    act(() => {
      scroller.dispatchEvent(new Event("scroll"));
    });

    await searchFor(host, "mi");
    expect(pile.hidden).toBe(true);
    expect(
      pile.querySelector<HTMLButtonElement>(".pile-sticker__button")?.closest("[hidden]"),
    ).toBe(pile);
    scroller.scrollTop = 20;
    act(() => {
      scroller.dispatchEvent(new Event("scroll"));
    });
    await wait(200);
    await searchFor(host, "");

    expect(pile.hidden).toBe(false);
    expect(host.querySelector(".explore-view")).toBe(pile);
    expect(ids()).toEqual(beforeSearch);
    expect(layersOf(host)).toEqual(days);
    expect(scroller.scrollTop).toBe(350);
    expect(explorePile.mock.calls).toEqual([[CURSOR]]);
    await reachEnd();
    expect(explorePile.mock.calls).toEqual([[CURSOR], [nextCursor]]);
    vi.restoreAllMocks();
  });

  it("keeps This week selected through typing, deleting, and Clear", async () => {
    reduceMotion();
    const host = await openExplore(
      exploreWith([], { bestCombo: [{ person: people.ken, value: 64 }] }),
    );
    act(() => tab(host, "This week").click());
    act(() => tab(host, "Best combo").click());

    await searchFor(host, "mik");
    expect(host.querySelector<HTMLElement>(".explore-view")?.hidden).toBe(true);
    await searchFor(host, "mi");
    const clear = host.querySelector<HTMLButtonElement>(".search-clear");
    act(() => clear?.click());

    expect(tab(host, "This week").getAttribute("aria-selected")).toBe("true");
    expect(tab(host, "Best combo").getAttribute("aria-selected")).toBe("true");
    expect(host.querySelector(".explore-view .leaderboard")?.textContent).toContain("@ken");
    expect(host.querySelector<HTMLElement>(".explore-view")?.hidden).toBe(false);
  });

  it("still starts the pile from its first page after switching to This week and back", async () => {
    const today = sticker({ sealedAt: minutesAgo(5) });
    const older = sticker({ sealedAt: minutesAgo(50 * 60) });
    const explorePile = vi.fn<ApiClient["explorePile"]>(() =>
      Promise.resolve({ stickers: unGiven(older), before: null }),
    );
    const host = await openExplore(exploreWith(unGiven(today), {}, CURSOR), { explorePile });
    await reachEnd();
    expect(layersOf(host).map(([day]) => day)).toEqual(["Today", "September 24"]);

    act(() => tab(host, "This week").click());
    act(() => tab(host, "Stickers").click());
    expect(layersOf(host)).toEqual([["Today", 1]]);
    expect(explorePile.mock.calls).toEqual([[CURSOR]]);
  });

  it("does not ask for an older page from hidden geometry, and keeps an older-page error for retry", async () => {
    const old = sticker({ sealedAt: minutesAgo(5) });
    const older = sticker({ sealedAt: minutesAgo(50 * 60) });
    const explorePile = vi
      .fn<ApiClient["explorePile"]>()
      .mockRejectedValueOnce(new ApiError(500, { error: "internal_error" }))
      .mockResolvedValueOnce({ stickers: unGiven(older), before: null });
    const host = await openExplore(exploreWith(unGiven(old), {}, CURSOR), { explorePile });
    await reachEnd();
    expect(host.querySelector('.explore-view [role="alert"]')).not.toBeNull();
    await searchFor(host, "mi");
    await reachEnd();
    expect(explorePile.mock.calls).toEqual([[CURSOR]]);
    await searchFor(host, "");
    expect(host.querySelector('.explore-view [role="alert"]')).not.toBeNull();
    const retry = host.querySelector<HTMLButtonElement>('.explore-view [role="alert"] button');
    act(() => retry?.click());
    await wait(0);
    expect(explorePile.mock.calls).toEqual([[CURSOR], [CURSOR]]);
    expect(layersOf(host).map(([day]) => day)).toEqual(["Today", "September 24"]);
  });

  it("replaces hidden pages when the NSFW opt-in turns off during search", async () => {
    const old = sticker({ sealedAt: minutesAgo(5), nsfw: true });
    const older = sticker({ sealedAt: minutesAgo(50 * 60), nsfw: true });
    const replacement = sticker({ sealedAt: minutesAgo(3) });
    const explore = vi
      .fn<ApiClient["explore"]>()
      .mockResolvedValueOnce(exploreWith(unGiven(old), {}, CURSOR))
      .mockResolvedValueOnce(exploreWith(unGiven(replacement)));
    view = renderWithApi(
      <ExploreScreen onOpenArtist={() => {}} onOpenMyBoard={() => {}} covered={false} />,
      emptyApi({
        explore,
        explorePile: () => Promise.resolve({ stickers: unGiven(older), before: null }),
      }),
      { ...TEST_ME, nsfwOptIn: true },
    );
    await wait(0);
    const host = view.host;
    await reachEnd();
    expect(layersOf(host)).toHaveLength(2);
    await searchFor(host, "mi");
    view.setMe({ ...TEST_ME, nsfwOptIn: false });
    await wait(0);
    await searchFor(host, "");

    expect(explore).toHaveBeenCalledTimes(2);
    expect(
      [...host.querySelectorAll<HTMLElement>("[data-pile-id]")].map((el) => el.dataset.pileId),
    ).toEqual([replacement.id]);
    expect(layersOf(host)).toEqual([["Today", 1]]);
  });
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

describe("ExploreScreen on an iPad", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** An iPad held sideways with just room for the split view, and the same iPad upright. */
  const SIDEWAYS = {
    width: TWO_COLUMNS_MIN_WIDTH,
    height: Math.round(TWO_COLUMNS_MIN_WIDTH * 0.7),
  };
  const UPRIGHT = { width: SIDEWAYS.height, height: SIDEWAYS.width };

  /** A large screen whose every box measures `size`; `turn()` swaps its sides, as turning the iPad does. */
  function onIpad(size: { width: number; height: number }) {
    onLargeScreen();
    const resizes = stubResizeObservers();
    const box = { ...size };
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => box.width);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(() => box.height);
    return {
      turn() {
        [box.width, box.height] = [box.height, box.width];
        act(() => resizes.resize());
      },
    };
  }

  const BOARDS: Partial<Explore["leaderboards"]> = {
    mostGratitude: [{ person: people.mika, value: 1234 }],
    bestCombo: [{ person: people.ken, value: 64 }],
    longestStreak: [{ person: people.bob, value: 3 }],
  };

  /** Explore on today's sticker and the weekly rankings, with an older page loaded: its pile as laid out. */
  async function withOlderPage() {
    const older = { stickers: unGiven(sticker({ sealedAt: minutesAgo(50 * 60) })), before: null };
    const explorePile = vi.fn<ApiClient["explorePile"]>(() => Promise.resolve(older));
    const first = exploreWith(unGiven(sticker({ sealedAt: minutesAgo(5) })), BOARDS, CURSOR);
    const host = await openExplore(first, { explorePile });
    await reachEnd();
    return { host, explorePile, layers: layersOf(host) };
  }

  const childClasses = (host: HTMLElement) =>
    [...(host.querySelector(".explore")?.children ?? [])].map((child) => child.className);

  it("splits sideways: the search across the top, then the pile, then This week, in reading order", async () => {
    onIpad(SIDEWAYS);
    const { host } = await withOlderPage();
    expect(host.querySelector(".view-switch")).toBeNull();
    expect(childClasses(host)).toEqual(["explore-search", "explore-view", "explore-week"]);
    expect(host.querySelectorAll(".explore-week .leaderboard")).toHaveLength(1);
    expect(tab(host, "Most gratitude").getAttribute("aria-selected")).toBe("true");
    expect(textsOf(host, ".explore-week .leaderboard .row-names b")).toEqual(["@mika"]);
  });

  it("shows one selected ranking upright and changes it through the category tabs", async () => {
    reduceMotion();
    onIpad(UPRIGHT);
    const host = await openExplore(exploreWith([], BOARDS));
    act(() => tab(host, "This week").click());
    expect(host.querySelectorAll(".leaderboard")).toHaveLength(1);
    expect(tab(host, "Most gratitude").getAttribute("aria-selected")).toBe("true");
    expect(textsOf(host, ".leaderboard .row-names b")).toEqual(["@mika"]);

    act(() => tab(host, "Best combo").click());
    await wait(500);
    expect(tab(host, "Best combo").getAttribute("aria-selected")).toBe("true");
    expect(host.querySelectorAll(".leaderboard")).toHaveLength(1);
    expect(textsOf(host, ".leaderboard .row-names b")).toEqual(["@ken"]);
  });

  it("keeps the selected ranking beside search results and preserves the pile's pages", async () => {
    reduceMotion();
    onIpad(SIDEWAYS);
    const { host, explorePile, layers } = await withOlderPage();
    act(() => tab(host, "Streak").click());
    await wait(500);
    await searchFor(host, "mi");
    expect(textsOf(host, ".explore-results .row-names b")).toEqual(["@mika"]);
    expect(host.querySelector<HTMLElement>(".explore-view")?.hidden).toBe(true);
    expect(tab(host, "Streak").getAttribute("aria-selected")).toBe("true");
    expect(host.querySelectorAll(".explore-week .leaderboard")).toHaveLength(1);
    expect(textsOf(host, ".explore-week .leaderboard .row-names b")).toEqual(["@bob"]);

    await searchFor(host, "");
    expect(tab(host, "Streak").getAttribute("aria-selected")).toBe("true");
    expect(textsOf(host, ".explore-week .leaderboard .row-names b")).toEqual(["@bob"]);
    expect(host.querySelector<HTMLElement>(".explore-view")?.hidden).toBe(false);
    expect(layersOf(host)).toEqual(layers);
    expect(explorePile).toHaveBeenCalledTimes(1);
  });

  it("restores a two-column pile's position after results scroll in its place", async () => {
    onIpad(SIDEWAYS);
    const { host, explorePile, layers } = await withOlderPage();
    const pile = host.querySelector<HTMLElement>(".explore-view");
    if (!pile) throw new Error("pile column missing");
    const ids = [...pile.querySelectorAll<HTMLElement>("[data-pile-id]")].map(
      (el) => el.dataset.pileId,
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const top = this.matches(".pile-sticker")
        ? 100 + ids.indexOf(this.dataset.pileId) * 200 - pile.scrollTop
        : 0;
      return new DOMRect(0, top, 0, 150);
    });
    pile.scrollTop = 350;
    act(() => {
      pile.dispatchEvent(new Event("scroll"));
    });
    await searchFor(host, "mi");
    expect(pile.hidden).toBe(true);
    const results = host.querySelector<HTMLElement>(".explore-results");
    if (!results) throw new Error("search results missing");
    results.scrollTop = 220;
    act(() => {
      results.dispatchEvent(new Event("scroll"));
    });
    pile.scrollTop = 0;
    await searchFor(host, "");

    expect(pile.scrollTop).toBe(350);
    expect(layersOf(host)).toEqual(layers);
    expect(explorePile).toHaveBeenCalledTimes(1);
  });

  it("keeps the pile and the pages it loaded through a turn", async () => {
    const ipad = onIpad(UPRIGHT);
    const { host, explorePile, layers } = await withOlderPage();
    expect(host.querySelector(".explore-week")).toBeNull();
    ipad.turn();
    expect(host.querySelector(".explore-week")).not.toBeNull();
    expect(layersOf(host)).toEqual(layers);
    expect(explorePile).toHaveBeenCalledTimes(1);
  });

  it("remembers the selected ranking when turning between the split view and the upright view", async () => {
    reduceMotion();
    const ipad = onIpad(SIDEWAYS);
    const host = await openExplore(exploreWith([], BOARDS));
    act(() => tab(host, "Best combo").click());
    await wait(500);
    expect(textsOf(host, ".explore-week .leaderboard .row-names b")).toEqual(["@ken"]);

    ipad.turn();
    act(() => tab(host, "This week").click());
    await wait(500);
    expect(host.querySelector(".explore-week")).toBeNull();
    expect(tab(host, "Best combo").getAttribute("aria-selected")).toBe("true");
    expect(host.querySelectorAll(".leaderboard")).toHaveLength(1);
    expect(textsOf(host, ".explore-view .leaderboard .row-names b")).toEqual(["@ken"]);

    ipad.turn();
    await wait(500);
    expect(tab(host, "Best combo").getAttribute("aria-selected")).toBe("true");
    expect(host.querySelectorAll(".leaderboard")).toHaveLength(1);
    expect(textsOf(host, ".explore-week .leaderboard .row-names b")).toEqual(["@ken"]);
  });
});
