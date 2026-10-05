// @vitest-environment happy-dom
import type { Me } from "@drawing-app/api/client";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MeContext } from "../api/meContext";
import { TEST_ME } from "../api/testing";
import { strings } from "../i18n/strings";
import { formatNo } from "../stickers/format";
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

/** Your sticker No.0001, and No.0002, an NSFW one, picked from in turn for someone, as `me`. */
const pickFor = (recipientOptedIn: boolean, me: Me = TEST_ME) => {
  act(() =>
    root.render(
      <MeContext value={me}>
        <StickerPicker
          stickers={[kept(1, false), kept(2, true)]}
          picked={null}
          onPick={onPick}
          label="Your stickers"
          blocked={(s) => !canGiveTo(s, recipientOptedIn)}
        />
      </MeContext>,
    ),
  );
  for (const tile of host.querySelectorAll("button")) act(() => tile.click());
};
const nsfwTile = () => host.querySelectorAll("button")[1];

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
  it("won't pick an NSFW sticker for someone without the NSFW opt-in, but picks their others", () => {
    pickFor(false);
    expect(onPick.mock.calls).toEqual([["s-1"]]);
  });

  it("picks an NSFW sticker for someone with the NSFW opt-in", () => {
    pickFor(true);
    expect(onPick.mock.calls).toEqual([["s-1"], ["s-2"]]);
    expect(nsfwTile()?.querySelector(".nsfw-mark")).toBeNull();
  });

  it("marks your NSFW sticker 18+ while you see it blurred, and still picks it", () => {
    pickFor(true, { ...TEST_ME, nsfwOptIn: false });
    expect(onPick.mock.calls).toEqual([["s-1"], ["s-2"]]);
    expect(nsfwTile()?.querySelector(".nsfw-mark")).not.toBeNull();
    expect(nsfwTile()?.getAttribute("aria-label")).toBe(
      `${formatNo(2)}, ${strings.stickers.nsfw.veiled.en}`,
    );
  });
});
