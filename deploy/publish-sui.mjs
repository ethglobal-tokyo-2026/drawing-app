#!/usr/bin/env node
// deploy/publish-sui.mjs: publishes contracts/sui-sticker-contract/stickers on Sui, names the server
// in its ServerConfig and creates the stickers' Display; --set-image-host moves Display's image host
// later. Run it once per network, and with --set-image-host when CDN_BASE_URL moves. It simulates
// unless given --publish. `node deploy/publish-sui.mjs --help` lists its settings.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";
import { ObjectError } from "@mysten/sui/client";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import {
  MIST_PER_SUI,
  deriveObjectID,
  fromBase64,
  isValidSuiAddress,
  normalizeStructTag,
  normalizeSuiAddress,
  toBase64,
} from "@mysten/sui/utils";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PACKAGE_DIR = join(ROOT, "contracts/sui-sticker-contract/stickers");
const DRAWING_API_ENV = join(ROOT, "deploy/drawing-api.env");
const LIFF_SOURCE = join(ROOT, "apps/frontend/src/line/liff.ts");
const SHINAMI_GAS_URL = "https://api.us1.shinami.com/sui/gas/v1";
/** The system DisplayRegistry, which every type's Display derives from. */
const DISPLAY_REGISTRY_ID = normalizeSuiAddress("0xd");
const NETWORKS = ["testnet", "mainnet", "devnet"];

/** How long one request to Sui or Shinami may take. */
const REQUEST_TIMEOUT_MS = 30_000;
/** How long Sui may take to show a transaction it ran. */
const LANDING_TIMEOUT_MS = 60_000;
/** How long the Sui CLI's build may take: a first build fetches the framework. */
const BUILD_TIMEOUT_MS = 10 * 60_000;

const USAGE = `Usage:
  node deploy/publish-sui.mjs [--publish] [--server <address>] [--image-host <url>]
  node deploy/publish-sui.mjs --set-image-host <url> [--publish]

The first publishes the stickers package, then names the server in ServerConfig and creates the
stickers' Display; it prints the IDs for deploy/drawing-api.env and apps/api/.env.example. The second
points Display's image_url at another image host. Both simulate unless given --publish.

Settings come from the environment, over the env file the other deploy scripts read (DEPLOY_ENV_FILE,
else deploy/.env), over deploy/drawing-api.env:
  SUI_DEPLOYER_PRIVATE_KEY  Ed25519 suiprivkey…: sends everything, and keeps the UpgradeCap, AdminCap
                            and DisplayCap
  SUI_SERVER_PRIVATE_KEY    Ed25519 suiprivkey…: ServerConfig names its address (--server overrides)
  SHINAMI_ACCESS_KEY        optional: Shinami's Gas Station pays when it takes the transaction,
                            otherwise the deployer pays
  CDN_BASE_URL              the image host Display's image_url starts with (--image-host overrides)
  SUI_NETWORK               testnet, mainnet or devnet
  SUI_STICKER_PACKAGE       for --set-image-host: the package publishing printed
`;

/** A refusal the operator acts on, printed without a stack. */
class Refusal extends Error {
  name = "Refusal";
}

/** @param {string} line */
function log(line) {
  process.stderr.write(`${line}\n`);
}

/** @param {unknown} error */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Rejects once `promise` has run `ms`, for work that takes no abort signal. The work itself may
 * still finish; the script exits on the rejection.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} what
 * @returns {Promise<T>}
 */
function withTimeout(promise, ms, what) {
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  /** @type {Promise<never>} */
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} took longer than ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** @param {string} path */
function shown(path) {
  const inRepo = relative(ROOT, path);
  return inRepo.startsWith("..") ? path : inRepo;
}

function readArgs() {
  try {
    const { values } = parseArgs({
      options: {
        publish: { type: "boolean", default: false },
        server: { type: "string" },
        "image-host": { type: "string" },
        "set-image-host": { type: "string" },
        help: { type: "boolean", short: "h", default: false },
      },
      strict: true,
      allowPositionals: false,
    });
    if (values["set-image-host"] !== undefined && (values.server ?? values["image-host"])) {
      throw new Error("--set-image-host takes no --server or --image-host");
    }
    return values;
  } catch (error) {
    throw new Refusal(`${messageOf(error)}\n\n${USAGE}`);
  }
}

