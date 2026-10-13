#!/usr/bin/env node
// Back up only service assets; mutable databases/images and the auth signing key never move.
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
const [mode, snapshot, api, auth, frontend] = process.argv.slice(2);
if (
  !snapshot ||
  !api ||
  !auth ||
  !frontend ||
  !mode ||
  !["save", "restore", "check-auth"].includes(mode)
)
  throw new Error("Expected save/restore and snapshot/API/auth/frontend directories");
if (mode === "check-auth") {
  let protectedAuth = false;
  try {
    /** @type {unknown} */
    const metadata = JSON.parse(readFileSync(join(auth, "server/package.json"), "utf8"));
    protectedAuth =
      typeof metadata === "object" &&
      metadata !== null &&
      Reflect.get(metadata, "croquisPrivyIssuance") === "session";
  } catch {
    /* Missing or invalid artifact metadata cannot authorize restarting the issuer. */
  }
  if (!protectedAuth) {
    const message =
      "Previous auth artifact predates protected issuance. Auth remains stopped; install protected auth before sign-in recovery.\n";
    mkdirSync(auth, { recursive: true });
    writeFileSync(join(auth, "issuance-recovery-required"), message, { mode: 0o600 });
    chmodSync(join(auth, "issuance-recovery-required"), 0o600);
    process.stderr.write(message);
    process.exit(1);
  }
  console.log("previous auth artifact permits session-authorized issuance only");
  process.exit(0);
}
const roots = [api, auth, frontend];
if (
  new Set(roots.map((root) => resolve(root))).size !== 3 ||
  roots.some(
    (root) =>
      resolve(snapshot) === resolve(root) || resolve(snapshot).startsWith(`${resolve(root)}/`),
  )
)
  throw new Error("Release snapshot directories must be separate");
const files = [
  [
    "server",
    "drizzle",
    "api.env",
    "chain.env",
    "privy-internal.env",
    "drawing-api.service",
    "line-menus.json",
  ],
  ["server", "auth.env", "privy-internal.env", "sticker-auth.service"],
  ["site", "serve.py", "sticker-board.service"],
];
if (mode === "save") {
  mkdirSync(snapshot, { recursive: false, mode: 0o700 });
  chmodSync(snapshot, 0o700);
} else if (!existsSync(join(snapshot, "complete")))
  throw new Error("Release snapshot is incomplete; refusing restore");
for (const [index, root] of roots.entries()) {
  const backup = join(snapshot, String(index));
  if (mode === "save") mkdirSync(backup, { mode: 0o700 });
  for (const file of files[index] ?? []) {
    const current = join(root, file);
    const saved = join(backup, file);
    if (mode === "save") {
      if (existsSync(current))
        cpSync(current, saved, { recursive: true, preserveTimestamps: true });
    } else {
      rmSync(current, { recursive: true, force: true });
      if (existsSync(saved)) cpSync(saved, current, { recursive: true, preserveTimestamps: true });
    }
  }
}
if (mode === "save") mkdirSync(join(snapshot, "complete"), { mode: 0o700 });
console.log(
  mode === "save" ? "saved previous service/build set" : "restored previous service/build set",
);
