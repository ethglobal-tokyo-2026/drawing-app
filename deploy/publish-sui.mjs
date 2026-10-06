#!/usr/bin/env node
// deploy/publish-sui.mjs: publishes the stickers package (contracts/sui-sticker-contract/stickers) on Sui,
// names the REST API's server address in its ServerConfig and creates the stickers' Display, or later
// points the Display at another image host. Without --publish it only simulates and sends nothing.
//
//   node deploy/publish-sui.mjs --image-host <the API's CDN_BASE_URL, or its IMAGE_BASE_URL> [--publish]
//   node deploy/publish-sui.mjs --set-image-host <url> [--publish]
//
// Shinami Gas Station pays the gas when SHINAMI_ACCESS_KEY is set and it takes the transaction;
// otherwise the deployer, SUI_DEPLOYER_PRIVATE_KEY, pays. The deployer keeps the AdminCap, the
// UpgradeCap and the DisplayCap. SUI_NETWORK and SUI_STICKER_PACKAGE come from deploy/drawing-api.env,
// and the keys from deploy/.env, or the file DEPLOY_ENV_FILE names. It prints addresses and IDs,
// never a key.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";
// deploy/ is no workspace package, so the SDK the REST API depends on loads by path from pnpm's
// hoisted packages, beside its own dependencies, where TypeScript finds their types too.
import { bcs } from "../node_modules/.pnpm/node_modules/@mysten/sui/dist/bcs/index.mjs";
import { decodeSuiPrivateKey } from "../node_modules/.pnpm/node_modules/@mysten/sui/dist/cryptography/index.mjs";
import { SuiGrpcClient } from "../node_modules/.pnpm/node_modules/@mysten/sui/dist/grpc/index.mjs";
import { Ed25519Keypair } from "../node_modules/.pnpm/node_modules/@mysten/sui/dist/keypairs/ed25519/index.mjs";
import {
  Transaction,
  TransactionDataBuilder,
} from "../node_modules/.pnpm/node_modules/@mysten/sui/dist/transactions/index.mjs";
import {
  MIST_PER_SUI,
  deriveObjectID,
  fromBase64,
  normalizeStructTag,
  normalizeSuiAddress,
  toBase64,
} from "../node_modules/.pnpm/node_modules/@mysten/sui/dist/utils/index.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PACKAGE_DIR = join(ROOT, "contracts/sui-sticker-contract/stickers");
const DISPLAY_REGISTRY = normalizeSuiAddress("0xd");
const SHINAMI_GAS_STATION = "https://api.us1.shinami.com/sui/gas/v1";
const SHINAMI_TIMEOUT_MS = 30_000;
const SUI_CALL_TIMEOUT_MS = 60_000;
const BUILD_TIMEOUT_MS = 5 * 60_000;
// The SDK's own reads while it builds a transaction take no signal, so the whole run has a limit.
const RUN_TIMEOUT_MS = 15 * 60_000;

const USAGE = `Usage: node deploy/publish-sui.mjs --image-host <url> [--publish]
       node deploy/publish-sui.mjs --set-image-host <url> [--publish]`;

/** @param {string} line */
const log = (line) => console.error(line);

/** The last transaction sent, named if the run stops after sending it. */
let lastSent = "";
setTimeout(() => {
  const sent = lastSent ? `; the last transaction sent was ${lastSent}` : "";
  log(`✗ stopped after ${RUN_TIMEOUT_MS / 60_000} minutes${sent}`);
  process.exit(1);
}, RUN_TIMEOUT_MS).unref();

/** @param {unknown} value @returns {value is Record<string, unknown>} */
const isRecord = (value) => typeof value === "object" && value !== null;

