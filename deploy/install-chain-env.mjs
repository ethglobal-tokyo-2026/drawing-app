#!/usr/bin/env node
// deploy-api.sh runs this on the server to validate and atomically install the REST API's chain.env: exactly the
// keys below, each required one, and each optional one that's set. It merges nothing from the file already there, so
// a key the API stopped reading leaves the box with the next deploy.
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";

const [chainPath, mode] = process.argv.slice(2);
if (!chainPath || !mode || !["check", "install"].includes(mode)) {
  throw new Error("Expected chain.env path, and check or install");
}
const supplied = parseEnv(readFileSync(0, "utf8"));
// What each key must look like. Every value must also be one line that isn't a placeholder.
const required = {
  // Bech32, as `sui keytool generate ed25519` writes it.
  SUI_SERVER_PRIVATE_KEY: /^suiprivkey1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{59}$/,
  SHINAMI_ACCESS_KEY: /./,
  PRIVY_APP_ID: /./,
  PRIVY_APP_SECRET: /./,
  LINE_MESSAGING_CHANNEL_ID: /^\d+$/,
  LINE_MESSAGING_CHANNEL_SECRET: /^[0-9a-f]{32}$/,
  FASTLY_API_TOKEN: /./,
};
const optional = {
  // Who the CDN cap tells in LINE. Without it the cap still pauses the site, and logs what it couldn't tell.
  OPERATOR_LINE_USER_ID: /^U[0-9a-f]{32}$/,
};
/** @type {Record<string, string>} */
const values = { STICKER_CHAIN_MODE: "sui" };
for (const [key, shape] of Object.entries(required)) {
  const value = supplied[key];
  if (
    !value ||
    /replace-with|your-|placeholder/i.test(value) ||
    /[\r\n]/.test(value) ||
    !shape.test(value)
  ) {
    throw new Error(`Missing or invalid ${key}; configure deploy/.env`);
  }
  values[key] = value;
}
for (const [key, shape] of Object.entries(optional)) {
  const value = supplied[key];
  if (!value) continue;
  if (/replace-with|your-|placeholder/i.test(value) || /[\r\n]/.test(value) || !shape.test(value)) {
    throw new Error(`Invalid ${key}; configure deploy/.env`);
  }
  values[key] = value;
}
if (mode === "check") {
  console.log("chain configuration is complete");
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
