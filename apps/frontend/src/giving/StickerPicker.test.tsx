// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canGiveTo } from "../stickers/nsfw";
import type { KeptSticker } from "../stickers/useKeptStickers";
import { StickerPicker } from "./StickerPicker";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const onPick = vi.fn();

const kept = (no: number, nsfw: boolean): KeptSticker => ({
  id: `s-${no}`,
  no,
  createdAt: 0,
  timeUsed: 60,
  width: 100,
  height: 100,
  url: `blob:${no}`,
  nsfw,
});

const pickFor = (recipient: "adult" | "unknown") => {
  act(() =>
    root.render(
      <StickerPicker
        stickers={[kept(1, false), kept(2, true)]}
        picked={null}
        onPick={onPick}
        label="Your stickers"
        blocked={(s) => !canGiveTo(s, recipient)}
      />,
    ),
  );
  for (const tile of host.querySelectorAll("button")) act(() => tile.click());
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onPick.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("StickerPicker", () => {
  it("won't pick an NSFW sticker for someone not verified adult, but picks their others", () => {
    pickFor("unknown");
    expect(onPick.mock.calls).toEqual([["s-1"]]);
  });

  it("picks an NSFW sticker for an adult", () => {
    pickFor("adult");
    expect(onPick.mock.calls).toEqual([["s-1"], ["s-2"]]);
  });
});