/** @param {unknown} value @returns {value is string[]} */
const isStrings = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** @param {bigint} mist */
function sui(mist) {
  const whole = mist / MIST_PER_SUI;
  const fraction = (mist % MIST_PER_SUI).toString().padStart(9, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} SUI`;
}

/** @param {string} path */
const readEnvFile = (path) => parseEnv(readFileSync(path, "utf8"));

/**
 * An Ed25519 suiprivkey1… key. The SDK's decode error repeats the key, so it's replaced, never
 * passed on.
 * @param {string} name
 * @param {string} value
 */
function keypair(name, value) {
  /** @type {ReturnType<typeof decodeSuiPrivateKey>} */
  let decoded;
  try {
    decoded = decodeSuiPrivateKey(value);
  } catch {
    throw new Error(`${name} isn't a suiprivkey1… key`);
  }
  if (decoded.scheme !== "ED25519") {
    throw new Error(`${name} is a ${decoded.scheme} key, not Ed25519`);
  }
  return Ed25519Keypair.fromSecretKey(decoded.secretKey);
}

/**
 * The host Display joins each sticker's image file name to.
 * @param {string} flag
 * @param {string} value
 */
function imageHost(flag, value) {
  const url = URL.parse(value);
  if (!url || url.protocol !== "https:" || url.search || url.hash || /[{}]/.test(value)) {
    throw new Error(`${flag} takes an https URL, such as the API's IMAGE_BASE_URL; got ${value}`);
  }
  return value.replace(/\/+$/, "");
}

/** @param {string} host */
const imageUrl = (host) => `${host}/{image}`;

/** The LIFF app's link, which Display gives as every sticker's project. */
function liffLink() {
  const liff = readFileSync(join(ROOT, "apps/frontend/src/line/liff.ts"), "utf8");
  const id = /export const LIFF_ID =[^;]*"(\d+-\w+)";/.exec(liff)?.[1];
  if (!id) throw new Error("apps/frontend/src/line/liff.ts no longer sets LIFF_ID to a literal id");
  return `https://liff.line.me/${id}`;
}

/**
 * Display fills each `{field}` from the Sticker object.
 * @param {string} host
 */
const displayFields = (host) => ({
  name: "Sticker No.{number}",
  description: "A sticker drawn on Croquis.",
  image_url: imageUrl(host),
  project_url: liffLink(),
});

/** @param {string} network */
function buildPackage(network) {
  log(`→ building contracts/sui-sticker-contract/stickers for ${network}`);
  /** @type {unknown} */
  const built = JSON.parse(
    execFileSync(
      "sui",
      ["move", "build", "--dump-bytecode-as-base64", "-e", network, "--path", PACKAGE_DIR],
      { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], timeout: BUILD_TIMEOUT_MS },
    ),
  );
  if (!isRecord(built) || !isStrings(built.modules) || !isStrings(built.dependencies)) {
    throw new Error("sui move build answered no modules and dependencies");
  }
  return { modules: built.modules, dependencies: built.dependencies };
}

/** Shinami answered a JSON-RPC error: it won't sponsor the transaction, or its fund can't. */
class ShinamiRefusal extends Error {
  name = "ShinamiRefusal";
}

/**
 * Calls Shinami Gas Station, and rejects with ShinamiRefusal, in its words, when it refuses.
 * @param {string} key
 * @param {string} method
 * @param {unknown[]} params
 */
async function gasStation(key, method, params) {
  const response = await fetch(SHINAMI_GAS_STATION, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": key },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(SHINAMI_TIMEOUT_MS),
  });
  if (response.status === 401) throw new Error(`Shinami refused SHINAMI_ACCESS_KEY for ${method}`);
  if (!response.ok) throw new Error(`Shinami answered HTTP ${response.status} for ${method}`);
  /** @type {unknown} */
  const body = await response.json();
  if (!isRecord(body)) throw new Error(`Shinami answered ${method} with no JSON-RPC body`);
  if (isRecord(body.error)) {
    const { code, message, data } = body.error;
    const details = isRecord(data) && typeof data.details === "string" ? `: ${data.details}` : "";
    throw new ShinamiRefusal(`${String(code)} ${String(message)}${details}`);
  }
  return body.result;
}