/**
 * The environment, over the env file, over drawing-api.env's public settings. The env file is the
 * one deploy.sh reads; DEPLOY_ENV_FILE, when set, must name one that exists.
 * @returns {NodeJS.Dict<string>}
 */
function readSettings() {
  const named = process.env.DEPLOY_ENV_FILE;
  const envFile = resolve(named ?? join(ROOT, "deploy/.env"));
  /** @type {NodeJS.Dict<string>} */
  let fromFile = {};
  if (existsSync(envFile)) {
    fromFile = parseEnv(readFileSync(envFile, "utf8"));
    log(`→ settings: the environment, ${shown(envFile)} and ${shown(DRAWING_API_ENV)}`);
  } else if (named !== undefined) {
    throw new Refusal(`DEPLOY_ENV_FILE names ${envFile}, which doesn't exist`);
  } else {
    log(`→ settings: the environment and ${shown(DRAWING_API_ENV)}; there's no deploy/.env`);
  }
  return { ...parseEnv(readFileSync(DRAWING_API_ENV, "utf8")), ...fromFile, ...process.env };
}

/**
 * The keypair a `suiprivkey…` setting holds. No message here quotes the setting: the decoder's own
 * errors can echo the key.
 * @param {NodeJS.Dict<string>} settings
 * @param {string} name
 */
function keypairFrom(settings, name) {
  const value = settings[name];
  if (!value)
    throw new Refusal(`set ${name}, a suiprivkey… key, in deploy/.env or the environment`);
  /** @type {ReturnType<typeof decodeSuiPrivateKey>} */
  let decoded;
  try {
    decoded = decodeSuiPrivateKey(value);
  } catch {
    throw new Refusal(`${name} isn't a suiprivkey… key`);
  }
  if (decoded.scheme !== "ED25519") {
    throw new Refusal(`${name} is a ${decoded.scheme} key; use an Ed25519 one`);
  }
  try {
    return Ed25519Keypair.fromSecretKey(decoded.secretKey);
  } catch {
    throw new Refusal(`${name} isn't a valid Ed25519 key`);
  }
}

/**
 * @param {NodeJS.Dict<string>} settings
 * @param {string | undefined} flag
 */
function serverAddress(settings, flag) {
  if (flag === undefined) return keypairFrom(settings, "SUI_SERVER_PRIVATE_KEY").toSuiAddress();
  if (!/^0x[0-9a-fA-F]{64}$/.test(flag)) {
    throw new Refusal(`--server ${flag} isn't a Sui address: 0x and 64 hex digits`);
  }
  return normalizeSuiAddress(flag);
}

/**
 * Display's image_url: the image host, then the sticker's image file name.
 * @param {string | undefined} host
 */
function imageUrlTemplate(host) {
  if (!host) throw new Refusal("set CDN_BASE_URL in deploy/drawing-api.env, or pass --image-host");
  const url = URL.parse(host);
  if (url?.protocol !== "https:" || url.search || url.hash || /[{}]/.test(host)) {
    throw new Refusal(`the image host must be an https URL without a query: ${host}`);
  }
  return `${host.replace(/\/+$/, "")}/{image}`;
}

/** The LIFF app's ID, as the app sets it. */
function liffId() {
  const match = /export const LIFF_ID =[^;]*"(\d+-\w+)"/.exec(readFileSync(LIFF_SOURCE, "utf8"));
  if (!match?.[1])
    throw new Refusal(`${shown(LIFF_SOURCE)} no longer sets LIFF_ID to a literal ID`);
  return match[1];
}

/**
 * The package's modules, base64, and the packages they link to, from the Sui CLI.
 * @returns {{ modules: string[], dependencies: string[] }}
 */
