import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import type { AppEnv } from "../session.ts";

/** Explore, and finding people by handle. */
export const exploreRoutes = (_deps: AppDeps) => new Hono<AppEnv>();
