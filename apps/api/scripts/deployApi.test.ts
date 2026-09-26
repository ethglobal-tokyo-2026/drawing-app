import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { keccak256 } from "../src/keccak256.ts";
import { sealImages } from "../src/stickers/testPngs.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((dir) => rmSync(dir, { recursive: true })));

/** Runs the real deployment script against files, never a host, with the real image conversion. */
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "drawing-api-deploy-test-"));
  temporary.push(dir);
  const repo = join(dir, "repo");
  const remote = join(dir, "api");
  const bin = join(dir, "bin");
  const events = join(dir, "events");
  const running = join(dir, "running");
  const active = join(remote, "server/server.mjs");
  const write = (path: string, body: string | Uint8Array, executable = false) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, { mode: executable ? 0o755 : 0o644 });
  };
  const mock = (name: string, body: string) =>
    write(join(bin, name), `#!${process.execPath}\n${body}`, true);
  write(active, "previous API\n");
  write(running, "active");
  write(events, "");
  write(join(remote, "secrets.env"), "SESSION_SECRET=test-session-secret\n");
  write(join(remote, "chain.env"), "PRIVY_APP_SECRET=test-secret\n");
  write(join(repo, "deploy/drawing-api.env"), "IMAGE_DIR=unused\n");
  write(join(repo, "deploy/drawing-api.service"), "test service\n");
  write(join(repo, "deploy/install-node.sh"), "#!/usr/bin/env bash\nexit 0\n", true);
  write(join(repo, "package.json"), readFileSync(join(root, "package.json")));
  copyFileSync(join(root, "deploy/deploy-api.sh"), join(repo, "deploy/deploy-api.sh"));
  copyFileSync(
    join(root, "deploy/install-chain-env.mjs"),
    join(repo, "deploy/install-chain-env.mjs"),
  );
  for (const relative of ["apps/api", "packages/db"]) {
    mkdirSync(join(repo, relative), { recursive: true });
    symlinkSync(join(root, relative, "node_modules"), join(repo, relative, "node_modules"));
  }
  write(join(repo, "packages/db/drizzle/test.sql"), "SELECT 1;\n");
  write(join(repo, "apps/api/dist/server.mjs"), "new API\n");
  write(
    join(repo, "apps/api/dist/backfill-sticker-webp.mjs"),
    `import { appendFileSync, existsSync } from "node:fs";
if (existsSync(process.env.TEST_API_RUNNING)) throw new Error("The API must be stopped before conversion");
appendFileSync(process.env.TEST_DEPLOY_EVENTS, "convert\\n");
await import(${JSON.stringify(new URL("./backfill-sticker-webp.ts", import.meta.url).href)});
`,
  );
  mock(
    "node",
    `const result = require("node:child_process").spawnSync(${JSON.stringify(process.execPath)}, process.argv.slice(2), { stdio: "inherit" }); process.exit(result.status ?? 1);`,
  );
  mock("pnpm", "process.exit(0);");
  mock("sleep", "process.exit(0);");
  mock("install", "process.exit(0);");
  mock("curl", 'console.log(JSON.stringify({ error: "signed_out" }));');
  mock(
    "sudo",
    `const result = require("node:child_process").spawnSync(process.argv[2], process.argv.slice(3), { stdio: "inherit" }); process.exit(result.status ?? 1);`,
  );
  mock(
    "systemctl",
    `const fs = require("node:fs");
const action = process.argv[2];
const running = process.env.TEST_API_RUNNING;
if (action === "is-active") process.exit(fs.existsSync(running) ? 0 : 3);
fs.appendFileSync(process.env.TEST_DEPLOY_EVENTS, action + "\\n");
if (action === "stop") fs.rmSync(running, { force: true });
if (action === "start" || action === "restart") fs.writeFileSync(running, "active");
`,
  );
  mock(
    "ssh",
    `const args = process.argv.slice(2);
while (args[0] === "-o") args.splice(0, 2);
if (args.shift() !== "local-test") throw new Error("Only the local fake host is allowed");
const command = args.join(" ")
  .replaceAll("/usr/local/lib/nodejs/node-24/bin/node", ${JSON.stringify(process.execPath)})
  .replaceAll("/usr/local/lib/nodejs/node-24/bin/npm", "true")
  .replaceAll("/tmp/drawing-api-deploy.XXXXXXXX", process.env.TEST_DEPLOY_TEMP + "/stage.XXXXXXXX");
const result = require("node:child_process").spawnSync("bash", ["-c", command], { stdio: "inherit" });
process.exit(result.status ?? 1);
`,
  );
  mock(
    "rsync",
    `const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
const destination = args.pop().replace(/^local-test:/, "");
for (const source of args) {
  const directory = fs.statSync(source).isDirectory();
  const target = directory || !destination.endsWith("/") ? destination : path.join(destination, path.basename(source));
  const changed = directory || !fs.existsSync(target) || !fs.readFileSync(source).equals(fs.readFileSync(target));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: directory });
  if (changed && process.argv.some((arg) => /^-[a-z]*i/.test(arg))) console.log("updated " + target);
}
`,
  );
  mock(
    "timeout",
    `if (process.env.TEST_BACKFILL_TIMEOUT === "1") process.exit(124);
const result = require("node:child_process").spawnSync(process.argv[3], process.argv.slice(4), { stdio: "inherit" });
process.exit(result.status ?? 1);
`,
  );
  const pngs = sealImages();
  const hash = keccak256(pngs.png);
  for (const [kind, bytes] of Object.entries(pngs)) {
    write(join(remote, "images", `${hash}${kind === "png" ? "" : `.${kind}`}.png`), bytes);
  }
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    DEPLOY_ENV_FILE: join(dir, "no-environment-file"),
    DEPLOY_TARGET: "local-test",
    DEPLOY_API_DIR: remote,
    DEPLOY_AUTH_DIR: join(dir, "auth"),
    DEPLOY_URL: "https://unused.test",
    ETHEREUM_SEPOLIA_RPC_URL: "https://rpc.test/sepolia",
    STICKER_NFT_ADDRESS: `0x${"1".repeat(40)}`,
    STICKER_GIFT_ESCROW_ADDRESS: `0x${"2".repeat(40)}`,
    STICKER_SEALER_PRIVATE_KEY: `0x${"3".repeat(64)}`,
    CROQUIS_NAMES_ADDRESS: `0x${"4".repeat(40)}`,
    CROQUIS_RESOLVER_ADDRESS: `0x${"5".repeat(40)}`,
    ENS_GATEWAY_PRIVATE_KEY: `0x${"6".repeat(64)}`,
    PRIVY_APP_ID: "test-app",
    PRIVY_APP_SECRET: "test-secret",
    TEST_API_RUNNING: running,
    TEST_DEPLOY_EVENTS: events,
    TEST_DEPLOY_TEMP: dir,
  };
  return {
    active,
    running,
    image: (suffix: string) => join(remote, "images", `${hash}${suffix}`),
    events: () => readFileSync(events, "utf8").trim().split("\n"),
    run: (extra: Record<string, string> = {}) =>
      spawnSync("bash", [join(repo, "deploy/deploy-api.sh")], {
        env: { ...env, ...extra },
        encoding: "utf8",
        timeout: 20_000,
      }),
  };
}

