// @vitest-environment happy-dom
import type { Gift } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyApi, renderWithApi, shownText, TEST_ME } from "../api/testing";
import { boardSticker, gift, MARKUP_LIKE_NAME } from "../api/testFixtures";
import { giving } from "../i18n/strings/giving";
import { refusingStorage } from "../ui/testing";
import { formatDay, formatDuration, formatNo } from "../stickers/format";
import type { GiftSender, GiftSendOutcome } from "./giftSender";
import { PICKER_ANSWER_MS, PREPARING_SLOW_MS } from "./giveFlow";
import { Giving } from "./Giving";
import { GiveSheet } from "./GiveSheet";

const stalePickerSend = vi.hoisted(() => vi.fn());
vi.mock("./useGiftSender", () => ({ useGiftSender: () => ({ send: stalePickerSend }) }));

const liff = vi.hoisted(() => ({ openWindow: vi.fn() }));
vi.mock("@line/liff", () => ({ default: liff }));

let view: ReturnType<typeof renderWithApi>;
/** Where each sticker's gift is on the server. */
let giftStatus: Map<string, Gift["status"]>;
let answerPicker: (outcome: GiftSendOutcome) => void;
const onClose = vi.fn();

const sender: GiftSender = {
  send: () => {
    return new Promise((resolve) => {
      answerPicker = resolve;
    });
  },
};

const token = `0x${"ab".repeat(32)}`;

/** A server that packs one gift per sticker and records what LINE's picker did with it. */
function giftsApi() {
  const byGift = new Map<string, string>();
  const settle = (giftId: string, status: Gift["status"]) => {
    const stickerId = byGift.get(giftId) ?? "";
    giftStatus.set(stickerId, status);
    return Promise.resolve(gift({ id: giftId, stickerId, status }));
  };
  return emptyApi({
    packageGift: (stickerId, forUserId) => {
      const packed = gift({ stickerId, status: "packed" });
      byGift.set(packed.id, stickerId);
      giftStatus.set(stickerId, "packed");
      return Promise.resolve({
        gift: packed,
        forUserId: forUserId ?? null,
        giftClaimToken: token,
        messageAttempt: null,
        deposit: null,
      });
    },
    beginMessageAttempt: (giftId) => settle(giftId, "packed"),
    reportShared: (giftId, _attemptId, outcome) =>
      settle(giftId, outcome === "sent" ? "sent" : "packed"),
    startTakeOut: (giftId) => settle(giftId, "taken_out").then((gift) => ({ gift })),
  });
}

interface Opening {
  fromHandle?: string;
  api?: ReturnType<typeof giftsApi>;
  toHandle?: string;
  nsfw?: boolean;
}

/** Opens Giving for a sticker, as Give does, which packs it at once; returns the sticker. */
const open = (
  stickerId: string,
  { fromHandle = "alice", api = giftsApi(), toHandle, nsfw = false }: Opening = {},
) => {
  const given = {
    id: stickerId,
    no: 147,
    timeUsed: 292,
    createdAt: Date.now(),
    url: "blob:x",
    nsfw,
  };
  view = renderWithApi(
    <Giving
      sticker={given}
      fromHandle={fromHandle}
      sender={sender}
      liffId="2011732197-P98cxGpu"
      onClose={onClose}
      {...(toHandle && { toHandle, forUserId: `user-${toHandle}` })}
    />,
    api,
  );
  return given;
};

const title = () => document.querySelector(".giving__title")?.textContent;
/** Taps the button named `label`, or the one whose text includes it. */
const tap = (label: string) =>
  act(() => {
    const target = [...document.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === label || b.textContent?.includes(label),
    );
    if (!target) throw new Error(`no "${label}" on screen; the title is "${title()}"`);
    target.click();
  });
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const pressEscape = () =>
  act(
    () =>
      void document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
  );
const giftOf = (stickerId: string) => giftStatus.get(stickerId);
/** Lets LINE's picker open past the bag's beat, and cancels it: Giving says Not sent yet. */
async function cancelPicker() {
  await wait(1150);
  await act(async () => answerPicker("cancelled"));
  await wait(0);
  expect(title()).toBe("Not sent yet");
}

// happy-dom has no font loading; every browser the app runs in does.
Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });

beforeEach(() => {
  vi.useFakeTimers();
  giftStatus = new Map();
  onClose.mockReset();
  liff.openWindow.mockReset();
});

afterEach(() => {
  view.unmount();
  vi.useRealTimers();
});

