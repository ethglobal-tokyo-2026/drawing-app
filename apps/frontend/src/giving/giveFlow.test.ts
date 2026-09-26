import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/apiClient";
import { errors } from "../i18n/en/errors";
import type { GiftBackend } from "./giftBackend";
import { buildGiftMessage, type GiftMessage } from "./giftMessage";
import type { GiftSendOutcome } from "./giftSender";
import { createGiveFlow } from "./giveFlow";

const PICKER_DELAY = 1150;
const TAKE_OUT = 380;

/** LINE's picker, answered by the test. */
class Deferred<T> {
  resolve: (value: T) => void = () => {};
  reject: (error: unknown) => void = () => {};
  readonly promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}

type GiftState = "packed" | "sent" | "taken_out";

/** The server's side of gifts: each packed gift and where it is. */
function fakeBackend() {
  const gifts = new Map<string, GiftState>();
  let packed = 0;
  const backend: GiftBackend = {
    pack: (sticker) => {
      packed += 1;
      const giftId = `gift-${packed}`;
      gifts.set(giftId, "packed");
      return Promise.resolve({
        giftId,
        message: buildGiftMessage({
          liffId: "123-abc",
          giftClaimToken: `token${packed}`,
          fromHandle: "alice",
          no: sticker.no,
          timeUsed: sticker.timeUsed,
          language: "en",
        }),
      });
    },
    markSent: async (giftId) => {
      gifts.set(giftId, "sent");
    },
    markCancelled: () => Promise.resolve(),
    takeOut: async (giftId) => {
      gifts.set(giftId, "taken_out");
    },
  };
  return { backend, states: () => [...gifts.values()] };
}

function setup({ backend }: { backend?: GiftBackend } = {}) {
  const server = fakeBackend();
  const messages: GiftMessage[] = [];
  const pickers: Deferred<GiftSendOutcome>[] = [];
  const flow = createGiveFlow({
    sticker: { id: "s1", no: 147, timeUsed: 292 },
    backend: backend ?? server.backend,
    sender: {
      send: (message) => {
        messages.push(message);
        const picker = new Deferred<GiftSendOutcome>();
        pickers.push(picker);
        return picker.promise;
      },
    },
    pickerDelayMs: PICKER_DELAY,
    takeOutMs: TAKE_OUT,
    report: () => {},
  });
  /** The open picker; fails the test when there isn't one. */
  const picker = () => {
    const open = pickers.at(-1);
    if (!open) throw new Error("expected LINE's picker to be open");
    return open;
  };
  return {
    flow,
    messages,
    picker,
    step: () => flow.getState().step,
    /** Every gift the flow packed, and where each is now. */
    gifts: server.states,
    /** What the flow says went wrong; fails the test when nothing did. */
    failure: () => {
      const state = flow.getState();
      if (state.step !== "failed") throw new Error(`expected a failure, got ${state.step}`);
      return state.error;
    },
  };
}

/** Lets pending promises and due timers run. */
const wait = (ms = 0) => vi.advanceTimersByTimeAsync(ms);

