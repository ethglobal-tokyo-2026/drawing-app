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
const onAdd = vi.fn<(position: "above" | "below") => void>();
const onToggleAdd = vi.fn<() => void>();
const onCloseAdd = vi.fn<() => void>();
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
      addOpen={false}
      onToggleAdd={onToggleAdd}
      onCloseAdd={onCloseAdd}
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
  onToggleAdd.mockReset();
  onCloseAdd.mockReset();
  onSelect.mockReset();
  onToggleOptions.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

describe("LayerColumn", () => {
  it("makes every enabled chip draggable and describes the same gesture", () => {
    renderColumn();
    for (const id of [1, 2, 3]) {
      expect(chip(id).getAttribute("data-drag-ready")).toBe("true");
      expect(chip(id).getAttribute("aria-describedby")).toBeTruthy();
    }
    renderColumn({ dragEnabled: false });
    expect(findAll("[data-drag-ready]")).toHaveLength(0);
  });

  it("pages the overflowing list with stable scroll controls and disables its reached ends", () => {
    renderColumn();
    const list = find(".layer-list");
    layOut(list, 100);
    const scrollBy = vi.fn();
    Object.defineProperty(list, "scrollBy", { configurable: true, value: scrollBy });
    act(() => {
      list.dispatchEvent(new Event("scroll"));
    });
    const up = find<HTMLButtonElement>('.layer-scroll-controls button[data-direction="up"]');
    const down = find<HTMLButtonElement>('.layer-scroll-controls button[data-direction="down"]');
    expect(up.disabled).toBe(true);
    expect(down.disabled).toBe(false);
    click(down);
    expect(scrollBy).toHaveBeenCalledWith({ top: 50, behavior: "smooth" });
    act(() => {
      list.scrollTop = 50;
      list.dispatchEvent(new Event("scroll"));
    });
    expect(up.disabled).toBe(false);
    expect(down.disabled).toBe(true);
    click(up);
    expect(scrollBy).toHaveBeenLastCalledWith({ top: -50, behavior: "smooth" });
    layOut(list);
    act(() => {
      list.dispatchEvent(new Event("scroll"));
    });
    expect(findAll(".layer-scroll-controls")).toHaveLength(0);
  });

  it("describes the continuing ends and fades only edges with more layers", () => {
    renderColumn();
    const list = find('[role="listbox"]');
    layOut(list, 50);
    const scroll = (top: number) =>
      act(() => {
        list.scrollTop = top;
        list.dispatchEvent(new Event("scroll"));
      });
    scroll(0);
    const position = () => find(".layer-overflow-description");
    expect(position().textContent).toBe("More layers below");
    expect(find(".layer-scroll-well").getAttribute("data-more-below")).toBe("true");
    scroll(50);
    expect(position().textContent).toBe("More layers above and below");
    expect(find(".layer-scroll-well").getAttribute("data-more-above")).toBe("true");
    scroll(100);
    expect(position().textContent).toBe("More layers above");
    expect(find(".layer-scroll-well").hasAttribute("data-more-below")).toBe(false);
    layOut(list);
    scroll(0);
    expect(findAll(".layer-overflow-description")).toHaveLength(0);
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
    layOut(list, 50);
    act(() => resized.forEach((resize) => resize()));
    expect(findAll(".layer-overflow-description")).toHaveLength(1);
    layOut(list);
    act(() => resized.forEach((resize) => resize()));
    expect(findAll(".layer-overflow-description")).toHaveLength(0);
    layOut(list, 50);
    act(() => resized.forEach((resize) => resize()));
    expect(findAll(".layer-overflow-description")).toHaveLength(1);
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 50 });
    renderColumn({ chips: chipsOf([3]), current: 3 });
    expect(findAll(".layer-overflow-description")).toHaveLength(0);
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

  it("shows recovery instead of introductory help and dismisses it when its chip scrolls away", () => {
    function Column() {
      const [recovery, setRecovery] = useState(true);
      return (
        <LayerColumn
          chips={chipsOf([1, 2, 3], { 3: { opacity: 0 } })}
          current={3}
          canAdd
          thumbnails={() => null}
          optionsOpen={false}
          addOpen={false}
          onToggleAdd={onToggleAdd}
          onCloseAdd={onCloseAdd}
          edge="left"
          onAdd={onAdd}
          onSelect={onSelect}
          onToggleOptions={onToggleOptions}
          onCloseOptions={() => {}}
          recovery={recovery ? <button type="button">Restore layer</button> : undefined}
          onRecoveryHidden={() => setRecovery(false)}
        />
      );
    }
    render(<Column />);
    expect(findAll(".layer-recovery-paper")).toHaveLength(1);
    expect(findAll(".layer-options-hint")).toHaveLength(0);
    const list = find(".layer-list");
    layOut(list, 80);
    act(() => {
      list.scrollTop = 50;
      list.dispatchEvent(new Event("scroll"));
    });
    expect(findAll(".layer-recovery-paper")).toHaveLength(0);
    act(() => {
      list.scrollTop = 0;
      list.dispatchEvent(new Event("scroll"));
    });
    expect(findAll(".layer-recovery-paper")).toHaveLength(0);
  });

  it.each(["left", "right"] as const)(
    "clamps recovery above the column foot on the %s edge",
    (edge) => {
      renderColumn({ edge, recovery: <button type="button">Restore layer</button> });
      find(".layer-column").getBoundingClientRect = () =>
        new DOMRect(edge === "left" ? 0 : 346, 100, 44, 560);
      chip(2).getBoundingClientRect = () => new DOMRect(0, 635, 36, 46);
      const paper = find(".layer-recovery-paper");
      paper.getBoundingClientRect = () => new DOMRect(0, 0, 276, 116);
      const list = find(".layer-list");
      list.getBoundingClientRect = () => new DOMRect(0, 80, 44, 580);
      Object.defineProperty(list, "clientHeight", { value: 580 });
      act(() => {
        list.dispatchEvent(new Event("scroll"));
      });
      expect(paper.style.top).toBe("444px");
    },
  );

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
            addOpen={false}
            onToggleAdd={onToggleAdd}
            onCloseAdd={onCloseAdd}
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
            addOpen={false}
            onToggleAdd={onToggleAdd}
            onCloseAdd={onCloseAdd}
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

  it("keeps the selected chip visible when overflow controls reduce the list's room", () => {
    renderColumn({ current: 1 });
    const list = find(".layer-list");
    layOut(list, 100);
    const selected = chip(1);
    const parent = selected.parentElement;
    if (!parent) throw new Error("The selected chip has no layer list");
    parent.style.padding = "4px";
    Object.defineProperties(selected, {
      offsetTop: { value: 104 },
      offsetHeight: { value: 46 },
    });
    act(() => {
      list.dispatchEvent(new Event("scroll"));
    });
    expect(findAll(".layer-scroll-controls")).toHaveLength(1);
    expect(list.scrollTop).toBe(54);
  });

  it("keeps the selected chip visible when reordering moves it beyond the list's foot", () => {
    renderColumn({ current: 3 });
    const list = find(".layer-list");
    Object.defineProperty(list, "clientHeight", { value: 80 });
    const selected = chip(3);
    const parent = selected.parentElement;
    if (!parent) throw new Error("The selected chip has no layer list");
    parent.style.padding = "4px";
    Object.defineProperties(selected, {
      offsetTop: { get: () => [...parent.children].indexOf(selected) * 50 + 4 },
      offsetHeight: { value: 46 },
    });
    renderColumn({ chips: chipsOf([3, 1, 2]), current: 3 });
    expect(list.scrollTop).toBe(74);
  });

  it("opens the above/below choice from +, and disables + once no more can be added", () => {
    renderColumn();
    click(addTile());
    expect(onToggleAdd).toHaveBeenCalledOnce();
    expect(onAdd).not.toHaveBeenCalled();
    renderColumn({ canAdd: false });
    expect(addTile().disabled).toBe(true);
  });

  it.each(["above", "below"] as const)(
    "creates a layer %s only after choosing its menu item",
    (position) => {
      renderColumn({ addOpen: true });
      const items = findAll('[role="menuitem"]');
      expect(items.map((item) => item.textContent)).toEqual(["Create above", "Create below"]);
      expect(addTile().getAttribute("aria-expanded")).toBe("true");
      expect(addTile().getAttribute("aria-controls")).toBe(find('[role="menu"]').id);
      expect(document.activeElement).toBe(items[0]);
      click(items[position === "above" ? 0 : 1]);
      expect(onAdd).toHaveBeenCalledExactlyOnceWith(position);
    },
  );

  it("moves through the creation menu with arrows and returns to + on Escape", () => {
    renderColumn({ addOpen: true });
    const items = findAll('[role="menuitem"]');
    press(items[0], "ArrowDown");
    expect(document.activeElement).toBe(items[1]);
    press(items[1], "ArrowDown");
    expect(document.activeElement).toBe(items[0]);
    press(items[0], "End");
    expect(document.activeElement).toBe(items[1]);
    press(items[1], "Escape");
    expect(document.activeElement).toBe(addTile());
    expect(onCloseAdd).toHaveBeenCalledOnce();
    expect(onAdd).not.toHaveBeenCalled();
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
    { position: "one pixel above", current: 3, initial: 0, scroll: 45, open: true },
    { position: "at the top boundary", current: 3, initial: 0, scroll: 46, open: false },
    { position: "past the top", current: 3, initial: 0, scroll: 50, open: false },
    { position: "one pixel below", current: 1, initial: 50, scroll: 21, open: true },
    { position: "at the bottom boundary", current: 1, initial: 50, scroll: 20, open: false },
    { position: "past the bottom", current: 1, initial: 50, scroll: 0, open: false },
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
            addOpen={false}
            onToggleAdd={onToggleAdd}
            onCloseAdd={onCloseAdd}
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
