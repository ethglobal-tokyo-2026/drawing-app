// @vitest-environment happy-dom
import { act, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../ui/ToastProvider";
import { AddressDialog } from "./AddressDialog";
import type { Chain } from "./addresses";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const liff = vi.hoisted(() => ({ isInClient: vi.fn(() => false), openWindow: vi.fn() }));
vi.mock("@line/liff", () => ({ default: liff }));

const ADDRESS = "0x3F2a5B0c9d1E4f6A7b8C9d0E1f2A3b4C5d6E9c1B";
const ETHERSCAN_PAGE = `https://sepolia.etherscan.io/address/${ADDRESS}`;
const SUI_ADDRESS = "0x7a1e5b0c9d1e4f6a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f708192ab04d";
const SUISCAN_PAGE = `https://suiscan.xyz/testnet/account/${SUI_ADDRESS}`;

let host: HTMLDivElement;
let root: Root;
const onClose = vi.fn();
const writeText = vi.fn<(text: string) => Promise<void>>();
/** Every flight the dialog starts; happy-dom never plays them. */
let flights: Animation[] = [];

/** The stat board's side of it: the paper on the cork, and the dialog it opens beside the cork. */
function Board({ chain = "ethereum", address = ADDRESS }: { chain?: Chain; address?: string }) {
  const paper = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <ToastProvider>
      <button ref={paper} type="button" onClick={() => setOpen(true)}>
        Board address paper
      </button>
      {open && (
        <AddressDialog
          chain={chain}
          address={address}
          from={paper}
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        />
      )}
    </ToastProvider>
  );
}

const find = <E extends Element>(selector: string) => host.querySelector<E>(selector);
const button = (name: string) => {
  const found = [...host.querySelectorAll("button")].find(
    (b) => b.textContent === name || b.getAttribute("aria-label") === name,
  );
  if (!found) throw new Error(`No "${name}" button`);
  return found;
};
const dialog = () => find<HTMLElement>('[role="dialog"]');
const toastText = () => find('[role="status"]')?.textContent;
/** Lands every flight under way, as the browser would once they've played. */
const land = () => act(async () => flights.forEach((a) => a.finish()));

/** Opens the dialog from the focused paper, as a tap on the cork does. */
async function open(chain?: Chain, address?: string) {
  act(() => root.render(<Board chain={chain} address={address} />));
  button("Board address paper").focus();
  await act(async () => button("Board address paper").click());
  await land();
}

beforeEach(() => {
  flights = [];
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => {
    const flight = new Animation();
    flights.push(flight);
    return flight;
  });
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  onClose.mockReset();
  writeText.mockReset();
  liff.isInClient.mockReset().mockReturnValue(false);
  liff.openWindow.mockReset();
  vi.restoreAllMocks();
});

describe("AddressDialog", () => {
  it("copies the board address and says so", async () => {
    writeText.mockResolvedValue();
    await open();
    await act(async () => button("Copy address").click());
    expect(writeText).toHaveBeenCalledWith(ADDRESS);
    expect(toastText()).toBe("Board address copied");
  });

  it("copies a Sui address and links to its page on Suiscan", async () => {
    writeText.mockResolvedValue();
    await open("sui", SUI_ADDRESS);
    expect(find("h2")?.textContent).toBe("Your Sui address");
    expect(find<HTMLAnchorElement>("a[href]")?.getAttribute("href")).toBe(SUISCAN_PAGE);
    await act(async () => button("Copy address").click());
    expect(writeText).toHaveBeenCalledWith(SUI_ADDRESS);
    expect(toastText()).toBe("Sui address copied");
  });

  it("says so when the clipboard refuses it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    writeText.mockRejectedValue(new DOMException("Not allowed here", "NotAllowedError"));
    await open();
    await act(async () => button("Copy address").click());
    expect(toastText()).toBe("Couldn’t copy the board address");
    expect(error).toHaveBeenCalledWith("Couldn't copy the board address", expect.any(DOMException));
  });

  it("links to the board address's page on Etherscan", async () => {
    await open();
    const link = find<HTMLAnchorElement>("a[href]");
    expect(link?.getAttribute("href")).toBe(ETHERSCAN_PAGE);
    expect(link?.target).toBe("_blank");
    expect(link?.rel).toBe("noopener noreferrer");
  });

  it("opens Etherscan in LINE's own browser inside LINE's app", async () => {
    liff.isInClient.mockReturnValue(true);
    await open();
    const tap = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => void find("a[href]")?.dispatchEvent(tap));
    expect(tap.defaultPrevented).toBe(true);
    expect(liff.openWindow).toHaveBeenCalledWith({ url: ETHERSCAN_PAGE, external: false });
  });

  it.each([
    ["the X", () => button("Close").click()],
    [
      "Escape",
      () =>
        document.activeElement?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        ),
    ],
    ["a tap on the scrim", () => find<HTMLElement>(".address-dialog__scrim")?.click()],
  ])("puts the paper back once on %s, however often it's asked", async (_, ask) => {
    await open();
    act(() => {
      ask();
      ask();
    });
    expect(onClose).not.toHaveBeenCalled();
    await land();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();
  });

  it("turns the paper around mid-flight rather than starting the way back over", async () => {
    act(() => root.render(<Board />));
    await act(async () => button("Board address paper").click());
    const opening = [...flights];
    act(() => button("Close").click());
    expect(opening.every((a) => a.playbackRate < 0)).toBe(true);
    expect(flights).toHaveLength(opening.length);
    await land();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("takes focus in, and gives it back to the paper once the paper is back", async () => {
    await open();
    expect(dialog()?.contains(document.activeElement)).toBe(true);
    act(() => button("Close").click());
    await land();
    expect(document.activeElement).toBe(button("Board address paper"));
  });
});
