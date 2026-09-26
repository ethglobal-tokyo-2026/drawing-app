import { hc } from "hono/client";
import type { AppType } from "./app.ts";

export type { AppType };

/**
 * The REST API's typed client, from its routes' own types: `createApiClient().me.$get()` calls
 * GET /api/me. `baseUrl` is the origin that serves /api; the app's own, behind a proxy, by default.
 */
export const createApiClient = (baseUrl = "/") => hc<AppType>(baseUrl).api;

export type ApiClient = ReturnType<typeof createApiClient>;
