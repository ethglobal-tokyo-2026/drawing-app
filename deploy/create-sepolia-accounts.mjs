#!/usr/bin/env node
/* oxlint-disable typescript/no-unsafe-argument, typescript/no-unsafe-assignment, typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/no-unsafe-return -- This standalone Node script is intentionally outside the app TypeScript projects. */

import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const deployDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(deployDir, ".env");
const foundryCast = resolve(homedir(), ".foundry/bin/cast");
const cast = existsSync(foundryCast) ? foundryCast : "cast";

const privateKeyPattern = /^0x[0-9a-fA-F]{64}$/;

function addressOf(privateKey) {
  return execFileSync(cast, ["wallet", "address", "--private-key", privateKey], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

try {
  execFileSync(cast, ["--version"], { stdio: "ignore" });
} catch {
  throw new Error("Foundry cast is required to create Sepolia accounts");
}

function newAccount() {
  for (;;) {
    const privateKey = `0x${randomBytes(32).toString("hex")}`;
    try {
      return { privateKey, address: addressOf(privateKey) };
    } catch {
      // The secp256k1 range excludes a tiny part of the 256-bit space. Try another value.
    }
  }
}

function currentValue(contents, name) {
  const match = contents.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match?.[1]?.trim() || null;
}

function installValue(contents, name, value) {
  const assignment = `${name}=${value}`;
  const existing = new RegExp(`^${name}=.*$`, "m");
  if (existing.test(contents)) return contents.replace(existing, assignment);
  const separator = contents && !contents.endsWith("\n") ? "\n" : "";
  return `${contents}${separator}${assignment}\n`;
}

function accountFor(contents, name) {
  const value = currentValue(contents, name);
  if (!value) return newAccount();
  if (!privateKeyPattern.test(value)) {
    throw new Error(`${name} in deploy/.env is not a 32-byte private key`);
  }
  return { privateKey: value, address: addressOf(value) };
}

let contents = existsSync(envPath)
  ? readFileSync(envPath, "utf8")
  : "# Local deployment secrets. Never commit this file.\n";
const deployer = accountFor(contents, "DEPLOYER_PRIVATE_KEY");
const sealer = accountFor(contents, "STICKER_SEALER_PRIVATE_KEY");

contents = installValue(contents, "DEPLOYER_PRIVATE_KEY", deployer.privateKey);
contents = installValue(contents, "STICKER_SEALER_PRIVATE_KEY", sealer.privateKey);
writeFileSync(envPath, contents, { mode: 0o600 });
chmodSync(envPath, 0o600);

console.log(`Deployer: ${deployer.address}`);
console.log(`Sealer:   ${sealer.address}`);
console.log("Private keys are stored only in gitignored deploy/.env (mode 600).");