function buildPackage() {
  log(`→ sui move build --dump-bytecode-as-base64 --path ${shown(PACKAGE_DIR)}`);
  /** @type {string} */
  let output;
  try {
    output = execFileSync(
      "sui",
      ["move", "build", "--dump-bytecode-as-base64", "--path", PACKAGE_DIR],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
        timeout: BUILD_TIMEOUT_MS,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    if (code === "ENOENT") throw new Refusal("the Sui CLI isn't installed: there's no sui on PATH");
    if (code === "ETIMEDOUT") {
      throw new Refusal(`sui move build ran past ${BUILD_TIMEOUT_MS / 60_000} minutes`);
    }
    throw new Refusal("sui move build failed; its output is above");
  }
  const json = output.split("\n").findLast((line) => line.startsWith("{"));
  /** @type {unknown} */
  let built;
  try {
    built = JSON.parse(json ?? "");
  } catch {
    throw new Refusal(`sui move build printed no bytecode:\n${output}`);
  }
  const fields = typeof built === "object" && built !== null ? built : {};
  const modules = "modules" in fields ? fields.modules : undefined;
  const dependencies = "dependencies" in fields ? fields.dependencies : undefined;
  if (!isStrings(modules) || modules.length === 0 || !isStrings(dependencies)) {
    throw new Refusal(
      `sui move build printed something other than modules and dependencies:\n${json}`,
    );
  }
  log(`✓ built ${modules.length} modules, linked to ${dependencies.join(", ")}`);
  return {
    modules,
    dependencies: dependencies.map((dependency) => normalizeSuiAddress(dependency)),
  };
}

/**
 * @param {unknown} value
 * @returns {value is string[]}
 */
function isStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** @param {{ computationCost: string, storageCost: string, storageRebate: string }} gas */
function costOf(gas) {
  return BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate);
}

/** @param {bigint} mist */
function inSui(mist) {
  const sign = mist < 0n ? "-" : "";
  const abs = mist < 0n ? -mist : mist;
  const fraction = (abs % MIST_PER_SUI).toString().padStart(9, "0").replace(/0+$/, "");
  return `${sign}${abs / MIST_PER_SUI}${fraction ? `.${fraction}` : ""} SUI`;
}

/** @param {string} packageId */
function stickerType(packageId) {
  return `${normalizeSuiAddress(packageId)}::sticker::Sticker`;
}

/**
 * Whether `type`, as Sui reports it, is the struct type `expected`.
 * @param {string | undefined} type
 * @param {string} expected
 */
function isType(type, expected) {
  // A package's type isn't a struct type.
  if (!type?.includes("::")) return false;
  return normalizeStructTag(type) === normalizeStructTag(expected);
}

/**
 * The objects a transaction created, with their types.
 * @typedef {{
 *   digest: string,
 *   effects: { changedObjects: { objectId: string, idOperation: string, outputState: string }[] },
 *   objectTypes: Record<string, string>,
 * }} Executed
 */

/**
 * The one object `executed` created whose type `matches`.
 * @param {Executed} executed
 * @param {string} what
 * @param {(type: string | undefined) => boolean} matches
 */
function created(executed, what, matches) {
  const found = executed.effects.changedObjects.filter(
    (change) => change.idOperation === "Created" && matches(executed.objectTypes[change.objectId]),
  );
  const [object] = found;
  if (!object || found.length > 1) {
    throw new Error(`${executed.digest} created ${found.length} ${what}, not one`);
  }
  log(`  ${what}: ${object.objectId}`);
  return object.objectId;
}

/**
 * Where Display<Sticker> is: the registry derives each type's Display from the type.
 * @param {string} packageId
 */
function displayId(packageId) {
  return deriveObjectID(
    DISPLAY_REGISTRY_ID,
    `0x2::display_registry::DisplayKey<${stickerType(packageId)}>`,
    // The BCS of a key with no fields: the one `false` the compiler gives it.
    new Uint8Array([0]),
  );
}

/**
 * The chain this run talks to, and who signs.
 * @typedef {{
 *   client: SuiGrpcClient,
 *   deployer: Ed25519Keypair,
 *   shinamiKey: string | undefined,
 *   send: boolean,
 * }} Chain
 */

/**
 * Asks Shinami's Gas Station to sponsor a transaction kind for `sender`. Answers the sponsored bytes
 * and Shinami's signature, or why it didn't sponsor; a key Shinami rejects stops the script.
 * @param {string} key
 * @param {Uint8Array} kind
 * @param {string} sender
 * @returns {Promise<{ txBytes: string, signature: string } | { refused: string }>}
 */
