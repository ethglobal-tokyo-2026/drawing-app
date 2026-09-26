// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GivenTo } from "./boardSticker";
import { GivenStickerSilhouette } from "./GivenStickerSilhouette";
import { fieldOf } from "./placement";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Midday, so the day reads the same in every time zone. */
const sept23 = new Date(2026, 8, 23, 12).getTime();
const sticker = {
  id: "s-147",
  no: 147,
  createdAt: sept23,
  timeUsed: 292,
  width: 120,
  height: 100,
  nsfw: false,
  urls: { png: "blob:147", mask: "blob:147-mask" },
  placement: { on: true, x: 0.5, y: 0.5, s: 0.3, r: 0, z: 1 },
};

let host: HTMLDivElement;
let root: Root;

const draw = (where: { givenTo: GivenTo } | { sentAt: number; to?: string }) => {
  act(() =>
    root.render(
      <GivenStickerSilhouette
        sticker={sticker}
        mask={sticker.urls.mask}
        field={fieldOf(390, 657)}
        boardWidth={390}
        onOpen={() => {}}
        {...where}
      />,
    ),
  );
  const silhouette = host.querySelector("button");
  return {
    label: silhouette?.getAttribute("aria-label"),
    caption: silhouette?.querySelector(".given-sticker-silhouette__caption")?.textContent,
  };
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("GivenStickerSilhouette", () => {
  it("names who received it, and when", () => {
    const receiver = {
      id: "artist-bob",
      handle: "bob",
      name: "Bob Tanaka",
      ageStatus: "adult" as const,
    };
    expect(draw({ givenTo: { receiver, receivedAt: sept23 } })).toEqual({
      label: "No.0147, given to @bob on 9.23. Open it",
      caption: "No.0147@bob",
    });
  });

  it("names the artist it was sent to in the app, and a friend through LINE's picker", () => {
    expect(draw({ sentAt: sept23, to: "mika" }).caption).toBe("No.0147@mika");
    expect(draw({ sentAt: sept23 }).label).toBe("No.0147, given to a friend on 9.23. Open it");
  });
});
