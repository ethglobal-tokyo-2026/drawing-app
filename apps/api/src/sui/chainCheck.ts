import type { AppDeps } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { startMidnightJob, type Schedule } from "../midnightJob.ts";
import type { GasStation, SuiChain } from "./types.ts";

/** Below this Shinami's fund may run dry before anyone tops it up, so the check says so. */
export const LOW_FUND_MIST = 1_000_000_000n;

/**
 * Checks the package's objects and the server's address against Sui, and Shinami's fund: a mismatch
 * means every mint, claim and return fails, and an empty fund means every transaction does.
 */
export async function checkChain({ sui, gasStation }: { sui: SuiChain; gasStation: GasStation }) {
  const [{ serverMatches, missing }, fund] = await Promise.all([
    sui.check(),
    gasStation.available(),
  ]);
  const fields = { serverMatches, missing: missing.join(", "), fundMist: fund.toString() };
  logInfo("chain.sui.checked", fields);
  if (!serverMatches || missing.length > 0) {
    const why = [
      ...(serverMatches ? [] : [`ServerConfig doesn't name the server's address ${sui.server}`]),
      ...(missing.length > 0 ? [`Sui has no ${missing.join(", ")}`] : []),
    ];
    logFailure("chain.sui.mismatch", new Error(why.join("; ")), fields);
  }
  if (fund < LOW_FUND_MIST) {
    logFailure(
      "sponsor.fund.low",
      new Error(`Shinami's fund holds ${fund} MIST, below ${LOW_FUND_MIST}`),
      fields,
    );
  }
}

/** The check at boot, then just after each midnight, Tokyo time. Null on the mock chain. */
export function startChainChecks(deps: AppDeps & { schedule?: Schedule }) {
  const { sui, gasStation } = deps;
  if (!sui || !gasStation) return null;
  return startMidnightJob(
    { clock: deps.clock, schedule: deps.schedule },
    {
      failedEvent: "chain.sui.check_failed",
      run: async () => {
        await checkChain({ sui, gasStation });
        return null;
      },
    },
  );
}
