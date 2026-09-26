import {
  stickerPlacements,
  stickers,
  stickerTimelapses,
  ticketUses,
  type Db,
} from "@drawing-app/db";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { queueNaming } from "../ens/naming.ts";
import type { AppDeps } from "../deps.ts";
import { diagnosticStep, failureCause, logFailure, logInfo } from "../diagnostics.ts";
import { keccak256 } from "../keccak256.ts";
import { stickerImagesSchema, type StickerImages } from "../shapes.ts";
import {
  loadStickers,
  stickerPlacementSchema,
  stickerSchema,
  toStickerPlacement,
} from "../views.ts";
import type { SealForm } from "./sealForm.ts";

/** POST /api/stickers's answer. */
export const sealResponseSchema = z.object({
  sticker: stickerSchema,
  stickerPlacement: stickerPlacementSchema,
});
export type SealResponse = z.infer<typeof sealResponseSchema>;

/** Why a seal was refused: the contract's status and code, and what failed. */
export type SealRefusal =
  | { status: 400; error: "invalid_request"; detail: string }
  | { status: 403; error: "ticket_not_yours"; detail: string }
  | { status: 404; error: "ticket_not_found"; detail: string }
  | { status: 409; error: "ticket_already_used"; detail: string }
  | { status: 503; error: "mint_failed"; detail: string };

type StickerPngs = Record<keyof StickerImages, Uint8Array>;

const invalid = (detail: string): SealRefusal => ({
  status: 400,
  error: "invalid_request",
  detail,
});

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR_DATA_BYTES = 13;
/** After the signature: IHDR's data length, its type, then the width and height it holds. */
const IHDR_LENGTH_AT = 8;
const IHDR_TYPE_AT = 12;
const IHDR_WIDTH_AT = 16;
const IHDR_HEIGHT_AT = 20;
const IHDR_SIZE_END = 24;

/** A PNG's size from its IHDR chunk; null for bytes that don't start as a PNG does. */
function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < IHDR_SIZE_END) return null;
  if (PNG_SIGNATURE.some((byte, at) => bytes[at] !== byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const type = String.fromCharCode(...bytes.subarray(IHDR_TYPE_AT, IHDR_WIDTH_AT));
  if (view.getUint32(IHDR_LENGTH_AT) !== IHDR_DATA_BYTES || type !== "IHDR") return null;
  return { width: view.getUint32(IHDR_WIDTH_AT), height: view.getUint32(IHDR_HEIGHT_AT) };
}

/** Each image must be a PNG, and the sticker PNG and its mask the sticker's size. */
function checkImages(pngs: StickerPngs, { width, height }: SealForm): SealRefusal | null {
  for (const part of stickerImagesSchema.keyof().options) {
    const size = pngSize(pngs[part]);
    if (!size) return invalid(`${part}: not a PNG`);
    // spec and rim are band-sized and flat is sheet-sized, so only these two match the sticker.
    const stickerSized = part === "png" || part === "mask";
    if (stickerSized && (size.width !== width || size.height !== height)) {
      return invalid(
        `${part}: ${size.width}×${size.height} px, not the sticker's ${width}×${height}`,
      );
    }
  }
  return null;
}

/** Whether the person can seal on this ticket: theirs, and not yet a sticker. */
function checkTicket(
  db: Pick<Db, "select">,
  ticketUseId: number,
  userId: string,
): { stickerId: string | null } | SealRefusal {
  const ticket = db
    .select({ userId: ticketUses.userId, stickerId: ticketUses.stickerId })
    .from(ticketUses)
    .where(eq(ticketUses.id, ticketUseId))
    .get();
  if (!ticket) {
    return { status: 404, error: "ticket_not_found", detail: `No ticket use ${ticketUseId}` };
  }
  if (ticket.userId !== userId) {
    const detail = `Ticket use ${ticketUseId} is someone else's`;
    return { status: 403, error: "ticket_not_yours", detail };
  }
  return { stickerId: ticket.stickerId };
}

const bytesOf = async (file: File) => new Uint8Array(await file.arrayBuffer());

/**
 * The seal already holds when the mint runs: the ticket is spent and the rows are written. So a
 * failed confirmation keeps the sticker for a same-ticket retry, which reconciles its NFT.
 */
async function mintSticker(deps: AppDeps, stickerId: string): Promise<SealRefusal | null> {
  const sticker = deps.db.select().from(stickers).where(eq(stickers.id, stickerId)).get();
  if (!sticker) throw new Error(`Sticker ${stickerId} is missing before its mint`);
  if (sticker.tokenId !== null && sticker.mintTxHash !== null) return null;
  let minted;
  try {
    minted = await deps.mint({
      stickerId,
      artistId: sticker.artistId,
      contentHash: sticker.contentHash,
      metadataUri: sticker.metadataUri,
      number: sticker.number,
      sealedAt: sticker.createdAt,
      width: sticker.width,
      height: sticker.height,
    });
    if (minted === null && deps.giftChain !== null) {
      throw new Error("The mint returned no confirmed NFT");
    }
  } catch (error) {
    logFailure("sticker.mint.failed", error, { stickerId, artistId: sticker.artistId });
    return {
      status: 503,
      error: "mint_failed",
      detail: `Sticker ${stickerId} is saved, but its NFT could not be confirmed (${failureCause(error)}). Retry Sealing with the same ticket; no new ticket is needed.`,
    };
  }
  // Explicit local mock mode stores stickers without sending a mint transaction.
  if (minted === null) return null;
  deps.db
    .update(stickers)
    .set({ tokenId: minted.tokenId, mintTxHash: minted.txHash })
    .where(eq(stickers.id, stickerId))
    .run();
  logInfo("sticker.mint.recorded", { stickerId, tokenId: minted.tokenId, txHash: minted.txHash });
  return null;
}

function sealedSticker({ db, images }: AppDeps, userId: string, stickerId: string): SealResponse {
  const sticker = loadStickers(db, [stickerId], images.urls).get(stickerId);
  const placement = db
    .select()
    .from(stickerPlacements)
    .where(and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, stickerId)))
    .get();
  if (!sticker || !placement) {
    throw new Error(`Sticker ${stickerId} lost its row or its placement right after its seal`);
  }
  return { sticker, stickerPlacement: toStickerPlacement(placement) };
}

