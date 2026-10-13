// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, it, vi } from "vitest";
import { StickerLaminate } from "./StickerLaminate";

import { mountLaminate, turnLaminate, updateLaminate } from "./laminateRenderer";

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
    updateLaminate: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(mountLaminate).mockClear();
  vi.mocked(turnLaminate).mockClear();
  vi.mocked(updateLaminate).mockClear();
});

it("preserves a live gesture's displayed turn when its crease texture changes before commit", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    act(() => root.render(<StickerLaminate print="print.png" cut="cut.png" turn={0} />));
    const canvas = host.querySelector("canvas");
    if (!canvas) throw new Error("The sticker laminate did not mount");
    expect(mountLaminate).toHaveBeenLastCalledWith(canvas, {
      print: "print.png",
      cut: "cut.png",
      normal: undefined,
      turn: 0,
      finish: "gloss",
      active: anyActiveCallback,
      canRevealCrease: anyActiveCallback,
      startCreaseReveal: anyActiveCallback,
    });
    const options = vi.mocked(mountLaminate).mock.calls[0]?.[1];
    expect(options?.canRevealCrease?.("normal.png")).toBe(false);
    expect(options?.startCreaseReveal?.("normal.png")).toBe(false);
    // The board gesture changes the surface before its saved placement reaches React.
    turnLaminate(canvas, 67);
    act(() =>
      root.render(<StickerLaminate print="print.png" cut="cut.png" normal="normal.png" turn={0} />),
    );
    expect(mountLaminate).toHaveBeenCalledOnce();
    expect(updateLaminate).toHaveBeenLastCalledWith(canvas, {
      print: "print.png",
      cut: "cut.png",
      normal: "normal.png",
      finish: "gloss",
    });
    expect(turnLaminate).toHaveBeenLastCalledWith(canvas, 67);
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
    expect(mountLaminate).toHaveBeenCalledOnce();
    expect(release).not.toHaveBeenCalled();
    expect(updateLaminate).toHaveBeenLastCalledWith(canvas, {
      print: "print.png",
      cut: "cut.png",
      normal: "normal.png",
      finish: "gloss",
    });
    act(() =>
      root.render(<StickerLaminate print="print.png" cut="cut.png" turn={90} finish="matte" />),
    );
    expect(mountLaminate).toHaveBeenCalledOnce();
    expect(release).not.toHaveBeenCalled();
    expect(updateLaminate).toHaveBeenLastCalledWith(canvas, {
      print: "print.png",
      cut: "cut.png",
      normal: undefined,
      finish: "matte",
    });
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});

it("keeps the mounted surface during a sharper print replacement", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    act(() => root.render(<StickerLaminate print="print.png" cut="cut.png" />));
    const canvas = host.querySelector("canvas");
    if (!canvas) throw new Error("The sticker laminate did not mount");
    const mounted = vi.mocked(mountLaminate).mock.results[0];
    if (!mounted || mounted.type !== "return")
      throw new Error("The laminate mount did not return its cleanup");
    act(() => root.render(<StickerLaminate print="sharp.png" cut="sharp-cut.png" />));
    expect(mountLaminate).toHaveBeenCalledOnce();
    expect(mounted.value).not.toHaveBeenCalled();
    expect(updateLaminate).toHaveBeenLastCalledWith(canvas, {
      print: "sharp.png",
      cut: "sharp-cut.png",
      normal: undefined,
      finish: "gloss",
    });
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
