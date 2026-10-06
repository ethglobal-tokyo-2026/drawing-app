import { access } from "node:fs/promises";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";
import { expect, it } from "vitest";
import { createSuiChain } from "../services/suiChain.ts";
import { TransactionRefusedError } from "../sui/types.ts";
import { TEST_PAYMENT_TARGET } from "./fakes.ts";
import { LOCALNET_START_TIMEOUT_MS, startLocalnet } from "./localnet.ts";
import { localSponsor } from "./localSponsor.ts";

it(
  "runs a sponsored kind only with the sender's signature and the sponsor's, refuses one whose dry run fails, and stops leaving nothing",
  async () => {
    const localnet = await startLocalnet();
    try {
      const sponsor = localSponsor(localnet);
      const sui = createSuiChain({
        client: localnet.client,
        serverPrivateKey: Ed25519Keypair.generate().getSecretKey(),
        stickerPackage: "0x1",
        stickerRegistry: "0x1",
        serverConfig: "0x1",
        giftEscrow: "0x1",
        payment: TEST_PAYMENT_TARGET,
      });
      // The sender holds no SUI: the sponsor pays.
      const sender = Ed25519Keypair.generate();
      const kindOf = (tx: Transaction) =>
        tx.build({ client: localnet.client, onlyTransactionKind: true });

      const reading = new Transaction();
      reading.moveCall({ target: "0x2::clock::timestamp_ms", arguments: [reading.object.clock()] });
      const sponsorship = await sponsor.sponsor(await kindOf(reading), sender.toSuiAddress());
      const { signature } = await sender.signTransaction(fromBase64(sponsorship.txBytes));
      await expect(sui.submit(sponsorship.txBytes, [signature])).rejects.toBeInstanceOf(
        TransactionRefusedError,
      );
      await expect(
        sui.submit(sponsorship.txBytes, [signature, sponsorship.sponsorSignature]),
      ).resolves.toMatchObject({ ok: true });
      await expect(sui.outcomeOf(sponsorship.digest)).resolves.toMatchObject({ ok: true });

      const aborting = new Transaction();
      const none = aborting.moveCall({ target: "0x1::option::none", typeArguments: ["u8"] });
      aborting.moveCall({
        target: "0x1::option::destroy_some",
        typeArguments: ["u8"],
        arguments: [none],
      });
      await expect(
        sponsor.sponsor(await kindOf(aborting), sender.toSuiAddress()),
      ).rejects.toMatchObject({ name: "SponsorshipError", reason: "refused" });
    } finally {
      await localnet.stop();
    }
    await expect(access(localnet.stateDir)).rejects.toThrow();
    await expect(fetch(localnet.faucetUrl)).rejects.toThrow();
  },
  LOCALNET_START_TIMEOUT_MS + 60_000,
);
