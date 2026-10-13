import { beforeAccountRelease, retryAccountRelease } from "../api/sessionLoss";
import { ApiError } from "../api/apiClient";
import { acceptSession, currentSelection, suspendSession } from "../api/sessionContext";
import { sessionEnvelope } from "../api/sessionTestFixtures";
import { TEST_ME } from "../api/testing";
const account = {
  userId: TEST_ME.id,
  selectionVersion: null,
  expectedSubject: "U-you",
  expectedSuiAddress: null,
};
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// LINE's tokens as each test needs them.
const liff = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => string | null>(),
  getIDToken: vi.fn<() => string | null>(),
  getDecodedIDToken: vi.fn<() => { exp: number } | null>(),
}));
vi.mock("@line/liff", () => ({ default: liff }));
const reconnectLine = vi.hoisted(() => vi.fn<() => Promise<void>>());
vi.mock("../line/reconnectLine", () => ({ reconnectLine }));
// As in a build: with LIFF Mock on, as on the dev server by default, Privy stays off.
vi.stubEnv("VITE_LIFF_MOCK", "off");

const { fetchPrivyJwt, privyStatus, resetPrivySignIn, retryPrivySignIn, setPrivyStatus } =
  await import("./privy");

const nowS = () => Math.floor(Date.now() / 1000);
/** LIFF logged in, holding an access token, and an ID token that lapses in `idTokenExpiresInS`. */
const lineToken = (idTokenExpiresInS = 3600) => {
  liff.getAccessToken.mockReturnValue("line-access-token");
  liff.getIDToken.mockReturnValue("line-id-token");
  liff.getDecodedIDToken.mockReturnValue({ exp: nowS() + idTokenExpiresInS });
};
const server = (status: number, body: object) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));
const failureReason = () => {
  const status = privyStatus();
  if (status.state !== "failed") throw new Error(`expected a failed sign-in, got ${status.state}`);
  return status.reason;
};

