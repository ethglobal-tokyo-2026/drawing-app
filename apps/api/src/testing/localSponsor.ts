import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction, TransactionDataBuilder } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import type { Clock } from "../deps.ts";
import { SponsorshipError, type GasStation } from "../sui/types.ts";
import type { Localnet } from "./localnet.ts";

/** How long a sponsorship lasts, as Shinami's do. */
const SPONSORSHIP_MS = 60 * 60_000;

/**
 * Shinami Gas Station on a localnet: a faucet-funded key that names itself gas owner, pays with a
 * coin no other sponsorship used, so it never signs two transactions over one, and dry-runs the
 * kind for its budget, refusing one that fails as Shinami does. What it answers then runs only with
 * the sender's signature beside its own, as Shinami's sponsorships do.
 */
export function localSponsor(
  localnet: Localnet,
  { clock = { now: () => new Date() } }: { clock?: Clock } = {},
) {
  const key = Ed25519Keypair.generate();
  const address = key.toSuiAddress();
  const unusedCoins: string[] = [];

  /** A gas coin no sponsorship has used, taken from the faucet when none is left. */
  async function unusedCoin() {
    let objectId = unusedCoins.shift();
    if (objectId === undefined) {
      unusedCoins.push(...(await localnet.fund(address)));
      objectId = unusedCoins.shift();
    }
    if (objectId === undefined) throw new Error("The localnet faucet sent the sponsor no coins");
    const { object } = await localnet.client.getObject({ objectId });
    return { objectId, version: object.version, digest: object.digest };
  }

  const gasStation: GasStation = {
    sponsor: async (kind, sender) => {
      const tx = Transaction.fromKind(kind);
      tx.setSender(sender);
      tx.setGasOwner(address);
      tx.setGasPayment([await unusedCoin()]);
      let txBytes: Uint8Array;
      try {
        txBytes = await tx.build({ client: localnet.client });
      } catch (error) {
        const words = error instanceof Error ? error.message : String(error);
        throw new SponsorshipError("refused", words, { cause: error });
      }
      return {
        digest: TransactionDataBuilder.getDigestFromBytes(txBytes),
        txBytes: toBase64(txBytes),
        sponsorSignature: (await key.signTransaction(txBytes)).signature,
        expiresAt: new Date(clock.now().getTime() + SPONSORSHIP_MS),
      };
    },
    available: async () => {
      const { balance } = await localnet.client.getBalance({ owner: address });
      return BigInt(balance.balance);
    },
  };
  return { ...gasStation, address };
}
