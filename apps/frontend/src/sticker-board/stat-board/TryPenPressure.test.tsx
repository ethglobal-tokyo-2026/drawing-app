// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import type { PenPressure } from "../../sticker-creation/canvas/brush";
import { contextOf, forgetContexts } from "../timelapse/testCanvas";
import { TryPenPressure } from "./TryPenPressure";

vi.mock(
  "../../sticker-creation/canvas/context2d",
  () => import("../../sticker-creation/canvas/testContext2d"),
);

/** The strip's size on screen, in CSS px, and the row strokes are drawn along. */
const [WIDTH, HEIGHT] = [300, 64];
const ROW = HEIGHT / 2;
/** How far a jittery sample strays off the row, in CSS px. */
const JITTER = 3;
/** ms between a Pencil's samples. */
const SAMPLE_MS = 1000 / 240;

type Sample = [x: number, y: number, pressure: number];

let frames: ((time: number) => void)[] = [];
let unmount = () => {};
afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
  forgetContexts();
  frames = [];
});

/** Try it under `response`, measured on screen as it is in Settings. */
function strip(response: PenPressure, fingersDraw = true): HTMLElement {
  vi.stubGlobal("requestAnimationFrame", (frame: (time: number) => void) => frames.push(frame));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const view = renderWithApi(<TryPenPressure response={response} fingersDraw={fingersDraw} />);
  unmount = view.unmount;
  const paper = view.host.querySelector<HTMLElement>(".try-pen-pressure__ink");
  if (!paper) throw new Error("No Try it strip");
  paper.getBoundingClientRect = () => new DOMRect(0, 0, WIDTH, HEIGHT);
  Object.defineProperties(paper, {
    clientWidth: { value: WIDTH },
    clientHeight: { value: HEIGHT },
  });
  return paper;
}

/** A pointer landing on the first sample, moving through the rest a frame apart, lifting on the last. */
function draw(paper: HTMLElement, pointerType: string, samples: Sample[]) {
  const send = (type: string, [x, y, pressure]: Sample, t: number) => {
    const event = new PointerEvent(type, {
      bubbles: true,
      pointerId: 1,
      pointerType,
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
      clientX: x,
      clientY: y,
      pressure,
    });
    Object.defineProperty(event, "timeStamp", { value: t });
    act(() => {
      paper.dispatchEvent(event);
      for (const frame of frames.splice(0)) frame(t);
    });
  };
  samples.forEach((sample, i) =>
    send(i === 0 ? "pointerdown" : "pointermove", sample, i * SAMPLE_MS),
  );
  send("pointerup", samples[samples.length - 1], samples.length * SAMPLE_MS);
}

/** Every point the strip's canvases painted, live and once it landed, as the circles its stroke is built from. */
const painted = (paper: HTMLElement) =>
  [...paper.querySelectorAll("canvas")]
    .flatMap((canvas) => contextOf(canvas)?.calls ?? [])
    .filter(([name]) => name === "arc")
    .map(([, x, y, r]) => ({ x: Number(x), y: Number(y), r: Number(r) }));

/** A pen's stroke along the row, its pressure rising from light: it moves, so it sets the width. */
const pressing = (jitter = 0): Sample[] =>
  Array.from({ length: 60 }, (_, i) => [
    20 + 4 * i,
    // Landing and lifting on the row; between, each sample strays up or down by `jitter`.
    i === 0 || i === 59 ? ROW : ROW + (i % 2 ? jitter : -jitter),
    0.2 + i / 600,
  ]);

describe("Try it", () => {
  it("draws with Smoothing as a fresh sheet does: a pen's jitter steadies", () => {
    const paper = strip("normal");
    draw(paper, "pen", pressing(JITTER));
    const strays = painted(paper).map(({ y }) => Math.abs(y - ROW));
    expect(strays.length).toBeGreaterThan(0);
    expect(Math.max(...strays)).toBeLessThan(JITTER);
  });

  it("draws a pen's pressure through the chosen curve: wider under Light than Firm", () => {
    const middle = (response: PenPressure) => {
      const paper = strip(response);
      draw(paper, "pen", pressing());
      const radii = painted(paper).map(({ r }) => r);
      return radii.toSorted((a, b) => a - b)[radii.length >> 1];
    };
    expect(middle("light")).toBeGreaterThan(middle("firm"));
  });

  it("lets fingers draw only where they draw on the sheet", () => {
    for (const fingersDraw of [false, true]) {
      const paper = strip("normal", fingersDraw);
      draw(paper, "touch", pressing());
      expect(painted(paper).length > 0).toBe(fingersDraw);
    }
  });
});
