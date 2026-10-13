import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it, onTestFinished } from "vitest";
const script = fileURLToPath(new URL("../../../deploy/release-snapshot.mjs", import.meta.url));
it("restores the previous coherent service/build set while retaining keys and mutable storage", () => {
  const dir = mkdtempSync(join(tmpdir(), "croquis-release-test-"));
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  const roots = ["api", "auth", "frontend"].map((name) => join(dir, name));
  for (const root of roots) mkdirSync(join(root, "server"), { recursive: true });
  const [api, auth, frontend] = roots;
  if (!api || !auth || !frontend) throw new Error("Fixture directories missing");
  writeFileSync(join(api, "server/server.mjs"), "old-api");
  writeFileSync(join(auth, "server/start-auth-server.js"), "old-auth");
  mkdirSync(join(frontend, "site"));
  writeFileSync(join(frontend, "site/index.html"), "old-frontend");
  writeFileSync(join(auth, "signing-key.pem"), "fixture-key");
  mkdirSync(join(api, "data"));
  writeFileSync(join(api, "data/database"), "initial");
  const run = (mode: string) =>
    spawnSync(process.execPath, [script, mode, join(dir, "snapshot"), ...roots], {
      encoding: "utf8",
      timeout: 5000,
    });
  expect(run("save").status).toBe(0);
  writeFileSync(join(api, "server/server.mjs"), "new-api");
  writeFileSync(join(auth, "server/start-auth-server.js"), "new-auth");
  writeFileSync(join(frontend, "site/index.html"), "new-frontend");
  writeFileSync(join(api, "privy-internal.env"), "new-secret");
  writeFileSync(join(api, "data/database"), "new-state");
  expect(run("restore").status).toBe(0);
  expect(readFileSync(join(api, "server/server.mjs"), "utf8")).toBe("old-api");
  expect(readFileSync(join(auth, "server/start-auth-server.js"), "utf8")).toBe("old-auth");
  expect(readFileSync(join(frontend, "site/index.html"), "utf8")).toBe("old-frontend");
  expect(readFileSync(join(auth, "signing-key.pem"), "utf8")).toBe("fixture-key");
  expect(readFileSync(join(api, "data/database"), "utf8")).toBe("new-state");
});