/**
 * Seals a drawing: checks the ticket and the images, stores the files, writes the sticker, then
 * mints it. The files go first, so no sticker row names a file that isn't stored.
 */
export async function sealSticker(
  deps: AppDeps,
  userId: string,
  form: SealForm,
): Promise<{ sealed: SealResponse; created: boolean } | { refused: SealRefusal }> {
  // Checked before any file is stored, and again where the rows are written.
  const ticket = checkTicket(deps.db, form.ticketUseId, userId);
  if (!("stickerId" in ticket)) return { refused: ticket };
  if (ticket.stickerId !== null) {
    logInfo("sticker.seal.retry", { stickerId: ticket.stickerId, userId });
    const refused = await mintSticker(deps, ticket.stickerId);
    if (refused) return { refused };
    queueNaming(deps, userId);
    return { sealed: sealedSticker(deps, userId, ticket.stickerId), created: false };
  }

  const pngs: StickerPngs = {
    png: await bytesOf(form.png),
    mask: await bytesOf(form.mask),
    spec: await bytesOf(form.spec),
    rim: await bytesOf(form.rim),
    flat: await bytesOf(form.flat),
  };
  const imageRefusal = checkImages(pngs, form);
  if (imageRefusal) return { refused: imageRefusal };

  // Hashed here, never taken from the client: the hash names files other stickers may share. The
  // store keeps a name's first files, so a PNG sealed before keeps its first seal's images.
  const contentHash = keccak256(pngs.png);
  await diagnosticStep("sticker.images.save", { userId }, () =>
    deps.images.save(contentHash, pngs),
  );
  const timelapse = form.timelapse ? Buffer.from(await form.timelapse.arrayBuffer()) : null;

  const stickerId = deps.ids.uuid();
  // The NFT's metadata JSON sits beside the sticker's images on the CDN; the mint writes it.
  const metadataUri = new URL(`${stickerId}.json`, deps.images.urls(contentHash).png).href;
  const refused = deps.db.transaction(
    (tx) => {
      const checked = checkTicket(tx, form.ticketUseId, userId);
      if (!("stickerId" in checked)) return checked;
      if (checked.stickerId !== null) {
        const detail = `Ticket use ${form.ticketUseId} already became sticker ${checked.stickerId}`;
        return { status: 409, error: "ticket_already_used", detail } satisfies SealRefusal;
      }
      const last = tx
        .select({ number: max(stickers.number) })
        .from(stickers)
        .get();
      tx.insert(stickers)
        .values({
          id: stickerId,
          number: (last?.number ?? 0) + 1,
          artistId: userId,
          ownerId: userId,
          timeUsed: form.timeUsed,
          width: form.width,
          height: form.height,
          outline: form.outline,
          contentHash,
          metadataUri,
        })
        .run();
      tx.update(ticketUses).set({ stickerId }).where(eq(ticketUses.id, form.ticketUseId)).run();
      // No spot and no seen_at: the sticker tray shows it as NEW.
      tx.insert(stickerPlacements).values({ userId, stickerId }).run();
      if (timelapse) tx.insert(stickerTimelapses).values({ stickerId, ops: timelapse }).run();
      return null;
    },
    { behavior: "immediate" },
  );
  if (refused) return { refused };

  logInfo("sticker.seal.saved", { stickerId, userId });
  const mintRefusal = await mintSticker(deps, stickerId);
  if (mintRefusal) return { refused: mintRefusal };
  queueNaming(deps, userId);
  return { sealed: sealedSticker(deps, userId, stickerId), created: true };
}
