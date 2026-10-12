// @vitest-environment happy-dom
import { act, createElement, Fragment } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testStickerUrls } from "../stickers/testStickerUrls";
import type { CreaseBatch, CreaseReply } from "../stickers/creaseWorker";
import { fieldOf, PHONE_BOARD, unitOf } from "./placement";
import { keepCreasesShown, useCreases } from "./useCreases";

const field = fieldOf(PHONE_BOARD.W, PHONE_BOARD.H);
const unit = unitOf("phone", PHONE_BOARD.W);
const stickers = ["lower", "top"].map((id) => ({
  id,
  width: 200,
  height: 100,
  urls: testStickerUrls(id),
  placement: { on: true, x: 0.5, y: 0.5, s: 0.4, r: 0, z: 1 },
}));
const foilOf = () => null;

class PaintWorker {
  static instances: PaintWorker[] = [];
  terminate = vi.fn();
  postMessage = vi.fn<(batch: CreaseBatch) => void>();
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  constructor() {
    PaintWorker.instances.push(this);
  }
}

function Probe({ shift = 0 }: { shift?: number }) {
  const placed = stickers.map((sticker, i) =>
    i === 0
      ? { ...sticker, placement: { ...sticker.placement, x: sticker.placement.x + shift } }
      : sticker,
  );
  useCreases({ stickers: placed, field, unit, foilOf });
  return null;
}

let host: HTMLDivElement;
let root: Root;
const show = (left: boolean, right: boolean, shift = 0) => {
  act(() =>
    root.render(
      createElement(
        Fragment,
        null,
        left && createElement(Probe, { key: "left", shift }),
        right && createElement(Probe, { key: "right" }),
      ),
    ),
  );
};
const settle = () => {
  act(() => {
    vi.advanceTimersByTime(100);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  PaintWorker.instances = [];
  vi.stubGlobal("Worker", PaintWorker);
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      getContext() {
        return {};
      }
    },
  );
  keepCreasesShown(true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  act(() => void keepCreasesShown(false));
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("shared crease worker lifetime", () => {
  it("stays alive for another board and terminates after the final board unmounts", () => {
    show(true, true);
    settle();
    expect(PaintWorker.instances).toHaveLength(1);
    const first = PaintWorker.instances[0];

    show(false, true);
    expect(first.terminate).not.toHaveBeenCalled();
    show(false, false);
    expect(first.terminate).toHaveBeenCalledTimes(1);

    show(true, false);
    settle();
    expect(PaintWorker.instances).toHaveLength(2);
    expect(PaintWorker.instances[1].terminate).not.toHaveBeenCalled();
  });

  it("terminates when every mounted board turns creases off, then recreates on demand", () => {
    show(true, true);
    settle();
    const first = PaintWorker.instances[0];
    expect(first).toBeDefined();

    act(() => void keepCreasesShown(false));
    expect(first.terminate).toHaveBeenCalledTimes(1);
    act(() => void keepCreasesShown(true));
    settle();
    expect(PaintWorker.instances).toHaveLength(2);
    expect(PaintWorker.instances[1].terminate).not.toHaveBeenCalled();
  });

  it("sends changed intent before the settle delay when a completed key returns", () => {
    show(true, false);
    settle();
    const worker = PaintWorker.instances[0];
    const first = worker.postMessage.mock.calls.at(-1)?.[0];
    if (!first?.jobs[0]) throw new Error("The first board bake was not posted");
    const of = first.jobs[0];
    const done: CreaseReply = {
      ok: true,
      board: first.board,
      id: of.id,
      key: of.key,
      crease: null,
      timings: { decode: 0, draw: 0, shade: 0, encode: 0, total: 0 },
    };
    act(() => worker.onmessage?.(new MessageEvent("message", { data: done })));

    show(true, false, 0.05);
    const changed = worker.postMessage.mock.calls.at(-1)?.[0];
    expect(changed?.start).toBe(false);
    expect(changed?.jobs[0]?.key).not.toBe(of.key);
    show(true, false);
    const returned = worker.postMessage.mock.calls.at(-1)?.[0];
    expect(returned?.start).toBe(false);
    expect(returned?.jobs[0]?.key).toBe(of.key);

    settle();
    const next = worker.postMessage.mock.calls.at(-1)?.[0];
    expect(next?.start).toBe(true);
    expect(next?.jobs[0]?.key).toBe(of.key);
    expect(PaintWorker.instances).toHaveLength(1);
  });
});
