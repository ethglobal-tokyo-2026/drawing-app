import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction, UpgradePolicy } from "@mysten/sui/transactions";
import {
  buildPackage,
  publishedObjects,
  publishTransaction,
  setupTransaction,
} from "../../../../deploy/stickers-package.mjs";
import type { Localnet } from "./localnet.ts";

/**
 * Move.toml names no localnet, so the package builds against testnet's dependencies; its calls into
 * the framework link against the localnet's own.
 */
const BUILD_ENVIRONMENT = "testnet";

/** The stickers package on a localnet, by the names createSuiChain takes them. */
export interface LocalStickersPackage {
  /** The package as first published, whose ID its types keep. */
  originalPackage: string;
  /** Its upgrade, which calls go to. */
  stickerPackage: string;
  stickerRegistry: string;
  serverConfig: string;
  giftEscrow: string;
}

/**
 * Publishes the stickers package on `localnet` and sets it up naming `server`, as publish-sui.mjs
 * does, then upgrades it once, so calls go to a version other than the one its types name, as on a
 * network after an upgrade. A deployer the faucet funds pays the gas.
 */
export async function publishStickersPackage(
  localnet: Localnet,
  server: string,
): Promise<LocalStickersPackage> {
  const deployer = Ed25519Keypair.generate();
  const deployerAddress = deployer.toSuiAddress();
  await localnet.fund(deployerAddress);
  const send = async (tx: Transaction, what: string) => {
    tx.setSender(deployerAddress);
    const result = await localnet.client.signAndExecuteTransaction({
      transaction: tx,
      signer: deployer,
      include: { effects: true, objectTypes: true },
    });
    if (result.$kind === "FailedTransaction") {
      const reason = result.FailedTransaction.status.error?.message ?? "no reason given";
      throw new Error(`${what} failed on the localnet: ${reason}`);
    }
    await localnet.client.waitForTransaction({ digest: result.Transaction.digest });
    return result.Transaction;
  };

  const build = buildPackage(BUILD_ENVIRONMENT);
  const published = publishedObjects(
    await send(publishTransaction(build, deployerAddress), "The publish"),
  );
  await send(
    setupTransaction(published, {
      server,
      deployer: deployerAddress,
      fields: { name: "Sticker No.{number}", image_url: "https://images.test/{image}" },
    }),
    "Naming the server and creating the Display",
  );

  const originalPackage = published.ids.SUI_STICKER_PACKAGE;
  if (!build.digest) throw new Error("sui move build gave no digest to authorize the upgrade with");
  const upgrade = new Transaction();
  const ticket = upgrade.moveCall({
    target: "0x2::package::authorize_upgrade",
    arguments: [
      upgrade.object(published.upgradeCap),
      upgrade.pure.u8(UpgradePolicy.COMPATIBLE),
      upgrade.pure.vector("u8", build.digest),
    ],
  });
  const receipt = upgrade.upgrade({
    modules: build.modules,
    dependencies: build.dependencies,
    package: originalPackage,
    ticket,
  });
  upgrade.moveCall({
    target: "0x2::package::commit_upgrade",
    arguments: [upgrade.object(published.upgradeCap), receipt],
  });
  const upgraded = await send(upgrade, "The upgrade");
  const stickerPackage = upgraded.effects.changedObjects.find(
    (change) => change.outputState === "PackageWrite",
  )?.objectId;
  if (!stickerPackage) throw new Error(`The upgrade, ${upgraded.digest}, wrote no package`);

  return {
    originalPackage,
    stickerPackage,
    stickerRegistry: published.ids.SUI_STICKER_REGISTRY,
    serverConfig: published.ids.SUI_SERVER_CONFIG,
    giftEscrow: published.ids.SUI_GIFT_ESCROW,
  };
}