/**
 * Shinami's sponsorship of a transaction kind, checked to carry that kind for that sender before
 * anyone signs it.
 * @param {string} key
 * @param {Uint8Array} kind
 * @param {string} sender
 */
async function sponsor(key, kind, sender) {
  const result = await gasStation(key, "gas_sponsorTransactionBlock", [toBase64(kind), sender]);
  if (!isRecord(result) || typeof result.txBytes !== "string") {
    throw new Error("Shinami's sponsorship has no txBytes");
  }
  if (typeof result.signature !== "string")
    throw new Error("Shinami's sponsorship has no signature");
  const bytes = fromBase64(result.txBytes);
  const data = bcs.TransactionData.parse(bytes).V1;
  const sponsoredKind = bcs.TransactionKind.serialize(data.kind).toBytes();
  if (data.sender !== sender || toBase64(sponsoredKind) !== toBase64(kind)) {
    throw new Error(
      "Shinami's transaction isn't the one sent for sponsorship, so it wasn't signed",
    );
  }
  return { bytes, signature: result.signature };
}

/** @typedef {{ network: string, client: SuiGrpcClient, shinamiKey: string | undefined }} Chain */

/**
 * Sends a transaction from `signer`, with Shinami paying when it takes it, and answers it once the
 * fullnode shows it.
 * @param {Chain} chain
 * @param {Transaction} tx
 * @param {Ed25519Keypair} signer
 * @param {string} label
 */
async function send(chain, tx, signer, label) {
  const sender = signer.toSuiAddress();
  tx.setSender(sender);
  /** @type {{ bytes: Uint8Array, signature: string } | null} */
  let sponsorship = null;
  if (chain.shinamiKey) {
    const kind = await tx.build({ client: chain.client, onlyTransactionKind: true });
    try {
      sponsorship = await sponsor(chain.shinamiKey, kind, sender);
    } catch (error) {
      if (!(error instanceof ShinamiRefusal)) throw error;
      log(`⚠ Shinami won't sponsor ${label} (${error.message}), so the deployer pays`);
    }
  }
  const bytes = sponsorship?.bytes ?? (await tx.build({ client: chain.client }));
  const { signature } = await signer.signTransaction(bytes);
  const digest = TransactionDataBuilder.getDigestFromBytes(bytes);
  lastSent = digest;
  log(`→ ${label}: ${digest}, its gas paid by ${sponsorship ? "Shinami" : "the deployer"}`);
  const result = await chain.client.executeTransaction({
    transaction: bytes,
    signatures: sponsorship ? [signature, sponsorship.signature] : [signature],
    include: { effects: true, objectTypes: true },
    signal: AbortSignal.timeout(SUI_CALL_TIMEOUT_MS),
  });
  if (result.$kind === "FailedTransaction") {
    const reason = result.FailedTransaction.status.error?.message ?? "no reason given";
    throw new Error(`${label} failed on Sui (${digest}): ${reason}`);
  }
  await chain.client.waitForTransaction({ digest, timeout: SUI_CALL_TIMEOUT_MS });
  log(`✓ ${label}`);
  return result.Transaction;
}

/**
 * Simulates a transaction from `sender` and logs what its gas costs. Checks are off, so the sender
 * needn't hold SUI: a throwaway or unfunded deployer simulates too.
 * @param {Chain} chain
 * @param {Transaction} tx
 * @param {string} sender
 * @param {string} label
 */
async function simulate(chain, tx, sender, label) {
  tx.setSender(sender);
  const result = await chain.client.simulateTransaction({
    transaction: tx,
    checksEnabled: false,
    include: { effects: true, objectTypes: true },
    signal: AbortSignal.timeout(SUI_CALL_TIMEOUT_MS),
  });
  if (result.$kind === "FailedTransaction") {
    const reason = result.FailedTransaction.status.error?.message ?? "no reason given";
    throw new Error(`${label} would fail: ${reason}`);
  }
  const { computationCost, storageCost, storageRebate } = result.Transaction.effects.gasUsed;
  const cost = BigInt(computationCost) + BigInt(storageCost) - BigInt(storageRebate);
  log(
    `✓ ${label} would cost ${sui(cost)}: computation ${computationCost}, storage ${storageCost}, rebate ${storageRebate} MIST`,
  );
  return result.Transaction;
}

