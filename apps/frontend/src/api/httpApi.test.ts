import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./apiClient";
import { createHttpApi, createServerClient, createSessionApi } from "./httpApi";

const me = {
  id: "u1",
  handle: "alice",
  lineDisplayName: "Alice",
  linePictureUrl: null,
  timeZone: "Asia/Tokyo",
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
  it("signs in with the token and zone, on this origin with the cookie", async () => {
    const fetch = answering(200, { me });
    const session = createSessionApi(createServerClient(fetch));
    await expect(session.signIn({ idToken: "t", timeZone: "Asia/Tokyo" })).resolves.toEqual({
      me,
    });
    const [input, init] = fetch.mock.calls[0] ?? [];
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    expect(url).toMatch(/\/api\/session$/);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");
    const body = typeof init?.body === "string" ? init.body : "";
    expect(JSON.parse(body)).toEqual({ idToken: "t", timeZone: "Asia/Tokyo" });
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
