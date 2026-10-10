// deploy/stickers-package.mjs: the stickers package's build, its publish, and the transaction after it that
// names the server and creates the Display. publish-sui.mjs sends them to Sui, and the REST API's localnet
// test runs them on a Sui network of its own, so both set the package up the same way.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// deploy/ is no workspace package, so the SDK the REST API depends on loads by path from pnpm's
// hoisted packages, beside its own dependencies, where TypeScript finds their types too.
import { Transaction } from "../node_modules/.pnpm/node_modules/@mysten/sui/dist/transactions/index.mjs";
import {
  normalizeStructTag,
  normalizeSuiAddress,
} from "../node_modules/.pnpm/node_modules/@mysten/sui/dist/utils/index.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PACKAGE_DIR = join(ROOT, "contracts/sui-sticker-contract/stickers");
export const DISPLAY_REGISTRY = normalizeSuiAddress("0xd");
const BUILD_TIMEOUT_MS = 5 * 60_000;

/** @param {unknown} value @returns {value is Record<string, unknown>} */
export const isRecord = (value) => typeof value === "object" && value !== null;

/** @param {unknown} value @returns {value is string[]} */
const isStrings = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** @param {unknown} value @returns {value is number[]} */
const isBytes = (value) =>
  Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item < 256);

/**
 * The package compiled against `environment`'s dependencies, a Move.toml environment: its modules,
 * the packages they link to, and the digest an upgrade to it is authorized with, null when the
 * build gives none, since only an upgrade reads it.
 * @param {string} environment
 */
export function buildPackage(environment) {
  /** @type {unknown} */
  const built = JSON.parse(
    execFileSync(
      "sui",
      ["move", "build", "--dump-bytecode-as-base64", "-e", environment, "--path", PACKAGE_DIR],
      { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], timeout: BUILD_TIMEOUT_MS },
    ),
  );
  if (!isRecord(built) || !isStrings(built.modules) || !isStrings(built.dependencies)) {
    throw new Error("sui move build answered no modules and dependencies");
  }
  const digest = isBytes(built.digest) ? built.digest : null;
  return { modules: built.modules, dependencies: built.dependencies, digest };
}

/**
 * Publishes the package, sending its UpgradeCap to `owner`.
 * @param {ReturnType<typeof buildPackage>} build
 * @param {string} owner
 */
export function publishTransaction(build, owner) {
  const tx = new Transaction();
  const { modules, dependencies } = build;
  tx.transferObjects([tx.publish({ modules, dependencies })], owner);
  return tx;
}

/** @typedef {{ digest: string, effects: { changedObjects: { objectId: string, idOperation: string, outputState: string }[] }, objectTypes: Record<string, string> }} Executed */

/**
 * The types of what the transaction created, normalized, by ID.
 * @param {Executed} executed
 */
export function createdTypes(executed) {
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
export function createdByType(executed) {
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
export function publishedObjects(executed) {
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
 * Names `server` in ServerConfig and creates the Display with `fields`, sending its DisplayCap to the
 * deployer, who holds the AdminCap. It follows the publish: a transaction can't call the package it
 * publishes.
 * @param {ReturnType<typeof publishedObjects>} published
 * @param {{ server: string, deployer: string, fields: Record<string, string> }} setup
 */
export function setupTransaction({ ids, adminCap }, { server, deployer, fields }) {
  const pkg = ids.SUI_STICKER_PACKAGE;
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::sticker::set_server`,
    arguments: [tx.object(adminCap), tx.object(ids.SUI_SERVER_CONFIG), tx.pure.address(server)],
  });
  const displayCap = tx.moveCall({
    target: `${pkg}::sticker::create_display`,
    arguments: [
      tx.object(adminCap),
      tx.object(DISPLAY_REGISTRY),
      tx.pure.vector("string", Object.keys(fields)),
      tx.pure.vector("string", Object.values(fields)),
    ],
  });
  tx.transferObjects([displayCap], deployer);
  return tx;
}
