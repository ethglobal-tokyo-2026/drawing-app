import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  erc721Abi,
  keccak256,
  zeroAddress,
  type Hex,
} from "viem";
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
const ALICE: Hex = `0x${"a".repeat(40)}`;
const BOB: Hex = `0x${"b".repeat(40)}`;
const NFT = `0x${"c".repeat(40)}`;
const ESCROW = `0x${"d".repeat(40)}`;
const TX = hex("1");
const TOKEN = hex("2");
const GIFT_ID = hex("3");
const CONTENT = hex("4");
const STICKER_ID = "00000000-0000-4000-8000-000000000001";
const METADATA = `https://images.test/${STICKER_ID}.json`;
const diagnostics: unknown[] = [];

function captureDiagnostic(line: unknown) {
  if (typeof line !== "string") throw new Error("Expected a structured diagnostic");
  const entry: unknown = JSON.parse(line);
  diagnostics.push(entry);
}

function expectDiagnostic(event: string, fields: object = {}) {
  expect(diagnostics).toContainEqual(expect.objectContaining({ event, ...fields }));
}

function diagnosticEvents() {
  return diagnostics.map((entry) =>
    typeof entry === "object" && entry !== null && "event" in entry ? entry.event : undefined,
  );
}

function mintReceipt(to: Hex = ALICE) {
  return {
    status: "success",
    logs: [
      {
        address: NFT,
        topics: encodeEventTopics({
          abi: erc721Abi,
          eventName: "Transfer",
          args: { from: zeroAddress, to, tokenId: 1n },
        }),
        data: encodeAbiParameters([], []),
      },
    ],
  };
}

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
  diagnostics.length = 0;
  vi.spyOn(console, "info").mockImplementation(captureDiagnostic);
  vi.spyOn(console, "error").mockImplementation(captureDiagnostic);
  rpc.writeContract.mockResolvedValue(TX);
  rpc.waitForTransactionReceipt.mockResolvedValue({ status: "success" });
});

afterEach(() => vi.restoreAllMocks());

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
      return mintReceipt();
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
    expectDiagnostic("chain.mint.wallet_lookup.completed", {
      stickerId: STICKER_ID,
      address: ALICE,
    });
    expectDiagnostic("chain.mint.simulate.completed", { stickerId: STICKER_ID });
    expectDiagnostic("chain.mint.submit.completed", { stickerId: STICKER_ID, txHash: TX });
    expectDiagnostic("chain.mint.receipt.completed", { txHash: TX, status: "success" });
    expectDiagnostic("chain.mint.confirmed", {
      stickerId: STICKER_ID,
      tokenId: "1",
      txHash: TX,
      recovered: true,
    });
    const output = JSON.stringify(diagnostics);
    expect(output).not.toContain(METADATA);
    expect(output).not.toContain(CONTENT);
    expect(output).not.toContain(hex("5"));
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
    expectDiagnostic("chain.claim.submitted", { giftId: GIFT_ID, recipientId: "bob", txHash: TX });
    expectDiagnostic("chain.claim.receipt.result", {
      giftId: GIFT_ID,
      txHash: TX,
      status: "success",
    });
    expect(JSON.stringify(diagnostics)).not.toContain(TOKEN);
  });

  it("does not confirm a mint whose receipt names a different recipient", async () => {
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
      return mintReceipt(BOB);
    });
    await expect(
      adapter().mint({
        stickerId: STICKER_ID,
        artistId: "alice",
        contentHash: CONTENT,
        metadataUri: METADATA,
      }),
    ).rejects.toThrow("Mint receipt does not confirm the artist received the sticker");
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
    expectDiagnostic("chain.claim.receipt.failed", { giftId: GIFT_ID, txHash: TX });
    expectDiagnostic("chain.claim.reconcile.result", {
      giftId: GIFT_ID,
      txHash: TX,
      recovered: true,
    });
    expectDiagnostic("chain.claim.reconcile.result", {
      giftId: GIFT_ID,
      recovered: false,
      status: "other_recipient",
    });
  });

  it("does not report a reverted claim as successful", async () => {
    rpc.readContract.mockResolvedValue(escrowGift(1));
    rpc.waitForTransactionReceipt.mockResolvedValue({ status: "reverted" });
    await expect(adapter().giftChain.claimGift(claimInput)).rejects.toThrow("reverted");
    expectDiagnostic("chain.claim.receipt.result", { txHash: TX, status: "reverted" });
    expectDiagnostic("chain.claim.transaction.failed", { giftId: GIFT_ID, txHash: TX });
  });

  it("records the mint submission error before a failing reconciliation read", async () => {
    const submissionError = new Error(`RPC rejected https://rpc.test/private-key ${hex("5")}`);
    const reconciliationError = new Error("Reconciliation read unavailable");
    rpc.readContract.mockResolvedValueOnce(0n).mockRejectedValueOnce(reconciliationError);
    rpc.simulateContract.mockResolvedValue({ request: {} });
    rpc.writeContract.mockRejectedValue(submissionError);

    await expect(
      adapter().mint({
        stickerId: STICKER_ID,
        artistId: "alice",
        contentHash: CONTENT,
        metadataUri: METADATA,
      }),
    ).rejects.toBe(reconciliationError);

    expectDiagnostic("chain.mint.transaction.failed", { stickerId: STICKER_ID });
    expectDiagnostic("chain.mint.reconcile.failed", { stickerId: STICKER_ID });
    const events = diagnosticEvents();
    expect(events.indexOf("chain.mint.transaction.failed")).toBeLessThan(
      events.indexOf("chain.mint.reconcile.failed"),
    );
    const output = JSON.stringify(diagnostics);
    expect(output).toContain("RPC rejected");
    expect(output).not.toContain("https://rpc.test/private-key");
    expect(output).not.toContain(hex("5"));
  });

  it("retains the submitted claim hash and first error when reconciliation also fails", async () => {
    const reconciliationError = new Error("Reconciliation read unavailable");
    rpc.readContract.mockResolvedValue(escrowGift(1));
    rpc.waitForTransactionReceipt.mockImplementation(async () => {
      rpc.readContract.mockRejectedValue(reconciliationError);
      throw new Error("Receipt timed out");
    });

    await expect(adapter().giftChain.claimGift(claimInput)).rejects.toBe(reconciliationError);

    expectDiagnostic("chain.claim.transaction.failed", { giftId: GIFT_ID, txHash: TX });
    expectDiagnostic("chain.claim.reconcile.failed", { giftId: GIFT_ID });
    const events = diagnosticEvents();
    expect(events.indexOf("chain.claim.transaction.failed")).toBeLessThan(
      events.indexOf("chain.claim.reconcile.failed"),
    );
    expect(JSON.stringify(diagnostics)).toContain("Receipt timed out");
    expect(rpc.writeContract).toHaveBeenCalledOnce();
  });
});
