import { encodeFunctionData, isAddress, isHex, type Address, type Hex } from "viem";
import { ApiError } from "../api/apiClient";
import { postJson, requiredObject, requiredString } from "../api/request";
import { ensureApiSession } from "../api/session";
import { sendSmartWalletTransaction } from "../identity/smartWallet";
import type { GiftBackend } from "./giftBackend";
import { buildGiftMessage } from "./giftMessage";
import type { GiftRecord, GiftStore } from "./giftStore";

interface ApiGiftBackendOptions {
  store: GiftStore;
  fromHandle: string;
  liffId: string;
  heroUrl?: string;
  now?: () => number;
}

const takeOutAbi = [
  {
    type: "function",
    name: "takeOut",
    stateMutability: "nonpayable",
    inputs: [{ name: "giftId", type: "bytes32" }],
    outputs: [],
  },
] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readGift(value: unknown) {
  const root = requiredObject(value, "gift response");
  const gift = requiredObject(root.gift, "gift");
  const id = requiredString(gift.id, "gift.id");
  const packedAt = Date.parse(requiredString(gift.packedAt, "gift.packedAt"));
  if (!isHex(id) || id.length !== 66 || !Number.isFinite(packedAt)) {
    throw new Error("The packed gift response is invalid");
  }
  return { root, id, packedAt };
}

function readTransfer(value: unknown): { to: Address; data: Hex } | null {
  if (value === null) return null;
  const transfer = requiredObject(value, "escrowTransfer");
  const to = requiredString(transfer.to, "escrowTransfer.to");
  const data = requiredString(transfer.data, "escrowTransfer.data");
  if (!isAddress(to) || !isHex(data)) throw new Error("The escrow transfer is invalid");
  return { to, data };
}

async function confirmDeposit(giftId: string, txHash: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      await postJson(`/api/gifts/${encodeURIComponent(giftId)}/deposit`, { txHash });
      return;
    } catch (error) {
      if (!(error instanceof ApiError && error.code === "deposit_not_landed") || attempt >= 7) {
        throw error;
      }
      await sleep(500 + attempt * 350);
    }
  }
}

function packedRecord(store: GiftStore, giftId: string): Extract<GiftRecord, { state: "packed" }> {
  const record = store.get(giftId);
  if (!record || record.state !== "packed") {
    throw new Error(`Gift ${giftId} isn't packed on this device`);
  }
  return record;
}

/** Giving backed by the REST API and sponsored Sepolia smart-account transactions. */
export function createApiGiftBackend({
  store,
  fromHandle,
  liffId,
  heroUrl,
  now = Date.now,
}: ApiGiftBackendOptions): GiftBackend {
  return {
    pack: async (sticker) => {
      await ensureApiSession();
      const { root, id, packedAt } = readGift(
        await postJson("/api/gifts", { stickerId: sticker.id }),
      );
      const existing = store.get(id);
      const issuedToken = root.giftClaimToken;
      if (issuedToken !== null && (typeof issuedToken !== "string" || !issuedToken)) {
        throw new Error("The gift claim token is invalid");
      }
      const claimToken = issuedToken ?? existing?.claimToken;
      if (!claimToken) {
        throw new Error(
          "This gift is already packed, but its gift claim token is not on this device",
        );
      }
      const transfer = readTransfer(root.escrowTransfer);
      let record: Extract<GiftRecord, { state: "packed" }> = {
        id,
        stickerId: sticker.id,
        state: "packed",
        packedAt,
        claimToken,
        escrowed: Boolean(transfer) || existing?.escrowed === true,
        ...(existing?.depositTxHash && { depositTxHash: existing.depositTxHash }),
      };
      store.put(record);

      if (record.escrowed) {
        let txHash = record.depositTxHash;
        if (!txHash) {
          if (!transfer) throw new Error("The escrow deposit is missing its transaction");
          txHash = await sendSmartWalletTransaction(transfer);
          record = { ...record, depositTxHash: txHash };
          store.put(record);
        }
        await confirmDeposit(id, txHash);
      }

      return {
        giftId: id,
        message: buildGiftMessage({
          liffId,
          giftClaimToken: claimToken,
          fromHandle,
          timeUsed: sticker.timeUsed,
          heroUrl,
        }),
      };
    },

    markShared: async (giftId, outcome) => {
      await ensureApiSession();
      await postJson(`/api/gifts/${encodeURIComponent(giftId)}/shared`, { outcome });
      if (outcome === "cancelled") return;
      const record = packedRecord(store, giftId);
      store.put({ ...record, state: "sent", sentAt: now() });
    },

    takeOut: async (giftId) => {
      await ensureApiSession();
      let record = packedRecord(store, giftId);
      if (record.escrowed && !record.takenOutOnChain) {
        const configured: unknown = import.meta.env.VITE_STICKER_ESCROW_ADDRESS;
        if (typeof configured !== "string" || !isAddress(configured)) {
          throw new Error("VITE_STICKER_ESCROW_ADDRESS is not configured");
        }
        if (!isHex(giftId) || giftId.length !== 66) throw new Error("The gift ID is invalid");
        await sendSmartWalletTransaction({
          to: configured,
          data: encodeFunctionData({ abi: takeOutAbi, functionName: "takeOut", args: [giftId] }),
        });
        record = { ...record, takenOutOnChain: true };
        store.put(record);
      }
      await postJson(`/api/gifts/${encodeURIComponent(giftId)}/take-out`);
      store.put({
        ...record,
        state: "not_sent",
        closedAt: now(),
        reason: "taken_out",
      });
    },
  };
}
