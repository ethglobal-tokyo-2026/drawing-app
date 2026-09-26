import { encodeFunctionData, type Address, type Hash, type Hex } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiGiftBackend } from "./apiGiftBackend";
import { createGiftStore, memoryStorage } from "./giftStore";

const mocks = vi.hoisted(() => ({
  ensureApiSession: vi.fn(() => Promise.resolve()),
  sendSmartWalletTransaction: vi.fn(() => Promise.resolve(`0x${"4".repeat(64)}` as `0x${string}`)),
}));

vi.mock("../api/session", () => ({ ensureApiSession: mocks.ensureApiSession }));
vi.mock("../identity/smartWallet", () => ({
  sendSmartWalletTransaction: mocks.sendSmartWalletTransaction,
}));

const GIFT_ID = `0x${"1".repeat(64)}` as Hex;
const CLAIM_TOKEN = `0x${"2".repeat(64)}` as Hex;
const TRANSACTION_HASH = `0x${"4".repeat(64)}` as Hash;
const NFT = `0x${"5".repeat(40)}` as Address;
const ESCROW = `0x${"6".repeat(40)}` as Address;
const TRANSFER_DATA = `0x${"7".repeat(64)}` as Hex;
const PACKED_AT = "2026-09-26T06:00:00.000Z";

const takeOutAbi = [
  {
    type: "function",
    name: "takeOut",
    stateMutability: "nonpayable",
    inputs: [{ name: "giftId", type: "bytes32" }],
    outputs: [],
  },
] as const;

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const packedResponse = ({
  claimToken = CLAIM_TOKEN,
  transfer = { to: NFT, data: TRANSFER_DATA },
}: {
  claimToken?: Hex | null;
  transfer?: { to: Address; data: Hex } | null;
} = {}) => ({
  gift: { id: GIFT_ID, packedAt: PACKED_AT },
  giftClaimToken: claimToken,
  escrowTransfer: transfer,
});

const sticker = { id: "sticker-1", no: 12, timeUsed: 90 };

const requestPath = (input: RequestInfo | URL) =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

describe("API Giving with the escrow", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_STICKER_ESCROW_ADDRESS", ESCROW);
    mocks.ensureApiSession.mockClear();
    mocks.sendSmartWalletTransaction.mockClear();
    mocks.sendSmartWalletTransaction.mockResolvedValue(TRANSACTION_HASH);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("puts a sticker in the escrow before returning its LINE message", async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = requestPath(input);
      if (path === "/api/gifts") return response(packedResponse(), 201);
      if (path === `/api/gifts/${GIFT_ID}/deposit`) return response({ gift: { id: GIFT_ID } });
      throw new Error(`Unexpected request ${path}`);
    });
    const store = createGiftStore(memoryStorage());
    const backend = createApiGiftBackend({ store, fromHandle: "alice", liffId: "123-abc" });

    const packed = await backend.pack(sticker);

    expect(mocks.ensureApiSession).toHaveBeenCalledOnce();
    expect(mocks.sendSmartWalletTransaction).toHaveBeenCalledWith({
      to: NFT,
      data: TRANSFER_DATA,
    });
    expect(fetchMock.mock.calls.map(([path]) => requestPath(path))).toEqual([
      "/api/gifts",
      `/api/gifts/${GIFT_ID}/deposit`,
    ]);
    expect(JSON.stringify(packed.message)).toContain(CLAIM_TOKEN);
    expect(store.get(GIFT_ID)).toMatchObject({
      state: "packed",
      escrowed: true,
      depositTxHash: TRANSACTION_HASH,
    });
  });

  it("resumes deposit confirmation after a reload without sending the transfer twice", async () => {
    const store = createGiftStore(memoryStorage());
    store.put({
      id: GIFT_ID,
      stickerId: sticker.id,
      state: "packed",
      packedAt: Date.parse(PACKED_AT),
      claimToken: CLAIM_TOKEN,
      escrowed: true,
      depositTxHash: TRANSACTION_HASH,
    });
    fetchMock.mockImplementation(async (input) => {
      const path = requestPath(input);
      if (path === "/api/gifts") {
        return response(packedResponse({ claimToken: null, transfer: null }));
      }
      if (path === `/api/gifts/${GIFT_ID}/deposit`) return response({ gift: { id: GIFT_ID } });
      throw new Error(`Unexpected request ${path}`);
    });
    const backend = createApiGiftBackend({ store, fromHandle: "alice", liffId: "123-abc" });

    await backend.pack(sticker);

    expect(mocks.sendSmartWalletTransaction).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.map(([path]) => requestPath(path))).toEqual([
      "/api/gifts",
      `/api/gifts/${GIFT_ID}/deposit`,
    ]);
  });

  it("takes a cancelled gift out through the smart account before closing it in the API", async () => {
    const store = createGiftStore(memoryStorage());
    store.put({
      id: GIFT_ID,
      stickerId: sticker.id,
      state: "packed",
      packedAt: Date.parse(PACKED_AT),
      claimToken: CLAIM_TOKEN,
      escrowed: true,
      depositTxHash: TRANSACTION_HASH,
    });
    fetchMock.mockResolvedValue(response({ gift: { id: GIFT_ID } }));
    const backend = createApiGiftBackend({ store, fromHandle: "alice", liffId: "123-abc" });

    await backend.takeOut(GIFT_ID);

    expect(mocks.sendSmartWalletTransaction).toHaveBeenCalledWith({
      to: ESCROW,
      data: encodeFunctionData({
        abi: takeOutAbi,
        functionName: "takeOut",
        args: [GIFT_ID],
      }),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/gifts/${GIFT_ID}/take-out`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(store.get(GIFT_ID)).toMatchObject({
      state: "not_sent",
      reason: "taken_out",
      takenOutOnChain: true,
    });
  });
});
