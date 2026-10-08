import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { describe, expect, it, onTestFinished } from "vitest";
import { chainEnvInput } from "./chainEnvFixture.ts";

const installer = fileURLToPath(new URL("../../../deploy/install-chain-env.mjs", import.meta.url));

/** Runs the real installer, as deploy-api.sh does on the box, against temporary files. */
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "drawing-chain-env-test-"));
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  const chain = join(dir, "chain.env");
  const input = chainEnvInput();
  const run = (values: Record<string, string> = input, mode: "check" | "install" = "install") =>
    spawnSync(process.execPath, [installer, chain, mode], {
      input: Object.entries(values)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(""),
      encoding: "utf8",
    });
  return { chain, input, run };
}

/**
 * Each test starts node several times, and `pnpm check` runs every package's tests at once, which
 * can slow that past vitest's default timeout.
 */
const NODE_RUNS_TIMEOUT_MS = 30_000;

describe("install-chain-env.mjs", { timeout: NODE_RUNS_TIMEOUT_MS }, () => {
  it("writes exactly the keys the API reads, dropping what was there, mode 600, and prints no secret", () => {
    const { chain, input, run } = setup();
    const before = 'ETHEREUM_SEPOLIA_RPC_URL="https://rpc.example/old"\nPRIVY_APP_SECRET="old"\n';
    writeFileSync(chain, before);
    const checked = run(input, "check");
    expect(checked.status, checked.stderr).toBe(0);
    expect(readFileSync(chain, "utf8")).toBe(before);
    const installed = run();
    expect(installed.status, installed.stderr).toBe(0);
    expect(parseEnv(readFileSync(chain, "utf8"))).toEqual({ STICKER_CHAIN_MODE: "sui", ...input });
    expect(statSync(chain).mode & 0o777).toBe(0o600);
    for (const secret of Object.values(input)) {
      expect(installed.stdout + installed.stderr).not.toContain(secret);
    }
    expect(run().stdout).toBe("");
  });

  it("refuses a missing or malformed setting, naming it, and keeps the chain.env it has", () => {
    const { chain, input, run } = setup();
    const refusals: [key: string, value: string][] = [
      ...Object.keys(input)
        .filter((key) => key !== "OPERATOR_LINE_USER_ID")
        .map((key): [string, string] => [key, ""]),
      ["OPERATOR_LINE_USER_ID", "ad0ll"],
      ["SUI_SERVER_PRIVATE_KEY", `0x${"3".repeat(64)}`],
      ["LINE_MESSAGING_CHANNEL_ID", "channel"],
      ["LINE_MESSAGING_CHANNEL_SECRET", "not hex"],
      ["PRIVY_APP_SECRET", "replace-with-the-privy-secret"],
    ];
    const expectEachRefused = () => {
      for (const [key, value] of refusals) {
        const result = run({ ...input, [key]: value });
        expect(result.status, `${key}=${value}`).not.toBe(0);
        expect(result.stderr).toMatch(new RegExp(`(Missing or invalid|Invalid) ${key}`));
      }
    };
    expectEachRefused();
    expect(existsSync(chain)).toBe(false);
    expect(run().status).toBe(0);
    const installed = readFileSync(chain, "utf8");
    expectEachRefused();
    expect(readFileSync(chain, "utf8")).toBe(installed);
  });

  it("installs without the operator's LINE user ID, which is optional", () => {
    const { chain, input, run } = setup();
    const { OPERATOR_LINE_USER_ID: _, ...required } = input;
    expect(run(required).status).toBe(0);
    expect(parseEnv(readFileSync(chain, "utf8"))).toEqual({
      STICKER_CHAIN_MODE: "sui",
      ...required,
    });
  });
});
