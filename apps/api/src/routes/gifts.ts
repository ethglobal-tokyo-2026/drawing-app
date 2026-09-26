import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import type { AppEnv } from "../session.ts";

/** Giving and Receiving. */
export const giftRoutes = (_deps: AppDeps) => new Hono<AppEnv>();
