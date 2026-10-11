// @vitest-environment node
import { expect, it, vi, afterEach } from "vitest";
import { insertUser } from "../../../../packages/db/src/testDb.ts";
import { createGiftsTestApp } from "../../../../apps/api/src/gifts/testGifts.ts";
import { devAccessToken } from "../../../../apps/api/src/services/devSignIn.ts";
import { packagedGiftSchema } from "../../../../apps/api/src/gifts/packaging.ts";
import {
  createServerClient,
  createHttpApi,
  createSessionApi,
} from "../../../../apps/frontend/src/api/httpApi.ts";
import { recordGratitudeBody } from "../../../../apps/frontend/src/api/testing.tsx";
import { onSessionLost } from "../../../../apps/frontend/src/api/sessionLoss.ts";
import {
  keepGratitudeInPlay,
  resendGratitudeWhenReachable,
  isGratitudeWaiting,
} from "../../../../apps/frontend/src/gratitude/gratitudeOutbox.ts";
import { readGratitudeRefusals } from "../../../../apps/frontend/src/gratitude/gratitudeRefusals.ts";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each(["same account recovery", "another tab signs in as Bob"] as const)(
  "real session endpoints and cookies: %s",
  async (scenario) => {
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
    const gratitudeResponses: Array<{ status: number; body: unknown }> = [];
    const browserFetch: typeof fetch = async (input, init) => {
      const path =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const headers = new Headers(init?.headers);
      if (cookie) headers.set("Cookie", cookie);
      // keepalive is a browser transport setting, not part of the HTTP request received by Hono.
      const { keepalive: _keepalive, ...serverInit } = init ?? {};
      const response = await test.app.request(path, { ...serverInit, headers });
      const replacement = response.headers.get("set-cookie");
      if (replacement !== null) cookie = replacement.split(";")[0];
      if (path === "/api/gratitude")
        gratitudeResponses.push({ status: response.status, body: await response.clone().json() });
      return response;
    };
    const server = createServerClient(browserFetch);
    const session = createSessionApi(server);
    const api = createHttpApi(server);
    const alice = { sub: "line-alice-review", name: "Alice Review" };
    const bob = { sub: "line-bob-review", name: "Bob Review" };
    const signIn = (who: typeof alice) =>
      session.signIn({ accessToken: devAccessToken(who), language: "en" });
    const { me: a } = await signIn(alice);
    const giver = insertUser(test.db);
    const stickerId = test.sealSticker(giver);
    const packaged = packagedGiftSchema.parse(
      await (await test.post(giver, "", { stickerId })).json(),
    );
    const received = await api.receiveGift({
      giftClaimToken: packaged.giftClaimToken!,
      liffContextType: "none",
    });
    expect(received.gift.receiverId).toBe(a.id);
    const body = recordGratitudeBody({
      giftId: packaged.gift.id,
      idempotencyKey: crypto.randomUUID(),
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    keepGratitudeInPlay(a.id, body);
    const stop = resendGratitudeWhenReachable(api, a.id);
    // App's effect is cleaned up when SessionGate handles a real signed_out response.
    let sessionLosses = 0;
    const stopListening = onSessionLost(() => {
      sessionLosses++;
      stop();
    });
    // Another tab signs out. The current tab's next API request loses its session.
    await session.signOut();
    await expect(session.me(alice.sub)).rejects.toMatchObject({ status: 401, code: "signed_out" });
    expect(sessionLosses).toBe(1);
    // SessionGate signs Alice back in. A later sign-in in another tab may replace the shared cookie.
    const recovered = await signIn(alice);
    expect(recovered.me.id).toBe(a.id);
    if (scenario === "another tab signs in as Bob") {
      const { me: b } = await signIn(bob);
      expect((await session.me(bob.sub)).me.id).toBe(b.id);
    }
    await vi.advanceTimersByTimeAsync(16000);
    await vi.waitFor(() => expect(gratitudeResponses).toHaveLength(1));
    await vi.waitFor(() => expect(isGratitudeWaiting(a.id, body.giftId)).toBe(false));
    if (scenario === "same account recovery") {
      expect(gratitudeResponses[0].status).toBe(201);
      expect(readGratitudeRefusals(a.id)).toEqual([]);
    } else {
      expect(gratitudeResponses[0]).toMatchObject({ status: 403, body: { error: "not_receiver" } });
      expect(readGratitudeRefusals(a.id)).toMatchObject([
        { giftId: body.giftId, code: "not_receiver" },
      ]);
      await signIn(alice);
      // The exact original combo remained valid: it records once Alice is signed in again.
      await expect(api.recordGratitude(body)).resolves.toMatchObject({
        giftId: body.giftId,
        hits: body.hits,
      });
    }
    stopListening();
    test.sqlite.close();
  },
);