/**
 * Logs Shinami's fund and the deployer's SUI, so a simulation shows who can pay.
 * @param {Chain} chain
 * @param {string | null} deployer
 */
async function logPayers(chain, deployer) {
  if (chain.shinamiKey) {
    const fund = await gasStation(chain.shinamiKey, "gas_getFund", []);
    if (!isRecord(fund)) throw new Error("Shinami answered gas_getFund with no fund");
    const balance = sui(BigInt(String(fund.balance)));
    const inFlight = sui(BigInt(String(fund.inFlight)));
    log(`  Shinami's fund ${String(fund.name)} holds ${balance}, ${inFlight} of it in flight`);
  } else {
    log("  SHINAMI_ACCESS_KEY isn't set, so the deployer pays");
  }
  if (!deployer) return;
  const { balance } = await chain.client.getBalance({
    owner: deployer,
    signal: AbortSignal.timeout(SUI_CALL_TIMEOUT_MS),
  });
  log(`  the deployer, ${deployer}, holds ${sui(BigInt(balance.balance))}`);
}

/** @typedef {{ digest: string, effects: { changedObjects: { objectId: string, idOperation: string, outputState: string }[] }, objectTypes: Record<string, string> }} Executed */

/**
 * The types of what the transaction created, normalized, by ID.
 * @param {Executed} executed
 */
function createdTypes(executed) {
  return executed.effects.changedObjects.flatMap((change) => {
    const type = executed.objectTypes[change.objectId];
    if (change.idOperation !== "Created" || !type) return [];
    return [{ id: change.objectId, type: type.includes("::") ? normalizeStructTag(type) : type }];
  });
}

/**
 * Finds the one object of a type the transaction created.
 * @param {Executed} executed
 */
function createdByType(executed) {
  const created = createdTypes(executed);
  /** @param {string} type */
  return (type) => {
    const ids = created.filter((object) => object.type === normalizeStructTag(type));
    const [object] = ids;
    if (ids.length !== 1 || !object) {
      throw new Error(`${executed.digest} created ${ids.length} ${type}, not one`);
    }
    return object.id;
  };
}

/**
 * What a publish of the package creates that the second transaction and the API's settings name.
 * A simulation runs the same lookups, so a package that would publish without them fails there.
 * @param {Executed} executed
 */
function publishedObjects(executed) {
  const pkg = executed.effects.changedObjects.find(
    (change) => change.outputState === "PackageWrite",
  )?.objectId;
  if (!pkg) throw new Error(`the publish, ${executed.digest}, wrote no package`);
  const created = createdByType(executed);
  return {
    ids: {
      SUI_STICKER_PACKAGE: pkg,
      SUI_STICKER_REGISTRY: created(`${pkg}::sticker::StickerRegistry`),
      SUI_SERVER_CONFIG: created(`${pkg}::sticker::ServerConfig`),
      SUI_GIFT_ESCROW: created(`${pkg}::gift::Escrow`),
    },
    adminCap: created(`${pkg}::sticker::AdminCap`),
    upgradeCap: created("0x2::package::UpgradeCap"),
  };
}

/**
 * Publishes the package, then names the server and creates the Display in a second transaction:
 * a transaction can't call the package it publishes.
 * @param {Chain} chain
 * @param {NodeJS.Dict<string>} env
 * @param {string} host
 * @param {boolean} publish
 */
