import { createTestDb } from "@drawing-app/db/testing";
import { serializeSigned } from "hono/utils/cookie";
import { createApp } from "../app.ts";
import type { AppDeps } from "../deps.ts";
import { mintStub } from "../services/mint.ts";
import { noSmartWallets } from "../services/smartWallets.ts";
import { mockSuiPayments } from "../services/suiPayments.ts";
import { SESSION_COOKIE } from "../session.ts";
import {
  fakeClock,
  fakeImageStore,
  fakeLineVerifier,
  fakeSuiPrice,
  sequentialIds,
} from "./fakes.ts";

/** A made-up SUI/JPY price that never moves. */
const TEST_SUI_YEN = "300";

/**
 * The app as the server runs it today (mock chain mode, the mint stub, no smart wallets, the mock Sui
 * payment at a fixed SUI/JPY price) on a fresh in-memory database, with fakes for LINE, the disk, the
 * time and ids. Override a dep with a fake from ./fakes.ts to run a path the server doesn't take yet.
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
    sui: mockSuiPayments,
    suiPrice: fakeSuiPrice(TEST_SUI_YEN),
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
