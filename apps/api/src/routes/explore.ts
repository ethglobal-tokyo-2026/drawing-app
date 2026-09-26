import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import { validate } from "../errors.ts";
import { loadExplore } from "../explore/explore.ts";
import { searchUsers, userSearchQuerySchema } from "../explore/userSearch.ts";
import type { AppEnv } from "../session.ts";

/** Explore, and finding people by handle. */
export const exploreRoutes = ({ db, clock, images }: AppDeps) =>
  new Hono<AppEnv>()
    .get("/explore", (c) => c.json(loadExplore(db, clock.now(), images.urls), 200))
    .get("/users", validate("query", userSearchQuerySchema), (c) =>
      c.json({ users: searchUsers(db, c.req.valid("query").handle) }, 200),
    );
