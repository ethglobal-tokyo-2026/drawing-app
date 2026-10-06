// @vitest-environment happy-dom
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddressPapers } from "./AddressPapers";
import type { ChainAddress } from "./addresses";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SUI: ChainAddress = {
  state: "ready",
  address: "0x7a1e00000000000000000000000000000000000000000000000000000000b04d",
};

let host: HTMLDivElement;
let root: Root;
const onOpen = vi.fn();
const paperRef = createRef<HTMLButtonElement>();

const render = (sui: ChainAddress, lifted = false) =>
  act(() =>
    root.render(<AddressPapers sui={sui} lifted={lifted} paperRef={paperRef} onOpen={onOpen} />),
  );

const paper = () =>
  host.querySelector<HTMLButtonElement>('button[aria-label="Show your Sui address as a QR code"]');
const button = (label: string) =>
  [...host.querySelectorAll("button")].find((b) => b.textContent === label);

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
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
    expect(host.textContent).toContain("Getting your Sui address…");
  });

  it("offers Try again only where asking again can bring the address", () => {
    render({ state: "failed" });
    expect(host.textContent).toContain("Sui address didn’t load");
    expect(button("Try again")).toBeUndefined();

    const retry = vi.fn();
    render({ state: "failed", retry });
    act(() => button("Try again")?.click());
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
