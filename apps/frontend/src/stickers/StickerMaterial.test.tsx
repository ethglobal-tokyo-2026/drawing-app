// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, it, vi } from "vitest";
import { StickerMaterial } from "./StickerMaterial";
import { LaminateActiveContext } from "./laminateActiveContext";

import { mountSticker, refreshSticker, turnSticker, updateSticker } from "./stickerRenderer";

const anyActiveCallback: unknown = expect.any(Function);

vi.mock("./stickerRenderer", () => {
  const turns = new WeakMap<HTMLCanvasElement, number>();
  return {
    mountSticker: vi.fn((canvas: HTMLCanvasElement, options: { turn: number }) => {
      turns.set(canvas, options.turn);
      return vi.fn();
    }),
    turnSticker: vi.fn((canvas: HTMLCanvasElement, turn: number) => {
      turns.set(canvas, turn);
    }),
    stickerTurn: (canvas: HTMLCanvasElement) => turns.get(canvas),
    refreshSticker: vi.fn(),
    updateSticker: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(mountSticker).mockClear();
  vi.mocked(refreshSticker).mockClear();
  vi.mocked(turnSticker).mockClear();
  vi.mocked(updateSticker).mockClear();
});

it("suspends its retained surface through context and refreshes it once when exposed again", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const expose = (active: boolean) =>
    act(() =>
      root.render(
        <LaminateActiveContext value={active}>
          <StickerMaterial print="print.png" cut="cut.png" turn={42} />
        </LaminateActiveContext>,
      ),
    );
  try {
    expose(true);
    const canvas = host.querySelector("canvas");
    if (!canvas) throw new Error("The sticker finish did not mount");
    const options = vi.mocked(mountSticker).mock.calls[0]?.[1];
    expect(options?.active?.()).toBe(true);
    vi.mocked(refreshSticker).mockClear();

    expose(false);
    expect(options?.active?.()).toBe(false);
    expect(refreshSticker).not.toHaveBeenCalled();

    expose(true);
    expect(options?.active?.()).toBe(true);
    expect(refreshSticker).toHaveBeenCalledExactlyOnceWith(canvas);
    expect(host.querySelector("canvas")).toBe(canvas);
    expect(mountSticker).toHaveBeenCalledOnce();
    expect(updateSticker).toHaveBeenCalledOnce();
    expect(turnSticker).toHaveBeenCalledExactlyOnceWith(canvas, 42);
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});

it.each([undefined, true, false])(
  "preserves explicit activity when the surrounding presentation's activity is %s",
  (exposed) => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const setActive = (active: boolean) =>
      act(() => {
        const surface = <StickerMaterial print="print.png" cut="cut.png" active={active} />;
        root.render(
          exposed === undefined ? (
            surface
          ) : (
            <LaminateActiveContext value={exposed}>{surface}</LaminateActiveContext>
          ),
        );
      });
    try {
      setActive(false);
      const canvas = host.querySelector("canvas");
      if (!canvas) throw new Error("The sticker finish did not mount");
      const options = vi.mocked(mountSticker).mock.calls[0]?.[1];
      expect(options?.active?.()).toBe(false);
      expect(refreshSticker).not.toHaveBeenCalled();

      setActive(true);
      expect(options?.active?.()).toBe(exposed !== false);
      if (exposed === false) expect(refreshSticker).not.toHaveBeenCalled();
      else expect(refreshSticker).toHaveBeenCalledExactlyOnceWith(canvas);

      setActive(false);
      expect(options?.active?.()).toBe(false);
      expect(mountSticker).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  },
);

it("preserves a live gesture's displayed turn when its crease texture changes before commit", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    act(() => root.render(<StickerMaterial print="print.png" cut="cut.png" turn={0} />));
    const canvas = host.querySelector("canvas");
    if (!canvas) throw new Error("The sticker finish did not mount");
    expect(mountSticker).toHaveBeenLastCalledWith(canvas, {
      print: "print.png",
      cut: "cut.png",
      normal: undefined,
      turn: 0,
      finish: "gloss",
      active: anyActiveCallback,
      canRevealCrease: anyActiveCallback,
      startCreaseReveal: anyActiveCallback,
    });
    const options = vi.mocked(mountSticker).mock.calls[0]?.[1];
    expect(options?.canRevealCrease?.("normal.png")).toBe(false);
    expect(options?.startCreaseReveal?.("normal.png")).toBe(false);
    // The board gesture changes the surface before its saved placement reaches React.
    turnSticker(canvas, 67);
    act(() =>
      root.render(<StickerMaterial print="print.png" cut="cut.png" normal="normal.png" turn={0} />),
    );
    expect(mountSticker).toHaveBeenCalledOnce();
    expect(updateSticker).toHaveBeenLastCalledWith(canvas, {
      print: "print.png",
      cut: "cut.png",
      normal: "normal.png",
      finish: "gloss",
    });
    expect(turnSticker).toHaveBeenLastCalledWith(canvas, 67);
    act(() =>
      root.render(
        <StickerMaterial print="print.png" cut="cut.png" normal="next-normal.png" turn={90} />,
      ),
    );
    expect(turnSticker).toHaveBeenLastCalledWith(canvas, 90);
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
    act(() => root.render(<StickerMaterial print="print.png" cut="cut.png" turn={10} />));
    const canvas = host.querySelector("canvas");
    if (!canvas) throw new Error("The sticker finish did not mount");
    expect(mountSticker).toHaveBeenCalledOnce();
    const mounted = vi.mocked(mountSticker).mock.results[0];
    if (!mounted || mounted.type !== "return")
      throw new Error("The laminate mount did not return its cleanup");
    const release = mounted.value;
    act(() => root.render(<StickerMaterial print="print.png" cut="cut.png" turn={90} />));
    expect(mountSticker).toHaveBeenCalledOnce();
    expect(release).not.toHaveBeenCalled();
    expect(turnSticker).toHaveBeenLastCalledWith(canvas, 90);
    act(() =>
      root.render(
        <StickerMaterial print="print.png" cut="cut.png" normal="normal.png" turn={90} />,
      ),
    );
    expect(mountSticker).toHaveBeenCalledOnce();
    expect(release).not.toHaveBeenCalled();
    expect(updateSticker).toHaveBeenLastCalledWith(canvas, {
      print: "print.png",
      cut: "cut.png",
      normal: "normal.png",
      finish: "gloss",
    });
    act(() =>
      root.render(<StickerMaterial print="print.png" cut="cut.png" turn={90} finish="matte" />),
    );
    expect(mountSticker).toHaveBeenCalledOnce();
    expect(release).not.toHaveBeenCalled();
    expect(updateSticker).toHaveBeenLastCalledWith(canvas, {
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
    act(() => root.render(<StickerMaterial print="print.png" cut="cut.png" />));
    const canvas = host.querySelector("canvas");
    if (!canvas) throw new Error("The sticker finish did not mount");
    const mounted = vi.mocked(mountSticker).mock.results[0];
    if (!mounted || mounted.type !== "return")
      throw new Error("The laminate mount did not return its cleanup");
    act(() => root.render(<StickerMaterial print="sharp.png" cut="sharp-cut.png" />));
    expect(mountSticker).toHaveBeenCalledOnce();
    expect(mounted.value).not.toHaveBeenCalled();
    expect(updateSticker).toHaveBeenLastCalledWith(canvas, {
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
