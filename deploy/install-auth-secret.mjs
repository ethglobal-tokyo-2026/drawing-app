#!/usr/bin/env node
// Install only the shared internal secret; the signing key stays exclusively in the auth directory.
import { chmodSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
const [apiPath, authPath, mode] = process.argv.slice(2);
if (
  !apiPath ||
  !authPath ||
  !mode ||
  apiPath === authPath ||
  !["check", "install", "verify"].includes(mode)
)
  throw new Error("Expected separate API/auth private paths and check or install");
let supplied;
try {
  supplied = parseEnv(readFileSync(0, "utf8"));
} catch {
  throw new Error("Invalid internal secret environment input");
}
const secret = supplied.PRIVY_JWT_INTERNAL_SECRET;
if (
  !secret ||
  !/^[A-Za-z0-9_-]{32,}$/.test(secret) ||
  /replace-with|placeholder|your-/i.test(secret)
)
  throw new Error("Missing or invalid PRIVY_JWT_INTERNAL_SECRET; configure deploy/.env");
if (mode === "check") console.log("internal authentication configuration is complete");
else if (mode === "verify") {
  const expected = `PRIVY_JWT_INTERNAL_SECRET=${JSON.stringify(secret)}\n`;
  if (
    ![apiPath, authPath].every(
      (path) => existsSync(path) && readFileSync(path, "utf8") === expected,
    )
  )
    throw new Error("Protected issuer configuration differs; use coordinated deploy.sh");
  console.log("protected service authentication files match");
} else {
  const contents = `PRIVY_JWT_INTERNAL_SECRET=${JSON.stringify(secret)}\n`;
  const paths = [apiPath, authPath];
  const previous = paths.map((path) => (existsSync(path) ? readFileSync(path) : null));
  try {
    for (const path of paths) {
      writeFileSync(`${path}.new`, contents, { mode: 0o600 });
      chmodSync(`${path}.new`, 0o600);
    }
    for (const path of paths) renameSync(`${path}.new`, path);
  } catch {
    for (const [index, path] of paths.entries()) {
      rmSync(`${path}.new`, { force: true });
      const value = previous[index];
      if (value) {
        writeFileSync(path, value, { mode: 0o600 });
        chmodSync(path, 0o600);
      } else rmSync(path, { force: true });
    }
    throw new Error("Internal authentication secret installation failed; previous files restored");
  }
  console.log("installed private internal authentication files");
}
