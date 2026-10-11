// @vitest-environment happy-dom
import { act, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../../i18n/i18n";
import type { LayerId } from "../canvas/ops";
import { LayerColumn, type LayerColumnProps } from "./LayerColumn";
import type { LayerChipView } from "./layerView";
import { testHost } from "./testHost";
import { layOut } from "./layerListTesting";

// happy-dom has no painted canvas; help still follows the real chip's ink state.
vi.mock("./layerThumbnails", () => ({ drawThumbnail: vi.fn() }));

const { render, find, findAll, click, press } = testHost();
const onAdd = vi.fn<() => void>();
const onSelect = vi.fn<(id: LayerId) => void>();
const onToggleOptions = vi.fn<() => void>();

/** Empty layers at full opacity, back to front, with `changes` laid over the ones they name. */
const chipsOf = (
  ids: readonly LayerId[],
  changes: Partial<Record<LayerId, Partial<LayerChipView>>> = {},
): LayerChipView[] =>
  ids.map((id) => ({
    id,
    opacity: 100,
    locked: false,
    clipBase: null,
    inked: false,
    version: 0,
    ...changes[id],
  }));

/** Layers 1 to 3 with layer 2 current, under any of `props`. */
const renderColumn = (props: Partial<LayerColumnProps> = {}) =>
  render(
    <LayerColumn
      chips={chipsOf([1, 2, 3])}
      current={2}
      canAdd
      thumbnails={() => null}
      optionsOpen={false}
      edge="left"
      onAdd={onAdd}
      onSelect={onSelect}
      onToggleOptions={onToggleOptions}
      onCloseOptions={() => {}}
      {...props}
    />,
  );

const chip = (id: LayerId) => find(`[data-layer-chip="${id}"]`);
const addTile = () =>
  find<HTMLButtonElement>(`[aria-label="${i18next.t(($) => $.stickerCreation.layers.add)}"]`);

beforeEach(() => {
  localStorage.clear();
  onAdd.mockReset();
  onSelect.mockReset();
  onToggleOptions.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

describe("LayerColumn", () => {
  it("reports the position and continuing ends only while layers overflow", () => {
    renderColumn();
    const list = find('[role="listbox"]');
    layOut(list, 42);
    const scroll = (top: number) =>
      act(() => {
        list.scrollTop = top;
        list.dispatchEvent(new Event("scroll"));
      });
    scroll(0);
    const position = () => find('[role="meter"]');
    expect(position().getAttribute("aria-label")).toBe("Layer list position");
    expect(position().getAttribute("aria-valuenow")).toBe("0");
    expect(position().getAttribute("aria-valuetext")).toBe("More layers below");
    scroll(42);
    expect(position().getAttribute("aria-valuenow")).toBe("50");
    expect(position().getAttribute("aria-valuetext")).toBe("More layers above and below");
    scroll(84);
    expect(position().getAttribute("aria-valuenow")).toBe("100");
    expect(position().getAttribute("aria-valuetext")).toBe("More layers above");
    layOut(list);
    scroll(0);
    expect(findAll('[role="meter"]')).toHaveLength(0);
  });

  it("rechecks overflow after a resize and after layers are removed", () => {
    const resized: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class implements ResizeObserver {
        constructor(callback: ResizeObserverCallback) {
          resized.push(() => callback([], this));
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    renderColumn({ current: 3 });
    const list = find('[role="listbox"]');
    layOut(list, 42);
    act(() => resized.forEach((resize) => resize()));
    expect(findAll('[role="meter"]')).toHaveLength(1);
    layOut(list);
    act(() => resized.forEach((resize) => resize()));
    expect(findAll('[role="meter"]')).toHaveLength(0);
    layOut(list, 42);
    act(() => resized.forEach((resize) => resize()));
    expect(findAll('[role="meter"]')).toHaveLength(1);
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 42 });
    renderColumn({ chips: chipsOf([3]), current: 3 });
    expect(findAll('[role="meter"]')).toHaveLength(0);
  });

  it("offers options help only for a blank current layer in a stack", () => {
    renderColumn({ chips: chipsOf([1]), current: 1 });
    expect(findAll(".layer-options-hint")).toHaveLength(0);
    renderColumn();
    const hint = find(".layer-options-hint");
    expect(chip(2).getAttribute("aria-describedby")).toBe(hint.id);
    renderColumn({ chips: chipsOf([1, 2, 3], { 2: { inked: true } }) });
    expect(findAll(".layer-options-hint")).toHaveLength(0);
  });

  it("remembers an options opening across a new column and never overlaps help with options", () => {
    renderColumn();
    expect(findAll(".layer-options-hint")).toHaveLength(1);
    renderColumn({ optionsOpen: true, options: <button type="button">Layer action</button> });
    expect(findAll(".layer-options-hint")).toHaveLength(0);
    expect(findAll(".layer-options")).toHaveLength(1);
    render(null);
    renderColumn();
    expect(findAll(".layer-options-hint")).toHaveLength(0);
  });

  it("dismisses help with a named button, keeps focus on the current chip, and remembers dismissal", () => {
    renderColumn();
    const dismiss = find<HTMLButtonElement>(".layer-options-hint button");
    expect(dismiss.getAttribute("aria-label")).toBeTruthy();
    click(dismiss);
    expect(findAll(".layer-options-hint")).toHaveLength(0);
    expect(document.activeElement).toBe(chip(2));
    render(null);
    renderColumn();
    expect(findAll(".layer-options-hint")).toHaveLength(0);
  });

  it("Escape closes options and restores the current chip without reaching the screen's handler", () => {
    const outsideEscape = vi.fn();
    function Column() {
      const [optionsOpen, setOptionsOpen] = useState(true);
      return (
        <div
          onKeyDown={(event) => {
            if (event.key === "Escape") outsideEscape();
          }}
        >
          <LayerColumn
            chips={chipsOf([1, 2, 3])}
            current={2}
            canAdd
            thumbnails={() => null}
            optionsOpen={optionsOpen}
            edge="left"
            onAdd={onAdd}
            onSelect={onSelect}
            onToggleOptions={onToggleOptions}
            onCloseOptions={() => setOptionsOpen(false)}
            options={<button type="button">Layer action</button>}
          />
        </div>
      );
    }
    render(<Column />);
    const action = find<HTMLButtonElement>(".layer-options button");
    act(() => action.focus());
    act(() => {
      // Repeated Escape before React commits must close, never toggle options back open.
      action.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      action.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(findAll(".layer-options")).toHaveLength(0);
    expect(document.activeElement).toBe(chip(2));
    expect(chip(2).tabIndex).toBe(0);
    expect(chip(2).getAttribute("aria-expanded")).toBe("false");
    expect(outsideEscape).not.toHaveBeenCalled();
    expect(onToggleOptions).not.toHaveBeenCalled();
  });

  it("explains the layer limit beside the unavailable Add control until a layer is removed", () => {
    renderColumn({ chips: chipsOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), canAdd: false });
    const maximum = find(".layer-maximum");
    expect(maximum.textContent).toContain("10");
    expect(addTile().getAttribute("aria-describedby")).toBe(maximum.id);
    renderColumn();
    expect(findAll(".layer-maximum")).toHaveLength(0);
    expect(addTile().hasAttribute("aria-describedby")).toBe(false);
  });

  it.each([
    { edge: "left" as const, chipTop: 85, expectedTop: -12 },
    { edge: "left" as const, chipTop: 340, expectedTop: 144 },
    { edge: "right" as const, chipTop: 635, expectedTop: 330 },
  ])(
    "keeps a tall options panel inside the screen and above the column foot: $edge/$chipTop",
    ({ edge, chipTop, expectedTop }) => {
      const ui = (
        <div className="drawing-screen">
          <LayerColumn
            chips={chipsOf([1, 2, 3])}
            current={2}
            canAdd
            thumbnails={() => null}
            optionsOpen
            edge={edge}
            onAdd={onAdd}
            onSelect={onSelect}
            onToggleOptions={onToggleOptions}
            onCloseOptions={() => {}}
            options={<button type="button">Layer action</button>}
          />
        </div>
      );
      render(ui);
      find(".drawing-screen").getBoundingClientRect = () => new DOMRect(0, 80, 390, 600);
      find(".layer-column").getBoundingClientRect = () =>
        new DOMRect(edge === "left" ? 0 : 324, 100, 66, 560);
      chip(2).getBoundingClientRect = () => new DOMRect(0, chipTop, 30, 38);
      const panel = find(".layer-options");
      panel.getBoundingClientRect = () => new DOMRect(0, 0, 236, 230);
      const list = find(".layer-list");
      list.getBoundingClientRect = () => new DOMRect(0, 80, 50, 580);
      Object.defineProperty(list, "clientHeight", { value: 580 });
      act(() => {
        list.dispatchEvent(new Event("scroll"));
      });
      expect(panel.style.top).toBe(`${expectedTop}px`);
    },
  );

  it("selects a chip that isn't current, and opens the current chip's options instead of selecting it", () => {
    renderColumn();
    click(chip(3));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(3);
    click(chip(2));
    expect(onToggleOptions).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("shows the front layer on top, from chips listed back to front", () => {
    renderColumn({ chips: chipsOf([4, 1, 7]), current: 1 });
    expect(findAll('[role="option"]').map((el) => Number(el.dataset.layerChip))).toEqual([7, 1, 4]);
  });

  it("adds a layer from +, and disables + once no more can be added", () => {
    renderColumn();
    click(addTile());
    expect(onAdd).toHaveBeenCalledOnce();
    renderColumn({ canAdd: false });
    expect(addTile().disabled).toBe(true);
  });

  it("names each chip by its layer, then the states the catalog words", () => {
    renderColumn({ chips: chipsOf([1, 2, 3], { 3: { opacity: 0, locked: true, clipBase: 1 } }) });
    const layer = (number: LayerId) => i18next.t(($) => $.stickerCreation.layers.chip, { number });
    expect(chip(2).getAttribute("aria-label")).toBe(layer(2));
    const name = chip(3).getAttribute("aria-label") ?? "";
    expect(name.startsWith(layer(3))).toBe(true);
    for (const state of [
      i18next.t(($) => $.stickerCreation.layers.hidden),
      i18next.t(($) => $.stickerCreation.layers.locked),
      i18next.t(($) => $.stickerCreation.layers.clippedTo, { base: 1 }),
    ]) {
      expect(name).toContain(state);
    }
  });

  it("moves focus between the chips with Up and Down, from one Tab stop on the current chip", () => {
    renderColumn();
    const tabStops = () => findAll('[role="option"]').filter((el) => el.tabIndex === 0);
    expect(tabStops()).toEqual([chip(2)]);
    act(() => chip(2).focus());
    press(chip(2), "ArrowDown");
    expect(document.activeElement).toBe(chip(1));
    press(chip(1), "ArrowUp");
    press(chip(2), "ArrowUp");
    expect(document.activeElement).toBe(chip(3));
    expect(tabStops()).toEqual([chip(3)]);
  });

  it.each([
    { position: "one pixel above", current: 3, initial: 0, scroll: 37, open: true },
    { position: "at the top boundary", current: 3, initial: 0, scroll: 38, open: false },
    { position: "past the top", current: 3, initial: 0, scroll: 42, open: false },
    { position: "one pixel below", current: 1, initial: 42, scroll: 5, open: true },
    { position: "at the bottom boundary", current: 1, initial: 42, scroll: 4, open: false },
    { position: "past the bottom", current: 1, initial: 42, scroll: 0, open: false },
  ])(
    "keeps options only while their chip is visible: $position",
    ({ current, initial, scroll, open }) => {
      function Column() {
        const [optionsOpen, setOptionsOpen] = useState(false);
        return (
          <LayerColumn
            chips={chipsOf([1, 2, 3])}
            current={current}
            canAdd
            thumbnails={() => null}
            optionsOpen={optionsOpen}
            edge="left"
            onAdd={onAdd}
            onSelect={onSelect}
            onToggleOptions={() => setOptionsOpen((shown) => !shown)}
            onCloseOptions={() => setOptionsOpen(false)}
            options={<button type="button">Layer action</button>}
          />
        );
      }
      render(<Column />);
      const list = find('[role="listbox"]');
      layOut(list, 80);
      list.scrollTop = initial;
      click(chip(current));
      expect(findAll(".layer-options")).toHaveLength(1);

      act(() => {
        list.scrollTop = scroll;
        // Two events before the close commits must not toggle the options back open.
        list.dispatchEvent(new Event("scroll"));
        list.dispatchEvent(new Event("scroll"));
      });

      expect(findAll(".layer-options")).toHaveLength(open ? 1 : 0);
      expect(chip(current).getAttribute("aria-expanded")).toBe(String(open));
      expect(chip(current).getAttribute("aria-selected")).toBe("true");
      expect(onSelect).not.toHaveBeenCalled();
    },
  );
});
