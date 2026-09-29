import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { describe, expect, it, onTestFinished } from "vitest";

const installer = fileURLToPath(new URL("../../../deploy/install-chain-env.mjs", import.meta.url));

/** Runs the real installer, as deploy-api.sh does on the box, against temporary files. */
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "drawing-chain-env-test-"));
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  const chain = join(dir, "chain.env");
  const input = [
    "ETHEREUM_SEPOLIA_RPC_URL=https://rpc.example/sepolia",
    `STICKER_NFT_ADDRESS=0x${"1".repeat(40)}`,
    `STICKER_GIFT_ESCROW_ADDRESS=0x${"2".repeat(40)}`,
    `STICKER_SEALER_PRIVATE_KEY=0x${"3".repeat(64)}`,
    `CROQUIS_NAMES_ADDRESS=0x${"4".repeat(40)}`,
    `CROQUIS_RESOLVER_ADDRESS=0x${"5".repeat(40)}`,
    `ENS_GATEWAY_PRIVATE_KEY=0x${"6".repeat(64)}`,
    "PRIVY_APP_ID=test-app",
  ].join("\n");
  const run = (value: string, mode: "check" | "install" = "install") =>
    spawnSync(process.execPath, [installer, chain, mode], { input: value, encoding: "utf8" });
  return { chain, input, run };
}

const LINE_CHANNEL = `LINE_MESSAGING_CHANNEL_ID=2000000001\nLINE_MESSAGING_CHANNEL_SECRET=${"ab".repeat(16)}\n`;

/**
 * Each test starts node several times, and `pnpm check` runs every package's tests at once, which
 * can slow that past vitest's default timeout.
 */
const NODE_RUNS_TIMEOUT_MS = 30_000;

describe("install-chain-env.mjs", { timeout: NODE_RUNS_TIMEOUT_MS }, () => {
  it("keeps what chain.env holds that the input leaves out, mode 600, and prints no secret", () => {
    const { chain, input, run } = setup();
    const onBox = `PRIVY_APP_SECRET=server-secret\n${LINE_CHANNEL}EXISTING_OPTION=preserved\n`;
    writeFileSync(chain, onBox);
    const checked = run(input, "check");
    expect(checked.status, checked.stderr).toBe(0);
    expect(readFileSync(chain, "utf8")).toBe(onBox);
    const installed = run(input);
    expect(installed.status, installed.stderr).toBe(0);
    const kept = parseEnv(onBox);
    expect(parseEnv(readFileSync(chain, "utf8"))).toMatchObject(kept);
    expect(statSync(chain).mode & 0o777).toBe(0o600);
    expect(installed.stdout).not.toContain(kept.PRIVY_APP_SECRET);
    expect(installed.stdout).not.toContain(kept.LINE_MESSAGING_CHANNEL_SECRET);
    expect(run("").stdout).toBe("");
  });

  it("installs no chat menu channel without one, and refuses half of one", () => {
    const { chain, input, run } = setup();
    const without = run(`${input}\nPRIVY_APP_SECRET=s\n`);
    expect(without.status, without.stderr).toBe(0);
    expect(parseEnv(readFileSync(chain, "utf8")).LINE_MESSAGING_CHANNEL_ID).toBeUndefined();
    const half = run(
      `${input}\nPRIVY_APP_SECRET=s\nLINE_MESSAGING_CHANNEL_ID=2000000001\n`,
      "check",
    );
    expect(half.status).not.toBe(0);
    expect(half.stderr).toMatch(/Missing or invalid LINE_MESSAGING_CHANNEL_SECRET/);
  });

  it("missing Privy credentials abort before installing a file", () => {
    const { chain, input, run } = setup();
    const result = run(input);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Missing or invalid PRIVY_APP_SECRET/);
    expect(existsSync(chain)).toBe(false);
  });

  it("takes several RPC URLs separated by commas, and refuses a list with a bad one", () => {
    const { input, run } = setup();
    const list = "https://rpc.example/one, https://rpc.example/two";
    const withList = `${input.replace("https://rpc.example/sepolia", list)}\nPRIVY_APP_SECRET=s\n`;
    const accepted = run(withList, "check");
    expect(accepted.status, accepted.stderr).toBe(0);
    const refused = run(
      withList.replace("https://rpc.example/two", "ftp://rpc.example/two"),
      "check",
    );
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toMatch(/Invalid ETHEREUM_SEPOLIA_RPC_URL/);
  });

  it("an explicit invalid credential cannot erase an existing configuration", () => {
    const { chain, input, run } = setup();
    const initial = run(`${input}\nPRIVY_APP_SECRET=server-secret\n`);
    expect(initial.status, initial.stderr).toBe(0);
    const previous = readFileSync(chain, "utf8");
    const result = run("STICKER_SEALER_PRIVATE_KEY=invalid\n");
    expect(result.status).not.toBe(0);
    expect(readFileSync(chain, "utf8")).toBe(previous);
  });

  it("takes age verification's World ID app only whole", () => {
    const { input, run } = setup();
    const base = `${input}\nPRIVY_APP_SECRET=s\n`;
    const app = `WORLD_ID_APP_ID=app_test\nWORLD_ID_RP_ID=rp_test\nWORLD_ID_SIGNING_KEY=0x${"7".repeat(64)}\n`;
    const whole = run(base + app, "check");
    expect(whole.status, whole.stderr).toBe(0);
    const partial = run(base + "WORLD_ID_APP_ID=app_test\n", "check");
    expect(partial.status).not.toBe(0);
    expect(partial.stderr).toMatch(/Missing or invalid WORLD_ID_RP_ID/);
  });
});
