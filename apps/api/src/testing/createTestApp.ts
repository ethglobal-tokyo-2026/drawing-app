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

interface SendOptions {
  /** The user the request is signed in as; without one it carries no session. */
  as?: string;
  headers?: Record<string, string>;
  /** Sent as JSON. */
  body?: unknown;
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
  const app = createApp(deps);
  /** Request headers carrying a valid session cookie for `userId`. */
  const signInAs = async (userId: string) => ({
    Cookie: await serializeSigned(SESSION_COOKIE, userId, deps.sessionSecret),
  });
  return {
    app,
    deps,
    db,
    sqlite,
    clock,
    images,
    signInAs,
    /** Sends `method path`; the content type is JSON only when there's a body. */
    send: async (method: string, path: string, { as, headers, body }: SendOptions = {}) =>
      app.request(path, {
        method,
        headers: {
          ...(as === undefined ? {} : await signInAs(as)),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
  };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;
