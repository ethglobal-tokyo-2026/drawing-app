// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { people } from "../api/testFixtures";
import { emptyApi, renderWithApi } from "../api/testing";
import { ExploreScreen } from "./ExploreScreen";

/** Lets the name's lookup answer. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
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
