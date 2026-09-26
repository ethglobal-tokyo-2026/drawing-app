import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import type { AppEnv } from "../session.ts";

/** Session and you: signing in with LINE, your profile and handle, and account deletion. */
export const sessionRoutes = (_deps: AppDeps) => new Hono<AppEnv>();
