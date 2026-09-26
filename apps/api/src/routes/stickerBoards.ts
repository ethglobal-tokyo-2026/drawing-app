import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import type { AppEnv } from "../session.ts";

/** Sticker Boards, your sticker tray and the stat board's User Stats. */
export const stickerBoardRoutes = (_deps: AppDeps) => new Hono<AppEnv>();
