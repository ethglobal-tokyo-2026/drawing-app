import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/apiClient";
import { errors } from "../i18n/strings/errors";
import { PickerSendError } from "../line/friendPicker";
import {
  GiftMessageOutError,
  GiftPackagingError,
  GiftTransferError,
  type GiftBackend,
  type PackWait,
} from "./giftBackend";
import { buildGiftMessage, type GiftMessage } from "./giftMessage";
import type { GiftSendOutcome } from "./giftSender";
import { createGiveFlow, PICKER_ANSWER_MS, PREPARING_SLOW_MS } from "./giveFlow";

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
    markCancelled: async (giftId) => {
      gifts.set(giftId, "packed");
    },
    beginMessageAttempt: async (giftId) => {
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
      if (!("error" in state) || !state.error)
        throw new Error(`expected a failure, got ${state.step}`);
      return state.error;
    },
  };
}

/** Lets pending promises and due timers run. */
const wait = (ms = 0) => vi.advanceTimersByTimeAsync(ms);

/** Prepares the sticker, then opens LINE's picker with a separate send. */
async function openPicker(t: ReturnType<typeof setup>) {
  t.flow.give();
  await wait();
  expect(t.step()).toBe("ready");
  t.flow.sendInLine();
  expect(t.step()).toBe("picking");
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("giving through a LINE chat", () => {
  it("prepares an acknowledged gift and opens LINE synchronously only on a separate send", async () => {
    const t = setup();
    t.flow.give();
    await wait();
    expect(t.step()).toBe("ready");
    expect(t.gifts()).toEqual(["maybeSent"]);
    expect(t.messages).toHaveLength(0);

    await wait(30_000);
    expect(t.step()).toBe("ready");
    expect(t.messages).toHaveLength(0);
    t.flow.sendInLine();
    expect(t.step()).toBe("picking");
    expect(t.messages).toHaveLength(1);
    t.flow.sendInLine();
    expect(t.messages).toHaveLength(1);
  });

  it.each(["cancelled", "failed"] as const)(
    "acknowledges a fresh attempt after %s before another direct send",
    async (outcome) => {
      const server = fakeBackend();
      const acknowledgements: { id: string; pending: Deferred<void> }[] = [];
      const t = setup({
        backend: {
          ...server.backend,
          beginMessageAttempt: async (giftId, id) => {
            const pending = new Deferred<void>();
            acknowledgements.push({ id, pending });
            await pending.promise;
            await server.backend.beginMessageAttempt(giftId, id);
          },
        },
      });
      t.flow.give();
      await wait();
      expect(t.step()).toBe("preparing");
      t.flow.sendInLine();
      expect(t.messages).toHaveLength(0);
      const first = acknowledgements[0];
      if (!first) throw new Error("expected the first message attempt acknowledgement");
      first.pending.resolve();
      await wait();
      expect(t.step()).toBe("ready");
      t.flow.sendInLine();
      expect(t.messages).toHaveLength(1);

      if (outcome === "cancelled") t.picker().resolve("cancelled");
      else t.picker().reject(new PickerSendError("CREATE_SUBWINDOW_FAILED", false));
      await wait();
      expect(t.step()).toBe("preparing");
      expect(server.states()).toEqual(["packed"]);
      expect(acknowledgements).toHaveLength(2);
      const second = acknowledgements[1];
      if (!second) throw new Error("expected the next message attempt acknowledgement");
      expect(second.id).not.toBe(first.id);
      t.flow.sendInLine();
      expect(t.messages).toHaveLength(1);
      second.pending.resolve();
      await wait();
      expect(t.state()).toMatchObject(
        outcome === "cancelled"
          ? { step: "ready", cancelled: true }
          : { step: "ready", error: { detail: "CREATE_SUBWINDOW_FAILED" } },
      );
      t.flow.sendInLine();
      expect(t.messages).toHaveLength(2);
      expect(t.messages[1]).toEqual(t.messages[0]);
      expect(server.states()).toEqual(["maybeSent"]);
    },
  );

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
    t.flow.give();
    await wait();
    expect(t.step()).toBe("preparing");
    expect(t.messages).toHaveLength(0);

    t.flow.give();
    t.flow.sendInLine();
    expect(pack).toHaveBeenCalledTimes(1);
    expect(t.step()).toBe("preparing");

    packing.resolve(await server.backend.pack(STICKER));
    await wait();
    expect(t.step()).toBe("ready");
    expect(t.messages).toHaveLength(0);
    t.flow.sendInLine();
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
    t.flow.give();
    await wait();
    expect(t.step()).toBe("preparing");

    t.flow.takeOut();
    expect(t.step()).toBe("takingOut");
    expect(server.states()).toEqual([]);

    packing.resolve(await server.backend.pack(STICKER));
    await wait(TAKE_OUT);
    expect(t.step()).toBe("takenOut");
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
    t.flow.give();
    heard("moving");
    await wait();
    expect(t.state()).toEqual({ step: "preparing", wait: "moving" });

    await wait(PREPARING_SLOW_MS);
    heard("asking");
    expect(t.state()).toEqual({ step: "preparing", wait: "asking", slow: true });

    packing.resolve(await server.backend.pack(STICKER));
    await wait();
    expect(t.state()).toEqual({ step: "ready" });
    await wait(PREPARING_SLOW_MS);
    expect(t.state()).not.toHaveProperty("slow");
  });

  it("keeps the gift in the bag when the picker is cancelled", async () => {
    const t = setup();
    await openPicker(t);
    t.picker().resolve("cancelled");
    await wait();
    expect(t.state()).toMatchObject({ step: "ready", cancelled: true });
    expect(t.gifts()).toEqual(["maybeSent"]);
  });

  it("preserves an uncertain SDK failure and its empty message without permitting another send", async () => {
    const t = setup();
    await openPicker(t);
    const sdkError = Object.assign(new Error(""), { code: "EXCEPTION_IN_SUBWINDOW" });
    t.picker().reject(
      new PickerSendError(
        "LINE’s friend picker failed: EXCEPTION_IN_SUBWINDOW: (empty message)",
        true,
        {
          cause: sdkError,
        },
      ),
    );
    await wait();
    expect(t.step()).toBe("maybeSent");
    expect(t.failure().message).toBe("LINE’s friend picker couldn’t complete the send.");
    expect(t.failure().detail).toContain("EXCEPTION_IN_SUBWINDOW");
    expect(t.failure().detail).toContain('"message": ""');
    expect(t.gifts()).toEqual(["maybeSent"]);
    t.flow.sendInLine();
    expect(t.messages).toHaveLength(1);
  });

  it("names why a gift couldn't be packed in plain words, and keeps the developer's detail apart", async () => {
    const server = fakeBackend();
    const noLink = new GiftPackagingError(
      "gift-1",
      new GiftTransferError("no_link", "No.0147 is in a gift the server gave no link for"),
    );
    const t = setup({ backend: { ...server.backend, pack: () => Promise.reject(noLink) } });
    t.flow.give();
    await wait();
    expect(t.failure().message).toMatch(
      /^No\.0147 couldn’t be packed: This gift came without a link to send\./,
    );
    expect(t.failure().detail).toBe("No.0147 is in a gift the server gave no link for");
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
    // One gift, marked again while its picker is open.
    expect(t.gifts()).toEqual(["maybeSent"]);
  });

  it("takes the sticker out before the picker opens, and never opens it", async () => {
    const t = setup();
    t.flow.give();
    await wait();
    t.flow.takeOut();
    expect(t.step()).toBe("takingOut");

    await wait(TAKE_OUT);
    expect(t.step()).toBe("takenOut");
    await wait();
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
    t.flow.give();
    await wait();
    expect(t.failure().message).toContain(errors.not_minted.en);
    expect(t.messages).toHaveLength(0);
    t.flow.takeOut();
    await wait(TAKE_OUT);
    expect(t.step()).toBe("takenOut");
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
    t.flow.give();
    await wait();
    expect(t.failure().message).toContain(errors.deposit_not_landed.en);

    t.flow.takeOut();
    await wait();
    expect(t.failure().detail).toContain("Take-out is still pending");
    t.flow.takeOut();
    await wait(TAKE_OUT);
    expect(t.step()).toBe("takenOut");
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
    t.flow.give();
    await wait();
    t.flow.takeOut();
    await wait(TAKE_OUT);
    expect(t.failure().detail).toContain("Gas sponsorship failed");
    expect(server.states()).toEqual(["maybeSent"]);
    t.flow.takeOut();
    await wait(TAKE_OUT);
    expect(t.step()).toBe("takenOut");
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
    expect(t.step()).toBe("ready");
    expect(t.messages).toHaveLength(1);
    t.flow.sendInLine();
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
    t.flow.give();
    t.flow.dispose();
    await wait();
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
    t.flow.give();
    await wait();
    expect(t.step()).toBe("preparing");
    t.flow.dispose();
    packing.resolve(await server.backend.pack({ id: "s1", no: 147, timeUsed: 292 }));
    await wait();
    expect(t.messages).toHaveLength(0);
    expect(takeOut).not.toHaveBeenCalled();
    expect(server.states()).toEqual(["packed"]);
  });

  it.each([
    ["sent", "sent", "sent"],
    ["cancelled", "ready", "maybeSent"],
  ] as const)(
    "keeps a visible LINE picker pending until LINE confirms %s",
    async (outcome, step, gift) => {
      const t = setup();
      await openPicker(t);
      // A picker can stay open over the page while the giver chooses a chat.
      await wait(30_000);
      expect(t.state()).toEqual({ step: "picking" });
      expect(t.gifts()).toEqual(["maybeSent"]);
      t.flow.sendInLine();
      await wait();
      expect(t.messages).toHaveLength(1);

      t.picker().resolve(outcome);
      await wait();
      expect(t.step()).toBe(step);
      expect(t.gifts()).toEqual([gift]);
    },
  );

  it("stops waiting on the picker when LINE never answers, and never sends that gift message again", async () => {
    const t = setup();
    await openPicker(t);
    await wait(PICKER_ANSWER_MS);
    expect(t.step()).toBe("maybeSent");
    expect(t.failure().message).toContain("LINE didn’t confirm that No.0147 was sent");
    expect(t.gifts()).toEqual(["maybeSent"]);
    t.flow.sendInLine();
    await wait();
    expect(t.step()).toBe("maybeSent");
    expect(t.messages).toHaveLength(1);
    t.flow.takeOut();
    await wait(TAKE_OUT);
    expect(t.step()).toBe("takenOut");
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
          pack: () =>
            Promise.reject(new GiftMessageOutError("gift-1", outcome, `0x${"12".repeat(32)}`)),
        },
      });
      t.flow.give();
      await wait();
      expect(t.step()).toBe(step);
      expect(t.messages).toHaveLength(0);
    },
  );

  it.each(["sent", "maybeSent"] as const)(
    "keeps a gift whose message is %s when packing ends only after Take it out was pressed",
    async (outcome) => {
      const server = fakeBackend();
      const packing = new Deferred<Awaited<ReturnType<GiftBackend["pack"]>>>();
      const takeOut = vi.fn(server.backend.takeOut);
      const markSent = vi.fn(server.backend.markSent);
      const t = setup({
        backend: { ...server.backend, pack: () => packing.promise, takeOut, markSent },
      });
      t.flow.give();
      await wait(PREPARING_SLOW_MS);
      t.flow.takeOut();
      expect(t.step()).toBe("takingOut");

      packing.reject(new GiftMessageOutError("gift-1", outcome, `0x${"12".repeat(32)}`));
      await wait(TAKE_OUT);
      expect(t.step()).toBe(outcome);
      expect(takeOut).not.toHaveBeenCalled();
      expect(markSent).not.toHaveBeenCalled();
    },
  );

  it("takes out a gift with an unresolved LINE send after showing the error", async () => {
    const server = fakeBackend();
    const takeOut = vi.fn(server.backend.takeOut);
    const t = setup({
      backend: {
        ...server.backend,
        pack: () =>
          Promise.reject(new GiftMessageOutError("gift-1", "maybeSent", `0x${"12".repeat(32)}`)),
        takeOut,
      },
    });
    t.flow.give();
    await wait();
    expect(t.step()).toBe("maybeSent");

    t.flow.takeOut();
    await wait(TAKE_OUT);
    expect(t.step()).toBe("takenOut");
    expect(takeOut).toHaveBeenCalledExactlyOnceWith("gift-1");
  });

  it("does not repeat an explicit take-out when its flow closes before confirmation", async () => {
    const server = fakeBackend();
    const takingOut = new Deferred<void>();
    const takeOut = vi.fn(async (giftId: string) => {
      await takingOut.promise;
      await server.backend.takeOut(giftId);
    });
    const t = setup({ backend: { ...server.backend, takeOut } });
    t.flow.give();
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

describe("acknowledging a durable message attempt before LINE", () => {
  it.each(["ready", "preparing"] as const)(
    "cancels an acknowledged attempt closed while %s without moving the sticker",
    async (step) => {
      const server = fakeBackend();
      const pending = new Deferred<void>();
      const t = setup({
        backend: {
          ...server.backend,
          beginMessageAttempt: async (giftId, id) => {
            await pending.promise;
            await server.backend.beginMessageAttempt(giftId, id);
          },
        },
      });
      t.flow.give();
      await wait();
      if (step === "ready") {
        pending.resolve();
        await wait();
      }
      expect(t.step()).toBe(step);
      t.flow.dispose();
      pending.resolve();
      await wait();
      expect(t.messages).toHaveLength(0);
      expect(server.states()).toEqual(["packed"]);
    },
  );

  it("preserves pending protection if closing an unused acknowledged attempt cannot be recorded", async () => {
    const server = fakeBackend();
    const t = setup({
      backend: {
        ...server.backend,
        markCancelled: () => Promise.reject(new Error("cancel acknowledgement lost")),
      },
    });
    t.flow.give();
    await wait();
    expect(t.step()).toBe("ready");
    t.flow.dispose();
    await wait();
    expect(t.messages).toHaveLength(0);
    expect(server.states()).toEqual(["maybeSent"]);
  });

  it("opens no picker on a lost begin acknowledgement, and retries the same ID only before opening", async () => {
    const server = fakeBackend();
    const ids: string[] = [];
    let fail = true;
    const backend = {
      ...server.backend,
      beginMessageAttempt: async (_giftId: string, id: string) => {
        ids.push(id);
        if (fail) throw new Error("acknowledgement lost");
      },
    };
    const t = setup({ backend });
    t.flow.give();
    await wait();
    expect(t.messages).toHaveLength(0);
    expect(t.step()).toBe("failed");
    fail = false;
    t.flow.sendInLine();
    await wait();
    expect(t.step()).toBe("ready");
    expect(t.messages).toHaveLength(0);
    t.flow.sendInLine();
    expect(t.messages).toHaveLength(1);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toMatch(/^0x[0-9a-f]{64}$/);
    expect(ids[1]).toBe(ids[0]);
  });

  it("prevents duplicate picker entry while begin is waiting", async () => {
    const server = fakeBackend();
    const pending = new Deferred<void>();
    const t = setup({ backend: { ...server.backend, beginMessageAttempt: () => pending.promise } });
    t.flow.give();
    await wait();
    t.flow.sendInLine();
    expect(t.messages).toHaveLength(0);
    pending.resolve();
    await wait();
    expect(t.step()).toBe("ready");
    expect(t.messages).toHaveLength(0);
    t.flow.sendInLine();
    expect(t.messages).toHaveLength(1);
  });
});
