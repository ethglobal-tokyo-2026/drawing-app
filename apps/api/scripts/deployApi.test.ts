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
import { chainEnvInput } from "./chainEnvFixture.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const DEPLOY_URL = "https://croquis.test";
const PACKAGE_ID_KEYS = [
  "SUI_STICKER_PACKAGE",
  "SUI_STICKER_REGISTRY",
  "SUI_SERVER_CONFIG",
  "SUI_GIFT_ESCROW",
];
/** deploy/drawing-api.env as the box would have it once the stickers package is published. */
const PUBLISHED_API_ENV = [
  "IMAGE_DIR=unused",
  ...PACKAGE_ID_KEYS.map((key, index) => `${key}=0x${String(index + 1).repeat(64)}`),
  "",
].join("\n");

/** Runs the real deployment script against folders, never a host: fakes stand in for the box's commands. */
function setup(apiEnv = PUBLISHED_API_ENV) {
  const dir = mkdtempSync(join(tmpdir(), "drawing-api-deploy-test-"));
  onTestFinished(() => rmSync(dir, { recursive: true }));
  const repo = join(dir, "repo");
  const remote = join(dir, "api");
  const auth = join(dir, "auth");
  const frontend = join(dir, "frontend");
  const bin = join(dir, "bin");
  const events = join(dir, "events");
  const write = (path: string, body: string | Uint8Array, executable = false) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, { mode: executable ? 0o755 : 0o644 });
  };
  const mock = (name: string, body: string) =>
    write(join(bin, name), `#!${process.execPath}\n${body}`, true);
  write(join(remote, "server/server.mjs"), "previous API\n");
  write(join(auth, "server/start-auth-server.js"), "previous auth\n");
  write(
    join(auth, "server/package.json"),
    JSON.stringify({ type: "module", croquisPrivyIssuance: "session" }),
  );
  write(join(auth, "sticker-auth.service"), "previous auth unit\n");
  write(join(auth, "signing-key.pem"), "fixture signing key\n");
  write(join(frontend, "site/index.html"), "previous frontend\n");
  write(join(remote, "secrets.env"), "SESSION_SECRET=test-session-secret\n");
  write(join(remote, "chain.env"), "PRIVY_APP_SECRET=test-secret\n");
  write(join(remote, "privy-internal.env"), `PRIVY_JWT_INTERNAL_SECRET="${"a".repeat(64)}"\n`);
  write(join(auth, "privy-internal.env"), `PRIVY_JWT_INTERNAL_SECRET="${"a".repeat(64)}"\n`);
  write(events, "");
  write(join(repo, "deploy/drawing-api.env"), apiEnv);
  write(join(repo, "deploy/drawing-api.service"), "test service\n");
  write(join(repo, "deploy/line/menus.json"), "{}\n");
  write(join(repo, "deploy/install-node.sh"), "#!/usr/bin/env bash\nexit 0\n", true);
  write(join(repo, "package.json"), readFileSync(join(root, "package.json")));
  for (const file of [
    "deploy/deploy-api.sh",
    "deploy/lib.sh",
    "deploy/install-chain-env.mjs",
    "deploy/install-auth-secret.mjs",
    "deploy/deploy.sh",
    "deploy/release-snapshot.mjs",
  ]) {
    copyFileSync(join(root, file), join(repo, file));
  }
  for (const relative of ["apps/api", "packages/db"]) {
    mkdirSync(join(repo, relative), { recursive: true });
    symlinkSync(join(root, relative, "node_modules"), join(repo, relative, "node_modules"));
  }
  write(join(repo, "packages/db/drizzle/test.sql"), "SELECT 1;\n");
  write(join(repo, "apps/api/dist/server.mjs"), "new API\n");
  write(join(repo, "packages/line-auth/dist/auth-server/start-auth-server.js"), "new auth\n");
  write(
    join(repo, "packages/line-auth/dist/auth-server/package.json"),
    JSON.stringify({ type: "module", croquisPrivyIssuance: "session" }),
  );
  write(join(repo, "apps/frontend/dist/index.html"), "new frontend\n");
  write(join(repo, "deploy/sticker-auth.env"), "AUTH_KEY_ID=existing\n");
  write(join(repo, "deploy/sticker-auth.service"), "auth unit\n");
  write(join(repo, "deploy/sticker-board.service"), "frontend unit\n");
  write(join(repo, "deploy/serve.py"), "frontend server\n");
  mock(
    "node",
    `const result = require("node:child_process").spawnSync(${JSON.stringify(process.execPath)}, process.argv.slice(2), { stdio: "inherit" }); process.exit(result.status ?? 1);`,
  );
  mock("pnpm", "process.exit(0);");
  mock("install", "process.exit(0);");
  mock(
    "npm",
    `require("node:fs").appendFileSync(process.env.TEST_DEPLOY_EVENTS, "npm " + process.argv[2] + "\\n");
process.exit(Number(process.env.TEST_NPM_STATUS ?? 0));`,
  );
  mock(
    "curl",
    `require("node:fs").appendFileSync(process.env.TEST_DEPLOY_EVENTS, "curl " + process.argv.at(-1) + "\\n");
const url = process.argv.at(-1);
if ((process.env.TEST_FAIL_STAGE === "issuer" && url.includes("jwks")) || (process.env.TEST_FAIL_STAGE === "api" && url.includes("/api/me")) || (process.env.TEST_FAIL_STAGE === "frontend" && url === "http://127.0.0.1:3003/")) console.log("unavailable");
else if (url.includes("jwks")) console.log(JSON.stringify({ keys: [{ kid: "existing" }] }));
else if (url.includes("/api/me")) console.log(JSON.stringify({ error: "signed_out" }));
else if (url.endsWith("/")) process.stdout.write(require("node:fs").readFileSync(process.env.DEPLOY_FRONTEND_DIR + "/site/index.html"));`,
  );
  mock(
    "sudo",
    `const result = require("node:child_process").spawnSync(process.argv[2], process.argv.slice(3), { stdio: "inherit" }); process.exit(result.status ?? 1);`,
  );
  mock(
    "systemctl",
    `const fs = require("node:fs");
fs.appendFileSync(process.env.TEST_DEPLOY_EVENTS, process.argv[2] + (process.argv[3] === "sticker-auth" ? " sticker-auth" : "") + "\\n");
if (process.argv[2] === "restart" && ["drawing-api", "sticker-auth"].includes(process.argv[3])) {
  const directory = process.argv[3] === "drawing-api" ? process.env.DEPLOY_API_DIR : process.env.DEPLOY_AUTH_DIR;
  if (fs.existsSync(directory + "/privy-internal.env")) fs.copyFileSync(directory + "/privy-internal.env", directory + "/fixture-running-auth.env");
}`,
  );
  mock(
    "ssh",
    String.raw`const args = process.argv.slice(2);
while (args[0] === "-o") args.splice(0, 2);
if (args.shift() !== "local-test") throw new Error("Only the local fake host is allowed");
const command = args.join(" ")
  .replace(/\/usr\/local\/lib\/nodejs\/node-\d+\/bin\/npm/g, "npm")
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
    DEPLOY_AUTH_DIR: auth,
    DEPLOY_FRONTEND_DIR: frontend,
    PRIVY_JWT_INTERNAL_SECRET: "a".repeat(64),
    DEPLOY_URL,
    ...chainEnvInput(),
    TEST_DEPLOY_EVENTS: events,
    TEST_DEPLOY_TEMP: dir,
  };
  // deploy-api.sh deploys only the commit main points to, pushed, with nothing uncommitted.
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, env });
  const commit = (message: string) =>
    git(
      "-c",
      "user.name=test",
      "-c",
      "user.email=test@example.test",
      "commit",
      "--allow-empty",
      "-qm",
      message,
    );
  const origin = join(dir, "origin.git");
  execFileSync("git", ["init", "-q", "--bare", origin], { env });
  git("init", "-q", "-b", "main");
  git("add", "-A");
  commit("main");
  git("remote", "add", "origin", origin);
  git("push", "-q", "origin", "main");
  return {
    commit,
    legacyAuth: () =>
      writeFileSync(join(auth, "server/package.json"), JSON.stringify({ type: "module" })),
    recoveryRequired: () => readFileSync(join(auth, "issuance-recovery-required"), "utf8"),
    authPublished: () => readFileSync(join(auth, "server/start-auth-server.js"), "utf8"),
    frontendPublished: () => readFileSync(join(frontend, "site/index.html"), "utf8"),
    servicesLoadedSecret: (secret: string) =>
      [remote, auth].every(
        (directory) =>
          readFileSync(join(directory, "fixture-running-auth.env"), "utf8") ===
          `PRIVY_JWT_INTERNAL_SECRET="${secret}"\n`,
      ),
    runRelease: (overrides: Record<string, string> = {}) =>
      spawnSync("bash", [join(repo, "deploy/deploy.sh")], {
        env: { ...env, ...overrides },
        encoding: "utf8",
        timeout: 30_000,
      }),
    built: () => readFileSync(join(repo, "apps/api/dist/server.mjs"), "utf8"),
    published: () => readFileSync(join(remote, "server/server.mjs"), "utf8"),
    /** What the box's npm, systemctl and curl were asked since the last call. */
    takeEvents: () => {
      const taken = readFileSync(events, "utf8").split("\n").filter(Boolean);
      writeFileSync(events, "");
      return taken;
    },
    /** Runs deploy-api.sh; TEST_NPM_STATUS in `overrides` is the exit status of the box's npm. */
    run: (overrides: Record<string, string> = {}) =>
      spawnSync("bash", [join(repo, "deploy/deploy-api.sh")], {
        env: { ...env, ...overrides },
        encoding: "utf8",
        timeout: 20_000,
      }),
  };
}

/** A deploy that installs the native modules and restarts the API, then checks it. */
const INSTALLED_AND_RESTARTED = ["npm install", "daemon-reload", "enable", "restart"];

/** Whether the API answers, on the box and then publicly. */
const API_CHECKS: unknown[] = [
  expect.stringMatching(/^curl http:\/\/127\.0\.0\.1:\d+\/api\/me$/),
  `curl ${DEPLOY_URL}/api/me`,
];

describe("deploy-api.sh", () => {
  it("publishes the API, installs and restarts only when something changed, and checks that it answers", () => {
    const deploy = setup();
    const first = deploy.run();
    expect(first.status, first.stderr).toBe(0);
    expect(deploy.published()).toBe(deploy.built());
    expect(deploy.takeEvents()).toEqual([
      "curl http://127.0.0.1:8787/.well-known/jwks.json",
      ...INSTALLED_AND_RESTARTED,
      ...API_CHECKS,
    ]);
    const second = deploy.run();
    expect(second.status, second.stderr).toBe(0);
    expect(deploy.takeEvents()).toEqual([
      "curl http://127.0.0.1:8787/.well-known/jwks.json",
      ...API_CHECKS,
    ]);
  }, 45_000);

  it("installs the native modules again on the deploy after one whose install failed", () => {
    const deploy = setup();
    const failed = deploy.run({ TEST_NPM_STATUS: "1" });
    expect(failed.status).not.toBe(0);
    expect(deploy.takeEvents()).toEqual([
      "curl http://127.0.0.1:8787/.well-known/jwks.json",
      "npm install",
    ]);
    const next = deploy.run();
    expect(next.status, next.stderr).toBe(0);
    expect(deploy.takeEvents()).toEqual([
      "curl http://127.0.0.1:8787/.well-known/jwks.json",
      ...INSTALLED_AND_RESTARTED,
      ...API_CHECKS,
    ]);
  }, 45_000);

  it("stops before replacing anything while main has a commit origin's main doesn't", () => {
    const deploy = setup();
    deploy.commit("not pushed");
    const run = deploy.run();
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("origin's main");
    expect(deploy.takeEvents()).toEqual([]);
    expect(deploy.published()).toBe("previous API\n");
  }, 45_000);

  it("stops before replacing anything while an ID from publish-sui.mjs is blank", () => {
    for (const key of PACKAGE_ID_KEYS) {
      const deploy = setup(PUBLISHED_API_ENV.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=`));
      const run = deploy.run();
      expect(run.status, key).not.toBe(0);
      expect(run.stderr).toContain(key);
      expect(deploy.takeEvents()).toEqual([]);
      expect(deploy.published()).toBe("previous API\n");
    }
  }, 45_000);
});

