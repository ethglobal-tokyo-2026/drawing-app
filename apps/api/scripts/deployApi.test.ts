import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
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
import { describe, expect, it, onTestFinished } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const DEPLOY_URL = "https://croquis.test";

/** Runs the real deployment script against folders, never a host: fakes stand in for the box's commands. */
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "drawing-api-deploy-test-"));
  onTestFinished(() => rmSync(dir, { recursive: true }));
  const repo = join(dir, "repo");
  const remote = join(dir, "api");
  const bin = join(dir, "bin");
  const events = join(dir, "events");
  const write = (path: string, body: string | Uint8Array, executable = false) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, { mode: executable ? 0o755 : 0o644 });
  };
  const mock = (name: string, body: string) =>
    write(join(bin, name), `#!${process.execPath}\n${body}`, true);
  write(join(remote, "server/server.mjs"), "previous API\n");
  write(join(remote, "secrets.env"), "SESSION_SECRET=test-session-secret\n");
  write(join(remote, "chain.env"), "PRIVY_APP_SECRET=test-secret\n");
  write(events, "");
  write(join(repo, "deploy/drawing-api.env"), "IMAGE_DIR=unused\n");
  write(join(repo, "deploy/drawing-api.service"), "test service\n");
  write(join(repo, "deploy/line/menus.json"), "{}\n");
  write(join(repo, "deploy/install-node.sh"), "#!/usr/bin/env bash\nexit 0\n", true);
  write(join(repo, "package.json"), readFileSync(join(root, "package.json")));
  for (const file of ["deploy/deploy-api.sh", "deploy/lib.sh", "deploy/install-chain-env.mjs"]) {
    copyFileSync(join(root, file), join(repo, file));
  }
  for (const relative of ["apps/api", "packages/db"]) {
    mkdirSync(join(repo, relative), { recursive: true });
    symlinkSync(join(root, relative, "node_modules"), join(repo, relative, "node_modules"));
  }
  write(join(repo, "packages/db/drizzle/test.sql"), "SELECT 1;\n");
  write(join(repo, "apps/api/dist/server.mjs"), "new API\n");
  mock(
    "node",
    `const result = require("node:child_process").spawnSync(${JSON.stringify(process.execPath)}, process.argv.slice(2), { stdio: "inherit" }); process.exit(result.status ?? 1);`,
  );
  mock("pnpm", "process.exit(0);");
  mock("install", "process.exit(0);");
  mock(
    "curl",
    `require("node:fs").appendFileSync(process.env.TEST_DEPLOY_EVENTS, "curl " + process.argv.at(-1) + "\\n");
console.log(JSON.stringify({ error: "signed_out" }));`,
  );
  mock(
    "sudo",
    `const result = require("node:child_process").spawnSync(process.argv[2], process.argv.slice(3), { stdio: "inherit" }); process.exit(result.status ?? 1);`,
  );
  mock(
    "systemctl",
    `require("node:fs").appendFileSync(process.env.TEST_DEPLOY_EVENTS, process.argv[2] + "\\n");`,
  );
  mock(
    "ssh",
    String.raw`const args = process.argv.slice(2);
while (args[0] === "-o") args.splice(0, 2);
if (args.shift() !== "local-test") throw new Error("Only the local fake host is allowed");
const command = args.join(" ")
  .replace(/\/usr\/local\/lib\/nodejs\/node-\d+\/bin\/npm/g, "true")
  .replaceAll("/tmp/drawing-api-deploy.XXXXXXXX", process.env.TEST_DEPLOY_TEMP + "/stage.XXXXXXXX");
const result = require("node:child_process").spawnSync("bash", ["-c", command], { stdio: "inherit" });
process.exit(result.status ?? 1);
`,
  );
  // Like rsync -c, it compares by content, a folder by each file in it, and -i lists what it changed.
  mock(
    "rsync",
    `const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
const destination = args.pop().replace(/^local-test:/, "");
const same = (source, target) =>
  fs.existsSync(target) &&
  (fs.statSync(source).isDirectory()
    ? fs.readdirSync(source).every((name) => same(path.join(source, name), path.join(target, name)))
    : fs.readFileSync(source).equals(fs.readFileSync(target)));
for (const source of args) {
  const directory = fs.statSync(source).isDirectory();
  const target = directory || !destination.endsWith("/") ? destination : path.join(destination, path.basename(source));
  const changed = !same(source, target);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: directory });
  if (changed && process.argv.some((arg) => /^-[a-z]*i/.test(arg))) console.log("updated " + target);
}
`,
  );
  mock(
    "timeout",
    `const result = require("node:child_process").spawnSync(process.argv[3], process.argv.slice(4), { stdio: "inherit" });
process.exit(result.status ?? 1);
`,
  );
  // Without git's own variables, which a hook sets, and this machine's git config, such as commit signing, git
  // stays inside the temporary repository.
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_"))),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    PATH: `${bin}:${process.env.PATH}`,
    DEPLOY_ENV_FILE: join(dir, "no-environment-file"),
    DEPLOY_TARGET: "local-test",
    DEPLOY_API_DIR: remote,
    DEPLOY_URL,
    ETHEREUM_SEPOLIA_RPC_URL: "https://rpc.test/sepolia",
    STICKER_NFT_ADDRESS: `0x${"1".repeat(40)}`,
    STICKER_GIFT_ESCROW_ADDRESS: `0x${"2".repeat(40)}`,
    STICKER_SEALER_PRIVATE_KEY: `0x${"3".repeat(64)}`,
    CROQUIS_NAMES_ADDRESS: `0x${"4".repeat(40)}`,
    CROQUIS_RESOLVER_ADDRESS: `0x${"5".repeat(40)}`,
    ENS_GATEWAY_PRIVATE_KEY: `0x${"6".repeat(64)}`,
    PRIVY_APP_ID: "test-app",
    PRIVY_APP_SECRET: "test-secret",
    TEST_DEPLOY_EVENTS: events,
    TEST_DEPLOY_TEMP: dir,
  };
  // deploy-api.sh deploys only the commit main points to, with nothing uncommitted.
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, env });
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("-c", "user.name=test", "-c", "user.email=test@example.test", "commit", "-qm", "main");
  return {
    built: () => readFileSync(join(repo, "apps/api/dist/server.mjs"), "utf8"),
    published: () => readFileSync(join(remote, "server/server.mjs"), "utf8"),
    /** What the box's systemctl and curl were asked since the last call. */
    takeEvents: () => {
      const taken = readFileSync(events, "utf8").split("\n").filter(Boolean);
      writeFileSync(events, "");
      return taken;
    },
    run: () =>
      spawnSync("bash", [join(repo, "deploy/deploy-api.sh")], {
        env,
        encoding: "utf8",
        timeout: 20_000,
      }),
  };
}

/** Whether the API answers, on the box and then publicly. */
const API_CHECKS: unknown[] = [
  expect.stringMatching(/^curl http:\/\/127\.0\.0\.1:\d+\/api\/me$/),
  `curl ${DEPLOY_URL}/api/me`,
];

describe("deploy-api.sh", () => {
  it("publishes the API, restarts it only when something changed, and checks that it answers", () => {
    const deploy = setup();
    const first = deploy.run();
    expect(first.status, first.stderr).toBe(0);
    expect(deploy.published()).toBe(deploy.built());
    expect(deploy.takeEvents()).toEqual(["daemon-reload", "enable", "restart", ...API_CHECKS]);
    const second = deploy.run();
    expect(second.status, second.stderr).toBe(0);
    expect(deploy.takeEvents()).toEqual(API_CHECKS);
  }, 45_000);
});
