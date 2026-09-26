// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StickerRecord } from "../../stickers/stickerStorage";
import { ticketDay } from "../../tickets/tickets";
import type { SealedSticker } from "./makeSticker";
import { SealCeremony } from "./SealCeremony";
import { TOTAL } from "./sealTimeline";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date(2026, 8, 26, 21, 4);

const sticker: SealedSticker = {
  png: new Blob(),
  mask: new Blob(),
  spec: new Blob(),
  rim: new Blob(),
  flat: new Blob(),
  outline: "M0 0L100 0L100 80Z",
  width: 120,
  height: 100,
  pad: 6,
  inkWidth: 748,
  place: { x: 100, y: 200, w: 480, h: 400 },
  contour: [
    [130, 230],
    [550, 230],
    [550, 570],
    [130, 570],
  ],
  layers: {
    plain: "blob:plain",
    tint: "blob:tint",
    gloss: "blob:gloss",
    shadow: "blob:shadow",
    mask: "blob:mask",
    spec: "blob:spec",
    rim: "blob:rim",
  },
  maskImage: document.createElement("canvas"),
  dispose: () => {},
};

const record: StickerRecord = {
  id: "s1",
  no: 147,
  createdAt: NOW.getTime(),
  timeUsed: 292,
  blob: new Blob(),
  width: 120,
  height: 100,
};

const onKeepDrawing = vi.fn();
const onBoard = vi.fn();
const onGetTickets = vi.fn();

let host: HTMLDivElement;
let root: Root;

/** Opens the ceremony with `used` of the day's three tickets used. */
async function seal(used: number) {
  const uses = Array.from({ length: used }, () => ({}));
  localStorage.setItem("draw.tickets", JSON.stringify({ day: ticketDay(NOW), uses, paid: 0 }));
  // Async, so the ticket stubs' outlines settle inside it.
  await act(async () =>
    root.render(
      <SealCeremony
        sticker={sticker}
        record={record}
        sheet={{ x: 8, y: 8, w: 374, h: 788 }}
        handle="alice"
        onKeepDrawing={onKeepDrawing}
        onBoard={onBoard}
        onGetTickets={onGetTickets}
      />,
    ),
  );
}

const button = (name: string) => {
  const found = [...host.querySelectorAll("button")].find((b) => b.textContent === name);
  if (!found) throw new Error(`no "${name}" button`);
  return found;
};
const card = () => host.querySelector(".sealed-card");
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
/** Past the ceremony's end: its clock starts at its first animation frame, not at mount. */
const playThrough = () => wait(TOTAL + 50);

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  // Whether the sheen plays isn't tested here; happy-dom's own animations reject unhandled.
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  // happy-dom has no 2D canvas: the ceremony plays without its dim, used sticker silhouette and
  // cut line, and says so.
  const report = console.error.bind(console);
  vi.spyOn(console, "error").mockImplementation((message: unknown, ...rest: unknown[]) => {
    if (!String(message).startsWith("No 2D context")) report(message, ...rest);
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("SealCeremony", () => {
  it.each<[string, () => void]>([
    [
      "a tap",
      () =>
        host.firstElementChild?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })),
    ],
    [
      "Enter",
      () =>
        document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    ],
  ])("skips to the sealed card at %s", async (_, skip) => {
    await seal(1);
    wait(400);
    expect(card()?.hasAttribute("inert")).toBe(true);
    act(skip);
    expect(card()?.hasAttribute("inert")).toBe(false);
    expect(host.querySelector<HTMLElement>(".seal-ceremony__piece")?.style.transform).toContain(
      "rotate(-2deg)",
    );
  });

  it.each([
    ["Keep drawing", onKeepDrawing],
    ["Go to sticker board", onBoard],
  ])("acts on %s once, and only once the ceremony has played", async (name, action) => {
    await seal(1);
    wait(1000);
    act(() => button(name).click());
    wait(1000);
    expect(action).not.toHaveBeenCalled();
    playThrough();
    act(() => button(name).click());
    act(() => button(name).click());
    wait(1000);
    expect(action).toHaveBeenCalledOnce();
  });

  it("leads to the sticker board and Sui on the last ticket", async () => {
    await seal(1);
    playThrough();
    expect(button("Keep drawing")).toBeTruthy();
    expect(button("Go to sticker board").classList.contains("label-btn")).toBe(true);
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(
      "2 tickets left today",
    );
    act(() => root.unmount());
    root = createRoot(host);

    await seal(3);
    playThrough();
    expect(button("Go to sticker board").classList.contains("key")).toBe(true);
    act(() => button("Get more tickets with Sui").click());
    wait(1000);
    expect(onGetTickets).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("That was today’s last ticket · new ones at 4:00 AM");
  });
});
