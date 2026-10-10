// @vitest-environment happy-dom
import { act, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buttonNamed, renderInHost, type HostView } from "../../ui/testing";
import { ToastProvider } from "../../ui/ToastProvider";
import { AddressDialog } from "./AddressDialog";

const liff = vi.hoisted(() => ({ isInClient: vi.fn(() => false), openWindow: vi.fn() }));
vi.mock("@line/liff", () => ({ default: liff }));

const ADDRESS = "0x7a1e5b0c9d1e4f6a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f708192ab04d";
const SUISCAN_PAGE = `https://suiscan.xyz/testnet/account/${ADDRESS}`;

let view: HostView;
const onClose = vi.fn();
const writeText = vi.fn<(text: string) => Promise<void>>();
/** Every flight the dialog starts; happy-dom never plays them. */
let flights: Animation[] = [];

/** The stat board's side of it: the paper on the cork, and the dialog it opens beside the cork. */
function Board() {
  const paper = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <ToastProvider>
      <button ref={paper} type="button" onClick={() => setOpen(true)}>
        Sui address paper
      </button>
      {open && (
        <AddressDialog
          address={ADDRESS}
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

const find = <E extends Element>(selector: string) => view.host.querySelector<E>(selector);
const button = (name: string) => buttonNamed(view.host, name);
const dialog = () => find<HTMLElement>('[role="dialog"]');
const toastText = () => find('[role="status"]')?.textContent;
/** Lands every flight under way, as the browser would once they've played. */
const land = () => act(async () => flights.forEach((a) => a.finish()));

/** Opens the dialog from the focused paper, as a tap on the cork does. */
async function open() {
  view.rerender(<Board />);
  button("Sui address paper").focus();
  await act(async () => button("Sui address paper").click());
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
  view = renderInHost();
});

afterEach(() => {
  view.unmount();
  onClose.mockReset();
  writeText.mockReset();
  liff.isInClient.mockReset().mockReturnValue(false);
  liff.openWindow.mockReset();
  vi.restoreAllMocks();
});

describe("AddressDialog", () => {
  it("copies the Sui address and says so", async () => {
    writeText.mockResolvedValue();
    await open();
    expect(find("h2")?.textContent).toBe("Your Sui address");
    await act(async () => button("Copy address").click());
    expect(writeText).toHaveBeenCalledWith(ADDRESS);
    expect(toastText()).toBe("Sui address copied");
  });

  it("keeps a copy the clipboard refused on the card, under Copy, until the next try", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    writeText.mockRejectedValueOnce(new DOMException("Not allowed here", "NotAllowedError"));
    await open();
    await act(async () => button("Copy address").click());
    const problem = () => find('[role="alert"]')?.textContent;
    expect(problem()).toContain("Couldn’t copy the Sui address");
    expect(toastText()).toBe("");
    expect(error).toHaveBeenCalledWith("Couldn't copy the Sui address", expect.any(DOMException));

    writeText.mockResolvedValueOnce();
    await act(async () => button("Copy address").click());
    expect(problem()).toBeUndefined();
    expect(toastText()).toBe("Sui address copied");
  });

  it("links to the Sui address's page on Suiscan", async () => {
    await open();
    const link = find<HTMLAnchorElement>("a[href]");
    expect(link?.getAttribute("href")).toBe(SUISCAN_PAGE);
    expect(link?.target).toBe("_blank");
    expect(link?.rel).toBe("noopener noreferrer");
  });

  it("opens Suiscan in LINE's own browser inside LINE's app", async () => {
    liff.isInClient.mockReturnValue(true);
    await open();
    const tap = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => void find("a[href]")?.dispatchEvent(tap));
    expect(tap.defaultPrevented).toBe(true);
    expect(liff.openWindow).toHaveBeenCalledWith({ url: SUISCAN_PAGE, external: false });
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
    view.rerender(<Board />);
    await act(async () => button("Sui address paper").click());
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
    expect(document.activeElement).toBe(button("Sui address paper"));
  });
});
