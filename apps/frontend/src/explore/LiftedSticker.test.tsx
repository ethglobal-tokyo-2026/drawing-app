// @vitest-environment happy-dom
import type { Person } from "@drawing-app/api/client";
import { act, useState, type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { people, sticker } from "../api/testFixtures";
import { renderWithApi, shownText, TEST_OWNER } from "../api/testing";
import { LiftedSticker } from "./LiftedSticker";

/** Newest first: @mika's, then @ken's that @bob was given, then one you drew. */
const pile: ComponentProps<typeof LiftedSticker>["stickers"] = [
  { sticker: sticker({ number: 147, artist: people.mika, timeUsed: 292 }) },
  { sticker: sticker({ number: 133, artist: people.ken }), givenTo: people.bob },
  { sticker: sticker({ number: 117, artist: TEST_OWNER }) },
];

/** Each sticker's button in the pile, which the sheet lifts it off and gives focus back to. */
const buttonOf = (id: string) =>
  document.querySelector<HTMLButtonElement>(`[data-sticker-id="${CSS.escape(id)}"]`);

/** The pile as Explore holds it: a button per sticker, and the sheet while one is lifted. */
function Pile({ start, onGoToBoard }: { start: number; onGoToBoard: (artist: Person) => void }) {
  const [lifted, setLifted] = useState<number | null>(start);
  return (
    <>
      {pile.map((entry, i) => (
        <button
          key={entry.sticker.id}
          type="button"
          data-sticker-id={entry.sticker.id}
          onClick={() => setLifted(i)}
        >
          {entry.sticker.number}
        </button>
      ))}
      {lifted !== null && (
        <LiftedSticker
          stickers={pile}
          index={lifted}
          onIndexChange={setLifted}
          onClose={() => setLifted(null)}
          onGoToBoard={onGoToBoard}
          originOf={(id) => {
            const el = buttonOf(id);
            return el && { el, turn: 12 };
          }}
        />
      )}
    </>
  );
}

let rendered: ReturnType<typeof renderWithApi> | undefined;
afterEach(() => rendered?.unmount());

const onGoToBoard = vi.fn<(artist: Person) => void>();
/** Lifts the pile's sticker at `start`, with focus on its button as a tap or a key press leaves it. */
function lift(start: number) {
  onGoToBoard.mockReset();
  rendered = renderWithApi(<Pile start={start} onGoToBoard={onGoToBoard} />);
}

const sheet = () => document.querySelector<HTMLElement>('[role="dialog"]');
const shown = () => sheet()?.getAttribute("aria-label");
const control = (name: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
    (b) => (b.getAttribute("aria-label") ?? b.textContent.trim()) === name,
  );
const press = (name: string) =>
  act(() => {
    const target = control(name);
    if (!target) throw new Error(`no "${name}" in the sheet, which shows ${shown()}`);
    target.click();
  });
const key = (name: string) =>
  act(() => {
    sheet()?.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
  });
/** Waits out the flight back onto the pile. */
const landed = () => act(() => new Promise((resolve) => setTimeout(resolve, 400)));

describe("LiftedSticker", () => {
  it("pages by the arrows and the arrow keys, not past either end", () => {
    lift(1);
    expect(shown()).toBe("No.0133 by @ken");
    press("Next sticker");
    expect(shown()).toBe("No.0117 by @you");
    expect(control("Next sticker")?.getAttribute("aria-disabled")).toBe("true");
    press("Next sticker");
    expect(shown()).toBe("No.0117 by @you");

    key("ArrowLeft");
    key("ArrowLeft");
    expect(shown()).toBe("No.0147 by @mika");
    expect(control("Previous sticker")?.getAttribute("aria-disabled")).toBe("true");
    key("ArrowLeft");
    expect(shown()).toBe("No.0147 by @mika");
  });

  it("names the artist on a plain chip, and says who a given sticker went to", () => {
    lift(1);
    const chip = sheet()?.querySelector(".artist-chip");
    expect(chip?.getAttribute("aria-label")).toBe("Artist: @ken");
    expect(chip?.querySelector(".artist-chip__ring")).toBeNull();
    expect(shownText(".lifted-sticker__fine")).toBe("No.0133 · 2m 52s · 2026.09.23 · to @bob");

    press("Previous sticker");
    expect(shownText(".lifted-sticker__fine")).toBe("No.0147 · 4m 52s · 2026.09.23");
  });

  it("goes to the artist's sticker board, or to yours on a sticker you drew", () => {
    lift(0);
    press("Go to @mika’s sticker board");
    expect(onGoToBoard).toHaveBeenCalledExactlyOnceWith(people.mika);

    press("Next sticker");
    press("Next sticker");
    press("Back to My board");
    expect(onGoToBoard).toHaveBeenLastCalledWith(TEST_OWNER);
  });

  it("holds focus while it's up, and puts the sticker back with focus on its button", async () => {
    lift(0);
    expect(sheet()?.contains(document.activeElement)).toBe(true);
    press("Next sticker");
    press("Put back");
    await landed();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(buttonOf(pile[1]?.sticker.id ?? ""));
  });

  it.each([
    ["Escape", () => key("Escape")],
    [
      "the scrim",
      () => act(() => document.querySelector<HTMLElement>(".lifted-sticker__scrim")?.click()),
    ],
    ["the perforation", () => press("Close No.0133 by @ken")],
  ])("puts the sticker back on %s", async (_, putBack) => {
    lift(1);
    putBack();
    await landed();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(buttonOf(pile[1]?.sticker.id ?? ""));
  });
});
