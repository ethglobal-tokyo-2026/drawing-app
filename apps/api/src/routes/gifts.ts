import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import type { AppDeps } from "../deps.ts";
import { apiError, validate } from "../errors.ts";
import { depositBodySchema, reportDeposit } from "../gifts/deposit.ts";
import {
  packageBodySchema,
  packageGift,
  pendingGifts,
  reportShared,
  sharedBodySchema,
  takeOut,
  type Refusal,
} from "../gifts/packaging.ts";
import type { AppEnv } from "../session.ts";
import { bytes32Schema } from "../shapes.ts";
import { toGift } from "../views.ts";

/** Each Giving and Receiving refusal's status. */
const REFUSAL_STATUS = {
  sticker_not_found: 404,
  gift_not_found: 404,
  not_yours: 403,
  not_minted: 409,
  gift_in_transit: 409,
  deposit_not_landed: 409,
  deposit_mismatch: 409,
  not_deposited: 409,
  gift_closed: 409,
  already_received: 409,
} as const satisfies Record<string, ContentfulStatusCode>;

const refused = <Code extends keyof typeof REFUSAL_STATUS>(
  c: Context,
  { refusal, detail }: Refusal<Code>,
) => apiError(c, REFUSAL_STATUS[refusal], refusal, detail);

const giftParamSchema = z.object({ giftId: bytes32Schema });

/** Giving and Receiving. */
export const giftRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    .get("/pending", (c) => c.json(pendingGifts(deps, c.var.userId), 200))
    .post("/", validate("json", packageBodySchema), async (c) => {
      const packaging = await packageGift(deps, c.var.userId, c.req.valid("json").stickerId);
      if (packaging.refusal !== null) return refused(c, packaging);
      return packaging.created ? c.json(packaging.packaged, 201) : c.json(packaging.packaged, 200);
    })
    .post(
      "/:giftId/deposit",
      validate("param", giftParamSchema),
      validate("json", depositBodySchema),
      async (c) => {
        const report = await reportDeposit(deps, c.var.userId, c.req.valid("param").giftId);
        if (report.refusal !== null) return refused(c, report);
        return c.json({ gift: toGift(report.gift) }, 200);
      },
    )
    .post(
      "/:giftId/shared",
      validate("param", giftParamSchema),
      validate("json", sharedBodySchema),
      (c) => {
        const { giftId } = c.req.valid("param");
        const shared = reportShared(deps, c.var.userId, giftId, c.req.valid("json").outcome);
        if (shared.refusal !== null) return refused(c, shared);
        return c.json({ gift: toGift(shared.gift) }, 200);
      },
    )
    .post("/:giftId/take-out", validate("param", giftParamSchema), async (c) => {
      const takenOut = await takeOut(deps, c.var.userId, c.req.valid("param").giftId);
      if (takenOut.refusal !== null) return refused(c, takenOut);
      return c.json({ gift: toGift(takenOut.gift) }, 200);
    });
