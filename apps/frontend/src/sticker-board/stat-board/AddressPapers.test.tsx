// @vitest-environment happy-dom
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddressPapers } from "./AddressPapers";
import type { Chain, ChainAddress } from "./addresses";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const BOARD: ChainAddress = {
  state: "ready",
  address: "0x3F2a0000000000000000000000000000000c9c1B",
};
const SUI: ChainAddress = {
  state: "ready",
  address: "0x7a1e00000000000000000000000000000000000000000000000000000000b04d",
};

let host: HTMLDivElement;
let root: Root;
const onOpen = vi.fn();
const paperRefs = { ethereum: createRef<HTMLButtonElement>(), sui: createRef<HTMLButtonElement>() };

const render = (board: ChainAddress, sui: ChainAddress, lifted: Chain | null = null) =>
  act(() =>
    root.render(
      <AddressPapers
        board={board}
        sui={sui}
        lifted={lifted}
        paperRefs={paperRefs}
        onOpen={onOpen}
      />,
    ),
  );

const paper = (name: "board" | "Sui") =>
  host.querySelector<HTMLButtonElement>(
    `button[aria-label="Show your ${name} address as a QR code"]`,
  );
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
  it.each([
    ["board", "ethereum", "0x3F2a…9c1B"],
    ["Sui", "sui", "0x7a1e…b04d"],
  ] as const)(
    "opens the dialog from the %s address paper, which shows the short address",
    (name, chain, short) => {
      render(BOARD, SUI);
      const face = paper(name);
      expect(face?.textContent).toContain(short);
      expect(paperRefs[chain].current).toBe(face);
      act(() => face?.click());
      expect(onOpen).toHaveBeenCalledExactlyOnceWith(chain);
    },
  );

  it("has no paper to open while an address is on its way", () => {
    render({ state: "loading" }, { state: "loading" });
    expect(paper("board")).toBeNull();
    expect(paper("Sui")).toBeNull();
    expect(host.textContent).toContain("Getting your board address…");
    expect(host.textContent).toContain("Getting your Sui address…");
  });

  it("offers Try again only where signing in again can bring the address", () => {
    const retry = vi.fn();
    render({ state: "failed", retry }, { state: "failed" });
    expect(host.textContent).toContain("Board address didn’t load");
    expect(host.textContent).toContain("Sui address didn’t load");
    expect(
      [...host.querySelectorAll("button")].filter((b) => b.textContent === "Try again"),
    ).toHaveLength(1);
    act(() => button("Try again")?.click());
    expect(retry).toHaveBeenCalledOnce();
  });

  it("sticks a paper back on the cork only when it comes back from the dialog", () => {
    const animate = vi
      .spyOn(Element.prototype, "animate")
      .mockImplementation(() => new Animation());
    render(BOARD, SUI);
    render(BOARD, SUI, "sui");
    expect(paper("Sui")?.classList.contains("is-lifted")).toBe(true);
    expect(paper("board")?.classList.contains("is-lifted")).toBe(false);
    expect(animate).not.toHaveBeenCalled();
    render(BOARD, SUI);
    expect(animate).toHaveBeenCalled();
    expect(animate.mock.contexts.every((el) => el === paper("Sui"))).toBe(true);
  });
});