beforeEach(() => {
  acceptSession(sessionEnvelope(TEST_ME));
  vi.spyOn(console, "error").mockImplementation(() => {});
  reconnectLine.mockReset().mockResolvedValue(undefined);
  // Each test starts from a fresh sign-in, with no JWT kept from the last one.
  setPrivyStatus({ state: "signing-in" });
  retryPrivySignIn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("trading LIFF's access token for a Privy JWT", () => {
  it("hands Privy the auth server's JWT for LIFF's access token", async () => {
    lineToken();
    const fetch = server(200, {
      jwt: "privy.jwt",
      subject: account.expectedSubject,
      expiresAt: nowS() + 300,
    });
    vi.stubGlobal("fetch", fetch);
    expect(await fetchPrivyJwt(account)).toBe("privy.jwt");
    expect(fetch).toHaveBeenCalledWith(
      "/api/session/privy-jwt",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ accessToken: "line-access-token" }),
      }),
    );
  });

  // LIFF stays logged in for hours after its hour-long ID token lapses, inside LINE and out.
  it("signs in after LINE's ID token has expired, without reconnecting LINE", async () => {
    lineToken(-10);
    vi.stubGlobal(
      "fetch",
      server(200, { jwt: "privy.jwt", subject: account.expectedSubject, expiresAt: nowS() + 300 }),
    );
    expect(await fetchPrivyJwt(account)).toBe("privy.jwt");
    expect(privyStatus()).toEqual({ state: "signing-in" });
    expect(reconnectLine).not.toHaveBeenCalled();
  });

  // Privy re-authenticates whenever it gets a different JWT, and it asks again on every re-sync.
  it("reuses a JWT until it nears expiry", async () => {
    lineToken();
    const fetch = server(200, {
      jwt: "privy.jwt",
      subject: account.expectedSubject,
      expiresAt: nowS() + 300,
    });
    vi.stubGlobal("fetch", fetch);
    await fetchPrivyJwt(account);
    expect(await fetchPrivyJwt(account)).toBe("privy.jwt");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  // The SDK re-syncs on its own after a failure; each retry would hit the auth server, LINE and Privy.
  it("retries an unavailable auth server only when the person tries again", async () => {
    lineToken();
    const fetch = server(503, {});
    vi.stubGlobal("fetch", fetch);
    await fetchPrivyJwt(account);
    expect(await fetchPrivyJwt(account)).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
    retryPrivySignIn();
    await fetchPrivyJwt(account);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(reconnectLine).not.toHaveBeenCalled();
  });

  it("stays signed in while a lapsed JWT is renewed in the background", async () => {
    lineToken();
    // Kept, but within the expiry margin, so the next ask goes to the auth server.
    vi.stubGlobal(
      "fetch",
      server(200, { jwt: "privy.jwt", subject: account.expectedSubject, expiresAt: nowS() + 30 }),
    );
    await fetchPrivyJwt(account);
    setPrivyStatus({ state: "signed-in", userId: "did:privy:1" });
    const renewed = fetchPrivyJwt(account);
    expect(privyStatus()).toEqual({ state: "signed-in", userId: "did:privy:1" });
    expect(await renewed).toBe("privy.jwt");
  });

  // Privy logs the person out when this throws, so failures resolve and say why.
  it.each(["line_token_expired", "line_token_invalid"])(
    "keeps the rejected LINE reason %s",
    async (error) => {
      lineToken();
      vi.stubGlobal("fetch", server(401, { error }));
      expect(await fetchPrivyJwt(account)).toBeUndefined();
      expect(failureReason()).toContain(`401 ${error}`);
      expect(privyStatus()).toMatchObject({ reconnectLine: true });
    },
  );

  it("allows an ordinary retry when the auth server can't be reached", async () => {
    lineToken();
    const fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchPrivyJwt(account)).toBeUndefined();
    expect(failureReason()).toContain("0 network");
    retryPrivySignIn();
    await fetchPrivyJwt(account);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(reconnectLine).not.toHaveBeenCalled();
  });

  it("does not reload for an ordinary JWT failure, and retries the exchange", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    lineToken();
    const fetch = server(503, { error: "auth_unavailable" });
    vi.stubGlobal("fetch", fetch);
    await fetchPrivyJwt(account);
    expect(privyStatus()).toMatchObject({ state: "failed", reconnectLine: false });
    resetPrivySignIn();
    expect(privyStatus()).toEqual({ state: "signing-in" });
    await fetchPrivyJwt(account);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
  });

  it.each([
    { status: 502, error: "line_unavailable" },
    { status: 500, error: "auth_unavailable" },
    { status: 400, error: "invalid_request" },
    { status: 401, error: "auth_unavailable" },
  ])("retries $status $error without reconnecting LINE", async ({ status, error }) => {
    lineToken();
    const fetch = server(status, { error });
    vi.stubGlobal("fetch", fetch);
    expect(await fetchPrivyJwt(account)).toBeUndefined();
    expect(privyStatus()).toMatchObject({ state: "failed", reconnectLine: false });
    expect(failureReason()).toContain(`${status} ${error}`);

    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jwt: "privy.jwt",
          subject: account.expectedSubject,
          expiresAt: nowS() + 300,
        }),
      ),
    );
    retryPrivySignIn();
    expect(await fetchPrivyJwt(account)).toBe("privy.jwt");
    expect(reconnectLine).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reconnects LINE on explicit retry when LIFF holds no access token", async () => {
    const fetch = server(200, {
      jwt: "privy.jwt",
      subject: account.expectedSubject,
      expiresAt: nowS() + 300,
    });
    vi.stubGlobal("fetch", fetch);
    liff.getAccessToken.mockReturnValue(null);
    expect(await fetchPrivyJwt(account)).toBeUndefined();
    expect(privyStatus()).toMatchObject({ state: "failed", reconnectLine: true });
    expect(reconnectLine).not.toHaveBeenCalled();

    retryPrivySignIn();
    retryPrivySignIn();
    expect(await fetchPrivyJwt(account)).toBeUndefined();
    expect(reconnectLine).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reloads a failed provider even while an earlier LINE reconnect is pending", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    let finishReconnect: (() => void) | undefined;
    reconnectLine.mockReturnValueOnce(
      new Promise((resolve) => {
        finishReconnect = resolve;
      }),
    );
    liff.getAccessToken.mockReturnValue(null);
    await fetchPrivyJwt(account);
    retryPrivySignIn();
    setPrivyStatus({ state: "failed", reason: "Provider stopped", reloadRequired: true });

    retryPrivySignIn();
    expect(reload).toHaveBeenCalledOnce();
    finishReconnect?.();
  });

  it("keeps the provider recovery visible if an earlier LINE reconnect later fails", async () => {
    let rejectReconnect: ((error: Error) => void) | undefined;
    reconnectLine.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectReconnect = reject;
      }),
    );
    liff.getAccessToken.mockReturnValue(null);
    await fetchPrivyJwt(account);
    retryPrivySignIn();
    setPrivyStatus({ state: "failed", reason: "Provider stopped", reloadRequired: true });

    rejectReconnect?.(new Error("LINE stopped"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(privyStatus()).toMatchObject({ state: "failed", reloadRequired: true });
  });

  it.each(["line_token_expired", "line_token_invalid"])(
    "reconnects LINE after %s without repeating the exchange",
    async (error) => {
      lineToken();
      const fetch = server(401, { error });
      vi.stubGlobal("fetch", fetch);
      await fetchPrivyJwt(account);
      expect(await fetchPrivyJwt(account)).toBeUndefined();
      expect(reconnectLine).not.toHaveBeenCalled();

      retryPrivySignIn();
      expect(await fetchPrivyJwt(account)).toBeUndefined();

      expect(reconnectLine).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it("keeps a failed LINE reconnect recoverable without logging SDK error values", async () => {
    liff.getAccessToken.mockReturnValue(null);
    const failure = new Error("SDK error containing credential details");
    reconnectLine.mockRejectedValueOnce(failure);
    await fetchPrivyJwt(account);

    // The screen that asked hears it too, so it can say so where the person tapped.
    const onFailed = vi.fn();
    retryPrivySignIn(undefined, onFailed);
    await vi.waitFor(() => {
      expect(privyStatus()).toEqual({
        state: "failed",
        reason: "LINE could not reconnect; try again",
        reconnectLine: true,
      });
    });
    expect(onFailed).toHaveBeenCalledWith(
      expect.objectContaining({ code: "line_reconnect_failed" }),
    );
    expect(vi.mocked(console.error).mock.calls.flat()).not.toContain(failure);
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain(failure.message);

    retryPrivySignIn();
    expect(reconnectLine).toHaveBeenCalledTimes(2);
    expect(await fetchPrivyJwt(account)).toBeUndefined();
  });
});

