import { ensureApiSession } from "../../api/session";
import {
  postJson,
  requestJson,
  requiredNumber,
  requiredObject,
  requiredString,
} from "../../api/request";
import { requireSmartWallet } from "../../identity/smartWallet";
import type { SpentTicket, TicketKind } from "../../tickets/tickets";
import type { Op } from "../canvas/ops";
import type { SealedSticker } from "./makeSticker";
import { gzipTimelapse, makeTimelapse } from "./timelapse";

export interface ApiStickerIdentity {
  id: string;
  no: number;
  createdAt: number;
  contentHash: string;
  tokenId: string;
  mintTxHash: string;
}

function ticketUseId(value: unknown): number {
  const root = requiredObject(value, "ticket spend response");
  const ticketUse = requiredObject(root.ticketUse, "ticketUse");
  const id = requiredNumber(ticketUse.id, "ticketUse.id");
  if (!Number.isInteger(id) || id <= 0) throw new Error("ticketUse.id is invalid");
  return id;
}

export async function reserveServerTicket(
  spent: SpentTicket,
  kind: TicketKind,
): Promise<SpentTicket> {
  if (spent.serverId !== undefined) return spent;
  await ensureApiSession();
  return { ...spent, serverId: ticketUseId(await postJson("/api/tickets/spend", { kind })) };
}

function stickerIdentity(value: unknown): ApiStickerIdentity {
  const root = requiredObject(value, "seal response");
  const sticker = requiredObject(root.sticker, "sticker");
  const tokenId = requiredString(sticker.tokenId, "sticker.tokenId");
  const mintTxHash = requiredString(sticker.mintTxHash, "sticker.mintTxHash");
  return {
    id: requiredString(sticker.id, "sticker.id"),
    no: requiredNumber(sticker.number, "sticker.number"),
    createdAt: Date.parse(requiredString(sticker.sealedAt, "sticker.sealedAt")),
    contentHash: requiredString(sticker.contentHash, "sticker.contentHash"),
    tokenId,
    mintTxHash,
  };
}

/** Uploads every sealed layer, waits for the server mint, and returns its authoritative identity. */
export async function sealStickerThroughApi({
  ticket,
  timeUsed,
  sticker,
  ops,
}: {
  ticket: SpentTicket;
  timeUsed: number;
  sticker: SealedSticker;
  ops: readonly Op[];
}): Promise<ApiStickerIdentity> {
  if (ticket.serverId === undefined) throw new Error("The drawing has no server ticket");
  requireSmartWallet();
  await ensureApiSession();
  const form = new FormData();
  form.set("ticketUseId", String(ticket.serverId));
  form.set("timeUsed", String(timeUsed));
  form.set("width", String(sticker.width));
  form.set("height", String(sticker.height));
  form.set("outline", sticker.outline);
  form.set("png", sticker.png, "sticker.png");
  form.set("mask", sticker.mask, "sticker.mask.png");
  form.set("spec", sticker.spec, "sticker.spec.png");
  form.set("rim", sticker.rim, "sticker.rim.png");
  form.set("flat", sticker.flat, "sticker.flat.png");
  form.set(
    "timelapse",
    await gzipTimelapse(makeTimelapse(sticker, ops)),
    "sticker.timelapse.json.gz",
  );
  const identity = stickerIdentity(
    await requestJson("/api/stickers", { method: "POST", body: form }, 90_000),
  );
  if (!Number.isInteger(identity.no) || identity.no <= 0 || !Number.isFinite(identity.createdAt)) {
    throw new Error("The sealed sticker response is invalid");
  }
  return identity;
}
