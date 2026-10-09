// @vitest-environment happy-dom
import type { TimelapseV1 } from "@drawing-app/api/client";
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../../api/apiClient";
import { ApiProvider } from "../../api/ApiProvider";
import { emptyApi } from "../../api/testing";
import { StickerFigure } from "../../stickers/StickerFigure";
import { errorMessage } from "../../i18n/errorMessage";
import { deferred, fakeTimelapsePlayers, handFrames, TEST_TIMELAPSE } from "./testTimelapse";
import { testStickerUrls } from "../../stickers/testStickerUrls";
import { TimelapseButton, TimelapseFailure } from "./TimelapseButton";
import { TimelapseLayer } from "./TimelapseLayer";
import {
  FADE_MS,
  HOLD_MS,
  REDUCED_FADE_MS,
  useTimelapse,
  type TimelapseSticker,
} from "./useTimelapse";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STICKER: TimelapseSticker = {
  id: "s-147",
  no: 147,
  width: 240,
  height: 200,
  urls: testStickerUrls("blob:s-147"),
};

let host: HTMLDivElement;
let root: Root;
let players: ReturnType<typeof fakeTimelapsePlayers>;
let frames: ReturnType<typeof handFrames>;
let client: ApiClient;

/** The detail's parts the timelapse reaches: the figure, a layer over it, and its controls. */
function Detail({ reduced }: { reduced: boolean }) {
  const figure = useRef<HTMLSpanElement>(null);
  const timelapse = useTimelapse({
    sticker: STICKER,
    hasTimelapse: true,
    figure,
    reduced,
    kyotoSeika: false,
    createPlayer: players.create,
    frames: frames.source,
  });
  const { phase, said } = timelapse;
  return (
    <>
      <div className="sticker-detail__slide">
        <StickerFigure
          ref={figure}
          urls={STICKER.urls}
          width={STICKER.width}
          height={STICKER.height}
        />
        <TimelapseLayer timelapse={timelapse} />
      </div>
      <p className="fine sticker-detail__fine-print">
        <TimelapseButton timelapse={timelapse} />
      </p>
      <TimelapseFailure timelapse={timelapse} />
      <button type="button" data-test="stop" onClick={timelapse.stop} />
      <output data-phase={phase} data-said={said ?? undefined} />
    </>
  );
}

const render = (reduced = false) =>
  act(() =>
    root.render(
      <ApiProvider client={client}>
        <Detail reduced={reduced} />
      </ApiProvider>,
    ),
  );
/** Lets pending promises settle, and React render what they set. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
/** Runs the ending's frames `ms` on. */
const advance = (ms: number) => act(() => frames.advance(ms));
const control = (name: string) => {
  const el = document.querySelector<HTMLButtonElement>(`[data-test="${name}"]`);
  if (!el) throw new Error(`no ${name} control`);
  return el;
};
const button = () => {
  const el = document.querySelector<HTMLButtonElement>(".timelapse-button");
  if (!el) throw new Error("no Timelapse button");
  return el;
};
const press = () => act(() => button().click());
/** The label the button shows. */
const label = () =>
  button().querySelector(".timelapse-button__labels > :not([aria-hidden])")?.textContent;
const alert = () => document.querySelector('[role="alert"]')?.textContent;
/** What the hook says: its phase, and what the live line said. */
const shows = () =>
  Object.fromEntries(Object.entries(document.querySelector("output")?.dataset ?? {}));
const phase = () => shows().phase;
const layer = () => document.querySelector<HTMLElement>(".timelapse-layer");
const sheen = () => {
  const band = document.querySelector(".live-resin__sheen > b");
  if (!band) throw new Error("The figure has no sheen");
  return band;
};

/** Presses Timelapse and lets it load, prepare and start playing. */
async function playing({ reduced = false } = {}) {
  render(reduced);
  press();
  await settle();
  players.last().prepared.resolve();
  await settle();
  expect(phase()).toBe("playing");
  return players.last();
}