/** Packs the sticker and waits until LINE's picker is open. */
async function openPicker(t: ReturnType<typeof setup>) {
  t.flow.chooseLineChat();
  await wait(PICKER_DELAY);
  expect(t.step()).toBe("picking");
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("giving through a LINE chat", () => {
  it("packs the sticker, then opens LINE's picker on its own", async () => {
    const t = setup();
    t.flow.chooseLineChat();
    await wait(PICKER_DELAY - 1);
    expect(t.step()).toBe("packed");
    expect(t.gifts()).toEqual(["packed"]);
    expect(t.messages).toHaveLength(0);

    await wait(1);
    expect(t.step()).toBe("picking");
    expect(t.messages).toHaveLength(1);
  });

  it("seals only once LINE reports the gift message sent", async () => {
    const t = setup();
    await openPicker(t);
    t.flow.takeOut();
    expect(t.step()).toBe("picking");

    t.picker().resolve("sent");
    await wait();
    expect(t.step()).toBe("sent");
    expect(t.gifts()).toEqual(["sent"]);
  });

  it("keeps the gift in the bag when the picker is cancelled", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().resolve("cancelled");
    await wait();
    expect(t.step()).toBe("notSent");
    expect(t.gifts()).toEqual(["packed"]);
  });

  it("shows what failed when the picker fails, and keeps the gift in the bag", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().reject(new Error("EXCEPTION_IN_SUBWINDOW: the picker closed"));
    await wait();
    expect(t.failure()).toMatch(/No\.0147.*EXCEPTION_IN_SUBWINDOW/);
    expect(t.gifts()).toEqual(["packed"]);
  });

  it("sends the same gift again, straight away, after a cancel", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().resolve("cancelled");
    await wait();

    t.flow.sendInLine();
    await wait();
    expect(t.step()).toBe("picking");
    expect(t.messages).toHaveLength(2);
    expect(t.messages[1]).toEqual(t.messages[0]);
    expect(t.gifts()).toEqual(["packed"]);
  });

  it("opens the picker once, at once, when Send in LINE beats the timer", async () => {
    const t = setup();
    t.flow.chooseLineChat();
    t.flow.sendInLine();
    await wait();
    expect(t.messages).toHaveLength(1);

    t.picker().resolve("cancelled");
    await wait(PICKER_DELAY * 2);
    expect(t.messages).toHaveLength(1);
    expect(t.step()).toBe("notSent");
  });

  it("takes the sticker out before the picker opens, and never opens it", async () => {
    const t = setup();
    t.flow.chooseLineChat();
    await wait(PICKER_DELAY / 2);
    t.flow.takeOut();
    expect(t.step()).toBe("takingOut");

    await wait(TAKE_OUT);
    expect(t.step()).toBe("sheet");
    await wait(PICKER_DELAY * 2);
    expect(t.messages).toHaveLength(0);
    expect(t.gifts()).toEqual(["taken_out"]);
  });

  it("says why when the sticker can't be packed, and doesn't open the picker", async () => {
    const t = setup({
      backend: {
        pack: () =>
          Promise.reject(
            new ApiError(409, { error: "not_minted", detail: "No.0147 has no NFT yet" }),
          ),
        markSent: () => Promise.resolve(),
        markCancelled: () => Promise.resolve(),
        takeOut: () => Promise.resolve(),
      },
    });
    t.flow.chooseLineChat();
    await wait(PICKER_DELAY * 2);
    expect(t.failure()).toContain(errors.not_minted);
    expect(t.messages).toHaveLength(0);
  });

  it("keeps a taking-out failure visible and lets the person retry", async () => {
    const server = fakeBackend();
    const takeOut = vi
      .fn(server.backend.takeOut)
      .mockRejectedValueOnce(new Error("Gas sponsorship failed"));
    const t = setup({ backend: { ...server.backend, takeOut } });
    t.flow.chooseLineChat();
    await wait();
    t.flow.takeOut();
    await wait(TAKE_OUT);
    expect(t.failure()).toContain("Gas sponsorship failed");
    expect(server.states()).toEqual(["packed"]);
    t.flow.takeOut();
    await wait(TAKE_OUT);
    expect(t.step()).toBe("sheet");
    expect(server.states()).toEqual(["taken_out"]);
  });

  it("still records the outcome when the flow closes mid-send", async () => {
    const t = setup();
    await openPicker(t);
    t.flow.dispose();
    t.picker().resolve("sent");
    await wait();
    expect(t.gifts()).toEqual(["sent"]);
  });

  it("puts the sticker back when the flow closes before the picker opens", async () => {
    const t = setup();
    t.flow.chooseLineChat();
    t.flow.dispose();
    await wait(PICKER_DELAY * 2);
    expect(t.messages).toHaveLength(0);
    expect(t.gifts()).toEqual(["taken_out"]);
  });

  it("puts the sticker back when the flow closes after a cancel", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().resolve("cancelled");
    await wait();
    t.flow.dispose();
    await wait();
    expect(t.gifts()).toEqual(["taken_out"]);
  });
});