async function publishPackage(chain, env, host, publish) {
  const fields = displayFields(host);
  const deployerKey = env.SUI_DEPLOYER_PRIVATE_KEY;
  const deployer = deployerKey ? keypair("SUI_DEPLOYER_PRIVATE_KEY", deployerKey) : null;
  const serverKey = env.SUI_SERVER_PRIVATE_KEY;
  const server = serverKey ? keypair("SUI_SERVER_PRIVATE_KEY", serverKey).toSuiAddress() : null;
  const build = buildPackage(chain.network);
  /** @param {string} owner */
  const publishTx = (owner) => {
    const tx = new Transaction();
    tx.transferObjects([tx.publish(build)], owner);
    return tx;
  };

  if (!publish) {
    const from = deployer?.toSuiAddress() ?? new Ed25519Keypair().toSuiAddress();
    if (!deployer) {
      log(`  SUI_DEPLOYER_PRIVATE_KEY isn't set, so a throwaway address, ${from}, simulates`);
    }
    const simulated = await simulate(chain, publishTx(from), from, "the publish");
    publishedObjects(simulated);
    // Without the package's ID, which a publish gets anew.
    const types = createdTypes(simulated).map(({ type }) =>
      type === "package" ? "the package" : type.replace(/^0x[0-9a-f]+::/, ""),
    );
    log(`  it creates ${types.toSorted().join(", ")}`);
    await logPayers(chain, deployer ? from : null);
    log(
      `With --publish, the server becomes ${server ?? "SUI_SERVER_PRIVATE_KEY's address"}, and Display gets:`,
    );
    for (const [name, value] of Object.entries(fields)) log(`  ${name}: ${value}`);
    log("That second transaction can't be simulated before the package exists. Nothing was sent.");
    return;
  }
  if (!deployer || !server) {
    throw new Error("--publish needs SUI_DEPLOYER_PRIVATE_KEY and SUI_SERVER_PRIVATE_KEY");
  }

  const published = await send(chain, publishTx(deployer.toSuiAddress()), deployer, "the publish");
  const { ids, adminCap, upgradeCap } = publishedObjects(published);
  const pkg = ids.SUI_STICKER_PACKAGE;

  const setup = new Transaction();
  setup.moveCall({
    target: `${pkg}::sticker::set_server`,
    arguments: [
      setup.object(adminCap),
      setup.object(ids.SUI_SERVER_CONFIG),
      setup.pure.address(server),
    ],
  });
  const displayCap = setup.moveCall({
    target: `${pkg}::sticker::create_display`,
    arguments: [
      setup.object(adminCap),
      setup.object(DISPLAY_REGISTRY),
      setup.pure.vector("string", Object.keys(fields)),
      setup.pure.vector("string", Object.values(fields)),
    ],
  });
  setup.transferObjects([displayCap], deployer.toSuiAddress());
  /** @type {Awaited<ReturnType<typeof send>>} */
  let setUp;
  try {
    setUp = await send(chain, setup, deployer, "naming the server and creating the Display");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `the package ${pkg} is published, but its server and Display aren't set, so the API can't use it. Run again with --publish for a fresh package. ${reason}`,
    );
  }
  const setUpObject = createdByType(setUp);
  const stickerType = `${pkg}::sticker::Sticker`;
  log(`  the server: ${server}`);
  log(`  the deployer, ${deployer.toSuiAddress()}, holds:`);
  log(`    AdminCap ${adminCap}`);
  log(`    UpgradeCap ${upgradeCap}`);
  log(`    DisplayCap ${setUpObject(`0x2::display_registry::DisplayCap<${stickerType}>`)}`);
  log(`  Display: ${setUpObject(`0x2::display_registry::Display<${stickerType}>`)}`);
  log("For deploy/drawing-api.env and apps/api/.env.example:");
  for (const [key, value] of Object.entries(ids)) console.log(`${key}=${value}`);
}

/**
 * Points Display's image_url at `host` with the deployer's DisplayCap, so every sticker's image
 * follows.
 * @param {Chain} chain
 * @param {NodeJS.Dict<string>} env
 * @param {string | undefined} pkg
 * @param {string} host
 * @param {boolean} publish
 */
