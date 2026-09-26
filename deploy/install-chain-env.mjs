#!/usr/bin/env node
// deploy-api.sh runs this on the server to validate and atomically install chain credentials.
import { existsSync, readFileSync, writeFileSync, renameSync, chmodSync } from "node:fs";
import { parseEnv } from "node:util";

const [chainPath, authPath, mode] = process.argv.slice(2);
if (!chainPath || !authPath || !mode || !["check", "install"].includes(mode)) {
  throw new Error("Expected chain.env path, auth secrets path, and check or install");
}
/** @param {string} path @returns {NodeJS.Dict<string>} */
const readEnv = (path) => (existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {});
const values = readEnv(chainPath);
const supplied = parseEnv(readFileSync(0, "utf8"));
for (const [key, value] of Object.entries(supplied)) {
  if (value) values[key] = value;
}
values.PRIVY_APP_SECRET ||= readEnv(authPath).PRIVY_APP_SECRET ?? "";
values.STICKER_CHAIN_MODE = "sepolia";
const required = [
  "ETHEREUM_SEPOLIA_RPC_URL",
  "STICKER_NFT_ADDRESS",
  "STICKER_GIFT_ESCROW_ADDRESS",
  "STICKER_SEALER_PRIVATE_KEY",
  "PRIVY_APP_ID",
  "PRIVY_APP_SECRET",
];
for (const key of required) {
  const value = values[key];
  if (!value || /replace-with|your-|placeholder/i.test(value) || /[\r\n]/.test(value)) {
    throw new Error(`Missing or invalid ${key}; configure deploy/.env or the server's chain.env`);
  }
}
for (const key of ["STICKER_NFT_ADDRESS", "STICKER_GIFT_ESCROW_ADDRESS"]) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(values[key] ?? "")) throw new Error(`Invalid ${key}`);
}
if (!/^0x[0-9a-fA-F]{64}$/.test(values.STICKER_SEALER_PRIVATE_KEY ?? ""))
  throw new Error("Invalid STICKER_SEALER_PRIVATE_KEY");
const rpcUrl = URL.parse(values.ETHEREUM_SEPOLIA_RPC_URL ?? "");
if (!rpcUrl || !["https:", "http:"].includes(rpcUrl.protocol))
  throw new Error("Invalid ETHEREUM_SEPOLIA_RPC_URL");
if (mode === "check") {
  console.log("Sepolia configuration is complete");
} else {
  const contents =
    Object.keys(values)
      .sort()
      .map((key) => `${key}=${JSON.stringify(values[key])}`)
      .join("\n") + "\n";
  if (!existsSync(chainPath) || readFileSync(chainPath, "utf8") !== contents) {
    writeFileSync(`${chainPath}.new`, contents, { mode: 0o600 });
    chmodSync(`${chainPath}.new`, 0o600);
    renameSync(`${chainPath}.new`, chainPath);
    console.log("installed chain.env");
  }
  chmodSync(chainPath, 0o600);
}
