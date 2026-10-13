import { Hono } from "hono";
import { z } from "zod";
import type { AppDeps } from "../deps.ts";
import { validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import { selectPerson } from "../session/personSwitch.ts";

/** The authenticated operator selects an existing account for this browser session. */
export const personSwitchRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>().post(
    "/session/person",
    validate("json", z.object({ userId: z.string().min(1) })),
    async (c) => c.json(await selectPerson(deps, c.var.session, c.req.valid("json").userId), 200),
  );