/** The player paints its last op, and the ending starts. */
async function finish() {
  act(() => players.last().finish());
  await settle();
  expect(phase()).toBe("ending");
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  players = fakeTimelapsePlayers();
  frames = handFrames();
  client = emptyApi({ timelapse: () => Promise.resolve(TEST_TIMELAPSE) });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe("useTimelapse", () => {
  it("loads, prepares and plays, then holds the ink, fades to the sticker and sweeps its sheen once", async () => {
    const loaded = deferred<TimelapseV1>();
    client = emptyApi({ timelapse: () => loaded.promise });
    render();
    const swept = vi.spyOn(sheen(), "animate");

    press();
    expect(phase()).toBe("loading");
    expect(layer()).toBeNull();

    loaded.resolve(TEST_TIMELAPSE);
    await settle();
    expect(phase()).toBe("preparing");
    const player = players.last();
    expect(player.options.canvas.parentElement).toBe(layer());
    expect(player.calls).toEqual(["prepare"]);

    player.prepared.resolve();
    await settle();
    expect(shows()).toMatchObject({ phase: "playing", said: "playing" });
    expect(player.calls).toEqual(["prepare", "play"]);

    await finish();
    advance(HOLD_MS);
    expect(layer()?.style.opacity).toBe("1");
    advance(FADE_MS / 2);
    const opacity = Number(layer()?.style.opacity);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    expect(swept).not.toHaveBeenCalled();

    advance(FADE_MS / 2);
    expect(shows()).toMatchObject({ phase: "idle", said: "done" });
    expect(layer()).toBeNull();
    expect(swept).toHaveBeenCalledOnce();
    expect(player.calls.at(-1)).toBe("stop");
  });

  it("cuts its layer to the sticker's mask, out of screen readers' way", async () => {
    await playing();
    expect(layer()?.style.getPropertyValue("--m")).toContain(STICKER.urls.mask);
    expect(layer()?.getAttribute("aria-hidden")).toBe("true");
  });

  it("skips to the finished ink when the sticker is tapped", async () => {
    const player = await playing();
    act(() => layer()?.click());
    expect(player.calls).toContain("skip");
  });

  it("skips to the finished ink while it plays, and the ending still plays", async () => {
    const player = await playing();
    const swept = vi.spyOn(sheen(), "animate");
    press();
    expect(player.calls).toContain("skip");
    await settle();
    expect(phase()).toBe("ending");
    advance(HOLD_MS + FADE_MS);
    expect(phase()).toBe("idle");
    expect(swept).toHaveBeenCalledOnce();
  });

  it("shows the sticker at once when skipped during the ending, with no sheen", async () => {
    await playing();
    const swept = vi.spyOn(sheen(), "animate");
    await finish();
    advance(HOLD_MS / 2);
    press();
    expect(phase()).toBe("idle");
    expect(layer()).toBeNull();
    advance(HOLD_MS + FADE_MS);
    expect(swept).not.toHaveBeenCalled();
  });

  it("tells the player about reduced motion, and ends in a short fade with no sheen", async () => {
    const player = await playing({ reduced: true });
    expect(player.options.reduced).toBe(true);
    const swept = vi.spyOn(sheen(), "animate");
    await finish();
    advance(HOLD_MS + REDUCED_FADE_MS);
    expect(phase()).toBe("idle");
    expect(swept).not.toHaveBeenCalled();
  });

  it("follows reduced motion turned on while it plays", async () => {
    const player = await playing();
    expect(player.options.reduced).toBe(false);
    const told = vi.spyOn(player, "setReduced");
    render(true);
    expect(told).toHaveBeenCalledExactlyOnceWith(true);
    const swept = vi.spyOn(sheen(), "animate");
    await finish();
    advance(HOLD_MS + REDUCED_FADE_MS);
    expect(phase()).toBe("idle");
    expect(swept).not.toHaveBeenCalled();
  });

  it("names each state on the one button, keeping its focus, and says when it plays and ends", async () => {
    render();
    const pressed = button();
    expect(label()).toBe("Timelapse");
    expect(pressed.getAttribute("aria-label")).toBe("Timelapse: watch No.0147 being drawn");
    pressed.focus();

    press();
    expect(label()).toBe("Loading…");
    expect(pressed.getAttribute("aria-disabled")).toBe("true");
    expect(pressed.hasAttribute("aria-label")).toBe(false);
    press();
    await settle();
    expect(label()).toBe("Preparing…");
    expect(pressed.getAttribute("aria-disabled")).toBe("true");

    players.last().prepared.resolve();
    await settle();
    expect(label()).toBe("Skip");
    expect(pressed.getAttribute("aria-label")).toBe("Skip to the end");
    expect(pressed.hasAttribute("aria-disabled")).toBe(false);
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      "Playing how No.0147 was drawn",
    );

    await finish();
    advance(HOLD_MS + FADE_MS);
    expect(label()).toBe("Timelapse");
    expect(document.querySelector('[role="status"]')?.textContent).toBe("Done");
    expect(button()).toBe(pressed);
    expect(document.activeElement).toBe(pressed);
    expect(players.made).toHaveLength(1);
  });

  it("says why it couldn't load under the meta, logs it, and Try again loads it again", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    client = emptyApi();
    render();
    press();
    await settle();
    const notFound = new ApiError(404, { error: "timelapse_not_found", detail: STICKER.id });
    expect(alert()).toContain(errorMessage(notFound));
    expect(document.body.textContent).toContain(STICKER.id);
    expect(label()).toBe("Timelapse");
    expect(logged).toHaveBeenCalled();
    expect(players.made).toHaveLength(0);

    // Try again goes as it retries, so focus moves on to the button first.
    const tryAgain = document.querySelector<HTMLButtonElement>('[role="alert"] button');
    act(() => tryAgain?.focus());
    expect(document.activeElement).toBe(tryAgain);
    act(() => tryAgain?.click());
    expect(label()).toBe("Loading…");
    expect(document.activeElement).toBe(button());
    expect(alert()).toBeUndefined();
  });

  it("stops a player that couldn't prepare, says what failed, and leaves no layer", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    render();
    press();
    await settle();
    const player = players.last();
    player.prepared.reject(new Error("no 2D context"));
    await settle();
    expect(alert()).toContain("It couldn’t play here");
    expect(document.body.textContent).toContain("no 2D context");
    expect(label()).toBe("Timelapse");
    expect(logged).toHaveBeenCalled();
    expect(player.calls).toContain("stop");
    expect(layer()).toBeNull();
  });

  it("logs a failure that comes after stop, naming the sticker, and shows no failure line", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const loaded = deferred<TimelapseV1>();
    client = emptyApi({ timelapse: () => loaded.promise });
    render();
    press();
    act(() => control("stop").click());
    loaded.reject(new Error("offline"));
    await settle();
    expect(logged).toHaveBeenCalledWith(expect.stringContaining(STICKER.id), expect.anything());
    expect(alert()).toBeUndefined();
    expect(phase()).toBe("idle");
  });

  it("hides the layer at stop, before React renders again, and stops the player", async () => {
    const player = await playing();
    const shown = layer();
    act(() => {
      control("stop").click();
      expect(layer()).toBe(shown);
      expect(shown?.style.visibility).toBe("hidden");
    });
    expect(player.calls).toContain("stop");
    expect(layer()).toBeNull();
    expect(phase()).toBe("idle");
  });
});
