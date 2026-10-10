// @vitest-environment happy-dom
import type { BoardSticker } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../api/apiClient";
import { boardSticker, gift, people, sticker } from "../api/testFixtures";
import { emptyApi, renderWithApi, TEST_OWNER } from "../api/testing";
import { toPerson } from "../api/views";
import type { GiftSender } from "../giving/giftSender";
import { PREPARING_SLOW_MS } from "../giving/giveFlow";
import { onLargeScreen } from "../ui/testing";
import { forgetGreetings } from "./artistChipGreeting";
import { ArtistBoard } from "./ArtistBoard";
import { fieldOf, LARGE_LANDING_GROWTH, PHONE_BOARD, unitOf } from "./placement";
import { shortAddress } from "./stat-board/addresses";
import { placedAt } from "./testBoardSticker";

// Someone's stat board mounts behind the front; nothing here needs LINE.
vi.mock("@line/liff", () => ({ default: { isApiAvailable: () => false } }));
// LINE's picker, answered by each test.
const line = vi.hoisted(() => ({ send: vi.fn<GiftSender["send"]>() }));
vi.mock("../giving/useGiftSender", () => ({ useGiftSender: () => line }));

// happy-dom has no font loading; every browser the app runs in does.
Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });

let unmount = () => {};
afterEach(() => {
  unmount();
  vi.restoreAllMocks();
});

// The board's size sets where stickers sit and so their reading order; happy-dom measures none.
beforeEach(() => {
  forgetGreetings();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(741);
});

/** Someone's board with three stickers, listed out of reading order: two on a top row, one below. */
const three = () => [
  boardSticker({ placement: placedAt(0.6, 0.2), sticker: sticker({ artist: people.mika }) }),
  boardSticker({ placement: placedAt(0.4, 0.75), sticker: sticker({ artist: people.ken }) }),
  boardSticker({ placement: placedAt(0.2, 0.2), sticker: sticker({ artist: people.mika }) }),
];

async function visit(boardStickers: BoardSticker[], overrides: Partial<ApiClient> = {}) {
  const api = emptyApi({
    stickerBoard: () => Promise.resolve({ owner: people.ken, boardStickers }),
    ...overrides,
  });
  const view = renderWithApi(<ArtistBoard person={people.ken} onBack={() => {}} />, api);
  unmount = view.unmount;
  await act(async () => {});
  return view.host;
}

const stickersIn = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLElement>(".placed-sticker"),
];
const focus = (el: HTMLElement) => act(() => el.focus());
const press = (el: Element, key: string) =>
  act(() => void el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));

describe("ArtistBoard's greeting", () => {
  const chipsIn = (host: HTMLElement) => host.querySelectorAll(".artist-chip-layer__chip").length;

  it("names the artists of their foil stickers as it first opens, and not again on this app open", async () => {
    const first = await visit(three());
    // Two of the three were drawn by @mika, not by @ken whose board it is.
    expect(chipsIn(first)).toBe(2);
    unmount();

    const again = await visit(three());
    expect(chipsIn(again)).toBe(0);
  });

  it("clears the greeting once a sticker is selected", async () => {
    const host = await visit(three());
    act(() => stickersIn(host)[0]?.click());
    expect(chipsIn(host)).toBe(0);
  });
});

