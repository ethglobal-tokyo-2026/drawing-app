import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { describe, expect, it, onTestFinished } from "vitest";

const installer = fileURLToPath(new URL("../../../deploy/install-chain-env.mjs", import.meta.url));

type Settings = Record<string, string>;

/** What deploy-api.sh sends from deploy/.env: fakes, in the forms the installer checks. */
const SETTINGS: Settings = {
  SUI_SERVER_PRIVATE_KEY: `suiprivkey1${"q".repeat(59)}`,
  SHINAMI_ACCESS_KEY: "fake-shinami-access-key",
  PRIVY_APP_ID: "fake-privy-app",
  PRIVY_APP_SECRET: "fake-privy-secret",
  LINE_MESSAGING_CHANNEL_ID: "2000000001",
  LINE_MESSAGING_CHANNEL_SECRET: "ab".repeat(16),
};

/** Runs the real installer, as deploy-api.sh does on the box, against a temporary chain.env. */
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "drawing-chain-env-test-"));
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  const chain = join(dir, "chain.env");
  const run = (settings: Settings, mode: "check" | "install" = "install") => {
    const input = Object.entries(settings)
      .map(([key, value]) => `${key}=${value}\n`)
      .join("");
    return spawnSync(process.execPath, [installer, chain, mode], { input, encoding: "utf8" });
  };
  return { chain, run };
}

/** Its output reaches the deploy's terminal over SSH, so it never shows a value it was given. */
function expectNoValueShown(result: SpawnSyncReturns<string>, settings: Settings) {
  for (const value of Object.values(settings).filter(Boolean)) {
    expect(result.stdout + result.stderr).not.toContain(value);
  }
}

/**
 * Each test starts node several times, and `pnpm check` runs every package's tests at once, which
 * can slow that past vitest's default timeout.
 */
const NODE_RUNS_TIMEOUT_MS = 30_000;

describe("install-chain-env.mjs", { timeout: NODE_RUNS_TIMEOUT_MS }, () => {
  it("replaces an earlier chain.env with exactly its keys, mode 600, and never prints a value", () => {
    const { chain, run } = setup();
    const earlier = "EARLIER_SETTING=earlier-value\nPRIVY_APP_SECRET=earlier-secret\n";
    writeFileSync(chain, earlier, { mode: 0o644 });
    const checked = run(SETTINGS, "check");
    expect(checked.status, checked.stderr).toBe(0);
    expect(readFileSync(chain, "utf8")).toBe(earlier);
    const installed = run(SETTINGS);
    expect(installed.status, installed.stderr).toBe(0);
    expect(parseEnv(readFileSync(chain, "utf8"))).toEqual({
      ...SETTINGS,
      STICKER_CHAIN_MODE: "sui",
    });
    expect(statSync(chain).mode & 0o777).toBe(0o600);
    expectNoValueShown(checked, SETTINGS);
    expectNoValueShown(installed, SETTINGS);
    // deploy-api.sh restarts the API when the install prints anything.
    const again = run(SETTINGS);
    expect(again.status, again.stderr).toBe(0);
    expect(again.stdout).toBe("");
  });

  it("refuses a missing, malformed or unexpected setting, and leaves chain.env as it was", () => {
    const { chain, run } = setup();
    expect(run(SETTINGS).status).toBe(0);
    const installed = readFileSync(chain, "utf8");
    /** Each key with a value the installer refuses; undefined leaves the key out. */
    const invalid: [string, string | undefined][] = [
      ["SHINAMI_ACCESS_KEY", undefined],
      // What deploy-api.sh sends for a setting deploy/.env leaves out.
      ["PRIVY_APP_SECRET", ""],
      ["PRIVY_APP_SECRET", "replace-with-the-app-secret"],
      // A key in hex, one with a letter bech32 doesn't use, and one cut short.
      ["SUI_SERVER_PRIVATE_KEY", `0x${"3".repeat(64)}`],
      ["SUI_SERVER_PRIVATE_KEY", `suiprivkey1${"b".repeat(59)}`],
      ["SUI_SERVER_PRIVATE_KEY", `suiprivkey1${"q".repeat(58)}`],
      // The Official account's basic ID in place of the channel's, and a secret that isn't one.
      ["LINE_MESSAGING_CHANNEL_ID", "@croquis"],
      ["LINE_MESSAGING_CHANNEL_SECRET", "not-a-channel-secret"],
    ];
    const refusals = invalid.map(([key, value]): [Settings, string] => {
      const { [key]: _replaced, ...others } = SETTINGS;
      const settings = value === undefined ? others : { ...others, [key]: value };
      return [settings, `Missing or invalid ${key}`];
    });
    refusals.push([{ ...SETTINGS, EXTRA_SETTING: "extra-value" }, "Unexpected EXTRA_SETTING"]);
    for (const [settings, refusal] of refusals) {
      for (const mode of ["check", "install"] as const) {
        const refused = run(settings, mode);
        expect(refused.status, `${refusal} (${mode})`).not.toBe(0);
        expect(refused.stderr).toContain(refusal);
        expectNoValueShown(refused, settings);
      }
    }
    expect(readFileSync(chain, "utf8")).toBe(installed);
  });
});
