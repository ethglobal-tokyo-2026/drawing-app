import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./apiClient";
import { createHttpApi, createServerClient, createSessionApi } from "./httpApi";
import { startNftRequest } from "./httpDiagnostics";

const me = {
  id: "u1",
  handle: "alice",
  lineDisplayName: "Alice",
  linePictureUrl: null,
  lineUserId: "U-alice",
  language: "en",
  languageChoice: null,
  createdAt: "2026-09-26T00:00:00.000Z",
  needsHandle: false,
  newStickerCount: 0,
  unseenGratitudeCount: 0,
};

/** A fetch that answers every request with `status` and `body`, and records what it was asked. */
function answering(status: number, body: unknown) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(text, { status })));
}

const refusalOf = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error("expected a refusal");
    },
    (error: unknown) => {
      if (!(error instanceof ApiError)) throw error;
      return error;
    },
  );

describe("the session client", () => {
  it("matches the resumed session to the current LINE user without putting their ID in the URL", async () => {
    const fetch = answering(200, { me });
    const session = createSessionApi(createServerClient(fetch));
    await expect(session.me("line-alice")).resolves.toEqual({ me });
    const [input, init] = fetch.mock.calls[0] ?? [];
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    expect(url).toMatch(/\/api\/me$/);
    expect(new Headers(init?.headers).get("x-line-user-id")).toBe("line-alice");
    expect(init?.credentials).toBe("same-origin");
    expect(init?.cache).toBe("no-store");
  });

  it("signs in with the token and language, on this origin with the cookie", async () => {
    const fetch = answering(200, { me });
    const session = createSessionApi(createServerClient(fetch));
    const request = { idToken: "t", language: "ja" } as const;
    await expect(session.signIn(request)).resolves.toEqual({ me });
    const [input, init] = fetch.mock.calls[0] ?? [];
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    expect(url).toMatch(/\/api\/session$/);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");
    const body = typeof init?.body === "string" ? init.body : "";
    expect(JSON.parse(body)).toEqual(request);
  });

  it("turns the server's refusal into an ApiError with its code", async () => {
    const session = createSessionApi(
      createServerClient(answering(409, { error: "handle_taken", detail: "alice" })),
    );
    const error = await refusalOf(session.setHandle("alice"));
    expect(error).toMatchObject({ status: 409, code: "handle_taken", detail: "alice" });
  });

  it("keeps the status of an answer that isn't the error body, and says what came back", async () => {
    const session = createSessionApi(createServerClient(answering(502, "Bad Gateway")));
    const error = await refusalOf(session.me());
    expect(error.status).toBe(502);
    expect(error.code).toBe("http_502");
    expect(error.detail).toContain("Bad Gateway");
  });

  it("keeps the whole of an answer that isn't the error body, down to what failed", async () => {
    const page = `<html><head>${"<meta>".repeat(60)}</head><body>upstream drawing-api is down</body></html>`;
    const error = await refusalOf(createSessionApi(createServerClient(answering(502, page))).me());
    expect(error.detail).toContain("upstream drawing-api is down");
  });

  it("reports no answer at all as status 0, naming the request", async () => {
    const offline = vi.fn<typeof fetch>(() => Promise.reject(new TypeError("Failed to fetch")));
    const error = await refusalOf(createSessionApi(createServerClient(offline)).me());
    expect(error).toMatchObject({ status: 0, code: "network" });
    expect(error.detail).toMatch(/\/api\/me.*Failed to fetch/);
  });
});

