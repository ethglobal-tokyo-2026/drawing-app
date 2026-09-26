import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import type { AppEnv } from "../session.ts";

/** Tickets: the day's tickets, spending one, and buying packs. */
export const ticketRoutes = (_deps: AppDeps) => new Hono<AppEnv>();
