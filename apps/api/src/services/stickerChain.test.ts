import { beforeEach, describe, expect, it, vi } from "vitest";
import { keccak256, type Hex } from "viem";
import { createStickerChain } from "./stickerChain.ts";
import { stickerImageUrls } from "./imageStore.ts";

const rpc = vi.hoisted(() => ({
  readContract: vi.fn(),
  simulateContract: vi.fn(),
  getContractEvents: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  writeContract: vi.fn(),
}));
vi.mock("viem", async (original) => ({
  ...(await original<typeof import("viem")>()),
  createPublicClient: () => rpc,
  createWalletClient: () => rpc,
}));

const hex = (value: string): Hex => `0x${value.repeat(64)}`;
const ALICE = `0x${"a".repeat(40)}`;
const BOB = `0x${"b".repeat(40)}`;
const NFT = `0x${"c".repeat(40)}`;
const ESCROW = `0x${"d".repeat(40)}`;
const TX = hex("1");
const TOKEN = hex("2");
const GIFT_ID = hex("3");
const CONTENT = hex("4");
const STICKER_ID = "00000000-0000-4000-8000-000000000001";
const METADATA = `https://images.test/${STICKER_ID}.json`;

function adapter() {
  const saveMetadata = vi.fn(async () => {});
  const chain = createStickerChain({
    rpcUrl: "https://rpc.test",
    stickerContract: NFT,
    escrowContract: ESCROW,
    sealerPrivateKey: hex("5"),
    smartWallets: { addressFor: async (id) => (id === "alice" ? ALICE : BOB) },
    images: {
      save: async () => {},
      urls: (contentHash) => stickerImageUrls("https://images.test", contentHash),
      saveMetadata,
    },
  });
  return { ...chain, saveMetadata };
}

const claimInput = { giftId: GIFT_ID, giftClaimToken: TOKEN, recipientId: "bob" };
const escrowGift = (status: number, recipient = BOB) => [
  ALICE,
  recipient,
  1n,
  keccak256(TOKEN),
  BigInt(Math.floor(Date.now() / 1000) + 3600),
  status,
];

beforeEach(() => {
  vi.resetAllMocks();
  rpc.writeContract.mockResolvedValue(TX);
  rpc.waitForTransactionReceipt.mockResolvedValue({ status: "success" });
});

describe("Sepolia sticker adapter", () => {
  it("mints to the artist's smart wallet and recovers an existing mint without sending another", async () => {
    let minted = false;
    rpc.readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === "tokenIdForSticker") return minted ? 1n : 0n;
      if (functionName === "artistOf") return ALICE;
      if (functionName === "contentHashOf") return CONTENT;
      if (functionName === "tokenURI") return METADATA;
      throw new Error(`Unexpected read ${functionName}`);
    });
    rpc.simulateContract.mockImplementation(async (request: object) => ({ request }));
    rpc.waitForTransactionReceipt.mockImplementation(async () => {
      minted = true;
      return { status: "success" };
    });
    rpc.getContractEvents.mockResolvedValue([{ transactionHash: TX }]);
    const chain = adapter();
    const sticker = {
      stickerId: STICKER_ID,
      artistId: "alice",
      contentHash: CONTENT,
      metadataUri: METADATA,
    };

    await expect(chain.mint(sticker)).resolves.toEqual({ tokenId: "1", txHash: TX });
    await expect(chain.mint(sticker)).resolves.toEqual({ tokenId: "1", txHash: TX });

    expect(rpc.writeContract).toHaveBeenCalledOnce();
    expect(rpc.simulateContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "sealSticker",
        args: [ALICE, expect.any(String), CONTENT, METADATA],
      }),
    );
    expect(chain.saveMetadata).toHaveBeenCalledWith(
      STICKER_ID,
      expect.objectContaining({
        image: `https://images.test/${CONTENT}.png`,
      }),
    );
  });

  it("claims to the recipient's smart wallet and checks the transaction receipt", async () => {
    rpc.readContract.mockResolvedValue(escrowGift(1));
    const chain = adapter();

    await expect(chain.giftChain.claimGift(claimInput)).resolves.toEqual({
      claimed: true,
      txHash: TX,
    });

    expect(rpc.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: ESCROW,
        functionName: "claimGift",
        args: [GIFT_ID, BOB, expect.any(BigInt), expect.stringMatching(/^0x/)],
      }),
    );
    expect(rpc.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: TX });
  });

  it("recovers a landed claim after a receipt timeout, but rejects a claim won by another wallet", async () => {
    rpc.readContract.mockResolvedValue(escrowGift(1));
    rpc.waitForTransactionReceipt.mockImplementation(async () => {
      rpc.readContract.mockResolvedValue(escrowGift(2));
      throw new Error("Receipt timeout");
    });
    rpc.getContractEvents.mockResolvedValue([{ transactionHash: TX }]);
    const chain = adapter();

    await expect(chain.giftChain.claimGift(claimInput)).resolves.toEqual({
      claimed: true,
      txHash: TX,
    });
    rpc.readContract.mockResolvedValue(escrowGift(2, ALICE));
    await expect(chain.giftChain.claimGift(claimInput)).resolves.toEqual({ claimed: false });
    expect(rpc.writeContract).toHaveBeenCalledOnce();
  });

  it("does not report a reverted claim as successful", async () => {
    rpc.readContract.mockResolvedValue(escrowGift(1));
    rpc.waitForTransactionReceipt.mockResolvedValue({ status: "reverted" });
    await expect(adapter().giftChain.claimGift(claimInput)).rejects.toThrow("reverted");
  });
});