describe("ArtistBoard's keys", () => {
  it("starts on their name, and has the stickers one Tab stop, in reading order", async () => {
    const host = await visit(three());
    expect(document.activeElement).toBe(host.querySelector(".board-who"));
    const [first, second, third] = stickersIn(host);
    // The top row left to right, then the row below, whatever order the board lists them in.
    expect(stickersIn(host).map((el) => el.getAttribute("aria-label"))).toEqual([
      expect.stringContaining("1 of 3"),
      expect.stringContaining("2 of 3"),
      expect.stringContaining("3 of 3"),
    ]);
    expect(stickersIn(host).map((el) => el.tabIndex)).toEqual([0, -1, -1]);

    focus(first);
    press(first, "ArrowRight");
    expect(document.activeElement).toBe(second);
    expect(stickersIn(host).map((el) => el.tabIndex)).toEqual([-1, 0, -1]);
    press(second, "ArrowDown");
    expect(document.activeElement).toBe(third);
  });

  it("puts a selected sticker's toolbar right after it, and Escape gives focus back", async () => {
    const host = await visit(three());
    const [first] = stickersIn(host);
    focus(first);
    press(first, "Enter");
    expect(first.getAttribute("aria-pressed")).toBe("true");
    const toolbar = first.nextElementSibling;
    expect(toolbar?.getAttribute("role")).toBe("toolbar");
    expect(toolbar?.getAttribute("aria-label")).toMatch(/^No\./);
    // Foil marks a sticker someone else drew, and its toolbar names them above View.
    expect(toolbar?.querySelector(".artist-chip")).not.toBeNull();
    expect(toolbar?.textContent).toContain("View");
    expect(toolbar?.textContent).not.toContain("Remove");

    const view = toolbar?.querySelector("button");
    if (!view) throw new Error("The toolbar has no View");
    focus(view);
    press(view, "Escape");
    expect(document.activeElement).toBe(first);
    expect(host.querySelector(".sticker-toolbar")).not.toBeNull();
    press(first, "Escape");
    expect(host.querySelector(".sticker-toolbar")).toBeNull();
    expect(document.activeElement).toBe(first);
  });

  it("gives focus back to the sticker View opened from", async () => {
    const host = await visit(three());
    const [first] = stickersIn(host);
    focus(first);
    press(first, "Enter");
    const view = first.nextElementSibling?.querySelector("button");
    if (!view) throw new Error("The toolbar has no View");
    act(() => view.click());
    const dialog = document.querySelector(".visit-view");
    expect(dialog).not.toBeNull();
    press(document.body, "Escape");
    expect(document.querySelector(".visit-view")).toBeNull();
    expect(document.activeElement).toBe(first);
  });

  it("selects on a tap, and lets go on a tap on bare board", async () => {
    const host = await visit(three());
    const [first, second] = stickersIn(host);
    act(() => first.click());
    expect(first.getAttribute("aria-pressed")).toBe("true");
    act(() => second.click());
    expect(first.getAttribute("aria-pressed")).toBe("false");
    expect(second.getAttribute("aria-pressed")).toBe("true");
    // A press on the toolbar is not a tap on the board.
    act(() => host.querySelector<HTMLElement>(".sticker-toolbar")?.click());
    expect(second.getAttribute("aria-pressed")).toBe("true");
    act(() => host.querySelector<HTMLElement>(".board-stage")?.click());
    expect(host.querySelector(".sticker-toolbar")).toBeNull();
  });
});

describe("ArtistBoard's Give key", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    line.send.mockResolvedValue("sent");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Your board holds one sticker to give; their board is as in `three`. */
  const giving = () => ({
    stickerBoard: (userId?: string) =>
      Promise.resolve(
        userId
          ? { owner: people.ken, boardStickers: three() }
          : { owner: TEST_OWNER, boardStickers: [boardSticker()] },
      ),
    packageGift: (stickerId: string) =>
      Promise.resolve({
        gift: gift({ stickerId, status: "packed" }),
        giftClaimToken: `0x${"ab".repeat(32)}`,
        deposit: null,
      }),
    reportShared: (giftId: string) => Promise.resolve(gift({ id: giftId, status: "sent" })),
  });

  const keyOf = (selector: string) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`Nothing on screen matches ${selector}`);
    return el;
  };
  const tap = (selector: string) => act(() => keyOf(selector).click());

  /** Taps Give, which leaves focus where it was, as a tap does in Safari; returns that key. */
  async function tapGive() {
    await visit(three(), giving());
    const key = keyOf(".board-draw .key");
    expect(document.activeElement).not.toBe(key);
    tap(".board-draw .key");
    await act(async () => {});
    return key;
  }

  /**
   * Picks your sticker on the give sheet and gives it, which swaps the give sheet for Giving; then,
   * short of the long-wait notice and past the bag's beat, LINE's picker has opened and answered.
   */
  async function giveYourSticker() {
    tap(".sticker-picker button");
    tap(".giving__acts .key");
    await act(() => vi.dynamicImportSettled());
    expect(document.querySelector(".giving")).not.toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(PREPARING_SLOW_MS - 1));
  }

  it("gets focus back when the give sheet closes", async () => {
    const give = await tapGive();
    tap(".perf");
    expect(document.querySelector(".board-sheet-layer")).toBeNull();
    expect(document.activeElement).toBe(give);
  });

  it("gets focus back after backing out of the gift bag to the give sheet, and closing that", async () => {
    line.send.mockResolvedValue("cancelled");
    const give = await tapGive();
    await giveYourSticker();
    tap(".perf");
    expect(document.querySelector(".board-sheet-layer")).not.toBeNull();
    tap(".perf");
    expect(document.querySelector(".board-sheet-layer")).toBeNull();
    expect(document.activeElement).toBe(give);
  });

  it("gets focus back once the gift is sent and Giving closes", async () => {
    const give = await tapGive();
    await giveYourSticker();
    tap(".giving__sent .label-btn");
    expect(document.querySelector(".giving")).toBeNull();
    expect(document.activeElement).toBe(give);
  });
});

