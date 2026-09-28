import { createTestDb } from "@drawing-app/db/testing";
import { serializeSigned } from "hono/utils/cookie";
import { createApp } from "../app.ts";
import { chatMenuOff } from "../chatMenu/lineChatMenu.ts";
import type { AppDeps } from "../deps.ts";
import { mockChain } from "../services/mockChain.ts";
import { SESSION_COOKIE } from "../session.ts";
import {
  fakeClock,
  fakeImageStore,
  fakeLineVerifier,
  fakeServerLog,
  fakeTicketPayments,
  sequentialIds,
} from "./fakes.ts";

type Overrides = Partial<Omit<AppDeps, "db" | "sessionSecret" | "clock" | "images">>;

/** What a test's overrides can be built on: the test app's own database and clock. */
export interface TestBase {
  db: AppDeps["db"];
  clock: ReturnType<typeof fakeClock>;
}

/**
 * The app on a fresh in-memory database, with fakes for external services. Tests override the
 * chain dependencies to exercise minting and escrow without submitting transactions, and pass a
 * function to build an override on the app's database and clock.
 */
export async function createTestApp(overrides: Overrides | ((base: TestBase) => Overrides) = {}) {
  const { db, sqlite } = await createTestDb();
  const clock = fakeClock();
  const images = fakeImageStore();
  const deps: AppDeps = {
    db,
    sessionSecret: "test-session-secret",
    clock,
    ids: sequentialIds(),
    line: fakeLineVerifier(),
    images,
    ...mockChain,
    ticketPayments: fakeTicketPayments().ticketPayments,
    serverLog: fakeServerLog(),
    lineChatMenu: chatMenuOff("not_configured"),
    worldId: null,
    ...(typeof overrides === "function" ? overrides({ db, clock }) : overrides),
  };
  return {
    app: createApp(deps),
    deps,
    db,
    sqlite,
    clock,
    images,
    /** Request headers carrying a valid session cookie for `userId`. */
    signInAs: async (userId: string) => ({
      Cookie: await serializeSigned(SESSION_COOKIE, userId, deps.sessionSecret),
    }),
  };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;