async function askShinami(key, kind, sender) {
  /** @type {Response} */
  let response;
  try {
    response = await fetch(SHINAMI_GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "gas_sponsorTransactionBlock",
        params: [toBase64(kind), sender],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return { refused: `Shinami didn't answer: ${messageOf(error)}` };
  }
  if (response.status === 401 || response.status === 403) {
    throw new Refusal(`Shinami rejected SHINAMI_ACCESS_KEY (HTTP ${response.status})`);
  }
  if (!response.ok) return { refused: `Shinami answered HTTP ${response.status}` };
  /** @type {unknown} */
  let body;
  try {
    body = await response.json();
  } catch (error) {
    return { refused: `Shinami's answer wasn't JSON: ${messageOf(error)}` };
  }
  const answer = typeof body === "object" && body !== null ? body : {};
  // JSON-RPC errors come over HTTP 200: a refused dry run, no gas object, a low fund, a rate limit.
  if ("error" in answer) return { refused: `Shinami refused it: ${JSON.stringify(answer.error)}` };
  const result = "result" in answer && typeof answer.result === "object" ? answer.result : null;
  const txBytes = result && "txBytes" in result ? result.txBytes : undefined;
  const signature = result && "signature" in result ? result.signature : undefined;
  if (typeof txBytes !== "string" || typeof signature !== "string") {
    return { refused: "Shinami answered without the sponsored bytes and its signature" };
  }
  return { txBytes, signature };
}

/**
 * Shinami's sponsorship of `tx`, once its bytes are checked to be `tx` with gas from someone else,
 * since the deployer signs them. Null when Shinami isn't set or didn't sponsor it.
 * @param {Chain} chain
 * @param {Transaction} tx
 * @param {string} what
 * @returns {Promise<{ bytes: Uint8Array, signature: string } | null>}
 */
async function sponsorship(chain, tx, what) {
  if (!chain.shinamiKey) return null;
  const sender = chain.deployer.toSuiAddress();
  const kind = await withTimeout(
    tx.build({ client: chain.client, onlyTransactionKind: true }),
    REQUEST_TIMEOUT_MS,
    `building ${what}`,
  );
  const answer = await askShinami(chain.shinamiKey, kind, sender);
  if ("refused" in answer) {
    log(`⚠ ${what}: ${answer.refused}`);
    return null;
  }
  const bytes = fromBase64(answer.txBytes);
  const sponsored = Transaction.from(bytes);
  const { sender: sponsoredSender, gasData } = sponsored.getData();
  const sponsoredKind = await sponsored.build({ onlyTransactionKind: true });
  if (
    !sponsoredSender ||
    normalizeSuiAddress(sponsoredSender) !== sender ||
    !gasData.owner ||
    normalizeSuiAddress(gasData.owner) === sender ||
    !Buffer.from(sponsoredKind).equals(Buffer.from(kind))
  ) {
    throw new Error(`Shinami sponsored another transaction than ${what}; nothing was signed`);
  }
  return { bytes, signature: answer.signature };
}

/**
 * Sends `tx` from the deployer, sponsored by Shinami when it takes it, otherwise paid by the
 * deployer. Answers the transaction once Sui shows it.
 * @param {Chain} chain
 * @param {Transaction} tx
 * @param {string} what
 */
async function send(chain, tx, what) {
  const { client, deployer } = chain;
  tx.setSender(deployer.toSuiAddress());
  const sponsored = await sponsorship(chain, tx, what);
  log(`→ sending ${what}; ${sponsored ? "Shinami" : "the deployer"} pays`);
  const bytes =
    sponsored?.bytes ??
    (await withTimeout(tx.build({ client }), REQUEST_TIMEOUT_MS, `building ${what}`));
  const { signature } = await deployer.signTransaction(bytes);
  const result = await client.executeTransaction({
    transaction: bytes,
    signatures: sponsored ? [signature, sponsored.signature] : [signature],
    include: { effects: true, objectTypes: true },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const executed = result.Transaction ?? result.FailedTransaction;
  if (!executed.status.success) {
    throw new Error(`${what} failed (${executed.digest}): ${executed.status.error.message}`);
  }
  log(`✓ ${what}: ${executed.digest}, which cost ${inSui(costOf(executed.effects.gasUsed))}`);
  await client.waitForTransaction({ digest: executed.digest, timeout: LANDING_TIMEOUT_MS });
  return executed;
}

/**
 * Simulates `tx` from the deployer, with gas Sui stands in for, so the deployer needn't hold any.
 * Answers what it would cost.
 * @param {Chain} chain
 * @param {Transaction} tx
 * @param {string} what
 */
async function simulate(chain, tx, what) {
  tx.setSender(chain.deployer.toSuiAddress());
  const result = await chain.client.simulateTransaction({
    transaction: tx,
    include: { effects: true },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const simulated = result.Transaction ?? result.FailedTransaction;
  if (!simulated.status.success) {
    throw new Refusal(`${what} would fail: ${simulated.status.error.message}`);
  }
  const cost = costOf(simulated.effects.gasUsed);
  log(`✓ simulated ${what}: it would cost ${inSui(cost)}`);
  return cost;
}

/**
 * Publishes the package, then names the server and creates the Display, and prints the IDs the
 * API reads.
 * @param {Chain} chain
 * @param {string} server
 * @param {Record<string, string>} fields
 */
async function publish(chain, server, fields) {
  const deployer = chain.deployer.toSuiAddress();
  log(`→ ServerConfig will name ${server}`);
  for (const [name, value] of Object.entries(fields)) log(`→ Display's ${name}: ${value}`);
  const tx = new Transaction();
  tx.transferObjects([tx.publish(buildPackage())], deployer);

  if (!chain.send) {
    const cost = await simulate(chain, tx, "the publish");
    if (chain.shinamiKey) {
      log("→ asking Shinami to sponsor the publish; its sponsorship lapses unused");
      if (await sponsorship(chain, tx, "the publish")) log("✓ Shinami sponsors the publish");
    }
    const { balance } = await chain.client.getBalance({
      owner: deployer,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const held = BigInt(balance.balance);
    log(`→ the deployer holds ${inSui(held)}${held < cost ? ", less than the publish costs" : ""}`);
    log(
      "→ naming the server and creating the Display follow the publish. They call the new package,",
    );
    log("  so they can't be simulated before it exists. Nothing was sent; --publish sends.");
    return;
  }

  const published = await send(chain, tx, "the publish");
  const packageId = published.effects.changedObjects.find(
    (change) => change.idOperation === "Created" && change.outputState === "PackageWrite",
  )?.objectId;
  if (!packageId) throw new Error(`${published.digest} published no package`);
  log(`  package: ${packageId}`);
  /** @type {(type: string) => string} */
  const createdOf = (expected) =>
    created(published, expected, (type) => isType(type, `${packageId}::${expected}`));
  const ids = {
    SUI_STICKER_PACKAGE: packageId,
    SUI_STICKER_REGISTRY: createdOf("sticker::StickerRegistry"),
    SUI_SERVER_CONFIG: createdOf("sticker::ServerConfig"),
    SUI_GIFT_ESCROW: createdOf("gift::Escrow"),
  };
  const adminCap = createdOf("sticker::AdminCap");
  created(published, "UpgradeCap", (type) => isType(type, "0x2::package::UpgradeCap"));

  try {
    const setup = new Transaction();
    setup.moveCall({
      target: `${packageId}::sticker::set_server`,
      arguments: [
        setup.object(adminCap),
        setup.object(ids.SUI_SERVER_CONFIG),
        setup.pure.address(server),
      ],
    });
    const displayCap = setup.moveCall({
      target: `${packageId}::sticker::create_display`,
      arguments: [
        setup.object(adminCap),
        setup.object(DISPLAY_REGISTRY_ID),
        setup.pure.vector("string", Object.keys(fields)),
        setup.pure.vector("string", Object.values(fields)),
      ],
    });
    setup.transferObjects([displayCap], deployer);
    const named = await send(chain, setup, "naming the server and creating the Display");
    const type = stickerType(packageId);
    const display = created(named, "Display<Sticker>", (found) =>
      isType(found, `0x2::display_registry::Display<${type}>`),
    );
    created(named, "DisplayCap<Sticker>", (found) =>
      isType(found, `0x2::display_registry::DisplayCap<${type}>`),
    );
    if (display !== displayId(packageId)) {
      log(
        `⚠ --set-image-host derives Display<Sticker> at ${displayId(packageId)}, not where it is:`,
      );
      log("  fix displayId() in this script before using --set-image-host");
    }
  } catch (error) {
    throw new Error(
      `the package is published at ${packageId}, but naming the server and creating the Display` +
        ` didn't finish. Publish again for a package that's set up; this one stays unused.` +
        `\n${messageOf(error)}`,
    );
  }

  log(`✓ for ${shown(DRAWING_API_ENV)} and apps/api/.env.example:`);
  for (const [key, value] of Object.entries(ids)) process.stdout.write(`${key}=${value}\n`);
}

/**
 * The DisplayCap for `type`'s Display that the deployer holds, if it holds one.
 * @param {Chain} chain
 * @param {string} type
 */
async function displayCapHeld(chain, type) {
  /** @type {string | null} */
  let cursor = null;
  for (;;) {
    /** @type {import("@mysten/sui/client").SuiClientTypes.ListOwnedObjectsResponse} */
    const page = await chain.client.listOwnedObjects({
      owner: chain.deployer.toSuiAddress(),
      type: "0x2::display_registry::DisplayCap",
      cursor,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const cap = page.objects.find((object) =>
      isType(object.type, `0x2::display_registry::DisplayCap<${type}>`),
    );
    if (cap) return cap.objectId;
    if (!page.hasNextPage) return undefined;
    cursor = page.cursor;
  }
}

/**
 * Points Display's image_url at another image host, with the DisplayCap the deployer holds.
 * @param {Chain} chain
 * @param {string | undefined} packageId
 * @param {string} imageUrl
 */
async function setImageHost(chain, packageId, imageUrl) {
  if (!packageId || !isValidSuiAddress(packageId)) {
    throw new Refusal(
      "set SUI_STICKER_PACKAGE, the package publishing printed, in drawing-api.env",
    );
  }
  const type = stickerType(packageId);
  const cap = await displayCapHeld(chain, type);
  if (!cap) {
    throw new Refusal(
      `the deployer, ${chain.deployer.toSuiAddress()}, holds no DisplayCap<${type}>`,
    );
  }

  const display = displayId(packageId);
  try {
    const { object } = await chain.client.getObject({
      objectId: display,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!isType(object.type, `0x2::display_registry::Display<${type}>`)) {
      throw new Refusal(`${display} is a ${object.type}, not the Display<Sticker>`);
    }
  } catch (error) {
    if (error instanceof ObjectError && error.reason === "notFound") {
      throw new Refusal(`there's no Display<Sticker> at ${display}, where the registry derives it`);
    }
    throw error;
  }
  log(`→ Display<Sticker> ${display}, with the DisplayCap ${cap}`);
  log(`→ image_url: ${imageUrl}`);

  const tx = new Transaction();
  tx.moveCall({
    target: "0x2::display_registry::set",
    typeArguments: [type],
    arguments: [
      tx.object(display),
      tx.object(cap),
      tx.pure.string("image_url"),
      tx.pure.string(imageUrl),
    ],
  });
  if (chain.send) {
    await send(chain, tx, "setting image_url");
    return;
  }
  await simulate(chain, tx, "setting image_url");
  log("→ nothing was sent; --publish sends");
}

async function main() {
  const args = readArgs();
  if (args.help) {
    process.stdout.write(USAGE);
    return;
  }
  const settings = readSettings();
  const network = settings.SUI_NETWORK ?? "testnet";
  if (!NETWORKS.includes(network)) {
    throw new Refusal(`SUI_NETWORK is ${network}, not one of ${NETWORKS.join(", ")}`);
  }
  /** @type {Chain} */
  const chain = {
    client: new SuiGrpcClient({ network, baseUrl: `https://fullnode.${network}.sui.io:443` }),
    deployer: keypairFrom(settings, "SUI_DEPLOYER_PRIVATE_KEY"),
    shinamiKey: settings.SHINAMI_ACCESS_KEY || undefined,
    send: args.publish,
  };
  log(`→ on ${network}, as the deployer ${chain.deployer.toSuiAddress()}`);
  log(chain.send ? "→ --publish: transactions are sent" : "→ simulating: nothing is sent");
  if (args["set-image-host"] !== undefined) {
    await setImageHost(
      chain,
      settings.SUI_STICKER_PACKAGE,
      imageUrlTemplate(args["set-image-host"]),
    );
    return;
  }
  await publish(chain, serverAddress(settings, args.server), {
    name: "Sticker No.{number}",
    description: "A sticker drawn on Croquis.",
    image_url: imageUrlTemplate(args["image-host"] ?? settings.CDN_BASE_URL),
    project_url: `https://liff.line.me/${liffId()}`,
  });
}

try {
  await main();
} catch (error) {
  const shownError =
    error instanceof Refusal || !(error instanceof Error)
      ? messageOf(error)
      : (error.stack ?? error.message);
  log(`✗ ${shownError}`);
  process.exit(1);
}