describe("Giving", () => {
  it("packs the sticker as it opens, opens LINE's picker, and closes the bag once it's sent", async () => {
    open("s-sent");
    expect(title()).toBe("Preparing your gift");
    expect(document.querySelector(".gift-tag__name")?.textContent).toBe("@alice");
    await wait(1150);
    expect(giftOf("s-sent")).toBe("packed");

    await act(async () => answerPicker("sent"));
    await wait(0);
    expect(title()).toBe("Closed and sent");
    expect(giftOf("s-sent")).toBe("sent");
    await wait(300);
    expect(document.querySelector(".gift-bag")?.getAttribute("data-state")).toBe("closed");

    tap("Back to My board");
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("keeps a storage failure visible after LINE cancels and the server records it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    open("s-storage-failed");
    await cancelPicker();
    expect(document.body.textContent).toContain(giving.transferProblem.storage_failed.en);
    vi.unstubAllGlobals();
    log.mockRestore();
  });

  it("shows a persistent storage warning when recovery cannot read kept outcomes", async () => {
    const api = giftsApi();
    const original = await api.packageGift("s-read-blocked");
    const attemptId = `0x${"89".repeat(32)}`;
    vi.spyOn(api, "packageGift").mockResolvedValue({
      ...original,
      giftClaimToken: null,
      messageAttempt: { id: attemptId, state: "pending" },
    });
    const storage = localStorage;
    const failure = new Error("Gift outcome reads blocked");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const setItem = vi.fn(storage.setItem.bind(storage));
    const removeItem = vi.fn(storage.removeItem.bind(storage));
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => {
        if (key === "draw.gifts.kept.me") throw failure;
        return storage.getItem(key);
      },
      setItem,
      removeItem,
    });
    try {
      open("s-read-blocked", { api });
      await wait(1150);
      expect(title()).toBe("LINE send error");
      expect(document.querySelector('.giving__scroll [role="alert"]')?.textContent).toContain(
        "LINE didn’t confirm that No.0147 was sent",
      );
      expect(document.body.textContent).toContain(giving.transferProblem.storage_failed.en);
      await wait(5000);
      expect(document.body.textContent).toContain(giving.transferProblem.storage_failed.en);
      expect(setItem).not.toHaveBeenCalled();
      expect(removeItem).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledExactlyOnceWith(
        "Giving's kept gifts can't be read on this device",
        failure,
      );
    } finally {
      vi.unstubAllGlobals();
      log.mockRestore();
    }
  });

  it("keeps a missing-token gift in the bag when Giving closes", async () => {
    const api = giftsApi();
    const original = await api.packageGift("s-no-token");
    vi.spyOn(api, "packageGift").mockResolvedValue({ ...original, giftClaimToken: null });
    const takeOut = vi.spyOn(api, "startTakeOut");
    open("s-no-token", { api });
    await wait(1150);
    expect(document.body.textContent).toContain(giving.transferProblem.no_link.en);
    expect(takeOut).not.toHaveBeenCalled();
    pressEscape();
    expect(onClose).toHaveBeenCalledExactlyOnceWith(false);
    expect(takeOut).not.toHaveBeenCalled();
  });

  /** A server whose packing waits until `finishPacking` runs. */
  async function slowPacking(stickerId: string) {
    const api = giftsApi();
    const packed = await api.packageGift(stickerId);
    let finishPacking: () => void = () => {
      throw new Error("No pending gift");
    };
    const packing = new Promise<typeof packed>((resolve) => {
      finishPacking = () => resolve(packed);
    });
    vi.spyOn(api, "packageGift").mockReturnValue(packing);
    return { api, finishPacking: () => finishPacking() };
  }

  it("keeps its key busy and stays open while it prepares", async () => {
    const { api, finishPacking } = await slowPacking("s-preparing");
    const send = vi.spyOn(sender, "send");
    open("s-preparing", { api });
    await wait(1150);
    expect(title()).toBe("Preparing your gift");
    expect(send).not.toHaveBeenCalled();

    // Busy, the key keeps its face and its focus: aria-disabled, never disabled.
    const key = document.querySelector<HTMLButtonElement>(".key");
    expect(key?.disabled).toBe(false);
    expect(key?.getAttribute("aria-busy")).toBe("true");
    expect(key?.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(key);
    tap("Preparing…");
    tap("Take it out");
    tap("Close Preparing your gift");
    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
    expect(title()).toBe("Preparing your gift");

    await act(async () => finishPacking());
    expect(title()).toBe("In the bag");
    expect(send).toHaveBeenCalledTimes(1);
    await act(async () => answerPicker("sent"));
    expect(title()).toBe("Closed and sent");
    send.mockRestore();
  });

  it("says what a long wait is for, and lets Take it out put the sticker back once it settles", async () => {
    const { api, finishPacking } = await slowPacking("s-slow");
    const send = vi.spyOn(sender, "send");
    open("s-slow", { api });
    await wait(PREPARING_SLOW_MS);
    expect(shownText(".giving__sub")).toContain("taking longer than usual");
    expect(shownText(".giving__sub")).toContain("You can take the sticker out");

    tap("Take it out");
    expect(title()).toBe("Taking it out");
    await act(async () => finishPacking());
    await wait(400);
    expect(onClose).toHaveBeenCalledExactlyOnceWith(false);
    expect(giftOf("s-slow")).toBe("taken_out");
    expect(send).not.toHaveBeenCalled();
    send.mockRestore();
  });

  it("tells the giver who can open an NSFW sticker's gift while it's being prepared", async () => {
    open("s-nsfw", { nsfw: true });
    await act(async () => {});
    expect(title()).toBe("Preparing your gift");
    expect(shownText(".giving__nsfw-note")).toBe(giving.nsfw.whoCanOpen.en);
  });

  it("shows Not sent yet when the picker is cancelled, and Take it out puts the sticker back and closes", async () => {
    open("s-cancelled");
    await cancelPicker();
    expect(document.querySelector(".gift-bag")?.getAttribute("data-state")).toBe("open");
    expect(giftOf("s-cancelled")).toBe("packed");

    tap("Take it out");
    await wait(400);
    expect(giftOf("s-cancelled")).toBe("taken_out");
    expect(onClose).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("keeps waiting while the giver chooses a friend in a picker over the visible page", async () => {
    open("s-choosing");
    await wait(1150);
    await wait(30_000);
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(document.querySelector(".key")?.getAttribute("aria-busy")).toBe("true");
    expect(giftOf("s-choosing")).toBe("packed");

    await act(async () => answerPicker("cancelled"));
    await wait(0);
    expect(title()).toBe("Not sent yet");
    expect(document.querySelector(".key")?.hasAttribute("aria-busy")).toBe(false);
    expect(giftOf("s-choosing")).toBe("packed");
  });

  it("keeps a LINE timeout error visible until LINE confirms the send", async () => {
    open("s-late");
    await wait(1150);
    await wait(PICKER_ANSWER_MS);
    expect(title()).toBe("LINE send error");
    const error = document.querySelector('[role="alert"]')?.textContent;
    expect(error).toContain("LINE didn’t confirm that No.0147 was sent");
    expect(giftOf("s-late")).toBe("packed");
    await wait(5000);
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(error);
    await act(async () => answerPicker("sent"));
    await wait(0);
    expect(title()).toBe("Closed and sent");
    expect(giftOf("s-late")).toBe("sent");
  });

  it("keeps focus on the key and says the new step when the picker is cancelled", async () => {
    open("s-focus");
    await wait(1150);
    const key = document.querySelector(".key");
    expect(document.activeElement).toBe(key);
    await act(async () => answerPicker("cancelled"));
    await wait(0);
    expect(document.activeElement).toBe(key);
    expect(key?.hasAttribute("aria-busy")).toBe(false);
    expect(document.querySelector('[role="status"]')?.textContent).toContain("Not sent yet");
  });

  it("tags first packaging and cancellation for the chosen person, and from the giver for a nullable recipient", async () => {
    open("s-for", { toHandle: "bob" });
    await cancelPicker();
    expect(document.querySelector(".gift-tag__label")?.textContent).toBe("For");
    expect(document.querySelector(".gift-tag__name")?.textContent).toBe("@bob");
    view.unmount();
    open("s-from");
    await cancelPicker();
    expect(document.querySelector(".gift-tag__label")?.textContent).toBe("From");
  });

  it("keeps the same gift when its parent renders again during packing", async () => {
    const api = giftsApi();
    const packageGift = vi.spyOn(api, "packageGift");
    const takeOutGift = vi.spyOn(api, "takeOutGift");
    const given = open("s-rerender", { api });
    view.rerender(
      <Giving
        sticker={{ ...given }}
        fromHandle="alice"
        sender={{ ...sender }}
        liffId="2011732197-P98cxGpu"
        onClose={onClose}
      />,
    );
    await wait(1150);
    await act(async () => answerPicker("sent"));
    expect(packageGift).toHaveBeenCalledTimes(1);
    expect(takeOutGift).not.toHaveBeenCalled();
    expect(title()).toBe("Closed and sent");
  });
  it("prints a handle that reads as markup as it is, in the sticker's fine print", async () => {
    const given = open("s-markup", { fromHandle: MARKUP_LIKE_NAME });
    await act(async () => {});
    expect(shownText(".giving__meta")).toBe(
      `${formatNo(given.no)} · ${formatDuration(given.timeUsed)} · ${formatDay(given.createdAt)} · @${MARKUP_LIKE_NAME}`,
    );
  });

  describe("Can’t find them?, from Not sent yet", () => {
    it("goes back to Not sent yet", async () => {
      open("s-back");
      await cancelPicker();
      tap("Can’t find them?");
      expect(title()).toBe("Can’t find them?");
      tap("Back");
      expect(title()).toBe("Not sent yet");
    });

    it("steps back to Not sent yet on Escape, which closes Giving from there", async () => {
      open("s-escape");
      await cancelPicker();
      tap("Can’t find them?");
      pressEscape();
      expect(title()).toBe("Not sent yet");
      expect(onClose).not.toHaveBeenCalled();
      pressEscape();
      expect(onClose).toHaveBeenCalledExactlyOnceWith(false);
    });

    it("opens LINE's Add friends outside the app, and stays for when they come back", async () => {
      open("s-add-friends");
      await cancelPicker();
      tap("Can’t find them?");
      tap("Not friends in LINE yet?");
      expect(liff.openWindow).toHaveBeenCalledExactlyOnceWith({
        url: "https://line.me/R/nv/addFriends",
        external: true,
      });
      expect(title()).toBe("Can’t find them?");
    });
  });
});

it.each([
  { recipient: "user-carol", attempt: null, status: "packed" as const },
  {
    recipient: "user-carol",
    attempt: { id: "attempt-carol", state: "pending" as const },
    status: "packed" as const,
  },
  {
    recipient: "user-carol",
    attempt: { id: "attempt-carol", state: "sent" as const },
    status: "sent" as const,
  },
  { recipient: "user-bob", attempt: null, status: "packed" as const },
  { recipient: null, attempt: null, status: "packed" as const },
  {
    recipient: "user-bob",
    attempt: { id: "attempt-bob", state: "pending" as const },
    status: "packed" as const,
  },
  {
    recipient: "user-bob",
    attempt: { id: "attempt-bob", state: "sent" as const },
    status: "sent" as const,
  },
])(
  "presents the existing gift accurately after a stale Carol picker: $recipient/$status/$attempt",
  async ({ recipient, attempt, status }) => {
    const sticker = boardSticker();
    const originalGift = gift({ stickerId: sticker.stickerId, status });
    const packageGift = vi.fn(async () => ({
      gift: originalGift,
      forUserId: recipient,
      giftClaimToken: null,
      messageAttempt: attempt,
      deposit: null,
    }));
    const startTakeOut = vi.fn(async () => ({
      gift: { ...originalGift, status: "taken_out" as const },
    }));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    stalePickerSend.mockReset();
    view = renderWithApi(
      <GiveSheet
        to="carol"
        toId="user-carol"
        toNsfwOptIn={false}
        onClose={() => {}}
        returnFocus={() => null}
      />,
      emptyApi({
        stickerBoard: async () => ({ owner: TEST_ME, boardStickers: [sticker] }),
        packageGift,
        startTakeOut,
      }),
    );
    try {
      await act(async () => {});
      const select = document.querySelector<HTMLButtonElement>(".sticker-picker button");
      expect(select).not.toBeNull();
      act(() => select?.click());
      act(() => document.querySelector<HTMLButtonElement>(".giving__acts .key")?.click());
      await act(() => vi.dynamicImportSettled());
      await wait(1200);
      expect(packageGift).toHaveBeenCalledWith(sticker.stickerId, "user-carol");
      const mismatch = recipient !== "user-carol";
      expect(document.querySelector(".gift-tag__name")?.textContent === "@carol").toBe(!mismatch);
      expect(
        document
          .querySelector(".giving")
          ?.textContent?.includes(
            "This sticker is already in a gift with a different recipient. Its original recipient is unchanged.",
          ),
      ).toBe(mismatch);
      expect(stalePickerSend).not.toHaveBeenCalled();
      expect(startTakeOut).not.toHaveBeenCalled();
      if (attempt === null) {
        expect(error).toHaveBeenCalledWith(
          expect.stringContaining("couldn’t be packed"),
          expect.any(Error),
        );
        tap("Take it out");
        await wait(1000);
        expect(startTakeOut).toHaveBeenCalledWith(originalGift.id);
      } else expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  },
);
