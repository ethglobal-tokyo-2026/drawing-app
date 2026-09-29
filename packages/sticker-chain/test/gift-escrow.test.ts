import { createWalletClient, keccak256, stringToBytes, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import { stickerGiftEscrowAbi, stickerNftAbi } from "../src/generated/contracts.js";
import { createGiftAuthorizer, createGiftClaim, prepareGiftTransfer } from "../src/gift-sticker.js";
import { deployCroquisStack } from "./helpers/croquis.js";
import { deployStickerNft, localSepolia, startLocalChain } from "./helpers/foundry.js";

const contentHash = keccak256(stringToBytes("sealed-sticker-bytes"));

async function setup() {
  const { accounts, transport, publicClient } = await startLocalChain();
  const [admin, artist, recipient, claimSigner, stranger, relayer] = accounts;
  if (!admin || !artist || !recipient || !claimSigner || !stranger || !relayer) {
    throw new Error("Local chain did not create the required test accounts");
  }
  const walletClient = createWalletClient({ chain: localSepolia, transport, account: admin });
  const stickerAddress = await deployStickerNft(publicClient, walletClient);
  const croquis = await deployCroquisStack({
    publicClient,
    walletClient,
    account: admin,
    chain: localSepolia,
    sticker: stickerAddress,
    relayer: claimSigner.address,
    gatewaySigner: claimSigner.address,
  });
  const mintHash = await walletClient.writeContract({
    address: stickerAddress,
    abi: stickerNftAbi,
    functionName: "sealSticker",
    args: [
      artist.address,
      keccak256(stringToBytes("sticker-for-giving")),
      contentHash,
      "ipfs://sticker/metadata.json",
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: mintHash });
  return {
    publicClient,
    walletClient,
    stickerAddress,
    escrowAddress: croquis.escrow,
    artist,
    recipient,
    claimSigner,
    stranger,
    relayer,
  };
}

type TestContext = Awaited<ReturnType<typeof setup>>;

async function stageGift(context: TestContext, expiresAt: number) {
  let seed = 1;
  const claim = createGiftClaim((size) => new Uint8Array(size).fill(seed++));
  const transfer = prepareGiftTransfer({
    sender: context.artist.address,
    stickerContract: context.stickerAddress,
    escrowContract: context.escrowAddress,
    tokenId: 1n,
    giftId: claim.giftId,
    claimCommitment: claim.claimCommitment,
    expiresAt,
  });
  const hash = await context.walletClient.sendTransaction({
    ...transfer,
    account: context.artist,
  });
  await context.publicClient.waitForTransactionReceipt({ hash });
  return claim;
}

function createAuthorizer(
  context: TestContext,
  giftId: Hex,
  claimCommitment: Hex,
  expiresAt: number,
  signer = context.claimSigner,
) {
  return createGiftAuthorizer({
    signer,
    chainId: localSepolia.id,
    escrowContract: context.escrowAddress,
    findGift: async (requestedGiftId) =>
      requestedGiftId === giftId ? { giftId, claimCommitment, expiresAt, status: "pending" } : null,
    findArtistSmartWallet: async (artistId) =>
      artistId === "recipient-artist" ? context.recipient.address : null,
  });
}

describe("StickerGiftEscrow", () => {
  it("stages prepareGiftTransfer's gift and releases it to a later-created smart account", async () => {
    const context = await setup();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const claim = await stageGift(context, expiresAt);
    // The escrow decodes the commitment and expiry from prepareGiftTransfer's calldata.
    const [, , , storedCommitment, storedExpiresAt] = await context.publicClient.readContract({
      address: context.escrowAddress,
      abi: stickerGiftEscrowAbi,
      functionName: "gifts",
      args: [claim.giftId],
    });
    expect(storedCommitment).toBe(claim.claimCommitment);
    expect(storedExpiresAt).toBe(BigInt(expiresAt));

    const authorizer = createAuthorizer(context, claim.giftId, claim.claimCommitment, expiresAt);
    const authorized = await authorizer.authorizeClaim({
      giftId: claim.giftId,
      giftClaimToken: claim.giftClaimToken,
      recipientArtistId: "recipient-artist",
    });
    const hash = await context.walletClient.writeContract({
      address: context.escrowAddress,
      abi: stickerGiftEscrowAbi,
      functionName: "claimGift",
      args: [
        claim.giftId,
        context.recipient.address,
        BigInt(authorized.authorizationDeadline),
        authorized.authorization,
      ],
      account: context.relayer,
    });
    await context.publicClient.waitForTransactionReceipt({ hash });

    await expect(
      context.publicClient.readContract({
        address: context.stickerAddress,
        abi: stickerNftAbi,
        functionName: "ownerOf",
        args: [1n],
      }),
    ).resolves.toBe(context.recipient.address);
    await expect(
      context.publicClient.readContract({
        address: context.escrowAddress,
        abi: stickerGiftEscrowAbi,
        functionName: "pendingGiftForToken",
        args: [1n],
      }),
    ).resolves.toBe(`0x${"00".repeat(32)}`);
  }, 20_000);

  it("rejects invalid gift claim tokens and authorizations from other signers", async () => {
    const context = await setup();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const claim = await stageGift(context, expiresAt);
    const authorizer = createAuthorizer(context, claim.giftId, claim.claimCommitment, expiresAt);
    await expect(
      authorizer.authorizeClaim({
        giftId: claim.giftId,
        giftClaimToken: `0x${"ff".repeat(32)}`,
        recipientArtistId: "recipient-artist",
      }),
    ).rejects.toThrow("Gift claim token is invalid");

    const unauthorized = await createAuthorizer(
      context,
      claim.giftId,
      claim.claimCommitment,
      expiresAt,
      context.stranger,
    ).authorizeClaim({
      giftId: claim.giftId,
      giftClaimToken: claim.giftClaimToken,
      recipientArtistId: "recipient-artist",
    });
    await expect(
      context.walletClient.writeContract({
        address: context.escrowAddress,
        abi: stickerGiftEscrowAbi,
        functionName: "claimGift",
        args: [
          claim.giftId,
          context.recipient.address,
          BigInt(unauthorized.authorizationDeadline),
          unauthorized.authorization,
        ],
        account: context.relayer,
      }),
    ).rejects.toThrow();
  }, 20_000);
});
