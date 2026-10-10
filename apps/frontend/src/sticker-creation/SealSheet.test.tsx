// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../api/testing";
import { dragBy, onLargeScreen } from "../ui/testing";
import { DISMISS_PX } from "../ui/useSheetDrag";
import { BORDER_UNITS } from "./sealing/dieCut";
import { SealSheet } from "./SealSheet";

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

let view: ReturnType<typeof renderWithApi> | undefined;

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
});

type Props = ComponentProps<typeof SealSheet>;

/** Shows the seal sheet open over a sheet with no ink, with `props` in place of any of its own. */
function show(props: Partial<Props> = {}) {
  const sheet = (
    <SealSheet
      open
      timeUp={false}
      nsfw={false}
      subjects={null}
      ink={() => null}
      density={() => null}
      onNsfwChange={() => {}}
      onSeal={() => {}}
      onNotYet={() => {}}
      {...props}
    />
  );
  if (view) view.rerender(sheet);
  else view = renderWithApi(sheet);
}

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
});
