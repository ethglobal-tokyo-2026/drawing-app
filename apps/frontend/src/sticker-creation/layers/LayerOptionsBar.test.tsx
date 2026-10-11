// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../../i18n/i18n";
import { LayerOptionsBar } from "./LayerOptionsBar";
import { testHost } from "./testHost";

const { render, find, click, press } = testHost();
const handlers = {
  onLock: vi.fn(),
  onClip: vi.fn(),
  onMoveBack: vi.fn(),
  onMoveForward: vi.fn(),
  onDelete: vi.fn(),
  onMerge: vi.fn(),
  onClose: vi.fn(),
  onPreviewOpacity: vi.fn(),
  onCommitOpacity: vi.fn(),
  onHoldOpacity: vi.fn(),
};
const renderBar = (props: Partial<ComponentProps<typeof LayerOptionsBar>> = {}) =>
  render(
    <LayerOptionsBar
      id={2}
      locked={false}
      clipped={false}
      clipBase={1}
      opacity={74}
      count={2}
      canMoveBack
      canMoveForward
      canDelete
      mergeTarget={{ into: 1 }}
      {...handlers}
      {...props}
    />,
  );
const named = (name: string) => find(`[aria-label="${name}"]`);
beforeEach(() => {
  vi.clearAllMocks();
});

describe("compact layer options", () => {
  it("focuses opacity on opening, then keeps keyboard changes on that control", () => {
    renderBar();
    const slider = find("input");
    expect(document.activeElement).toBe(slider);
    press(slider, "ArrowRight");
    expect(handlers.onCommitOpacity).toHaveBeenCalledExactlyOnceWith(79);
    expect(document.activeElement).toBe(slider);
  });
  it("reveals contextual help without losing the Help button's focus", () => {
    renderBar();
    const help = named("Layer help");
    act(() => help.focus());
    click(help);
    expect(help.getAttribute("aria-expanded")).toBe("true");
    expect(find(".layer-options-help").hidden).toBe(false);
    expect(find(".layer-options-help").textContent).toContain("inside layer 1");
    expect(document.activeElement).toBe(help);
    click(help);
    expect(find(".layer-options-help").hidden).toBe(true);
  });
  it("retains localized toggle labels and changes only the requested state", () => {
    renderBar({ locked: true });
    click(named("Lock transparent pixels"));
    click(named("Clip to layer below"));
    expect(handlers.onLock).toHaveBeenCalledExactlyOnceWith(false);
    expect(handlers.onClip).toHaveBeenCalledExactlyOnceWith(true);
    expect(named("Lock transparent pixels").getAttribute("aria-pressed")).toBe("true");
  });
  it("names the destination and activates available Merge", () => {
    renderBar({ mergeTarget: { into: 7 } });
    click(named("Merge down into layer 7"));
    expect(handlers.onMerge).toHaveBeenCalledOnce();
  });
  it.each(["no-lower-layer", "clipped-above"] as const)(
    "explains unavailable Merge %s without dispatch",
    (reason) => {
      renderBar({ mergeTarget: { reason } });
      const merge = named("Merge down");
      expect(merge.getAttribute("aria-disabled")).toBe("true");
      click(merge);
      expect(handlers.onMerge).not.toHaveBeenCalled();
      expect(named("Layer help").getAttribute("aria-expanded")).toBe("true");
      expect(find(".layer-options-help").textContent).toContain(
        reason === "no-lower-layer" ? "No layer below" : "Layers above",
      );
    },
  );
  it("keeps unavailable clipping and deletion reasons in reachable Help", () => {
    renderBar({ clipBase: null, canDelete: false, canMoveForward: false });
    for (const label of ["Clip to layer below", "Delete layer", "Move forward"])
      click(named(label));
    expect(handlers.onClip).not.toHaveBeenCalled();
    expect(handlers.onDelete).not.toHaveBeenCalled();
    expect(handlers.onMoveForward).not.toHaveBeenCalled();
    expect(find(".layer-options-help").textContent).toContain("Keep at least one layer");
  });
  it("closes by its named button", () => {
    renderBar();
    click(named("Close layer options"));
    expect(handlers.onClose).toHaveBeenCalledOnce();
  });
  it("shows Japanese help on demand", async () => {
    await act(async () => {
      await i18next.changeLanguage("ja");
    });
    try {
      renderBar({ locked: true });
      click(named("レイヤーのヘルプ"));
      expect(find(".layer-options-help").textContent).toContain("ロックを解除してください");
    } finally {
      await act(async () => {
        await i18next.changeLanguage("en");
      });
    }
  });
});
