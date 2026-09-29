import { createWalletClient, keccak256, stringToBytes } from "viem";
import { describe, expect, it } from "vitest";
import { createStickerSealer } from "../src/seal-sticker.js";
import { deployStickerNft, localSepolia, startLocalChain } from "./helpers/foundry.js";

const sticker = {
  stickerId: "sticker-123",
  artistId: "line-user-1",
  contentHash: keccak256(stringToBytes("sealed-sticker-bytes")),
  metadataUri: "ipfs://bafybeigdyrzt5sticker/metadata.json",
};

describe("sticker sealing backend", () => {
  it("mints to the artist's smart wallet and reconciles a retry against the NFT", async () => {
    const { accounts, transport, publicClient } = await startLocalChain();
    const [sealer, artist] = accounts;
    if (!sealer || !artist) throw new Error("Local chain did not create test accounts");
    const walletClient = createWalletClient({ chain: localSepolia, transport, account: sealer });
    const seal = createStickerSealer({
      publicClient,
      walletClient,
      contractAddress: await deployStickerNft(publicClient, walletClient),
      sealerAccount: sealer,
      findArtistSmartWallet: async (artistId) =>
        artistId === sticker.artistId ? artist.address : null,
    });

    await expect(seal(sticker)).resolves.toMatchObject({ tokenId: 1n, alreadySealed: false });
    await expect(seal(sticker)).resolves.toEqual({ tokenId: 1n, alreadySealed: true });
  });
});
