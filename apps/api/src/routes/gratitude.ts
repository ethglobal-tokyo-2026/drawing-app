import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import type { AppEnv } from "../session.ts";

/** Gratitude: recording a Mini-game combo, and the giver's unseen gratitude and replays. */
export const gratitudeRoutes = (_deps: AppDeps) => new Hono<AppEnv>();
