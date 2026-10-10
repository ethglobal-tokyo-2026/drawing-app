import { assert, describe, expect, it, vi } from "vitest";
import { ChainUnavailableError } from "../deps.ts";
import { createTestApp } from "../testing/createTestApp.ts";
import { fakeClock } from "../testing/fakes.ts";
import { fakeSui } from "../testing/fakeSui.ts";
import { captureLogLines } from "../testing/logLines.ts";
import { checkChain, LOW_FUND_MIST, startChainChecks } from "./chainCheck.ts";

/** The fake chain, with `check` and the fund answering as given. */
function chainWith(check: { serverMatches: boolean; missing: string[] }, fund: bigint) {
  const { sui, gasStation } = fakeSui(fakeClock());
  vi.spyOn(sui, "check").mockResolvedValue(check);
  vi.spyOn(gasStation, "available").mockResolvedValue(fund);
  return { sui, gasStation };
}

describe("the chain check", () => {
  it("logs what it found, and nothing amiss when the server, the objects and the fund are all there", async () => {
    const logs = captureLogLines();
    await checkChain(chainWith({ serverMatches: true, missing: [] }, LOW_FUND_MIST));
    logs.expectLogged("chain.sui.checked", {
      serverMatches: true,
      fundMist: LOW_FUND_MIST.toString(),
    });
    expect(logs.entries.map(({ event }) => event)).toEqual(["chain.sui.checked"]);
  });

  it("says so when ServerConfig names another server or an object is missing, and when the fund runs low", async () => {
    const logs = captureLogLines();
    await checkChain(
      chainWith({ serverMatches: false, missing: ["SUI_GIFT_ESCROW"] }, LOW_FUND_MIST - 1n),
    );
    logs.expectLogged("chain.sui.mismatch", { serverMatches: false, missing: "SUI_GIFT_ESCROW" });
    logs.expectLogged("sponsor.fund.low", { fundMist: (LOW_FUND_MIST - 1n).toString() });
  });

  it("logs a boot check Sui can't answer, such as its read of a package's original ID, and runs again after midnight", async () => {
    const logs = captureLogLines();
    const { sui, gasStation } = fakeSui(fakeClock());
    vi.spyOn(sui, "check").mockRejectedValue(
      new ChainUnavailableError("Sui couldn't be asked for package 0x1"),
    );
    const waits: number[] = [];
    const job = startChainChecks({
      ...(await createTestApp({ sui, gasStation })).deps,
      schedule: (_, ms) => {
        waits.push(ms);
        return () => {};
      },
    });
    assert(job, "Sui runs the chain check");
    await job.idle();
    logs.expectLogged("chain.sui.check_failed");
    expect(waits).toHaveLength(1);
    job.stop();
  });
});
