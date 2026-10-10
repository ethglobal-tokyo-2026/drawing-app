import { GIFT_EXPIRY_MS } from "@drawing-app/db";
import { bytes32 } from "@drawing-app/db/testing";
import { bcs } from "@mysten/sui/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64, normalizeStructTag } from "@mysten/sui/utils";
import { expect, it } from "vitest";
import { stickerSealedIn } from "../sui/events.ts";
import type { SuiOutcome } from "../sui/types.ts";
import { TEST_PAYMENT_TARGET } from "../testing/fakes.ts";
import { LOCALNET_START_TIMEOUT_MS, startLocalnet, type Localnet } from "../testing/localnet.ts";
import { localSponsor } from "../testing/localSponsor.ts";
import { publishStickersPackage } from "../testing/localStickersPackage.ts";
import { createSuiChain } from "./suiChain.ts";

/** Long enough for a deposit to land before its gift expires, short enough to wait out. */
const SHORT_EXPIRY_MS = 5_000;
/** How often the localnet's clock is read while a gift expires. */
const CLOCK_POLL_MS = 250;

/** Sui's Clock, field for field. */
const clockObject = bcs.struct("Clock", { id: bcs.Address, timestamp_ms: bcs.u64() });

/** The time the package's expiry checks read: the localnet's Clock. */
async function chainNow(localnet: Localnet) {
  const { object } = await localnet.client.getObject({
    objectId: "0x6",
    include: { content: true },
  });
  return Number(clockObject.parse(object.content).timestamp_ms);
}

/** What a transaction Sui ran emitted; fails the test with Sui's words when it didn't run. */
function eventsOf(outcome: SuiOutcome | null) {
  if (outcome === null) throw new Error("Sui's answer to the transaction was lost");
  if (!outcome.ok) throw new Error(`Sui failed the transaction: ${outcome.failure}`);
  return outcome.events;
}

