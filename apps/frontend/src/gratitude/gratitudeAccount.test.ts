// @vitest-environment node
import { expect, it, vi, afterEach, onTestFinished } from "vitest";
import { insertUser } from "../../../../packages/db/src/testDb.ts";
import { gratitude } from "../../../../packages/db/src/schema/gratitude.ts";
import { createGiftsTestApp } from "../../../../apps/api/src/gifts/testGifts.ts";
import { devAccessToken } from "../../../../apps/api/src/services/devSignIn.ts";
import { packagedGiftSchema } from "../../../../apps/api/src/gifts/packaging.ts";
import { createServerClient, createHttpApi, createSessionApi } from "../api/httpApi";
import { recordGratitudeBody } from "../api/testing";
import { openEarly } from "../api/earlySession";
import { ApiError } from "../api/apiClient";
import {
  keepGratitudeInPlay,
  resendGratitudeWhenReachable,
  resendPendingGratitude,
  sendGratitude,
} from "./gratitudeOutbox";
import { keepGratitudeRefusal, readGratitudeRefusals } from "./gratitudeRefusals";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each([false, true])(
  "preserves an identical saved combo with shared signed cookies; switch=%s",
  async (switchAccount) => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => kept.get(k) ?? null,
      setItem: (k: string, v: string) => kept.set(k, v),
      removeItem: (k: string) => kept.delete(k),
    });
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
    const test = await createGiftsTestApp();
    let cookie = "";
    const responses: Array<{ status: number; body: unknown }> = [];
    const browserFetch: typeof fetch = async (input, init) => {
      const path =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const headers = new Headers(init?.headers);
      if (cookie) headers.set("Cookie", cookie);
      const { keepalive: _keepalive, ...serverInit } = init ?? {};
      const response = await test.app.request(path, { ...serverInit, headers });
      const replacement = response.headers.get("set-cookie");
      if (replacement !== null) cookie = replacement.split(";")[0];
      if (path === "/api/gratitude")
        responses.push({ status: response.status, body: await response.clone().json() });
      return response;
    };
    const session = createSessionApi(createServerClient(browserFetch));
    const signIn = (name: string) =>
      session.signIn({ accessToken: devAccessToken({ sub: name, name }), language: "en" });
    try {
      const { me: alice } = await signIn("Alice");
      const api = createHttpApi(createServerClient(browserFetch, alice.id));
      const giver = insertUser(test.db);
      const stickerId = test.sealSticker(giver);
      const packaged = packagedGiftSchema.parse(
        await (await test.post(giver, "", { stickerId })).json(),
      );
      const giftClaimToken = packaged.giftClaimToken;
      if (!giftClaimToken) throw new Error("The packaged gift has no claim token");
      await api.receiveGift({ giftClaimToken, liffContextType: "none" });
      const body = recordGratitudeBody({
        giftId: packaged.gift.id,
        idempotencyKey: crypto.randomUUID(),
      });
      const interrupted = `The gratitude for gift ${body.giftId} was still in play when its page went; it's sent as it was last kept`;
      const accountChanged = `The gratitude for gift ${body.giftId} didn't reach the server (HTTP 409: session_account_changed); this device keeps it and sends it again when the phone is back online, the app comes back to the front or it next opens`;
      const expectedWarnings = switchAccount
        ? [[interrupted], [accountChanged], [interrupted]]
        : [[interrupted]];
      const printWarning = console.warn.bind(console);
      const warnings = vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
        if (!expectedWarnings.some(([message]) => args.length === 1 && args[0] === message))
          printWarning(...args);
      });
      onTestFinished(() => {
        const calls = warnings.mock.calls;
        warnings.mockRestore();
        expect(calls).toEqual(expectedWarnings);
      });
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
      keepGratitudeInPlay(alice.id, body);
      keepGratitudeRefusal(alice.id, body.giftId, new ApiError(400, { error: "replay_invalid" }));
      const originalRefusals = readGratitudeRefusals(alice.id);
      const original = kept.get(`draw.gratitude.pending.${alice.id}`);
      const stop = resendGratitudeWhenReachable(api, alice.id);
      stop();
      expect(vi.getTimerCount()).toBe(0);
      if (switchAccount) await signIn("Bob");
      await vi.advanceTimersByTimeAsync(16_000);
      expect(responses).toEqual([]);
      // An old callback still holding Alice's immutable client cannot act as Bob.
      if (switchAccount) {
        await resendPendingGratitude(api, alice.id);
        expect(responses).toEqual([{ status: 409, body: { error: "session_account_changed" } }]);
        expect(kept.get(`draw.gratitude.pending.${alice.id}`)).toBe(original);
        expect(readGratitudeRefusals(alice.id)).toEqual(originalRefusals);
        expect(test.db.select().from(gratitude).all()).toEqual([]);
        await expect(session.me("Alice", alice.id)).rejects.toMatchObject({
          status: 409,
          code: "session_account_changed",
        });
        await signIn("Alice");
      }
      await resendPendingGratitude(api, alice.id);
      expect(responses.at(-1)?.status).toBe(201);
      expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
      expect(test.db.select().from(gratitude).all()).toHaveLength(1);
      expect(readGratitudeRefusals(alice.id)).toEqual([]);
      expect(kept.has(`draw.gratitude.pending.${alice.id}`)).toBe(false);
      await resendPendingGratitude(api, alice.id);
      expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
      await expect(sendGratitude(api, alice.id, body)).resolves.toEqual({ state: "recorded" });
      expect(responses.at(-1)?.status).toBe(200);
    } finally {
      test.sqlite.close();
    }
  },
);

it("binds early tickets to Me even when another tab replaces the cookie before the request", async () => {
  const test = await createGiftsTestApp();
  let cookie = "";
  const browserFetch: typeof fetch = async (input, init) => {
    const path = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers);
    if (cookie) headers.set("Cookie", cookie);
    const response = await test.app.request(path, { ...init, headers });
    const replacement = response.headers.get("set-cookie");
    if (replacement) cookie = replacement.split(";")[0];
    return response;
  };
  const session = createSessionApi(createServerClient(browserFetch));
  const signIn = (name: string) =>
    session.signIn({ accessToken: devAccessToken({ sub: name, name }), language: "en" });
  try {
    const { me: alice } = await signIn("Alice");
    const meAnswer = await session.me();
    await signIn("Bob");
    const opening = openEarly(
      { ...session, me: () => Promise.resolve(meAnswer) },
      (id) => createHttpApi(createServerClient(browserFetch, id)),
      { board: false },
    );
    expect(await opening.me).toEqual(alice);
    opening.accept(alice);
    expect(opening.takeTickets("Bob")).toBeUndefined();
    await expect(opening.takeTickets(alice.id)).rejects.toMatchObject({
      status: 409,
      code: "session_account_changed",
    });
  } finally {
    test.sqlite.close();
  }
});
