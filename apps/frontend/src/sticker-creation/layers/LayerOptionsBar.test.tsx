// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../../i18n/i18n";
import { LayerOptionsBar } from "./LayerOptionsBar";
import { testHost } from "./testHost";

const { render, find, click, press } = testHost();
const handlers = {
  onLock: vi.fn<(on: boolean) => void>(),
  onClip: vi.fn<(on: boolean) => void>(),
  onMoveBack: vi.fn<() => void>(),
  onMoveForward: vi.fn<() => void>(),
  onDelete: vi.fn<() => void>(),
};
const labels = {
  lock: i18next.t(($) => $.stickerCreation.layers.lock),
  clip: i18next.t(($) => $.stickerCreation.layers.clip),
  moveBack: i18next.t(($) => $.stickerCreation.layers.moveBack),
  moveForward: i18next.t(($) => $.stickerCreation.layers.moveForward),
  delete: i18next.t(($) => $.stickerCreation.layers.delete),
};

/** Layer 2's bar, with every action open to it unless `props` says otherwise. */
const renderBar = (props: Partial<ComponentProps<typeof LayerOptionsBar>> = {}) =>
  render(
    <LayerOptionsBar
      id={2}
      locked={false}
      clipped={false}
      clipBase={1}
      opacity={100}
      count={2}
      canMoveBack
      canMoveForward
      canDelete
      {...handlers}
      {...props}
    />,
  );

const tile = (label: string) => find(`[aria-label="${label}"]`);

beforeEach(() => {
  for (const handler of Object.values(handlers)) handler.mockReset();
});

describe("LayerOptionsBar", () => {
  it("has each toggle report the state it turns to, the opposite of the one it shows", () => {
    renderBar({ locked: true, clipped: false });
    expect(tile(labels.lock).getAttribute("aria-pressed")).toBe("true");
    click(tile(labels.lock));
    click(tile(labels.clip));
    expect(handlers.onLock).toHaveBeenCalledExactlyOnceWith(false);
    expect(handlers.onClip).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("dims an action the layer can't take, and doesn't fire it", () => {
    renderBar({ clipBase: null, canMoveBack: false, canMoveForward: false, canDelete: false });
    for (const label of [labels.clip, labels.moveBack, labels.moveForward, labels.delete]) {
      expect(tile(label).getAttribute("aria-disabled")).toBe("true");
      click(tile(label));
    }
    expect(handlers.onClip).not.toHaveBeenCalled();
    expect(handlers.onMoveBack).not.toHaveBeenCalled();
    expect(handlers.onMoveForward).not.toHaveBeenCalled();
    expect(handlers.onDelete).not.toHaveBeenCalled();
  });

  it("names every action visibly and explains the actual clipping base", () => {
    renderBar({ id: 7, clipBase: 3, opacity: 48 });
    for (const label of Object.values(labels)) expect(tile(label).textContent).toContain(label);
    expect(find(".layer-options-heading").textContent).toContain("Layer 7");
    expect(find(".layer-options-heading").textContent).toContain("Opacity 48%");
    const description = tile(labels.clip).getAttribute("aria-describedby");
    expect(description).toBeTruthy();
    expect(find(`[id="${description}"]`).textContent).toBe(
      "Shows this layer only inside layer 3’s ink.",
    );
  });

  it("explains unavailable clipping and deletion on the last layer", () => {
    renderBar({ clipBase: null, canDelete: false });
    expect(tile(labels.clip).textContent).toContain("No layer below to clip to.");
    expect(find(".layer-options-help").textContent).toBe("Keep at least one layer.");
    renderBar();
    expect(find(".layer-options-help").textContent).toBe("Undo brings a deleted layer back.");
  });

  it("lets arrow keys reach all actions while retaining one Tab stop", () => {
    renderBar();
    click(tile(labels.lock));
    tile(labels.lock).focus();
    press(tile(labels.lock), "ArrowDown");
    expect(document.activeElement).toBe(tile(labels.clip));
    press(tile(labels.clip), "ArrowRight");
    expect(document.activeElement).toBe(tile(labels.moveBack));
    expect(tile(labels.moveBack).tabIndex).toBe(0);
    expect(tile(labels.lock).tabIndex).toBe(-1);
  });

  it.each([false, true])("allows Lock with locked=%s and explains that state", (locked) => {
    renderBar({ locked, clipped: true, clipBase: 1, opacity: 0 });
    const lock = tile(labels.lock);
    expect(lock.getAttribute("aria-disabled")).toBeNull();
    expect(lock.getAttribute("aria-pressed")).toBe(String(locked));
    const description = lock.getAttribute("aria-describedby");
    expect(description).toBeTruthy();
    expect(find(`[id="${description}"]`).textContent).toBe(
      locked
        ? "Keeps new marks inside this layer’s ink. Turn off to draw outside it."
        : "Keeps new marks inside this layer’s ink.",
    );
    click(lock);
    expect(handlers.onLock).toHaveBeenCalledExactlyOnceWith(!locked);
  });

  it("explains active Lock in Japanese without claiming the layer is empty", async () => {
    await act(async () => {
      await i18next.changeLanguage("ja");
    });
    try {
      renderBar({ locked: true });
      expect(find(".layer-option-toggle").textContent).toContain(
        "このレイヤーの描画内だけにかけます。外にもかくには、ロックを解除してください。",
      );
    } finally {
      await act(async () => {
        await i18next.changeLanguage("en");
      });
    }
  });

  it("keeps the maximum-layer explanation readable while options cover the Add label", () => {
    renderBar({ count: 10 });
    expect(find(".layer-options-maximum").textContent).toBe("10 layers · maximum");
  });
});
