import {
  createTestClient,
  createWalletClient,
  custom,
  keccak256,
  stringToBytes,
  type Hex,
  type HttpTransport,
} from "viem";
import { describe, expect, it, vi } from "vitest";
import { createStickerSealer } from "../src/seal-sticker.js";
import { deployStickerNft, localSepolia, startLocalChain } from "./helpers/foundry.js";

const sticker = {
  stickerId: "sticker-123",
  artistId: "line-user-1",
  contentHash: keccak256(stringToBytes("sealed-sticker-bytes")),
  metadataUri: "ipfs://bafybeigdyrzt5sticker/metadata.json",
};

/**
 * Anvil, estimating gas against the latest block, as geth does. Anvil's own estimate and its
 * eth_fillTransaction run on its pending block, where the first seal has already landed, so they
 * refuse a retry before it can revert on chain.
 */
function estimatingAtLatest(transport: HttpTransport) {
  const anvil = transport({ chain: localSepolia });
  return custom(
    {
      request: ({ method, params }: { method: string; params?: unknown[] }) =>
        anvil.request({
          method,
          params:
            method === "eth_estimateGas" && params?.length === 1 ? [...params, "latest"] : params,
        }),
    },
    { methods: { exclude: ["eth_fillTransaction"] } },
  );
}

/** A sealer for StickerNFT on a new local chain, and a wait for each transaction it sends, by order. */
async function sealerOnLocalChain() {
  const { accounts, transport, publicClient } = await startLocalChain();
  const [sealer, artist] = accounts;
  if (!sealer || !artist) throw new Error("Local chain did not create test accounts");
  const walletClient = createWalletClient({
    chain: localSepolia,
    transport: estimatingAtLatest(transport),
    account: sealer,
  });
  const sent: Hex[] = [];
  const seal = createStickerSealer({
    publicClient,
    walletClient,
    contractAddress: await deployStickerNft(publicClient, walletClient),
    sealerAccount: sealer,
    findArtistSmartWallet: async (artistId) =>
      artistId === sticker.artistId ? artist.address : null,
    onProgress: ({ stage, phase, txHash }) => {
      if (stage === "submit" && phase === "completed" && txHash) sent.push(txHash);
    },
  });
  const sentTransaction = (index: number) =>
    vi.waitFor(() => {
      const hash = sent[index];
      if (!hash) throw new Error(`Sealing has not sent transaction ${index + 1} yet`);
      return hash;
    });
  return {
    seal,
    sentTransaction,
    publicClient,
    testClient: createTestClient({ chain: localSepolia, mode: "anvil", transport }),
  };
}

describe("sticker sealing backend", () => {
  it("mints to the artist's smart wallet and reconciles a retry against the NFT", async () => {
    const { seal } = await sealerOnLocalChain();

    await expect(seal(sticker)).resolves.toMatchObject({ tokenId: 1n, alreadySealed: false });
    await expect(seal(sticker)).resolves.toEqual({ tokenId: 1n, alreadySealed: true });
  });

  it("leaves out a retry's transaction that reverted behind the first seal's pending mint", async () => {
    const { seal, sentTransaction, publicClient, testClient } = await sealerOnLocalChain();
    // Blocks wait for the test, so the retry is sent while the first seal's transaction is pending.
    await testClient.setAutomine(false);
    const first = seal(sticker);
    const firstTx = await sentTransaction(0);
    const retry = seal(sticker);
    const retryTx = await sentTransaction(1);
    await testClient.mine({ blocks: 1 });

    await expect(first).resolves.toEqual({
      tokenId: 1n,
      transactionHash: firstTx,
      alreadySealed: false,
    });
    await expect(retry).resolves.toEqual({ tokenId: 1n, alreadySealed: true });
    await expect(publicClient.getTransactionReceipt({ hash: retryTx })).resolves.toMatchObject({
      status: "reverted",
    });
  });
});
