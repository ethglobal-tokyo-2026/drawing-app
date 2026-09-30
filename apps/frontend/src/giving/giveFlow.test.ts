import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/apiClient";
import { errors } from "../i18n/strings/errors";
import {
  GiftMessageOutError,
  GiftPackagingError,
  type GiftBackend,
  type PackWait,
} from "./giftBackend";
import { buildGiftMessage, type GiftMessage } from "./giftMessage";
import type { GiftSendOutcome } from "./giftSender";
import { GiftTransactionRevertedError } from "./giftTransactions";
import { createGiveFlow, PICKER_ANSWER_MS, PICKER_RETURN_MS, PREPARING_SLOW_MS } from "./giveFlow";

const PICKER_DELAY = 1150;
const TAKE_OUT = 380;
const STICKER = { id: "s1", no: 147, timeUsed: 292 };

/** LINE's picker, answered by the test. */
class Deferred<T> {
  resolve: (value: T) => void = () => {};
  reject: (error: unknown) => void = () => {};
  readonly promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}

type GiftState = "packed" | "maybeSent" | "sent" | "taken_out";

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
    markMaybeSent: (giftId) => {
      gifts.set(giftId, "maybeSent");
    },
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
    state: () => flow.getState(),
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

  it("closes the bag only once LINE reports the gift message sent", async () => {
    const t = setup();
    await openPicker(t);
    t.flow.takeOut();
    expect(t.step()).toBe("picking");

    t.picker().resolve("sent");
    await wait();
    expect(t.step()).toBe("sent");
    expect(t.gifts()).toEqual(["sent"]);
  });

  it("prepares the sticker before opening LINE and ignores a second send while it waits", async () => {
    const server = fakeBackend();
    const packing = new Deferred<Awaited<ReturnType<GiftBackend["pack"]>>>();
    const pack = vi.fn(() => packing.promise);
    const t = setup({ backend: { ...server.backend, pack } });
    t.flow.chooseLineChat();
    await wait(PICKER_DELAY);
    expect(t.step()).toBe("preparing");
    expect(t.messages).toHaveLength(0);

    t.flow.chooseLineChat();
    t.flow.sendInLine();
    expect(pack).toHaveBeenCalledTimes(1);
    expect(t.step()).toBe("preparing");

    packing.resolve(await server.backend.pack(STICKER));
    await wait();
    expect(t.step()).toBe("picking");
    expect(t.messages).toHaveLength(1);
    t.picker().resolve("sent");
    await wait();
    expect(t.step()).toBe("sent");
    expect(server.states()).toEqual(["sent"]);
  });

  it("takes the gift out once its packing settles when Take it out is pressed while preparing, and never opens LINE", async () => {
    const server = fakeBackend();
    const packing = new Deferred<Awaited<ReturnType<GiftBackend["pack"]>>>();
    const t = setup({ backend: { ...server.backend, pack: () => packing.promise } });
    t.flow.chooseLineChat();
    await wait(PICKER_DELAY);
    expect(t.step()).toBe("preparing");

    t.flow.takeOut();
    expect(t.step()).toBe("takingOut");
    expect(server.states()).toEqual([]);

    packing.resolve(await server.backend.pack(STICKER));
    await wait(TAKE_OUT);
    expect(t.step()).toBe("sheet");
    expect(t.messages).toHaveLength(0);
    expect(server.states()).toEqual(["taken_out"]);
  });

  it("says what a long wait for the gift bag waits on once it has run long, and stops saying it when it ends", async () => {
    const server = fakeBackend();
    const packing = new Deferred<Awaited<ReturnType<GiftBackend["pack"]>>>();
    let heard: (wait: PackWait) => void = () => {};
    const t = setup({
      backend: {
        ...server.backend,
        pack: (_sticker, onWait) => {
          if (onWait) heard = onWait;
          return packing.promise;
        },
      },
    });
    t.flow.chooseLineChat();
    heard("moving");
    await wait(PICKER_DELAY);
    expect(t.state()).toEqual({ step: "preparing", wait: "moving" });

    await wait(PREPARING_SLOW_MS - PICKER_DELAY);
    heard("confirming");
    expect(t.state()).toEqual({ step: "preparing", wait: "confirming", slow: true });

    packing.resolve(await server.backend.pack(STICKER));
    await wait();
    expect(t.state()).toEqual({ step: "picking" });
    await wait(PREPARING_SLOW_MS);
    expect(t.state()).toEqual({ step: "picking" });
  });

  it("keeps the gift in the bag when the picker is cancelled", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().resolve("cancelled");
    await wait();
    expect(t.step()).toBe("notSent");
    expect(t.gifts()).toEqual(["packed"]);
  });

  it("shows what failed when the picker fails, in plain words before the SDK's own text, and keeps the gift in the bag", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().reject(new Error("EXCEPTION_IN_SUBWINDOW: the picker closed"));
    await wait();
    expect(t.failure().message).toMatch(/^No\.0147 wasn’t sent: Something went wrong\./);
    expect(t.failure().detail).toContain("EXCEPTION_IN_SUBWINDOW");
    expect(t.gifts()).toEqual(["packed"]);
  });

  it("names why a gift couldn't be packed in plain words, and keeps the developer's detail apart", async () => {
    const server = fakeBackend();
    const reverted = new GiftPackagingError("gift-1", new GiftTransactionRevertedError("deposit"));
    const t = setup({ backend: { ...server.backend, pack: () => Promise.reject(reverted) } });
    t.flow.chooseLineChat();
    await wait(PICKER_DELAY);
    expect(t.failure().message).toMatch(
      /^No\.0147 couldn’t be packed: .*didn’t make it into the gift bag/,
    );
    expect(t.failure().detail).toBe("The deposit transaction reverted");
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

  it("says why when the sticker can't be packed, and takes it out with no gift to settle", async () => {
    const server = fakeBackend();
    const takeOut = vi.fn(server.backend.takeOut);
    const t = setup({
      backend: {
        ...server.backend,
        pack: () =>
          Promise.reject(
            new ApiError(409, { error: "not_minted", detail: "No.0147 has no NFT yet" }),
          ),
        takeOut,
      },
    });
    t.flow.chooseLineChat();
    await wait(PICKER_DELAY * 2);
    expect(t.failure().message).toContain(errors.not_minted.en);
    expect(t.messages).toHaveLength(0);
    t.flow.takeOut();
    await wait(TAKE_OUT);
    expect(t.step()).toBe("sheet");
    expect(takeOut).not.toHaveBeenCalled();
  });

  it("takes out the allocated gift after packaging confirmation fails without preparing it again", async () => {
    const server = fakeBackend();
    const pack = vi.fn(async (sticker: Parameters<GiftBackend["pack"]>[0]) => {
      const packed = await server.backend.pack(sticker);
      throw new GiftPackagingError(
        packed.giftId,
        new ApiError(409, { error: "deposit_not_landed", detail: "Deposit is still pending" }),
      );
    });
    const takeOut = vi
      .fn(server.backend.takeOut)
      .mockRejectedValueOnce(new Error("Take-out is still pending"));
    const t = setup({ backend: { ...server.backend, pack, takeOut } });
    t.flow.chooseLineChat();
    await wait(PICKER_DELAY);
    expect(t.failure().message).toContain(errors.deposit_not_landed.en);

    t.flow.takeOut();
    await wait();
    expect(t.failure().detail).toContain("Take-out is still pending");
    t.flow.takeOut();
    await wait(TAKE_OUT);
    expect(t.step()).toBe("sheet");
    expect(server.states()).toEqual(["taken_out"]);
    expect(takeOut).toHaveBeenCalledTimes(2);
    expect(pack).toHaveBeenCalledTimes(1);
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
    expect(t.failure().detail).toContain("Gas sponsorship failed");
    expect(server.states()).toEqual(["packed"]);
    t.flow.takeOut();
    await wait(TAKE_OUT);
    expect(t.step()).toBe("sheet");
    expect(server.states()).toEqual(["taken_out"]);
  });

  it("prepares a fresh Gift Message after an uncertain take-out instead of sending the old one", async () => {
    const server = fakeBackend();
    const pack = vi.fn(server.backend.pack);
    const takeOut = vi.fn(async (giftId: string) => {
      await server.backend.takeOut(giftId);
      throw new Error("The server could not confirm the take-out");
    });
    const t = setup({ backend: { ...server.backend, pack, takeOut } });
    await openPicker(t);
    const previousMessage = t.messages[0];
    t.picker().resolve("cancelled");
    await wait();

    t.flow.takeOut();
    await wait();
    expect(t.failure().detail).toContain("could not confirm the take-out");
    expect(server.states()).toEqual(["taken_out"]);

    t.flow.sendInLine();
    await wait();
    expect(pack).toHaveBeenCalledTimes(2);
    expect(t.step()).toBe("picking");
    expect(t.messages).toHaveLength(2);
    expect(t.messages[1]).not.toEqual(previousMessage);
  });

  it("still records the outcome when the flow closes mid-send", async () => {
    const t = setup();
    await openPicker(t);
    t.flow.dispose();
    t.picker().resolve("sent");
    await wait();
    expect(t.gifts()).toEqual(["sent"]);
  });

  it("leaves the sticker in the bag when the flow closes before the picker opens", async () => {
    const t = setup();
    t.flow.chooseLineChat();
    t.flow.dispose();
    await wait(PICKER_DELAY * 2);
    expect(t.messages).toHaveLength(0);
    expect(t.gifts()).toEqual(["packed"]);
  });

  it("leaves the sticker in the bag when the flow closes after a cancel", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().resolve("cancelled");
    await wait();
    t.flow.dispose();
    await wait();
    expect(t.gifts()).toEqual(["packed"]);
  });

  it("does not open LINE or take the sticker out when packing finishes after closing", async () => {
    const server = fakeBackend();
    const packing = new Deferred<Awaited<ReturnType<GiftBackend["pack"]>>>();
    const takeOut = vi.fn(server.backend.takeOut);
    const t = setup({
      backend: { ...server.backend, pack: () => packing.promise, takeOut },
    });
    t.flow.chooseLineChat();
    await wait(PICKER_DELAY);
    expect(t.step()).toBe("preparing");
    t.flow.dispose();
    packing.resolve(await server.backend.pack({ id: "s1", no: 147, timeUsed: 292 }));
    await wait();
    expect(t.messages).toHaveLength(0);
    expect(takeOut).not.toHaveBeenCalled();
    expect(server.states()).toEqual(["packed"]);
  });

  it.each([
    ["the page comes back and LINE still says nothing", PICKER_RETURN_MS, true],
    ["LINE never answers", PICKER_ANSWER_MS, false],
  ])(
    "stops waiting on the picker when %s, and never sends that gift message again",
    async (_, ms, shown) => {
      const t = setup();
      await openPicker(t);
      if (shown) t.flow.pageShown();
      await wait(ms);
      expect(t.step()).toBe("maybeSent");
      expect(t.gifts()).toEqual(["maybeSent"]);
      t.flow.sendInLine();
      await wait();
      expect(t.messages).toHaveLength(1);
      t.flow.takeOut();
      await wait(TAKE_OUT);
      expect(t.step()).toBe("sheet");
    },
  );

  it("asks whether it went out when LINE's answer doesn't say, and closes the bag once the giver says so", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().resolve("unknown");
    await wait();
    expect(t.step()).toBe("maybeSent");
    t.flow.sendInLine();
    await wait();
    expect(t.messages).toHaveLength(1);
    t.flow.itWentOut();
    await wait();
    expect(t.step()).toBe("sent");
    expect(t.gifts()).toEqual(["sent"]);
  });

  it.each([
    ["sent", "sent"],
    ["cancelled", "maybeSent"],
  ] as const)("after it stops waiting, a late %s from LINE leaves it %s", async (late, step) => {
    const t = setup();
    await openPicker(t);
    await wait(PICKER_ANSWER_MS);
    t.picker().resolve(late);
    await wait();
    expect(t.step()).toBe(step);
  });

  it.each([
    ["sent", "sent"],
    ["maybeSent", "maybeSent"],
  ] as const)(
    "shows a gift whose message is %s instead of sending it again",
    async (outcome, step) => {
      const t = setup({
        backend: {
          ...fakeBackend().backend,
          pack: () => Promise.reject(new GiftMessageOutError("gift-1", outcome)),
        },
      });
      t.flow.chooseLineChat();
      await wait(PICKER_DELAY);
      expect(t.step()).toBe(step);
      expect(t.messages).toHaveLength(0);
    },
  );

  it("does not repeat an explicit take-out when its flow closes before confirmation", async () => {
    const server = fakeBackend();
    const takingOut = new Deferred<void>();
    const takeOut = vi.fn(async (giftId: string) => {
      await takingOut.promise;
      await server.backend.takeOut(giftId);
    });
    const t = setup({ backend: { ...server.backend, takeOut } });
    t.flow.chooseLineChat();
    await wait();
    t.flow.takeOut();
    await wait();
    t.flow.dispose();
    takingOut.resolve();
    await wait(TAKE_OUT);
    expect(takeOut).toHaveBeenCalledTimes(1);
    expect(server.states()).toEqual(["taken_out"]);
  });
});
