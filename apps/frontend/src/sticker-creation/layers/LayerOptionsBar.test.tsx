// @vitest-environment happy-dom
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../../i18n/i18n";
import { LayerOptionsBar } from "./LayerOptionsBar";
import { testHost } from "./testHost";

const { render, find, click } = testHost();
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
      canClip
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
    renderBar({ canClip: false, canMoveBack: false, canMoveForward: false, canDelete: false });
    for (const label of [labels.clip, labels.moveBack, labels.moveForward, labels.delete]) {
      expect(tile(label).getAttribute("aria-disabled")).toBe("true");
      click(tile(label));
    }
    expect(handlers.onClip).not.toHaveBeenCalled();
    expect(handlers.onMoveBack).not.toHaveBeenCalled();
    expect(handlers.onMoveForward).not.toHaveBeenCalled();
    expect(handlers.onDelete).not.toHaveBeenCalled();
  });
});
