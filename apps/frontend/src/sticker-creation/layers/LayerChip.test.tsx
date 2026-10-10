// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { LayerChip } from "./LayerChip";
import { drawThumbnail } from "./layerThumbnails";
import type { LayerChipView } from "./layerView";
import { testHost } from "./testHost";

vi.mock("./layerThumbnails", () => ({ drawThumbnail: vi.fn() }));

const { render } = testHost();
const INKED: LayerChipView = {
  id: 1,
  opacity: 100,
  locked: false,
  clipBase: null,
  inked: true,
  version: 1,
};

/** The chip with `changes` over an inked layer, given a new thumbnail source each time, as a parent re-rendering does. */
const renderChip = (changes: Partial<LayerChipView>, current = false) =>
  render(
    <LayerChip
      chip={{ ...INKED, ...changes }}
      current={current}
      thumbnails={() => null}
      tabStop={current}
      expanded={undefined}
      controls={undefined}
      onPress={() => {}}
      onFocus={() => {}}
    />,
  );

describe("LayerChip", () => {
  it("redraws its thumbnail when its version bumps, and on no other change", () => {
    renderChip({});
    expect(drawThumbnail).toHaveBeenCalledOnce();
    renderChip({ opacity: 40, locked: true }, true);
    expect(drawThumbnail).toHaveBeenCalledOnce();
    renderChip({ version: 2 });
    expect(drawThumbnail).toHaveBeenCalledTimes(2);
  });
});
