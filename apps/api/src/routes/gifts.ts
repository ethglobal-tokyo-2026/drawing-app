import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppDeps } from "../deps.ts";
import { diagnosticStep, logInfo } from "../diagnostics.ts";
import { apiError, validate } from "../errors.ts";
import { depositBodySchema, reportDeposit } from "../gifts/deposit.ts";
import {
  packageBodySchema,
  packageGift,
  pendingGifts,
  reportShared,
  sharedBodySchema,
  takeOut,
} from "../gifts/packaging.ts";
import {
  giftsForYou,
  openGiftBodySchema,
  previewGift,
  receiveGift,
  receiveGiftForYou,
  type Receiving,
} from "../gifts/receiving.ts";
import type { AppEnv } from "../session.ts";
import { giftIdParam, type Refusal } from "../shapes.ts";
import { toGift } from "../views.ts";

/** Each Giving and Receiving refusal's status. */
const REFUSAL_STATUS = {
  sticker_not_found: 404,
  gift_not_found: 404,
  user_not_found: 404,
  not_yours: 403,
  not_minted: 409,
  gift_in_transit: 409,
  take_out_not_landed: 409,
  deposit_not_landed: 409,
  deposit_mismatch: 409,
  not_deposited: 409,
  gift_closed: 409,
  already_received: 409,
  group_chat: 403,
  own_gift: 403,
  taken_back: 409,
  gift_returned: 410,
  gift_expired: 410,
  adults_only: 403,
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
    .get("/pending", (c) => c.json(pendingGifts(deps, c.var.userId), 200))
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
      validate("json", depositBodySchema),
      async (c) => {
        const giftId = c.req.valid("param").giftId;
        const { txHash } = c.req.valid("json");
        const report = await diagnosticStep(
          "gift.deposit",
          { giftId, userId: c.var.userId, txHash },
          () => reportDeposit(deps, c.var.userId, giftId),
        );
        if (report.refusal !== null) return refused(c, report);
        return c.json({ gift: toGift(report.gift) }, 200);
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
    .post("/:giftId/take-out", validate("param", giftIdParam), async (c) => {
      const giftId = c.req.valid("param").giftId;
      const takenOut = await diagnosticStep("gift.take_out", { giftId, userId: c.var.userId }, () =>
        takeOut(deps, c.var.userId, giftId),
      );
      if (takenOut.refusal !== null) return refused(c, takenOut);
      return c.json({ gift: toGift(takenOut.gift) }, 200);
    });