async function setImageHost(chain, env, pkg, host, publish) {
  if (!pkg || !/^0x[0-9a-f]{64}$/.test(pkg)) {
    throw new Error("--set-image-host needs SUI_STICKER_PACKAGE in deploy/drawing-api.env");
  }
  const deployerKey = env.SUI_DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) throw new Error("--set-image-host needs SUI_DEPLOYER_PRIVATE_KEY");
  const deployer = keypair("SUI_DEPLOYER_PRIVATE_KEY", deployerKey);
  const stickerType = `${pkg}::sticker::Sticker`;
  // The registry derives each type's Display from DisplayKey<T>(), whose BCS is one zero byte: the
  // field Move gives a struct that declares none.
  const display = deriveObjectID(
    DISPLAY_REGISTRY,
    `0x2::display_registry::DisplayKey<${stickerType}>`,
    new Uint8Array([0]),
  );
  const { object } = await chain.client.getObject({
    objectId: display,
    signal: AbortSignal.timeout(SUI_CALL_TIMEOUT_MS),
  });
  if (object.type !== normalizeStructTag(`0x2::display_registry::Display<${stickerType}>`)) {
    throw new Error(`${display} is a ${object.type}, not the Display of ${stickerType}`);
  }
  const { objects: caps } = await chain.client.listOwnedObjects({
    owner: deployer.toSuiAddress(),
    type: `0x2::display_registry::DisplayCap<${stickerType}>`,
    signal: AbortSignal.timeout(SUI_CALL_TIMEOUT_MS),
  });
  const [cap] = caps;
  if (caps.length !== 1 || !cap) {
    throw new Error(
      `the deployer, ${deployer.toSuiAddress()}, holds ${caps.length} DisplayCaps for ${stickerType}, not one`,
    );
  }
  const tx = new Transaction();
  tx.moveCall({
    target: "0x2::display_registry::set",
    typeArguments: [stickerType],
    arguments: [
      tx.object(display),
      tx.object(cap.objectId),
      tx.pure.string("image_url"),
      tx.pure.string(imageUrl(host)),
    ],
  });
  const label = `pointing Display's image_url at ${imageUrl(host)}`;
  if (publish) {
    await send(chain, tx, deployer, label);
    return;
  }
  await simulate(chain, tx, deployer.toSuiAddress(), label);
  await logPayers(chain, deployer.toSuiAddress());
  log("Nothing was sent. --publish sends it.");
}

function readArgs() {
  try {
    return parseArgs({
      options: {
        publish: { type: "boolean", default: false },
        "image-host": { type: "string" },
        "set-image-host": { type: "string" },
      },
    }).values;
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${USAGE}`);
  }
}

async function main() {
  const args = readArgs();
  const newPackageHost = args["image-host"];
  const newHost = args["set-image-host"];
  if ((newPackageHost === undefined) === (newHost === undefined)) throw new Error(USAGE);

  const apiEnv = readEnvFile(join(ROOT, "deploy/drawing-api.env"));
  const network = apiEnv.SUI_NETWORK;
  if (network !== "testnet" && network !== "mainnet" && network !== "devnet") {
    throw new Error(`deploy/drawing-api.env's SUI_NETWORK is ${String(network)}`);
  }
  const envFile = process.env.DEPLOY_ENV_FILE ?? join(ROOT, "deploy/.env");
  // As the shell scripts source it: the file's values win over the environment's.
  const env = { ...process.env, ...(existsSync(envFile) ? readEnvFile(envFile) : {}) };
  /** @type {Chain} */
  const chain = {
    network,
    client: new SuiGrpcClient({ network, baseUrl: `https://fullnode.${network}.sui.io:443` }),
    shinamiKey: env.SHINAMI_ACCESS_KEY || undefined,
  };
  if (!args.publish) log("Simulating: nothing is sent without --publish.");
  if (newPackageHost !== undefined) {
    await publishPackage(chain, env, imageHost("--image-host", newPackageHost), args.publish);
  } else if (newHost !== undefined) {
    const host = imageHost("--set-image-host", newHost);
    await setImageHost(chain, env, apiEnv.SUI_STICKER_PACKAGE, host, args.publish);
  }
}

try {
  await main();
} catch (error) {
  log(`✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
