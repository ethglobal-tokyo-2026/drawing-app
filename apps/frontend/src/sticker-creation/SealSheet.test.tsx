// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dragBy, onLargeScreen } from "../ui/testing";
import { DISMISS_PX } from "../ui/useSheetDrag";
import { SealSheet } from "./SealSheet";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe("SealSheet", () => {
  it("on an iPad closes from a swipe down its head or its scrim, but from neither once time's up", () => {
    onLargeScreen();
    const onNotYet = vi.fn();
    const show = (timeUp: boolean) =>
      act(() =>
        root.render(
          <SealSheet
            open
            timeUp={timeUp}
            nsfw={false}
            subjects={null}
            ink={() => null}
            onNsfwChange={() => {}}
            onSeal={() => {}}
            onNotYet={onNotYet}
          />,
        ),
      );
    const swipe = () =>
      dragBy(document.querySelector(".seal-sheet .bottom-sheet__head"), [0, DISMISS_PX * 2]);
    // A browser's tap passes through an inert element, so the scrim only counts if it's live.
    const tapScrim = () => {
      const scrim = document.querySelector<HTMLElement>(".seal-sheet-layer__scrim");
      if (scrim && !scrim.closest("[inert]")) act(() => scrim.click());
    };
    show(true);
    swipe();
    tapScrim();
    expect(onNotYet).not.toHaveBeenCalled();
    show(false);
    swipe();
    expect(onNotYet).toHaveBeenCalledOnce();
    tapScrim();
    expect(onNotYet).toHaveBeenCalledTimes(2);
  });
});
