// @vitest-environment happy-dom
import { act, createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../../i18n/i18n";
import { buttonNamed, renderInHost, type HostView } from "../../ui/testing";
import { AddressPapers } from "./AddressPapers";
import type { ChainAddress } from "./addresses";

const SUI: ChainAddress = {
  state: "ready",
  address: "0x7a1e00000000000000000000000000000000000000000000000000000000b04d",
};
const TRY_AGAIN = i18next.t(($) => $.stickerBoard.addresses.tryAgain);

let view: HostView;
const onOpen = vi.fn();
const paperRef = createRef<HTMLButtonElement>();

const render = (sui: ChainAddress, lifted = false) =>
  view.rerender(<AddressPapers sui={sui} lifted={lifted} paperRef={paperRef} onOpen={onOpen} />);

const paper = () =>
  view.host.querySelector<HTMLButtonElement>(
    `button[aria-label="${i18next.t(($) => $.stickerBoard.addresses.sui.open)}"]`,
  );
const button = (label: string) => buttonNamed(view.host, label);

beforeEach(() => {
  view = renderInHost();
});

afterEach(() => {
  view.unmount();
  vi.restoreAllMocks();
  onOpen.mockReset();
});

describe("AddressPapers", () => {
  it("opens the dialog from the Sui address paper, which shows the short address", () => {
    render(SUI);
    const face = paper();
    expect(face?.textContent).toContain("0x7a1e…b04d");
    expect(paperRef.current).toBe(face);
    act(() => face?.click());
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("describes what the address is for, apart from the paper's name", () => {
    render(SUI);
    const id = paper()?.getAttribute("aria-describedby");
    const described = id ? document.getElementById(id)?.textContent : undefined;
    expect(described).toBeTruthy();
    expect(described).not.toBe(paper()?.getAttribute("aria-label"));
  });

  it("has no paper to open while the address is on its way", () => {
    render({ state: "loading" });
    expect(paper()).toBeNull();
    expect(view.host.textContent).toContain(i18next.t(($) => $.stickerBoard.addresses.sui.loading));
  });

  it("offers Try again only where asking again can bring the address", () => {
    render({ state: "failed" });
    expect(view.host.textContent).toContain(
      i18next.t(($) => $.stickerBoard.addresses.sui.didntLoad),
    );
    expect(() => button(TRY_AGAIN)).toThrow();

    const retry = vi.fn();
    render({ state: "failed", retry });
    act(() => button(TRY_AGAIN).click());
    expect(retry).toHaveBeenCalledOnce();
  });

  it("sticks the paper back on the cork only when it comes back from the dialog", () => {
    const animate = vi
      .spyOn(Element.prototype, "animate")
      .mockImplementation(() => new Animation());
    render(SUI);
    render(SUI, true);
    expect(paper()?.classList.contains("is-lifted")).toBe(true);
    expect(animate).not.toHaveBeenCalled();
    render(SUI);
    expect(animate).toHaveBeenCalled();
    expect(animate.mock.contexts.every((el) => el === paper())).toBe(true);
  });
});