describe("coordinated protected release", () => {
  it("reloads the changed secret in both services during a second same-build release", () => {
    const deploy = setup();
    const first = deploy.runRelease();
    expect(first.status, first.stderr).toBe(0);
    expect(deploy.servicesLoadedSecret("a".repeat(64))).toBe(true);
    deploy.takeEvents();
    const second = deploy.runRelease({ PRIVY_JWT_INTERNAL_SECRET: "b".repeat(64) });
    expect(second.status, second.stderr).toBe(0);
    expect(deploy.servicesLoadedSecret("b".repeat(64))).toBe(true);
    expect(deploy.takeEvents()).toContain("restart");
  }, 45_000);
  it("checks issuer before API publication and publishes frontend last", () => {
    const deploy = setup();
    const result = deploy.runRelease();
    expect(result.status, result.stderr).toBe(0);
    expect(deploy.authPublished()).toBe("new auth\n");
    expect(deploy.published()).toBe("new API\n");
    expect(deploy.frontendPublished()).toBe("new frontend\n");
    const events = deploy.takeEvents();
    expect(events.indexOf("curl http://127.0.0.1:8787/.well-known/jwks.json")).toBeLessThan(
      events.indexOf("npm install"),
    );
    expect(events.indexOf(`curl ${DEPLOY_URL}/api/me`)).toBeLessThan(
      events.indexOf("curl http://127.0.0.1:3003/"),
    );
  }, 45_000);
  it("leaves a legacy anonymous issuer stopped with persistent recovery instructions", () => {
    const deploy = setup();
    deploy.legacyAuth();
    const result = deploy.runRelease({ TEST_FAIL_STAGE: "api" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Auth remains stopped");
    expect(deploy.recoveryRequired()).toContain("install protected auth before sign-in recovery");
    const events = deploy.takeEvents();
    expect(events.filter((event) => event === "restart sticker-auth")).toHaveLength(1);
    expect(events).toContain("stop sticker-auth");
    expect(events).toContain("disable sticker-auth");
  }, 45_000);
  it.each(["issuer", "api", "frontend"])(
    "restores previous service/build set after %s failure",
    (stage) => {
      const deploy = setup();
      const result = deploy.runRelease({ TEST_FAIL_STAGE: stage });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("restoring previous service/build set");
      expect(deploy.authPublished()).toBe("previous auth\n");
      expect(deploy.published()).toBe("previous API\n");
      expect(deploy.frontendPublished()).toBe("previous frontend\n");
    },
    45_000,
  );
});
