#!/usr/bin/env node
// deploy-api.sh runs this on the server to validate and atomically install chain credentials.
import { existsSync, readFileSync, writeFileSync, renameSync, chmodSync } from "node:fs";
import { parseEnv } from "node:util";

const [chainPath, mode] = process.argv.slice(2);
if (!chainPath || !mode || !["check", "install"].includes(mode)) {
  throw new Error("Expected chain.env path, and check or install");
}
/** @type {NodeJS.Dict<string>} */
const values = existsSync(chainPath) ? parseEnv(readFileSync(chainPath, "utf8")) : {};
const supplied = parseEnv(readFileSync(0, "utf8"));
for (const [key, value] of Object.entries(supplied)) {
  if (value) values[key] = value;
}
values.STICKER_CHAIN_MODE = "sepolia";
const required = [
  "ETHEREUM_SEPOLIA_RPC_URL",
  "STICKER_NFT_ADDRESS",
  "STICKER_GIFT_ESCROW_ADDRESS",
  "STICKER_SEALER_PRIVATE_KEY",
  "CROQUIS_NAMES_ADDRESS",
  "CROQUIS_RESOLVER_ADDRESS",
  "ENS_GATEWAY_PRIVATE_KEY",
  "PRIVY_APP_ID",
  "PRIVY_APP_SECRET",
];
for (const key of required) {
  const value = values[key];
  if (!value || /replace-with|your-|placeholder/i.test(value) || /[\r\n]/.test(value)) {
    throw new Error(`Missing or invalid ${key}; configure deploy/.env or the server's chain.env`);
  }
}
for (const key of [
  "STICKER_NFT_ADDRESS",
  "STICKER_GIFT_ESCROW_ADDRESS",
  "CROQUIS_NAMES_ADDRESS",
  "CROQUIS_RESOLVER_ADDRESS",
]) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(values[key] ?? "")) throw new Error(`Invalid ${key}`);
}
for (const key of ["STICKER_SEALER_PRIVATE_KEY", "ENS_GATEWAY_PRIVATE_KEY"]) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(values[key] ?? "")) throw new Error(`Invalid ${key}`);
}
// The chat menu's Messaging API channel, optional: without it the API links no chat menu.
const lineChannelId = values.LINE_MESSAGING_CHANNEL_ID ?? "";
const lineChannelSecret = values.LINE_MESSAGING_CHANNEL_SECRET ?? "";
if (lineChannelId || lineChannelSecret) {
  if (!/^\d+$/.test(lineChannelId)) throw new Error("Missing or invalid LINE_MESSAGING_CHANNEL_ID");
  if (!/^[0-9a-f]{32}$/.test(lineChannelSecret)) {
    throw new Error("Missing or invalid LINE_MESSAGING_CHANNEL_SECRET");
  }
}
// Age verification's World ID app, optional: without it age verification is off.
const worldId = ["WORLD_ID_APP_ID", "WORLD_ID_RP_ID", "WORLD_ID_SIGNING_KEY"];
if (worldId.some((key) => values[key])) {
  if (!/^app_\w+$/.test(values.WORLD_ID_APP_ID ?? ""))
    throw new Error("Missing or invalid WORLD_ID_APP_ID");
  if (!/^rp_\w+$/.test(values.WORLD_ID_RP_ID ?? ""))
    throw new Error("Missing or invalid WORLD_ID_RP_ID");
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(values.WORLD_ID_SIGNING_KEY ?? "")) {
    throw new Error("Missing or invalid WORLD_ID_SIGNING_KEY");
  }
}
// One URL, or several separated by commas, which the API tries in turn.
const rpcUrls = (values.ETHEREUM_SEPOLIA_RPC_URL ?? "")
  .split(",")
  .map((url) => URL.parse(url.trim()));
if (!rpcUrls.every((url) => url && ["https:", "http:"].includes(url.protocol)))
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
