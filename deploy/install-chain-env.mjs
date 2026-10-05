#!/usr/bin/env node
// deploy-api.sh runs this on the box. It checks the settings deploy/.env sends on stdin, then installs them atomically
// as chain.env, which holds exactly these and STICKER_CHAIN_MODE=sui, whatever it held before. It prints no value.
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";

const [chainPath, mode] = process.argv.slice(2);
if (!chainPath || !mode || !["check", "install"].includes(mode)) {
  throw new Error("Expected chain.env path, and check or install");
}

/** For values with no published form: one word, without spaces or line breaks. */
const ONE_WORD = /^\S+$/;
/** What chain.env takes from deploy/.env, each with the form its value must have. Every one is required. */
const FORMS = {
  // bech32 of the scheme's flag and the 32-byte key, as `sui keytool export` writes it, with no 1, b, i or o after the
  // prefix. The API checks the checksum.
  SUI_SERVER_PRIVATE_KEY: /^suiprivkey1[02-9ac-hj-np-z]{59}$/,
  SHINAMI_ACCESS_KEY: ONE_WORD,
  PRIVY_APP_ID: ONE_WORD,
  PRIVY_APP_SECRET: ONE_WORD,
  LINE_MESSAGING_CHANNEL_ID: /^\d+$/,
  LINE_MESSAGING_CHANNEL_SECRET: /^[0-9a-f]{32}$/,
};

const supplied = parseEnv(readFileSync(0, "utf8"));
for (const key of Object.keys(supplied)) {
  if (!Object.hasOwn(FORMS, key)) {
    throw new Error(`Unexpected ${key}: chain.env takes only ${Object.keys(FORMS).join(", ")}`);
  }
}
/** @type {Record<string, string>} */
const values = { STICKER_CHAIN_MODE: "sui" };
for (const [key, form] of Object.entries(FORMS)) {
  const value = supplied[key] ?? "";
  if (!form.test(value) || /replace-with|your-|placeholder/i.test(value)) {
    throw new Error(`Missing or invalid ${key}; set it in deploy/.env`);
  }
  values[key] = value;
}

if (mode === "check") {
  console.log("chain.env's settings are complete");
} else {
  const contents =
    Object.keys(values)
      .sort()
      .map((key) => `${key}=${JSON.stringify(values[key])}`)
      .join("\n") + "\n";
  // deploy-api.sh restarts the API when this prints anything, so an unchanged chain.env prints nothing.
  if (!existsSync(chainPath) || readFileSync(chainPath, "utf8") !== contents) {
    writeFileSync(`${chainPath}.new`, contents, { mode: 0o600 });
    chmodSync(`${chainPath}.new`, 0o600);
    renameSync(`${chainPath}.new`, chainPath);
    console.log("installed chain.env");
  }
  chmodSync(chainPath, 0o600);
}
