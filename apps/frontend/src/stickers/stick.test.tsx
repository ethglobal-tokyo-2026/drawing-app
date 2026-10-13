// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { renderInHost } from "../ui/testing";
import { StickerFigure } from "./StickerFigure";
import { playStick } from "./stick";
import { testStickerUrls } from "./testStickerUrls";

let rendered: ReturnType<typeof renderInHost> | undefined;
afterEach(() => rendered?.unmount());

describe("playStick", () => {
  it.each(["land", "drop"] as const)("settles when the %s movement finishes", async (from) => {
    rendered = renderInHost(
      <div>
        <StickerFigure urls={testStickerUrls("s")} width={100} height={100} />
      </div>,
    );
    const sticker = rendered.host.querySelector("div");
    if (!sticker) throw new Error("no sticker to land");
    let settled = false;
    const done = playStick(sticker, { from, reduced: false }).then(() => {
      settled = true;
    });
    const [movement] = sticker.getAnimations();
    expect(movement).toBeDefined();
    movement.finish();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).toBe(true);
    await done;
  });
});
