import { describe, expect, it } from "vitest";
import { oneAtATime } from "./oneAtATime.ts";

/** A call that runs until the test finishes it, recording when it starts and ends in `trace`. */
function heldCall(trace: string[], name: string) {
  let finish: (failure?: Error) => void = () => undefined;
  const fn = () => {
    trace.push(`${name} started`);
    return new Promise<string>((resolve, reject) => {
      finish = (failure) => {
        trace.push(`${name} ended`);
        if (failure) reject(failure);
        else resolve(name);
      };
    });
  };
  return { fn, finish: (failure?: Error) => finish(failure) };
}

/** Lets every pending promise callback run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("one call at a time per key", () => {
  it("starts a key's next call only once the one before has settled, even when it rejects", async () => {
    const trace: string[] = [];
    const first = heldCall(trace, "first");
    const second = heldCall(trace, "second");
    const firstRun = oneAtATime("gift:1", first.fn);
    const secondRun = oneAtATime("gift:1", second.fn);
    await flush();
    expect(trace).toEqual(["first started"]);

    first.finish(new Error("Sui refused it"));
    await expect(firstRun).rejects.toThrow("Sui refused it");
    await flush();
    expect(trace).toEqual(["first started", "first ended", "second started"]);
    second.finish();
    await expect(secondRun).resolves.toBe("second");
  });

  it("runs calls with different keys side by side", async () => {
    const trace: string[] = [];
    const gift = heldCall(trace, "gift");
    const payer = heldCall(trace, "payer");
    const giftRun = oneAtATime("gift:2", gift.fn);
    const payerRun = oneAtATime("payer:0x2", payer.fn);
    await flush();
    expect(trace).toEqual(["gift started", "payer started"]);
    payer.finish();
    gift.finish();
    await expect(Promise.all([giftRun, payerRun])).resolves.toEqual(["gift", "payer"]);
  });
});
