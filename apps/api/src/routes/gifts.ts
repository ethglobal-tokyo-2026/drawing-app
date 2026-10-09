import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppDeps } from "../deps.ts";
import { diagnosticStep, logInfo } from "../diagnostics.ts";
import { apiError, validate } from "../errors.ts";
import { submitDeposit } from "../gifts/deposit.ts";
import {
  packageBodySchema,
  packageGift,
  reportShared,
  sharedBodySchema,
} from "../gifts/packaging.ts";
import { startTakeOut, submitTakeOut } from "../gifts/takeOut.ts";
import {
  giftsForYou,
  openGiftBodySchema,
  previewGift,
  previewGiftForYou,
  receiveGift,
  receiveGiftForYou,
  type Receiving,
} from "../gifts/receiving.ts";
import type { AppEnv } from "../session.ts";
import {
  giftIdParam,
  signedTransactionSchema,
  toGift,
  toSponsoredTransaction,
  type Refusal,
} from "../shapes.ts";

/**
 * Each Giving and Receiving refusal's status. A transaction whose answer from Sui was lost is a 503:
 * the app sends the same signature again.
 */
const REFUSAL_STATUS = {
  sticker_not_found: 404,
  gift_not_found: 404,
  user_not_found: 404,
  not_yours: 403,
  not_minted: 409,
  no_sui_wallet: 409,
  gift_in_transit: 409,
  sponsorship_expired: 409,
  transaction_failed: 409,
  take_out_not_landed: 503,
  deposit_not_landed: 503,
  not_deposited: 409,
  gift_closed: 409,
  already_received: 409,
  group_chat: 403,
  own_gift: 403,
  taken_back: 409,
  gift_returned: 410,
  gift_expired: 410,
  nsfw_not_opted_in: 403,
  claim_failed: 503,
} as const satisfies Record<string, ContentfulStatusCode>;

const refused = <Code extends keyof typeof REFUSAL_STATUS>(
  c: Context,
  { refusal, detail }: Refusal<Code>,
) => apiError(c, REFUSAL_STATUS[refusal], refusal, detail);

/** A Receiving's answer: the sticker on the receiver's board, or why not. */
function received(c: Context<AppEnv>, receiving: Receiving) {
  if (receiving.refusal !== null) return refused(c, receiving);
  logInfo("gift.receive.recorded", {
    giftId: receiving.received.gift.id,
    stickerId: receiving.received.sticker.id,
    userId: c.var.userId,
  });
  return c.json(receiving.received, 200);
}

/** Giving and Receiving. */
export const giftRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    .post("/preview", validate("json", openGiftBodySchema), async (c) => {
      const previewing = await previewGift(deps, c.var.userId, c.req.valid("json"));
      if (previewing.refusal !== null) return refused(c, previewing);
      return c.json(previewing.preview, 200);
    })
    .post("/receive", validate("json", openGiftBodySchema), async (c) => {
      const receiving = await diagnosticStep("gift.receive", { userId: c.var.userId }, () =>
        receiveGift(deps, c.var.userId, c.req.valid("json")),
      );
      return received(c, receiving);
    })
    .get("/for-you", (c) => c.json(giftsForYou(deps, c.var.userId), 200))
    .get("/:giftId/preview", validate("param", giftIdParam), async (c) => {
      const previewing = await previewGiftForYou(deps, c.var.userId, c.req.valid("param").giftId);
      if (previewing.refusal !== null) return refused(c, previewing);
      return c.json(previewing.preview, 200);
    })
    .post("/:giftId/receive", validate("param", giftIdParam), async (c) => {
      const giftId = c.req.valid("param").giftId;
      const receiving = await diagnosticStep(
        "gift.receive_for_you",
        { giftId, userId: c.var.userId },
        () => receiveGiftForYou(deps, c.var.userId, giftId),
      );
      return received(c, receiving);
    })
    .post("/", validate("json", packageBodySchema), async (c) => {
      const body = c.req.valid("json");
      const stickerId = body.stickerId;
      const packaging = await diagnosticStep(
        "gift.package",
        { stickerId, userId: c.var.userId },
        () => packageGift(deps, c.var.userId, body),
      );
      if (packaging.refusal !== null) return refused(c, packaging);
      logInfo("gift.package.ready", { stickerId, giftId: packaging.packaged.gift.id });
      return packaging.created ? c.json(packaging.packaged, 201) : c.json(packaging.packaged, 200);
    })
    .post(
      "/:giftId/deposit",
      validate("param", giftIdParam),
      validate("json", signedTransactionSchema),
      async (c) => {
        const giftId = c.req.valid("param").giftId;
        const signed = c.req.valid("json");
        const deposited = await diagnosticStep(
          "gift.deposit",
          { giftId, userId: c.var.userId, txDigest: signed.digest },
          () => submitDeposit(deps, c.var.userId, giftId, signed),
        );
        if (deposited.refusal !== null) return refused(c, deposited);
        return c.json({ gift: toGift(deposited.gift) }, 200);
      },
    )
    .post(
      "/:giftId/shared",
      validate("param", giftIdParam),
      validate("json", sharedBodySchema),
      (c) => {
        const { giftId } = c.req.valid("param");
        const shared = reportShared(deps, c.var.userId, giftId, c.req.valid("json").outcome);
        if (shared.refusal !== null) return refused(c, shared);
        return c.json({ gift: toGift(shared.gift) }, 200);
      },
    )
    .post("/:giftId/take-out/start", validate("param", giftIdParam), async (c) => {
      const giftId = c.req.valid("param").giftId;
      const started = await diagnosticStep(
        "gift.take_out.start",
        { giftId, userId: c.var.userId },
        () => startTakeOut(deps, c.var.userId, giftId),
      );
      if (started.refusal !== null) return refused(c, started);
      const gift = toGift(started.gift);
      if (!started.takeOut) return c.json({ gift }, 200);
      return c.json({ gift, takeOut: toSponsoredTransaction(started.takeOut) }, 200);
    })
    .post(
      "/:giftId/take-out",
      validate("param", giftIdParam),
      validate("json", signedTransactionSchema),
      async (c) => {
        const giftId = c.req.valid("param").giftId;
        const signed = c.req.valid("json");
        const takenOut = await diagnosticStep(
          "gift.take_out",
          { giftId, userId: c.var.userId, txDigest: signed.digest },
          () => submitTakeOut(deps, c.var.userId, giftId, signed),
        );
        if (takenOut.refusal !== null) return refused(c, takenOut);
        return c.json({ gift: toGift(takenOut.gift) }, 200);
      },
    );
