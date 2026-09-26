// @vitest-environment happy-dom
import type { Explore, Person } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { people, sticker } from "../api/testFixtures";
import { emptyApi, renderWithApi } from "../api/testing";
import { ExploreScreen } from "./ExploreScreen";

/** Lets the name's lookup answer. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  vi.useRealTimers();
});

describe("a name's link", () => {
  it("opens the board of whoever holds the name, once", async () => {
    const onOpenArtist = vi.fn();
    const client = emptyApi({
      explore: () => new Promise(() => {}),
      personByEnsLabel: (label) =>
        label === "mika" ? Promise.resolve(people.mika) : Promise.reject(new Error(label)),
    });
    ({ unmount } = renderWithApi(
      <ExploreScreen boardOf="mika" onOpenArtist={onOpenArtist} onOpenMyBoard={vi.fn()} />,
      client,
    ));
    await settle();
    await settle();
    expect(onOpenArtist.mock.calls).toEqual([[people.mika]]);
  });

  it("says so when nobody holds the name", async () => {
    ({ unmount } = renderWithApi(
      <ExploreScreen boardOf="nobody" onOpenArtist={vi.fn()} onOpenMyBoard={vi.fn()} />,
      emptyApi({ explore: () => new Promise(() => {}) }),
    ));
    await settle();
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

const EXPLORE: Explore = {
  todaysStickers: [sticker()],
  activity: [],
  leaderboards: {
    weekStart: "2026-09-20T19:00:00.000Z",
    mostGratitude: [],
    bestCombo: [],
    longestStreak: [],
  },
};

function show(client: Parameters<typeof renderWithApi>[1]) {
  const rendered = renderWithApi(
    <ExploreScreen onOpenArtist={vi.fn()} onOpenMyBoard={vi.fn()} />,
    client,
  );
  ({ unmount } = rendered);
  return rendered.host;
}

const skeletons = (host: HTMLElement) => host.querySelectorAll(".skeleton").length;
const status = (host: HTMLElement) => host.querySelector('[role="status"]')?.textContent;

describe("ExploreScreen while it loads", () => {
  it("outlines its sections, then shows them once Explore arrives", async () => {
    const explore = inFlight<Explore>();
    const host = show(emptyApi({ explore: () => explore.promise }));
    expect(status(host)).toBe("Loading Explore");
    expect(skeletons(host)).toBeGreaterThan(0);

    await act(async () => explore.answer(EXPLORE));
    expect(skeletons(host)).toBe(0);
    expect(host.querySelectorAll(".today-sticker")).toHaveLength(1);
  });

  it("outlines search results while the search is out", async () => {
    vi.useFakeTimers();
    const search = inFlight<Person[]>();
    const host = show(
      emptyApi({ explore: () => Promise.resolve(EXPLORE), searchUsers: () => search.promise }),
    );
    const input = host.querySelector("input");
    if (!input) throw new Error("No search field");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "ali");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(status(host)).toBe("Searching");
    expect(skeletons(host)).toBeGreaterThan(0);

    await act(async () => search.answer([]));
    expect(skeletons(host)).toBe(0);
  });
});
