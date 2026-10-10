// @vitest-environment happy-dom
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../../i18n/i18n";
import type { LayerId } from "../canvas/ops";
import { LayerColumn, type LayerColumnProps } from "./LayerColumn";
import type { LayerChipView } from "./layerView";
import { testHost } from "./testHost";

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
      {...props}
    />,
  );

const chip = (id: LayerId) => find(`[data-layer-chip="${id}"]`);
const addTile = () =>
  find<HTMLButtonElement>(`[aria-label="${i18next.t(($) => $.stickerCreation.layers.add)}"]`);

beforeEach(() => {
  onAdd.mockReset();
  onSelect.mockReset();
  onToggleOptions.mockReset();
});

describe("LayerColumn", () => {
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
});