describe("API deployment image preparation", () => {
  it("converts old Sticker images before publishing and restarting, and can run again", () => {
    const deploy = setup();
    const first = deploy.run();
    expect(first.status, first.stderr).toBe(0);
    expect(deploy.events()).toEqual(["stop", "convert", "daemon-reload", "enable", "restart"]);
    expect(readFileSync(deploy.active, "utf8")).toBe("new API\n");
    const webp = readFileSync(deploy.image(".webp"));
    expect(webp.subarray(8, 12).toString()).toBe("WEBP");
    const second = deploy.run();
    expect(second.status, second.stderr).toBe(0);
    expect(readFileSync(deploy.image(".webp"))).toEqual(webp);
    expect(existsSync(deploy.running)).toBe(true);
  }, 45_000);

  it("restores the previous API without publishing the staged build if conversion fails", () => {
    const deploy = setup();
    rmSync(deploy.image(".mask.png"));
    const result = deploy.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("sticker image preparation failed");
    expect(deploy.events()).toEqual(["stop", "convert", "start"]);
    expect(readFileSync(deploy.active, "utf8")).toBe("previous API\n");
    expect(existsSync(deploy.running)).toBe(true);
  }, 45_000);

  it("restores the previous API when image preparation times out", () => {
    const deploy = setup();
    const result = deploy.run({ TEST_BACKFILL_TIMEOUT: "1" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("sticker image preparation failed");
    expect(deploy.events()).toEqual(["stop", "start"]);
    expect(readFileSync(deploy.active, "utf8")).toBe("previous API\n");
    expect(existsSync(deploy.running)).toBe(true);
  }, 45_000);
});
