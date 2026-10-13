import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it, onTestFinished } from "vitest";
const script = fileURLToPath(new URL("../../../deploy/install-auth-secret.mjs", import.meta.url));
function setup() {
  const directory = mkdtempSync(join(tmpdir(), "privy-secret-test-"));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const api = join(directory, "api.env");
  const auth = join(directory, "auth.env");
  return {
    api,
    auth,
    run: (input: string, mode = "install") =>
      spawnSync(process.execPath, [script, api, auth, mode], {
        input,
        encoding: "utf8",
        timeout: 5000,
      }),
  };
}
it("installs only the shared secret in separate private files", () => {
  const fixture = setup();
  const secret = "a".repeat(64);
  const result = fixture.run(
    `PRIVY_JWT_INTERNAL_SECRET=${secret}\nAUTH_SIGNING_KEY_FILE=forbidden\n`,
  );
  expect(result.status, result.stderr).toBe(0);
  for (const file of [fixture.api, fixture.auth]) {
    expect(readFileSync(file, "utf8")).toBe(`PRIVY_JWT_INTERNAL_SECRET="${secret}"\n`);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  }
  expect(result.stdout + result.stderr).not.toContain(secret);
});
it.each([
  "",
  "PRIVY_JWT_INTERNAL_SECRET=short\n",
  "PRIVY_JWT_INTERNAL_SECRET=replace-with-secret\n",
])("rejects missing or invalid secrets without changing files", (input) => {
  const fixture = setup();
  const result = fixture.run(input);
  expect(result.status).not.toBe(0);
  expect(existsSync(fixture.api)).toBe(false);
  expect(existsSync(fixture.auth)).toBe(false);
  expect(result.stderr).toContain("Missing or invalid PRIVY_JWT_INTERNAL_SECRET");
});
it("validates without creating secret files", () => {
  const fixture = setup();
  expect(fixture.run(`PRIVY_JWT_INTERNAL_SECRET=${"b".repeat(64)}\n`, "check").status).toBe(0);
  expect(existsSync(fixture.api)).toBe(false);
});
