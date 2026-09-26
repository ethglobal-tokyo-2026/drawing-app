import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftBackend } from "./giftBackend";
import type { GiftMessage } from "./giftMessage";
import type { GiftSendOutcome } from "./giftSender";
import { createGiftStore, giftStatusBySticker, memoryStorage } from "./giftStore";
import { createGiveFlow } from "./giveFlow";
import { createLocalGiftBackend } from "./localGiftBackend";

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

function setup({ backend }: { backend?: GiftBackend } = {}) {
  const store = createGiftStore(memoryStorage());
  const messages: GiftMessage[] = [];
  const pickers: Deferred<GiftSendOutcome>[] = [];
  const flow = createGiveFlow({
    sticker: { id: "s1", no: 147, timeUsed: 292 },
    backend: backend ?? createLocalGiftBackend({ store, fromHandle: "alice", liffId: "123-abc" }),
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
    store,
    messages,
    picker,
    step: () => flow.getState().step,
    status: () => giftStatusBySticker(store.list()).get("s1"),
    /** What the flow says went wrong; fails the test when nothing did. */
    failure: () => {
      const state = flow.getState();
      if (state.step !== "failed") throw new Error(`expected a failure, got ${state.step}`);
      return state.error;
    },
    /** The first gift's record, closed without sending; fails the test otherwise. */
    notSent: () => {
      const [gift] = store.list();
      if (gift?.state !== "not_sent")
        throw new Error(`expected a gift not sent, got ${gift?.state}`);
      return gift;
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
    expect(t.status()?.state).toBe("packed");
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
    expect(t.status()?.state).toBe("sent");
  });

  it("keeps the sticker in its bag when the picker is cancelled", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().resolve("cancelled");
    await wait();
    expect(t.step()).toBe("notSent");
    expect(t.status()?.state).toBe("packed");
  });

  it("shows what failed when the picker fails, and keeps the gift packed", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().reject(new Error("EXCEPTION_IN_SUBWINDOW: the picker closed"));
    await wait();
    expect(t.failure()).toMatch(/No\.0147.*EXCEPTION_IN_SUBWINDOW/);
    expect(t.status()?.state).toBe("packed");
  });

  it("sends the same packed gift again, straight away, after a cancel", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().resolve("cancelled");
    await wait();

    t.flow.sendInLine();
    await wait();
    expect(t.step()).toBe("picking");
    expect(t.messages).toHaveLength(2);
    expect(t.messages[1]).toEqual(t.messages[0]);
    expect(t.store.list().map((r) => r.state)).toEqual(["packed"]);
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
    expect(t.status()).toBeUndefined();
    expect(t.notSent().reason).toBe("taken_out");
  });

  it("says why when the sticker can't be packed, and doesn't open the picker", async () => {
    const t = setup({
      backend: {
        pack: () => Promise.reject(new Error("storage is full")),
        markShared: () => Promise.resolve(),
        takeOut: () => Promise.resolve(),
      },
    });
    t.flow.chooseLineChat();
    await wait(PICKER_DELAY * 2);
    expect(t.failure()).toContain("storage is full");
    expect(t.messages).toHaveLength(0);
  });

  it("still records the outcome when the flow closes mid-send", async () => {
    const t = setup();
    await openPicker(t);
    t.flow.dispose();
    t.picker().resolve("sent");
    await wait();
    expect(t.status()?.state).toBe("sent");
  });

  it("leaves the sticker packed when the flow closes before the picker opens", async () => {
    const t = setup();
    t.flow.chooseLineChat();
    t.flow.dispose();
    await wait(PICKER_DELAY * 2);
    expect(t.messages).toHaveLength(0);
    expect(t.status()?.state).toBe("packed");
  });
});
