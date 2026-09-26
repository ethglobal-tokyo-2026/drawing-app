import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// LINE's tokens as each test needs them.
const liff = vi.hoisted(() => ({
  getIDToken: vi.fn<() => string | null>(),
  getDecodedIDToken: vi.fn<() => { exp: number } | null>(),
}));
vi.mock("@line/liff", () => ({ default: liff }));

const { fetchPrivyJwt, privyStatus, retryPrivySignIn } = await import("./privy");

const nowS = () => Math.floor(Date.now() / 1000);
const lineToken = (expiresInS: number) => {
  liff.getIDToken.mockReturnValue("line-id-token");
  liff.getDecodedIDToken.mockReturnValue({ exp: nowS() + expiresInS });
};
const server = (status: number, body: object) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));
const failureReason = () => {
  const status = privyStatus();
  if (status.state !== "failed") throw new Error(`expected a failed sign-in, got ${status.state}`);
  return status.reason;
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Each test starts from a fresh sign-in, with no JWT kept from the last one.
  retryPrivySignIn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("trading LINE's ID token for a Privy JWT", () => {
  it("hands Privy the auth server's JWT for a fresh LINE ID token", async () => {
    lineToken(3600);
    const fetch = server(200, { jwt: "privy.jwt", expiresAt: nowS() + 300 });
    vi.stubGlobal("fetch", fetch);
    expect(await fetchPrivyJwt()).toBe("privy.jwt");
    expect(fetch).toHaveBeenCalledWith(
      "/v1/auth/privy-jwt",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "line-id-token" }),
      }),
    );
  });

  // Privy re-authenticates whenever it gets a different JWT, and it asks again on every re-sync.
  it("reuses a JWT until it nears expiry", async () => {
    lineToken(3600);
    const fetch = server(200, { jwt: "privy.jwt", expiresAt: nowS() + 300 });
    vi.stubGlobal("fetch", fetch);
    await fetchPrivyJwt();
    expect(await fetchPrivyJwt()).toBe("privy.jwt");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  // The SDK re-syncs on its own after a failure; each retry would hit the auth server, LINE and Privy.
  it("asks nothing more after a failure until the person tries again", async () => {
    lineToken(3600);
    const fetch = server(401, { error: "line_auth_failed" });
    vi.stubGlobal("fetch", fetch);
    await fetchPrivyJwt();
    expect(await fetchPrivyJwt()).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
    retryPrivySignIn();
    await fetchPrivyJwt();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  // Privy logs the person out when this throws, so failures resolve and say why.
  it("resolves to nothing when the auth server refuses, and keeps its reason", async () => {
    lineToken(3600);
    vi.stubGlobal("fetch", server(401, { error: "line_auth_failed" }));
    expect(await fetchPrivyJwt()).toBeUndefined();
    expect(failureReason()).toMatch(/401.*line_auth_failed/);
  });

  it("resolves to nothing when the auth server can't be reached", async () => {
    lineToken(3600);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect(await fetchPrivyJwt()).toBeUndefined();
    expect(failureReason()).toContain("Failed to fetch");
  });

  it("never sends a missing or expired LINE ID token", async () => {
    const fetch = server(200, { jwt: "privy.jwt" });
    vi.stubGlobal("fetch", fetch);
    liff.getIDToken.mockReturnValue(null);
    liff.getDecodedIDToken.mockReturnValue(null);
    expect(await fetchPrivyJwt()).toBeUndefined();
    retryPrivySignIn();
    lineToken(-10);
    expect(await fetchPrivyJwt()).toBeUndefined();
    expect(failureReason()).toContain("expired");
    expect(fetch).not.toHaveBeenCalled();
  });
});