describe("the app's client over the server", () => {
  it("refuses a Gift Claim Token the server would, without asking it", async () => {
    const fetch = answering(200, {});
    const error = await refusalOf(
      createHttpApi(createServerClient(fetch)).previewGift({
        giftClaimToken: "demo",
        liffContextType: "utou",
      }),
    );
    expect(error).toMatchObject({ status: 400, code: "invalid_request" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends a well-formed Gift Claim Token on to the server", async () => {
    const fetch = answering(404, { error: "gift_not_found" });
    const giftClaimToken = `0x${"ab".repeat(32)}`;
    const error = await refusalOf(
      createHttpApi(createServerClient(fetch)).receiveGift({
        giftClaimToken,
        liffContextType: "utou",
      }),
    );
    expect(error.code).toBe("gift_not_found");
    const init = fetch.mock.calls[0]?.[1];
    const body = typeof init?.body === "string" ? init.body : "";
    expect(JSON.parse(body)).toMatchObject({ giftClaimToken });
  });
});

describe("sealing", () => {
  const sealRequest = {
    ticketUseId: 1,
    timeUsed: 60,
    width: 10,
    height: 10,
    outline: "M0 0L1 1Z",
    png: new Blob(["png"]),
    mask: new Blob(["mask"]),
    spec: new Blob(["spec"]),
    rim: new Blob(["rim"]),
    flat: new Blob(["flat"]),
    nsfw: false,
  };

  /** The multipart body the seal sent. */
  const formOf = (fetch: ReturnType<typeof answering>) => {
    const body = fetch.mock.calls[0]?.[1]?.body;
    if (!(body instanceof FormData)) throw new Error("expected a multipart body");
    return body;
  };

  it("uploads the timelapse with the sticker", async () => {
    const fetch = answering(201, {});
    const timelapse = new Blob(["gzipped"], { type: "application/gzip" });
    await createHttpApi(createServerClient(fetch)).seal({ ...sealRequest, timelapse });
    const part = formOf(fetch).get("timelapse");
    if (!(part instanceof File)) throw new Error("expected the timelapse as a file part");
    expect(await part.text()).toBe("gzipped");
  });

  it("seals without a timelapse part when there's none", async () => {
    const fetch = answering(201, {});
    await createHttpApi(createServerClient(fetch)).seal(sealRequest);
    expect(formOf(fetch).has("timelapse")).toBe(false);
  });
});

describe("NFT request diagnostics", () => {
  const requestId = "7ca8e8a4-4ea8-47bc-b3df-03777b388ed4";
  const giftClaimToken: `0x${string}` = `0x${"ab".repeat(32)}`;
  const claim = { giftClaimToken, liffContextType: "utou" } as const;

  function captureDiagnostics() {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(performance, "now").mockReturnValue(100);
    return {
      info,
      error,
      text: () => JSON.stringify([...info.mock.calls, ...error.mock.calls]),
    };
  }

  afterEach(() => vi.restoreAllMocks());

  it("correlates a completed request without reading or replacing its response", async () => {
    const logs = captureDiagnostics();
    vi.spyOn(performance, "now").mockReturnValueOnce(100).mockReturnValueOnce(137);
    const body = { giftClaimToken };
    const response = new Response(JSON.stringify(body), {
      status: 201,
      headers: { "x-request-id": requestId, "set-cookie": "private-session-cookie" },
    });
    const fetch = vi.fn<typeof globalThis.fetch>(async () => response);
    const received = await createServerClient(fetch).gifts.$post({ json: { stickerId: "s1" } });

    expect(received).toBe(response);
    expect(received.bodyUsed).toBe(false);
    expect(await received.json()).toEqual(body);
    expect(logs.info.mock.calls).toEqual([
      [
        "NFT API request",
        { event: "nft_request_started", method: "POST", path: "/api/gifts", elapsedMs: 0 },
      ],
      [
        "NFT API request",
        {
          event: "nft_request_completed",
          method: "POST",
          path: "/api/gifts",
          elapsedMs: 37,
          status: 201,
          requestId,
        },
      ],
    ]);
    expect(logs.error).not.toHaveBeenCalled();
    expect(logs.text()).not.toContain(giftClaimToken);
    expect(logs.text()).not.toContain("private-session-cookie");
  });

  it("distinguishes an HTTP refusal without logging request or response secrets", async () => {
    const logs = captureDiagnostics();
    const response = new Response(
      JSON.stringify({ error: "internal", detail: "https://provider.invalid/private-rpc-key" }),
      { status: 503, headers: { "x-request-id": requestId } },
    );
    const client = createServerClient(async () => response);
    const received = await client.gifts.receive.$post(
      { json: claim },
      {
        init: { headers: { Authorization: "Bearer private-auth-token", Cookie: "private-cookie" } },
      },
    );

    expect(received).toBe(response);
    expect(received.bodyUsed).toBe(false);
    expect(logs.error).toHaveBeenCalledWith("NFT API request", {
      event: "nft_request_http_failed",
      method: "POST",
      path: "/api/gifts/receive",
      elapsedMs: 0,
      status: 503,
      requestId,
    });
    for (const secret of [
      giftClaimToken,
      "private-rpc-key",
      "private-auth-token",
      "private-cookie",
    ]) {
      expect(logs.text()).not.toContain(secret);
    }
  });

  it("reports a network failure without adding raw error details to the console", async () => {
    const logs = captureDiagnostics();
    const rawMessage = "https://provider.invalid/private-rpc-key could not receive private-token";
    const client = createHttpApi(
      createServerClient(async () => {
        throw new TypeError(rawMessage);
      }),
    );
    const failure = await refusalOf(client.receiveGift(claim));

    expect(failure).toMatchObject({ status: 0, code: "network" });
    expect(failure.detail).toContain(rawMessage);
    expect(logs.error).toHaveBeenCalledWith("NFT API request", {
      event: "nft_request_network_failed",
      method: "POST",
      path: "/api/gifts/receive",
      elapsedMs: 0,
      status: 0,
    });
    expect(logs.text()).not.toContain(rawMessage);
    expect(logs.text()).not.toContain(giftClaimToken);
  });

  it("omits an arbitrary response header instead of treating it as a request ID", async () => {
    const logs = captureDiagnostics();
    const response = new Response("{}", {
      headers: { "x-request-id": `${requestId}/private-header-value` },
    });
    await createServerClient(async () => response).gifts.preview.$post({ json: claim });

    expect(logs.info).toHaveBeenLastCalledWith("NFT API request", {
      event: "nft_request_completed",
      method: "POST",
      path: "/api/gifts/preview",
      elapsedMs: 0,
      status: 200,
    });
    expect(logs.text()).not.toContain("private-header-value");
  });

  it.each([
    ["/api/stickers", "/api/stickers"],
    ["/api/gifts/private-gift-id/deposit", "/api/gifts/:giftId/deposit"],
    ["/api/gifts/private-gift-id/shared", "/api/gifts/:giftId/shared"],
    ["/api/gifts/private-gift-id/take-out", "/api/gifts/:giftId/take-out"],
  ])("logs a safe template for %s", (path, template) => {
    const logs = captureDiagnostics();
    const diagnostic = startNftRequest(
      `https://private-user:private-password@provider.invalid${path}?token=private-query#private-fragment`,
      "POST",
    );
    diagnostic?.completed(new Response());

    expect(logs.info).toHaveBeenLastCalledWith(
      "NFT API request",
      expect.objectContaining({ event: "nft_request_completed", path: template }),
    );
    expect(logs.text()).not.toContain("private-");
    expect(logs.text()).not.toContain("provider.invalid");
  });

  it("keeps unrelated requests and gift links outside the diagnostic routes", () => {
    const logs = captureDiagnostics();
    for (const [path, method] of [
      ["/api/session", "POST"],
      ["/api/gifts/pending", "GET"],
      [`/gift/${giftClaimToken}`, "POST"],
      ["/api/gifts/unknown-private-route", "POST"],
    ]) {
      expect(startNftRequest(path, method)).toBeUndefined();
    }
    expect(logs.info).not.toHaveBeenCalled();
    expect(logs.error).not.toHaveBeenCalled();
  });
});

describe("a sticker's timelapse", () => {
  const timelapse = {
    v: 1,
    ink: [390, 550],
    place: [20, 30, 150, 112.5],
    ops: [["brush", "#ff3366", 0, [100, 200, 60, 0]]],
  };

  it("reads how the sticker was drawn", async () => {
    const fetch = answering(200, timelapse);
    await expect(createHttpApi(createServerClient(fetch)).timelapse("s1")).resolves.toEqual(
      timelapse,
    );
    const [input] = fetch.mock.calls[0] ?? [];
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    expect(url).toMatch(/\/api\/stickers\/s1\/timelapse$/);
  });

  it("says when the sticker has none", async () => {
    const api = createHttpApi(
      createServerClient(answering(404, { error: "timelapse_not_found", detail: "s1" })),
    );
    expect(await refusalOf(api.timelapse("s1"))).toMatchObject({
      status: 404,
      code: "timelapse_not_found",
    });
  });
});