describe("ArtistBoard's stat board", () => {
  const SUI_ADDRESS = `0x${"5".repeat(64)}`;

  it("pins their Sui address at the foot of the leaf-and-stamps column, named for them", async () => {
    const suiAddress = vi.fn<ApiClient["suiAddress"]>(() => Promise.resolve(SUI_ADDRESS));
    const host = await visit(three(), { suiAddress });
    expect(suiAddress).toHaveBeenCalledWith(people.ken.id);
    const paper = host.querySelector(".stat-board__col--b .address-papers__face");
    expect(paper?.textContent).toContain(shortAddress(SUI_ADDRESS));
    expect(paper?.getAttribute("aria-label")).toContain(toPerson(people.ken).name);
  });

  it("pins no address paper while they have no Sui wallet", async () => {
    const host = await visit(three(), { suiAddress: () => Promise.resolve(null) });
    expect(host.querySelector(".address-papers")).toBeNull();
  });
});

describe("ArtistBoard's layouts", () => {
  const shown = (host: HTMLElement) => stickersIn(host).map((el) => el.dataset.stickerId);

  it("shows a visitor the layout for their own size class", async () => {
    // On the phone's board and in the tray in the large layout, and the other way round.
    const phone = boardSticker({
      placement: placedAt(0.3, 0.3),
      largePlacement: { ...placedAt(0.3, 0.3), onBoard: false },
    });
    const large = boardSticker({
      placement: { ...placedAt(0.7, 0.7), onBoard: false },
      largePlacement: placedAt(0.7, 0.7),
    });
    expect(shown(await visit([phone, large]))).toEqual([phone.stickerId]);
    unmount();
    onLargeScreen();
    expect(shown(await visit([phone, large]))).toEqual([large.stickerId]);
  });

  it("leads back to Explore with its chip on a phone, and on a large screen leaves that to the lit Explore tab", async () => {
    expect((await visit(three())).querySelector(".explore-chip")).not.toBeNull();
    unmount();
    onLargeScreen();
    expect((await visit(three())).querySelector(".explore-chip")).toBeNull();
  });

  it("shows a large screen a board with no large layout yet as its phone's arrangement spread across it, a size larger", async () => {
    onLargeScreen();
    const [W, H] = [1180, 662];
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(W);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(H);
    const centerX = (el: HTMLElement) =>
      Number(/translate\((-?[\d.]+)px/.exec(el.style.transform)?.[1]) +
      parseFloat(el.style.width) / 2;
    const [a, b] = [placedAt(0.1, 0.5), placedAt(0.9, 0.5)];
    const [left, right] = stickersIn(
      await visit([boardSticker({ placement: a }), boardSticker({ placement: b })]),
    );
    // Farther apart than the phone's whole field is wide: the arrangement has the large board's room.
    expect(centerX(right) - centerX(left)).toBeGreaterThan(fieldOf(PHONE_BOARD.W, PHONE_BOARD.H).w);
    expect(parseFloat(left.style.width)).toBeCloseTo(
      a.scale * LARGE_LANDING_GROWTH * unitOf("phone", PHONE_BOARD.W),
      0,
    );
  });
});