it("ignores an old reconnect rejection and preserves the restored session's pending retry", async () => {
  let rejectOld!: (error: Error) => void;
  let finishNew!: () => void;
  reconnectLine.mockReturnValueOnce(
    new Promise<void>((_, reject) => {
      rejectOld = reject;
    }),
  );
  reconnectLine.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finishNew = resolve;
    }),
  );
  setPrivyStatus({ state: "failed", reason: "Expired", reconnectLine: true });
  const oldFailed = vi.fn();
  retryPrivySignIn(undefined, oldFailed);
  suspendSession();
  acceptSession(sessionEnvelope(TEST_ME));
  const restoredFailure = {
    state: "failed",
    reason: "New reconnect needed",
    reconnectLine: true,
  } as const;
  setPrivyStatus(restoredFailure);
  retryPrivySignIn();
  expect(reconnectLine).toHaveBeenCalledTimes(2);
  rejectOld(new Error("Old LINE request failed"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(privyStatus()).toEqual(restoredFailure);
  expect(oldFailed).not.toHaveBeenCalled();
  retryPrivySignIn();
  expect(reconnectLine).toHaveBeenCalledTimes(2);
  finishNew();
  await new Promise((resolve) => setTimeout(resolve, 0));
  retryPrivySignIn();
  expect(reconnectLine).toHaveBeenCalledTimes(3);
});

describe("under LIFF Mock", () => {
  afterEach(() => {
    vi.stubEnv("VITE_LIFF_MOCK", "off");
  });

  it("stays off, since the auth server only takes LINE's own access tokens", async () => {
    vi.stubEnv("VITE_LIFF_MOCK", "");
    vi.resetModules();
    const privy = await import("./privy");
    expect(privy.privyStatus()).toEqual({ state: "off" });
  });
});

