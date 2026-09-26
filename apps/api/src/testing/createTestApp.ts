import { createTestDb } from "@drawing-app/db/testing";
import { serializeSigned } from "hono/utils/cookie";
import { createApp } from "../app.ts";
import type { AppDeps } from "../deps.ts";
import { mintStub } from "../services/mint.ts";
import { noSmartWallets } from "../services/smartWallets.ts";
import { SESSION_COOKIE } from "../session.ts";
import {
  fakeClock,
  fakeImageStore,
  fakeLineVerifier,
  fakeTicketPayments,
  sequentialIds,
} from "./fakes.ts";

/**
 * The app on a fresh in-memory database, with fakes for external services. Tests override the
 * chain dependencies to exercise minting and escrow without submitting transactions.
 */
export async function createTestApp(
  overrides: Partial<Omit<AppDeps, "db" | "sessionSecret" | "clock" | "images">> = {},
) {
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
    mint: mintStub,
    giftChain: null,
    smartWallets: noSmartWallets,
    ens: null,
    ticketPayments: fakeTicketPayments().ticketPayments,
    ...overrides,
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
