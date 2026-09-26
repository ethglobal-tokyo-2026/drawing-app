// Run with: node --test deploy/install-chain-env.test.mjs
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
import { test } from "node:test";
import assert from "node:assert/strict";

/** @param {import("node:test").TestContext} t */
function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), "drawing-chain-env-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const chain = join(dir, "chain.env");
  const auth = join(dir, "auth.env");
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
  /** @param {string} value @param {string} [mode] */
  const run = (value, mode = "install") =>
    spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./install-chain-env.mjs", import.meta.url)), chain, auth, mode],
      { input: value, encoding: "utf8" },
    );
  return { chain, auth, input, run };
}

await test("reuses remote Privy credentials without replacing other chain values or exposing secrets", (t) => {
  const { chain, auth, input, run } = setup(t);
  writeFileSync(
    auth,
    "PRIVY_APP_SECRET=server-secret\nLINE_MESSAGING_CHANNEL_SECRET=keep-private\n",
  );
  writeFileSync(chain, "EXISTING_OPTION=preserved\n");
  const checked = run(input, "check");
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(readFileSync(chain, "utf8"), "EXISTING_OPTION=preserved\n");
  const installed = run(input);
  assert.equal(installed.status, 0, installed.stderr);
  const config = parseEnv(readFileSync(chain, "utf8"));
  assert.equal(config.PRIVY_APP_SECRET, parseEnv(readFileSync(auth, "utf8")).PRIVY_APP_SECRET);
  assert.equal(config.EXISTING_OPTION, "preserved");
  assert.equal(statSync(chain).mode & 0o777, 0o600);
  assert.ok(config.PRIVY_APP_SECRET);
  assert.ok(!installed.stdout.includes(config.PRIVY_APP_SECRET));
  assert.equal(run("").stdout, "");
});

const LINE_CHANNEL = `LINE_MESSAGING_CHANNEL_ID=2000000001\nLINE_MESSAGING_CHANNEL_SECRET=${"ab".repeat(16)}\n`;

await test("takes the chat menu's Messaging API channel from the auth service's secrets, as a pair", (t) => {
  const { chain, auth, input, run } = setup(t);
  writeFileSync(auth, `PRIVY_APP_SECRET=server-secret\n${LINE_CHANNEL}`);
  const installed = run(input);
  assert.equal(installed.status, 0, installed.stderr);
  const config = parseEnv(readFileSync(chain, "utf8"));
  const channel = parseEnv(LINE_CHANNEL);
  assert.equal(config.LINE_MESSAGING_CHANNEL_ID, channel.LINE_MESSAGING_CHANNEL_ID);
  assert.equal(config.LINE_MESSAGING_CHANNEL_SECRET, channel.LINE_MESSAGING_CHANNEL_SECRET);
  assert.ok(!installed.stdout.includes(channel.LINE_MESSAGING_CHANNEL_SECRET ?? "?"));
});

await test("installs no chat menu channel without one, and refuses half of one", (t) => {
  const { chain, input, run } = setup(t);
  const without = run(`${input}\nPRIVY_APP_SECRET=s\n`);
  assert.equal(without.status, 0, without.stderr);
  assert.equal(parseEnv(readFileSync(chain, "utf8")).LINE_MESSAGING_CHANNEL_ID, undefined);
  const half = run(`${input}\nPRIVY_APP_SECRET=s\nLINE_MESSAGING_CHANNEL_ID=2000000001\n`, "check");
  assert.notEqual(half.status, 0);
  assert.match(half.stderr, /Missing or invalid LINE_MESSAGING_CHANNEL_SECRET/);
});

await test("missing Privy credentials abort before installing a file", (t) => {
  const { chain, input, run } = setup(t);
  const result = run(input);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing or invalid PRIVY_APP_SECRET/);
  assert.equal(existsSync(chain), false);
});

await test("takes several RPC URLs separated by commas, and refuses a list with a bad one", (t) => {
  const { input, run } = setup(t);
  const list = "https://rpc.example/one, https://rpc.example/two";
  const withList = `${input.replace("https://rpc.example/sepolia", list)}\nPRIVY_APP_SECRET=s\n`;
  const accepted = run(withList, "check");
  assert.equal(accepted.status, 0, accepted.stderr);
  const refused = run(
    withList.replace("https://rpc.example/two", "ftp://rpc.example/two"),
    "check",
  );
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /Invalid ETHEREUM_SEPOLIA_RPC_URL/);
});

await test("an explicit invalid credential cannot erase an existing configuration", (t) => {
  const { chain, input, run } = setup(t);
  const initial = run(`${input}\nPRIVY_APP_SECRET=server-secret\n`);
  assert.equal(initial.status, 0, initial.stderr);
  const previous = readFileSync(chain, "utf8");
  const result = run("STICKER_SEALER_PRIVATE_KEY=invalid\n");
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(chain, "utf8"), previous);
});

await test("takes age verification's World ID app only whole", (t) => {
  const { input, run } = setup(t);
  const base = `${input}\nPRIVY_APP_SECRET=s\n`;
  const app = `WORLD_ID_APP_ID=app_test\nWORLD_ID_RP_ID=rp_test\nWORLD_ID_SIGNING_KEY=0x${"7".repeat(64)}\n`;
  const whole = run(base + app, "check");
  assert.equal(whole.status, 0, whole.stderr);
  const partial = run(base + "WORLD_ID_APP_ID=app_test\n", "check");
  assert.notEqual(partial.status, 0);
  assert.match(partial.stderr, /Missing or invalid WORLD_ID_RP_ID/);
});
