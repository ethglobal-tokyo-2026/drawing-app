import { SEAL_RECEIPT_TIMEOUT_MS } from "@drawing-app/sticker-chain/seal-sticker";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  erc721Abi,
  keccak256,
  zeroAddress,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";
import { ChainUnavailableError } from "../deps.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import {
  CLAIM_RECEIPT_TIMEOUT_MS,
  createStickerChain,
  MINT_LOOKUP_DEADLINE_MS,
  RETURN_RECEIPT_TIMEOUT_MS,
  RPC_REQUEST_TIMEOUT_MS,
  RPC_RETRY_COUNT,
  rpcTransport,
} from "./stickerChain.ts";
import { stickerImageUrls } from "./imageStore.ts";

const rpc = vi.hoisted(() => ({
  readContract: vi.fn(),
  simulateContract: vi.fn(),
  getContractEvents: vi.fn(),
  getBlockNumber: vi.fn(),
  getCode: vi.fn(),
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
/** A Sealing retry's transaction, sent while the first seal's, TX, was pending. */
const RETRY_TX = hex("6");
const STICKER_ID = "00000000-0000-4000-8000-000000000001";
const METADATA = `https://images.test/${STICKER_ID}.json`;
const STICKER = {
  stickerId: STICKER_ID,
  artistId: "alice",
  contentHash: CONTENT,
  metadataUri: METADATA,
  number: 42,
  width: 256,
  height: 256,
};
/** The block whose state first holds the sticker's NFT. */
const MINT_BLOCK = 20n;
let logs: LogLines;

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

/** StickerNFT holds STICKER once the mint's `receipt` is read, and from MINT_BLOCK on. */
function mockMintReads(receipt: object = mintReceipt()) {
  let minted = false;
  rpc.readContract.mockImplementation(async ({ functionName, blockNumber }) => {
    if (functionName === "tokenIdForSticker")
      return blockNumber === undefined ? (minted ? 1n : 0n) : blockNumber >= MINT_BLOCK ? 1n : 0n;
    if (functionName === "artistOf") return ALICE;
    if (functionName === "contentHashOf") return CONTENT;
    if (functionName === "tokenURI") return METADATA;
    throw new Error(`Unexpected read ${functionName}`);
  });
  rpc.simulateContract.mockImplementation(async (request: object) => ({ request }));
  rpc.waitForTransactionReceipt.mockImplementation(async () => {
    minted = true;
    return receipt;
  });
}

/** A Sealing retry: its transaction, RETRY_TX, reverts once the first seal's, TX, mints. */
function mockRacedRetry() {
  mockMintReads({ status: "reverted", logs: [] });
  rpc.writeContract.mockResolvedValue(RETRY_TX);
  rpc.getContractEvents.mockResolvedValue([{ transactionHash: TX }]);
}

function adapter() {
  const saveMetadata = vi.fn(async () => {});
  const chain = createStickerChain({
    rpcUrl: "https://rpc.test",
    stickerContract: NFT,
    escrowContract: ESCROW,
    namesContract: "0x0000000000000000000000000000000000000cc0",
    resolverContract: "0x0000000000000000000000000000000000000cc1",
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
  logs = captureLogLines();
  rpc.writeContract.mockResolvedValue(TX);
  rpc.waitForTransactionReceipt.mockResolvedValue({ status: "success" });
  rpc.getBlockNumber.mockResolvedValue(31n);
  rpc.getCode.mockResolvedValue("0x1234");
});

afterEach(() => vi.restoreAllMocks());

describe("the RPC transport", () => {
  const ONE = "https://rpc.test/one";
  const TWO = "https://rpc.test/two";
  const BOTH = `${ONE}, ${TWO}`;
  const membersOf = (transport: ReturnType<ReturnType<typeof rpcTransport>>) =>
    transport.value && "transports" in transport.value ? transport.value.transports : [];

  /** The URLs one request through `rpcUrl` asks, in order, while every URL answers 503. */
  async function urlsAskedWhileDown(rpcUrl: string) {
    const asked: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      asked.push(url);
      return new Response(null, { status: 503 });
    });
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    await expect(
      rpcTransport(rpcUrl)({ chain: sepolia }).request({ method: "eth_blockNumber" }),
    ).rejects.toThrow();
    return asked;
  }

  it("is one URL's, or tries several separated by commas in turn", () => {
    expect(rpcTransport(ONE)({ chain: sepolia }).config.type).toBe("http");
    const several = rpcTransport(BOTH)({ chain: sepolia });
    expect(several.config.type).toBe("fallback");
    expect(membersOf(several)).toHaveLength(2);
  });

  it("bounds each request's time, and retries a failed one through every URL", async () => {
    const attempts = RPC_RETRY_COUNT + 1;
    expect(await urlsAskedWhileDown(ONE)).toEqual(Array.from({ length: attempts }, () => ONE));
    expect(await urlsAskedWhileDown(BOTH)).toEqual(
      Array.from({ length: attempts }, () => [ONE, TWO]).flat(),
    );
    expect(rpcTransport(ONE)({ chain: sepolia }).config.timeout).toBe(RPC_REQUEST_TIMEOUT_MS);
    expect(
      membersOf(rpcTransport(BOTH)({ chain: sepolia })).map(({ config }) => config.timeout),
    ).toEqual([RPC_REQUEST_TIMEOUT_MS, RPC_REQUEST_TIMEOUT_MS]);
  });
});

describe("Sepolia sticker adapter", () => {
  it("mints to the artist's smart wallet and recovers an existing mint without sending another", async () => {
    mockMintReads();
    rpc.getContractEvents.mockResolvedValue([{ transactionHash: TX }]);
    const chain = adapter();

    await expect(chain.mint(STICKER)).resolves.toEqual({ tokenId: "1", txHash: TX });
    // A mint that lands records the hash its receipt proves, without looking up the event.
    expect(rpc.getContractEvents).not.toHaveBeenCalled();
    await expect(chain.mint(STICKER)).resolves.toEqual({ tokenId: "1", txHash: TX });
    expect(rpc.getContractEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "StickerSealed",
        fromBlock: MINT_BLOCK,
        toBlock: MINT_BLOCK,
      }),
    );

    expect(rpc.writeContract).toHaveBeenCalledOnce();
    expect(rpc.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: TX,
      timeout: SEAL_RECEIPT_TIMEOUT_MS,
    });
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
    logs.expectLogged("chain.mint.wallet_lookup.completed", {
      stickerId: STICKER_ID,
      address: ALICE,
    });
    logs.expectLogged("chain.mint.simulate.completed", { stickerId: STICKER_ID });
    logs.expectLogged("chain.mint.submit.completed", { stickerId: STICKER_ID, txHash: TX });
    logs.expectLogged("chain.mint.receipt.completed", { txHash: TX, status: "success" });
    logs.expectLogged("chain.mint.confirmed", {
      stickerId: STICKER_ID,
      tokenId: "1",
      txHash: TX,
      recovered: true,
    });
    const output = logs.raw.join("\n");
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
    expect(rpc.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: TX,
      timeout: CLAIM_RECEIPT_TIMEOUT_MS,
    });
    logs.expectLogged("chain.claim.submitted", {
      giftId: GIFT_ID,
      recipientId: "bob",
      txHash: TX,
    });
    logs.expectLogged("chain.claim.receipt.result", {
      giftId: GIFT_ID,
      txHash: TX,
      status: "success",
    });
    expect(logs.raw.join("\n")).not.toContain(TOKEN);
  });

  it("does not confirm a mint whose receipt names a different recipient", async () => {
    mockMintReads(mintReceipt(BOB));
    await expect(adapter().mint(STICKER)).rejects.toThrow(
      "Mint receipt does not confirm the artist received the sticker",
    );
  });

  it("records the first seal's mint, not a retry's transaction that reverted behind it", async () => {
    mockRacedRetry();

    await expect(adapter().mint(STICKER)).resolves.toEqual({ tokenId: "1", txHash: TX });
    logs.expectLogged("chain.mint.receipt.completed", { txHash: RETRY_TX, status: "reverted" });
  });

  it("gives up finding a raced mint's transaction in time for Sealing to answer", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    mockRacedRetry();
    // The retry's transaction takes the mint's time to land.
    rpc.writeContract.mockImplementation(async () => {
      vi.setSystemTime(Date.now() + MINT_LOOKUP_DEADLINE_MS);
      return RETRY_TX;
    });

    await expect(adapter().mint(STICKER)).rejects.toThrow("timed out");
    expect(rpc.getContractEvents).not.toHaveBeenCalled();
  });

  it("recovers a landed claim after a receipt timeout, but rejects a claim won by another wallet", async () => {
    let claimed = false;
    rpc.readContract.mockImplementation(async ({ blockNumber }) =>
      escrowGift(blockNumber === undefined ? (claimed ? 2 : 1) : blockNumber >= 24n ? 2 : 1),
    );
    rpc.waitForTransactionReceipt.mockImplementation(async () => {
      claimed = true;
      throw new Error("Receipt timeout");
    });
    rpc.getContractEvents.mockResolvedValue([{ transactionHash: TX }]);
    const chain = adapter();

    await expect(chain.giftChain.claimGift(claimInput)).resolves.toEqual({
      claimed: true,
      txHash: TX,
    });
    expect(rpc.getContractEvents).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "GiftClaimed", fromBlock: 24n, toBlock: 24n }),
    );
    rpc.readContract.mockResolvedValue(escrowGift(2, ALICE));
    await expect(chain.giftChain.claimGift(claimInput)).resolves.toEqual({ claimed: false });
    expect(rpc.writeContract).toHaveBeenCalledOnce();
    logs.expectLogged("chain.claim.receipt.failed", { giftId: GIFT_ID, txHash: TX });
    logs.expectLogged("chain.claim.reconcile.result", {
      giftId: GIFT_ID,
      txHash: TX,
      recovered: true,
    });
    logs.expectLogged("chain.claim.reconcile.result", {
      giftId: GIFT_ID,
      recovered: false,
      status: "other_recipient",
    });
  });

  it("returns an expired gift through the relayer, and rejects a return that reverts", async () => {
    const chain = adapter();

    await expect(chain.giftChain.returnExpiredGift(GIFT_ID)).resolves.toEqual({ txHash: TX });
    expect(rpc.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: ESCROW,
        functionName: "returnExpiredGift",
        args: [GIFT_ID],
      }),
    );
    expect(rpc.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: TX,
      timeout: RETURN_RECEIPT_TIMEOUT_MS,
    });
    logs.expectLogged("chain.return.receipt.completed", { giftId: GIFT_ID, txHash: TX });

    rpc.waitForTransactionReceipt.mockResolvedValue({ status: "reverted" });
    await expect(chain.giftChain.returnExpiredGift(GIFT_ID)).rejects.toThrow("reverted");
    logs.expectLogged("chain.return.receipt.failed", { giftId: GIFT_ID, txHash: TX });
  });

  it("reports an escrow read the RPC failed as the chain being unavailable", async () => {
    rpc.readContract.mockRejectedValue(new Error("fetch failed"));
    await expect(adapter().giftChain.readEscrowGift(GIFT_ID)).rejects.toBeInstanceOf(
      ChainUnavailableError,
    );
  });

  it("does not report a reverted claim as successful", async () => {
    rpc.readContract.mockResolvedValue(escrowGift(1));
    rpc.waitForTransactionReceipt.mockResolvedValue({ status: "reverted" });
    await expect(adapter().giftChain.claimGift(claimInput)).rejects.toThrow("reverted");
    logs.expectLogged("chain.claim.receipt.result", { txHash: TX, status: "reverted" });
    logs.expectLogged("chain.claim.transaction.failed", { giftId: GIFT_ID, txHash: TX });
  });

  it("records the mint submission error before a failing reconciliation read", async () => {
    const submissionError = new Error(`RPC rejected https://rpc.test/private-key ${hex("5")}`);
    const reconciliationError = new Error("Reconciliation read unavailable");
    rpc.readContract.mockResolvedValueOnce(0n).mockRejectedValueOnce(reconciliationError);
    rpc.simulateContract.mockResolvedValue({ request: {} });
    rpc.writeContract.mockRejectedValue(submissionError);

    await expect(adapter().mint(STICKER)).rejects.toBe(reconciliationError);

    logs.expectLogged("chain.mint.transaction.failed", { stickerId: STICKER_ID });
    logs.expectLogged("chain.mint.reconcile.failed", { stickerId: STICKER_ID });
    const events = logs.entries.map((entry) => entry.event);
    expect(events.indexOf("chain.mint.transaction.failed")).toBeLessThan(
      events.indexOf("chain.mint.reconcile.failed"),
    );
    const output = logs.raw.join("\n");
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

    await expect(adapter().giftChain.claimGift(claimInput)).rejects.toSatisfy(
      (error) => error instanceof ChainUnavailableError && error.cause === reconciliationError,
    );

    logs.expectLogged("chain.claim.transaction.failed", { giftId: GIFT_ID, txHash: TX });
    logs.expectLogged("chain.claim.reconcile.failed", { giftId: GIFT_ID });
    const events = logs.entries.map((entry) => entry.event);
    expect(events.indexOf("chain.claim.transaction.failed")).toBeLessThan(
      events.indexOf("chain.claim.reconcile.failed"),
    );
    expect(logs.raw.join("\n")).toContain("Receipt timed out");
    expect(rpc.writeContract).toHaveBeenCalledOnce();
  });
});
