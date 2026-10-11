// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { strings } from "../i18n/strings";
import { dragBy, onLargeScreen, renderInHost, SWITCH, buttonNamed } from "../ui/testing";
import { DISMISS_PX } from "../ui/useSheetDrag";
import { BORDER_UNITS } from "./sealing/dieCut";
import { SealSheet } from "./SealSheet";
import * as sealPreview from "./sealing/sealPreview";

/** Where the preview tests' ink is drawn, in its own pixels: inside a sheet small enough to scan whole. */
const INKED = vi.hoisted(() => ({ x: 50, y: 60, w: 50, h: 60 }));

vi.mock("./canvas/context2d", () => ({
  // happy-dom has no 2D context: this one paints nothing, and reads ink back only inside INKED.
  context2d: () => ({
    drawImage() {},
    fillRect() {},
    getImageData(_x: number, _y: number, w: number, h: number) {
      const image = new ImageData(w, h);
      for (let y = INKED.y; y < INKED.y + INKED.h; y++)
        for (let x = INKED.x; x < INKED.x + INKED.w; x++) image.data[(y * w + x) * 4 + 3] = 255;
      return image;
    },
  }),
}));

let view: ReturnType<typeof renderInHost> | undefined;
let prepare: MockInstance<typeof sealPreview.prepareSealPreview>;

beforeEach(() => {
  prepare = vi.spyOn(sealPreview, "prepareSealPreview").mockReturnValue("ready");
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
});

type Props = ComponentProps<typeof SealSheet>;
const defaultInk = () => freshInk();
const defaultDensity = () => 3;

/** Shows the seal sheet open over a sheet with no ink, with `props` in place of any of its own. */
function show(props: Partial<Props> = {}) {
  const sheet = (
    <SealSheet
      open
      timeUp={false}
      nsfw={false}
      subjects={null}
      ink={defaultInk}
      density={defaultDensity}
      onNsfwChange={() => {}}
      onSeal={() => {}}
      onNotYet={() => {}}
      onStartOver={() => {}}
      {...props}
    />
  );
  if (view) view.rerender(sheet);
  else view = renderInHost(sheet);
}

const words = strings.stickerCreation.sealSheet;
const status = () => {
  const node = document.querySelector<HTMLElement>(".seal-sheet__preview-status");
  if (!node) throw new Error("Seal preview status is absent");
  return node;
};
const key = (name: string) => buttonNamed(document, name);
const freshInk = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 150;
  canvas.height = 180;
  return canvas;
};

