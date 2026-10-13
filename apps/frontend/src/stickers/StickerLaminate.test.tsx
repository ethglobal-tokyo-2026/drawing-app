// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, it, vi } from "vitest";
import { StickerLaminate } from "./StickerLaminate";

import { mountLaminate, turnLaminate } from "./laminateRenderer";

const anyActiveCallback: unknown = expect.any(Function);

vi.mock("./laminateRenderer", () => {
  const turns = new WeakMap<HTMLCanvasElement, number>();
  return {
    mountLaminate: vi.fn((canvas: HTMLCanvasElement, options: { turn: number }) => {
      turns.set(canvas, options.turn);
      return vi.fn();
    }),
    turnLaminate: vi.fn((canvas: HTMLCanvasElement, turn: number) => {
      turns.set(canvas, turn);
    }),
    laminateTurn: (canvas: HTMLCanvasElement) => turns.get(canvas),
    refreshLaminate: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(mountLaminate).mockClear();
  vi.mocked(turnLaminate).mockClear();
});

it("preserves a live gesture's displayed turn when its crease texture changes before commit", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    act(() => root.render(<StickerLaminate print="print.png" cut="cut.png" turn={0} />));
    const canvas = host.querySelector("canvas");
    if (!canvas) throw new Error("The sticker laminate did not mount");
    // The board gesture changes the surface before its saved placement reaches React.
    turnLaminate(canvas, 67);
    act(() =>
      root.render(<StickerLaminate print="print.png" cut="cut.png" normal="normal.png" turn={0} />),
    );
    expect(mountLaminate).toHaveBeenLastCalledWith(canvas, {
      print: "print.png",
      cut: "cut.png",
      normal: "normal.png",
      turn: 67,
      finish: "gloss",
      active: anyActiveCallback,
    });
    act(() =>
      root.render(
        <StickerLaminate print="print.png" cut="cut.png" normal="next-normal.png" turn={90} />,
      ),
    );
    expect(turnLaminate).toHaveBeenLastCalledWith(canvas, 90);
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});

it("turns the mounted material without replacing textures and keeps that turn on a later rebake", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    act(() => root.render(<StickerLaminate print="print.png" cut="cut.png" turn={10} />));
    const canvas = host.querySelector("canvas");
    if (!canvas) throw new Error("The sticker laminate did not mount");
    expect(mountLaminate).toHaveBeenCalledOnce();
    const mounted = vi.mocked(mountLaminate).mock.results[0];
    if (!mounted || mounted.type !== "return")
      throw new Error("The laminate mount did not return its cleanup");
    const release = mounted.value;
    act(() => root.render(<StickerLaminate print="print.png" cut="cut.png" turn={90} />));
    expect(mountLaminate).toHaveBeenCalledOnce();
    expect(release).not.toHaveBeenCalled();
    expect(turnLaminate).toHaveBeenLastCalledWith(canvas, 90);
    act(() =>
      root.render(
        <StickerLaminate print="print.png" cut="cut.png" normal="normal.png" turn={90} />,
      ),
    );
    expect(mountLaminate).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledOnce();
    expect(mountLaminate).toHaveBeenLastCalledWith(canvas, {
      print: "print.png",
      cut: "cut.png",
      normal: "normal.png",
      turn: 90,
      finish: "gloss",
      active: anyActiveCallback,
    });
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
