import { users, type Db } from "@drawing-app/db";
import { CROQUIS_PARENT_NAME } from "@drawing-app/sticker-chain/croquis-names";
import {
  answerGatewayRequest,
  requestedName,
  signGatewayAnswer,
  type GatewayRecords,
} from "@drawing-app/sticker-chain/ens-gateway";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { isAddress, isHex } from "viem";
import { z } from "zod";
import type { AppDeps, EnsDeps } from "../deps.ts";
import { apiError, validate } from "../errors.ts";
import { boardUrl, latestStickerAvatar } from "../ens/naming.ts";
import type { AppEnv } from "../session.ts";
import { toPerson } from "../shapes.ts";

/** How long CroquisResolver accepts a gateway answer. */
const GATEWAY_ANSWER_TTL_S = 300;

const gatewayParamSchema = z.object({
  sender: z.string(),
  /** EIP-3668's {data}, with the ".json" our URL template adds. */
  request: z.string(),
});
const labelParamSchema = z.object({ label: z.string().min(1) });

const liveUserByLabel = (db: Db, label: string) =>
  db
    .select()
    .from(users)
    .where(and(eq(users.ensLabel, label), isNull(users.deletedAt)))
    .get();

/** What the gateway says about `name`: a person under croquis.eth, or nothing. */
function gatewayRecords(deps: AppDeps, ens: EnsDeps, name: string): GatewayRecords {
  const suffix = `.${CROQUIS_PARENT_NAME}`;
  const label = name.endsWith(suffix) ? name.slice(0, -suffix.length) : null;
  if (label === null || label.includes(".")) return { texts: {} };
  const user = liveUserByLabel(deps.db, label);
  if (!user) return { texts: {} };
  const avatar = latestStickerAvatar(deps, ens, user.id);
  return {
    address:
      user.smartAccountAddress && isAddress(user.smartAccountAddress)
        ? user.smartAccountAddress
        : undefined,
    texts: { url: boardUrl(ens, label), ...(avatar ? { avatar } : {}) },
  };
}

/**
 * ENS: the CCIP-Read gateway for names under croquis.eth that aren't onchain yet, which any ENS
 * client calls without a session, and finding a person by their name.
 */
export const ensRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    .get("/gateway/:sender/:request", validate("param", gatewayParamSchema), async (c) => {
      // ENS apps call from their own origins.
      c.header("Access-Control-Allow-Origin", "*");
      const { ens } = deps;
      if (!ens) return apiError(c, 404, "ens_not_configured", "This server has no ENS gateway");
      const { sender, request: file } = c.req.valid("param");
      if (sender.toLowerCase() !== ens.resolverAddress.toLowerCase()) {
        return apiError(c, 404, "unknown_resolver", `This gateway answers ${ens.resolverAddress}`);
      }
      const request = file.endsWith(".json") ? file.slice(0, -".json".length) : file;
      if (!isHex(request) || !isAddress(sender)) {
        return apiError(c, 400, "invalid_request", "request: not hex calldata");
      }
      let name: string;
      let result;
      try {
        name = requestedName(request);
        result = answerGatewayRequest(request, gatewayRecords(deps, ens, name));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return apiError(c, 400, "unsupported_request", `request: ${detail}`);
      }
      const data = await signGatewayAnswer({
        signer: ens.gatewaySigner,
        resolver: sender,
        request,
        result,
        expires: BigInt(Math.floor(deps.clock.now().getTime() / 1000) + GATEWAY_ANSWER_TTL_S),
      });
      return c.json({ data }, 200);
    })
    .get("/people/:label", validate("param", labelParamSchema), (c) => {
      const { label } = c.req.valid("param");
      const user = liveUserByLabel(deps.db, label.toLowerCase());
      if (!user)
        return apiError(c, 404, "user_not_found", `Nobody is ${label}.${CROQUIS_PARENT_NAME}`);
      return c.json({ person: toPerson(user) }, 200);
    });