describe("Privy's errors after the JWT is accepted", () => {
  const WALLET_FRAME_RACE = "User must be authenticated before creating a Privy wallet";

  // Each test needs the one retry unspent, so each gets its own copy of the module.
  const freshPrivy = async () => {
    vi.resetModules();
    return import("./privy");
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("signs in again once when Privy signs out while its wallet frame starts", async () => {
    const privy = await freshPrivy();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    privy.setPrivyStatus({ state: "failed", reason: "Privy signed you out" });
    privy.onPrivyError(new Error(WALLET_FRAME_RACE));
    vi.advanceTimersByTime(1000);
    expect(privy.privyStatus()).toEqual({ state: "signing-in" });

    privy.onPrivyError(new Error(WALLET_FRAME_RACE));
    vi.advanceTimersByTime(1000);
    expect(privy.privyStatus()).toMatchObject({ state: "failed" });
    expect(reconnectLine).not.toHaveBeenCalled();
  });

  it("preserves a newer LINE failure when a wallet-frame retry is pending", async () => {
    const privy = await freshPrivy();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    privy.onPrivyError(new Error(WALLET_FRAME_RACE));
    privy.setPrivyStatus({ state: "failed", reason: "LINE expired", reconnectLine: true });

    vi.runAllTimers();
    privy.onPrivyError(new Error("Invalid JWT"));

    expect(privy.privyStatus()).toEqual({
      state: "failed",
      reason: "LINE expired",
      reconnectLine: true,
    });
    expect(reconnectLine).not.toHaveBeenCalled();
  });

  it("shows any other error as the failure, without retrying", async () => {
    const privy = await freshPrivy();
    privy.onPrivyError(new Error("Invalid JWT"));
    vi.advanceTimersByTime(1000);
    expect(privy.privyStatus()).toEqual({
      state: "failed",
      reason: "Privy could not sign in to the selected account. Try again.",
    });
  });
});

it("discards a JWT from an earlier version of the same selected account", async () => {
  lineToken();
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    ),
  );
  const pending = fetchPrivyJwt(account);
  suspendSession();
  acceptSession(sessionEnvelope(TEST_ME, { selectionVersion: "new-version" }));
  finish(
    new Response(
      JSON.stringify({ jwt: "old", subject: account.expectedSubject, expiresAt: nowS() + 300 }),
    ),
  );
  expect(await pending).toBeUndefined();
});
it("refuses an exchange for a different subject", async () => {
  lineToken();
  vi.stubGlobal(
    "fetch",
    server(200, { jwt: "wrong", subject: "someone-else", expiresAt: nowS() + 300 }),
  );
  expect(await fetchPrivyJwt(account)).toBeUndefined();
  expect(privyStatus().state).toBe("failed");
});

it("reports a genuine reconnect failure after a deferred preservation retry", async () => {
  let preserved = false;
  const stop = beforeAccountRelease({
    userId: TEST_ME.id,
    preservationError: () =>
      preserved ? null : new ApiError(0, { error: "person_switch_placement_preservation_failed" }),
    retryPreservation: () => {
      preserved = true;
    },
    blocked: () => suspendSession(),
  });
  try {
    reconnectLine.mockRejectedValueOnce(new Error("private-provider-credentials"));
    setPrivyStatus({ state: "failed", reason: "LINE expired", reconnectLine: true });
    const onFailed = vi.fn();
    retryPrivySignIn("/waiting-gift", onFailed);
    expect(reconnectLine).not.toHaveBeenCalled();
    expect(currentSelection()).toBeNull();
    retryAccountRelease(TEST_ME.id, () => {
      throw new Error("Deferred recovery was lost");
    });
    await vi.waitFor(() =>
      expect(onFailed).toHaveBeenCalledWith(
        expect.objectContaining({ code: "line_reconnect_failed" }),
      ),
    );
    expect(privyStatus()).toMatchObject({
      state: "failed",
      reason: "LINE could not reconnect; try again",
      reconnectLine: true,
    });
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain(
      "private-provider-credentials",
    );
  } finally {
    stop();
  }
});

it.each(["reload", "reconnect"])(
  "discards deferred %s recovery when a newer selection is accepted",
  (recovery) => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    let preserved = false;
    const stop = beforeAccountRelease({
      userId: TEST_ME.id,
      preservationError: () =>
        preserved
          ? null
          : new ApiError(0, { error: "person_switch_placement_preservation_failed" }),
      retryPreservation: () => {
        preserved = true;
      },
      blocked: () => suspendSession(),
    });
    try {
      setPrivyStatus({
        state: "failed",
        reason: "Recover old account",
        reconnectLine: recovery === "reconnect",
        reloadRequired: recovery === "reload",
      });
      retryPrivySignIn();
      expect(reconnectLine).not.toHaveBeenCalled();
      expect(reload).not.toHaveBeenCalled();
      acceptSession(sessionEnvelope(TEST_ME, { selectionVersion: "new-version" }));
      const newer = {
        state: "failed",
        reason: "Recover new account",
        reconnectLine: true,
      } as const;
      setPrivyStatus(newer);
      retryAccountRelease(TEST_ME.id, () => {
        throw new Error("Deferred recovery was lost");
      });
      expect(reconnectLine).not.toHaveBeenCalled();
      expect(reload).not.toHaveBeenCalled();
      expect(privyStatus()).toEqual(newer);
    } finally {
      stop();
    }
  },
);
