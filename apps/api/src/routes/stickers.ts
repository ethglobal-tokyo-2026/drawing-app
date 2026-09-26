import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import type { AppEnv } from "../session.ts";

/** Stickers: sealing, a sticker's detail with its Transfer Trail, and its timelapse. */
export const stickerRoutes = (_deps: AppDeps) => new Hono<AppEnv>();