describe("SealSheet", () => {
  it("on an iPad closes from a swipe down its head or its scrim, but from neither once time's up", () => {
    onLargeScreen();
    const onNotYet = vi.fn();
    const swipe = () =>
      dragBy(document.querySelector(".seal-sheet .bottom-sheet__head"), [0, DISMISS_PX * 2]);
    // A browser's tap passes through an inert element, so the scrim only counts if it's live.
    const tapScrim = () => {
      const scrim = document.querySelector<HTMLElement>(".sheet-scrim");
      if (scrim && !scrim.closest("[inert]")) act(() => scrim.click());
    };
    show({ timeUp: true, onNotYet });
    swipe();
    tapScrim();
    expect(onNotYet).not.toHaveBeenCalled();
    show({ timeUp: false, onNotYet });
    swipe();
    expect(onNotYet).toHaveBeenCalledOnce();
    tapScrim();
    expect(onNotYet).toHaveBeenCalledTimes(2);
  });

  it("previews the ink with the die-cut's white border round it, at the sheet's density", () => {
    prepare.mockRestore();
    const density = 3;
    const ink = document.createElement("canvas");
    ink.width = INKED.x * 2 + INKED.w;
    ink.height = INKED.y * 2 + INKED.h;
    show({ ink: () => ink, density: () => density });
    const preview = document.querySelector<HTMLCanvasElement>(".seal-preview__ink");
    const border = BORDER_UNITS * density;
    // However large it's shown, it has the shape of the drawn part with the border all round.
    expect((preview?.width ?? 0) / (preview?.height ?? 1)).toBeCloseTo(
      (INKED.w + 2 * border) / (INKED.h + 2 * border),
      2,
    );
  });

  it("offers Not yet for an empty preview without sealing or discarding it", () => {
    prepare.mockReturnValue("empty");
    const seal = vi.fn();
    const discard = vi.fn();
    const back = vi.fn();
    show({ ink: freshInk, density: () => 3, onSeal: seal, onStartOver: discard, onNotYet: back });
    expect(status().textContent).toContain(words.empty.en);
    expect(document.querySelector(SWITCH)).toBeNull();
    expect(document.querySelector<HTMLElement>(".seal-preview")?.hidden).toBe(true);
    expect(key(words.seal.en).disabled).toBe(true);
    act(() => key(words.seal.en).click());
    expect(seal).not.toHaveBeenCalled();
    expect(discard).not.toHaveBeenCalled();
    act(() => key(words.notYet.en).click());
    expect(back).toHaveBeenCalledOnce();
  });

  it("keeps an empty time-up sheet until explicit Start a new sticker", () => {
    prepare.mockReturnValue("empty");
    const discard = vi.fn();
    show({ timeUp: true, ink: freshInk, density: () => 3, onStartOver: discard });
    expect(status().textContent).toContain(words.discardHelp.en);
    expect(discard).not.toHaveBeenCalled();
    act(() => key(strings.stickerCreation.seal.startOver.en).click());
    expect(discard).toHaveBeenCalledOnce();
  });

  it("releases a failed composite and recovers through Try again", () => {
    const copies: HTMLCanvasElement[] = [];
    const ink = vi.fn(() => {
      const copy = freshInk();
      copies.push(copy);
      return copy;
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    prepare
      .mockImplementationOnce(() => {
        throw new Error("read failed");
      })
      .mockReturnValue("ready");
    show({ ink, density: () => 3 });
    expect(status().textContent).toContain(words.previewFailed.en);
    expect(copies[0].width).toBe(0);
    act(() => key(words.retryPreview.en).click());
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(key(words.seal.en).disabled).toBe(false);
    expect(copies.every(({ width, height }) => width === 0 && height === 0)).toBe(true);
    expect(error).toHaveBeenCalled();
  });

  it.each([
    "null ink",
    "zero-size ink",
    "throwing ink",
    "null density",
    "NaN density",
    "zero density",
    "negative density",
  ])("reports %s as failed, never empty", (fault) => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const ink =
      fault === "null ink"
        ? () => null
        : fault === "throwing ink"
          ? () => {
              throw new Error("read failed");
            }
          : fault === "zero-size ink"
            ? () => {
                const canvas = document.createElement("canvas");
                canvas.width = 0;
                canvas.height = 0;
                return canvas;
              }
            : freshInk;
    const density = () =>
      fault === "null density"
        ? null
        : fault === "NaN density"
          ? Number.NaN
          : fault === "zero density"
            ? 0
            : fault === "negative density"
              ? -1
              : 3;
    show({ ink, density });
    expect(status().textContent).toContain(words.previewFailed.en);
    expect(status().textContent).not.toContain(words.empty.en);
    expect(key(words.seal.en).disabled).toBe(true);
    expect(error).toHaveBeenCalled();
  });

  it.each(["empty", "failed"] as const)("blocks time-up dismissal for %s", (result) => {
    onLargeScreen();
    const back = vi.fn();
    const discard = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    if (result === "empty") prepare.mockReturnValue("empty");
    else
      prepare.mockImplementation(() => {
        throw new Error("read failed");
      });
    show({ timeUp: true, ink: freshInk, density: () => 3, onNotYet: back, onStartOver: discard });
    dragBy(document.querySelector(".seal-sheet .bottom-sheet__head"), [0, DISMISS_PX * 2]);
    act(() => document.querySelector<HTMLElement>(".sheet-scrim")?.click());
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(back).not.toHaveBeenCalled();
    expect(discard).not.toHaveBeenCalled();
    expect(status().textContent).toContain(words.discardHelp.en);
    expect(key(strings.stickerCreation.seal.startOver.en).disabled).toBe(false);
    if (result === "failed") expect(error).toHaveBeenCalled();
  });

  it("prepares once across 18+ and time-up changes but prepares after reopening", () => {
    const ink = vi.fn(freshInk);
    const density = () => 3;
    show({ ink, density });
    const paintedTarget = prepare.mock.calls[0][0];
    show({ ink, density, nsfw: true });
    show({ ink, density, nsfw: true, timeUp: true });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".seal-preview__ink")).toBe(paintedTarget);
    show({ open: false, ink, density });
    show({ open: true, ink, density });
    expect(prepare).toHaveBeenCalledTimes(2);
  });

  it.each(["empty", "failed"] as const)(
    "settled time-up autofocus is safe for %s",
    async (result) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      if (result === "empty") prepare.mockReturnValue("empty");
      else
        prepare.mockImplementation(() => {
          throw new Error("read failed");
        });
      show({ timeUp: true });
      await act(async () => {});
      expect(document.activeElement).toBe(status());
      expect(status().tabIndex).toBe(0);
    },
  );

  it.each(["ready", "empty", "failed"] as const)(
    "time up moves focused Not yet safely for %s",
    async (result) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      if (result === "empty") prepare.mockReturnValue("empty");
      if (result === "failed")
        prepare.mockImplementation(() => {
          throw new Error("read failed");
        });
      show();
      key(words.notYet.en).focus();
      show({ timeUp: true });
      await act(async () => {});
      expect(document.activeElement).toBe(
        result === "ready" ? document.querySelector(SWITCH) : status(),
      );
    },
  );

  it.each(["ready", "empty-early", "empty-expired", "failed"] as const)(
    "retry focuses checking then the safe destination for %s",
    async (outcome) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const ink = vi.fn(freshInk);
      const density = () => 3;
      let focusSeenByPrepare: Element | null = null;
      prepare
        .mockImplementationOnce(() => {
          throw new Error("read failed");
        })
        .mockImplementationOnce(() => {
          focusSeenByPrepare = document.activeElement;
          if (outcome === "failed") throw new Error("read failed again");
          return outcome === "ready" ? "ready" : "empty";
        });
      show({ ink, density, timeUp: outcome === "empty-expired" });
      const paintedTarget = document.querySelector(".seal-preview__ink");
      key(words.retryPreview.en).focus();
      act(() => key(words.retryPreview.en).click());
      await act(async () => {});
      expect(
        (focusSeenByPrepare as Element | null)?.classList.contains("seal-sheet__preview-status"),
      ).toBe(true);
      expect(document.querySelector(".seal-preview__ink")).toBe(paintedTarget);
      const destination =
        outcome === "ready"
          ? document.querySelector(SWITCH)
          : outcome === "empty-early"
            ? key(words.notYet.en)
            : outcome === "empty-expired"
              ? status()
              : key(words.retryPreview.en);
      expect(document.activeElement).toBe(destination);
    },
  );

  it("does not steal focus from an unaffected dialog", async () => {
    const ink = vi.fn(freshInk);
    const density = () => 3;
    show({ ink, density });
    const dialog = document.querySelector<HTMLElement>(".seal-sheet");
    if (!dialog) throw new Error("Seal sheet is absent");
    dialog.tabIndex = 0;
    dialog.focus();
    show({ ink, density, timeUp: true });
    await act(async () => {});
    expect(document.activeElement).toBe(dialog);
  });

  it("opens a ready preview with focus on the 18+ switch", async () => {
    show();
    await act(async () => {});
    expect(document.activeElement).toBe(document.querySelector(SWITCH));
  });

  it.each(["empty", "failed"] as const)(
    "opens early %s with one announcement and safe focus",
    async (result) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      if (result === "empty") prepare.mockReturnValue("empty");
      else
        prepare.mockImplementation(() => {
          throw new Error("read failed");
        });
      show();
      await act(async () => {});
      expect(document.activeElement).toBe(
        key(result === "empty" ? words.notYet.en : words.retryPreview.en),
      );
      const message = result === "empty" ? words.empty.en : words.previewFailed.en;
      expect(
        [...document.querySelectorAll('[role="status"]')].filter((node) =>
          node.textContent?.includes(message),
        ),
      ).toHaveLength(1);
    },
  );

  it.each(["empty", "failed"] as const)(
    "reopens early %s with focus on its recovery action",
    async (result) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      if (result === "empty") prepare.mockReturnValue("empty");
      else
        prepare.mockImplementation(() => {
          throw new Error("read failed");
        });
      const ink = vi.fn(freshInk);
      const density = () => 3;
      show({ ink, density });
      await act(async () => {});
      show({ open: false, ink, density });
      await act(async () => {});
      show({ open: true, ink, density });
      await act(async () => {});
      expect(document.activeElement).toBe(
        key(result === "empty" ? words.notYet.en : words.retryPreview.en),
      );
    },
  );

  it("reopens an empty sheet as failed with focus on Try again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prepare.mockReturnValueOnce("empty").mockImplementation(() => {
      throw new Error("read failed");
    });
    const ink = vi.fn(freshInk);
    const density = () => 3;
    show({ ink, density });
    await act(async () => {});
    expect(document.activeElement).toBe(key(words.notYet.en));
    show({ open: false, ink, density });
    await act(async () => {});
    show({ open: true, ink, density });
    await act(async () => {});
    expect(status().textContent).toContain(words.previewFailed.en);
    expect(document.activeElement).toBe(key(words.retryPreview.en));
  });
});