it(
  "mints, deposits, claims, takes out and returns through the upgraded stickers package, at the IDs the server derives and by the Clock it reads",
  async () => {
    const localnet = await startLocalnet();
    try {
      const serverKey = Ed25519Keypair.generate();
      const { originalPackage, ...stickers } = await publishStickersPackage(
        localnet,
        serverKey.toSuiAddress(),
      );
      // Calls go to the upgrade, while the package's types and derivation keys keep the first ID.
      expect(stickers.stickerPackage).not.toBe(originalPackage);
      const sui = createSuiChain({
        client: localnet.client,
        serverPrivateKey: serverKey.getSecretKey(),
        ...stickers,
        payment: TEST_PAYMENT_TARGET,
      });
      const sponsor = localSponsor(localnet);

      /** Sponsors the kind for `sender`, has `sign` sign it, submits it, and waits for the fullnode to show it. */
      const run = async (
        kind: Uint8Array,
        sender: string,
        sign: (txBytes: string) => Promise<string>,
      ) => {
        const sponsorship = await sponsor.sponsor(kind, sender);
        const outcome = await sui.submit(sponsorship.txBytes, [
          await sign(sponsorship.txBytes),
          sponsorship.sponsorSignature,
        ]);
        await localnet.client.waitForTransaction({ digest: sponsorship.digest });
        return { events: eventsOf(outcome), digest: sponsorship.digest };
      };
      const runAsServer = async (kind: Promise<Uint8Array>) =>
        run(await kind, sui.server, sui.signAsServer);
      const runAs = async (key: Ed25519Keypair, kind: Promise<Uint8Array>) =>
        run(await kind, key.toSuiAddress(), async (txBytes) => {
          const { signature } = await key.signTransaction(fromBase64(txBytes));
          return signature;
        });
      const ownerOf = async (objectId: string) =>
        (await localnet.client.getObject({ objectId })).object.owner;
      const heldBy = (key: Ed25519Keypair) => ({
        $kind: "AddressOwner",
        AddressOwner: key.toSuiAddress(),
      });

      expect(await sui.check()).toMatchObject({ serverMatches: true });

      const artist = Ed25519Keypair.generate();
      const stickerId = "00000000-0000-4000-8000-000000000001";
      const stickerObjectId = await sui.stickerObjectId(stickerId);
      expect(await sui.stickerMinted(stickerId)).toBe(false);
      const mint = await runAsServer(
        sui.mintKind({
          stickerId,
          number: 1,
          artist: artist.toSuiAddress(),
          contentHash: bytes32("the sticker's PNG"),
          width: 640,
          height: 480,
          nsfw: false,
          image: "sticker.png",
        }),
      );
      const sealed = { sticker: stickerObjectId, key: stickerId };
      expect(stickerSealedIn(mint.events)).toEqual(sealed);
      expect(stickerSealedIn(eventsOf(await sui.outcomeOf(mint.digest)))).toEqual(sealed);
      expect(await sui.stickerMinted(stickerId)).toBe(true);
      const { object: minted } = await localnet.client.getObject({ objectId: stickerObjectId });
      expect(minted.type).toBe(normalizeStructTag(`${originalPackage}::sticker::Sticker`));
      expect(minted.owner).toEqual(heldBy(artist));

      const depositBy = (giver: Ed25519Keypair, giftId: string, expiresAt: Date) =>
        runAs(
          giver,
          sui.depositKind({
            sender: giver.toSuiAddress(),
            stickerObjectId,
            giftId,
            claimCommitment: bytes32(`the claim commitment of ${giftId}`),
            expiresAt,
          }),
        );
      const inAWeek = () => new Date(Date.now() + GIFT_EXPIRY_MS);

      const receiver = Ed25519Keypair.generate();
      const claimed = bytes32("the gift that's claimed");
      await depositBy(artist, claimed, inAWeek());
      expect(await sui.readGift(claimed)).toEqual({ status: "pending", recipient: null });
      expect(await ownerOf(stickerObjectId)).toMatchObject({ $kind: "ObjectOwner" });
      await runAsServer(sui.claimKind(claimed, receiver.toSuiAddress()));
      expect(await sui.readGift(claimed)).toEqual({
        status: "claimed",
        recipient: receiver.toSuiAddress(),
      });
      expect(await ownerOf(stickerObjectId)).toEqual(heldBy(receiver));

      const takenOut = bytes32("the gift that's taken out");
      await depositBy(receiver, takenOut, inAWeek());
      expect(await sui.readGift(takenOut)).toEqual({ status: "pending", recipient: null });
      await runAs(receiver, sui.takeOutKind(receiver.toSuiAddress(), takenOut));
      expect(await sui.readGift(takenOut)).toEqual({ status: "taken_out", recipient: null });
      expect(await ownerOf(stickerObjectId)).toEqual(heldBy(receiver));

      const returned = bytes32("the gift that's returned");
      const expiresAt = new Date((await chainNow(localnet)) + SHORT_EXPIRY_MS);
      await depositBy(receiver, returned, expiresAt);
      expect(await sui.readGift(returned)).toEqual({ status: "pending", recipient: null });
      // The server's read of the Clock falls between two of the test's own.
      const before = await chainNow(localnet);
      const read = (await sui.readClock()).getTime();
      expect(read).toBeGreaterThanOrEqual(before);
      expect(read).toBeLessThanOrEqual(await chainNow(localnet));
      // The expiry sweep's rule: once the server's read is past the expiry, the return runs.
      await expect
        .poll(async () => (await sui.readClock()).getTime(), {
          timeout: SHORT_EXPIRY_MS * 3,
          interval: CLOCK_POLL_MS,
        })
        .toBeGreaterThan(expiresAt.getTime());
      await runAsServer(sui.returnKind(returned));
      expect(await sui.readGift(returned)).toEqual({ status: "expired_returned", recipient: null });
      expect(await ownerOf(stickerObjectId)).toEqual(heldBy(receiver));
    } finally {
      await localnet.stop();
    }
  },
  LOCALNET_START_TIMEOUT_MS + 60_000,
);
