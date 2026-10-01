// @vitest-environment happy-dom
import type { Tickets } from "@drawing-app/api/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { FRESH_TICKETS } from "../api/testing";
import {
  addUnaddedPurchase,
  addUnaddedPurchases,
  forgetUnaddedPurchase,
  keepUnaddedPurchase,
  keptRefusal,
  PASSING_FAILURE_STATUSES,
  PAYMENT_LANDS_WITHIN_MS,
  readUnaddedPurchasesAgain,
  REFUSAL_STATUSES,
  refusalError,
  UNADDED_KEPT_MAX,
  unaddedPurchasesFor,
  type UnaddedPurchase,
} from "./unaddedPurchases";

const KEY = "draw.unaddedPurchases.me";

const purchase = (n: number, tickets = 3): UnaddedPurchase => ({
  purchaseId: n,
  digest: `${n}`.padStart(44, "D"),
  tickets,
  priceYen: tickets * 90,
  paidAt: Date.UTC(2026, 8, 27) + n * 60_000,
});
const bought: Tickets = { ...FRESH_TICKETS, reserveLeft: 3 };
const counted: Tickets = { ...FRESH_TICKETS, reserveLeft: 4 };

/** A server that answers every POST /api/ticket-purchases with `answer`: tickets, or a failure. */
const server = (answer: Tickets | Error | "never") => ({
  buyTickets: vi.fn<ApiClient["buyTickets"]>(() =>
    answer === "never"
      ? new Promise(() => {})
      : answer instanceof Error
        ? Promise.reject(answer)
        : Promise.resolve(answer),
  ),
  tickets: vi.fn<ApiClient["tickets"]>(() => Promise.resolve(counted)),
});

/** What the next app open still has kept for you, read from storage. */
const keptAtNextOpen = () => {
  readUnaddedPurchasesAgain();
  return unaddedPurchasesFor("me");
};

beforeEach(() => {
  localStorage.clear();
  readUnaddedPurchasesAgain();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("payments kept until their tickets are added", () => {
  it("keeps a payment, with its pack and price, for the person who paid, across a reload", () => {
    keepUnaddedPurchase("me", purchase(1));
    expect(keptAtNextOpen()).toEqual([purchase(1)]);
    expect(unaddedPurchasesFor("someone-else")).toEqual([]);
    // Someone else's sign-in leaves it be.
    keepUnaddedPurchase("someone-else", purchase(2));
    expect(keptAtNextOpen()).toEqual([purchase(1)]);
  });

  it("asks again with the same purchase and payment, and forgets it once its tickets are added", async () => {
    keepUnaddedPurchase("me", purchase(1));
    const api = server(bought);
    await expect(addUnaddedPurchases(api, "me")).resolves.toEqual(bought);
    expect(api.buyTickets).toHaveBeenCalledExactlyOnceWith({
      purchaseId: purchase(1).purchaseId,
      txDigest: purchase(1).digest,
    });
    expect(keptAtNextOpen()).toEqual([]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("takes a payment already counted as added, and reads the tickets", async () => {
    keepUnaddedPurchase("me", purchase(1));
    const api = server(new ApiError(409, { error: "payment_already_counted" }));
    await expect(addUnaddedPurchases(api, "me")).resolves.toEqual(counted);
    expect(api.tickets).toHaveBeenCalledOnce();
    expect(keptAtNextOpen()).toEqual([]);
  });

  /** Failures asking again can get past, as the client sees them. */
  const passing: [string, Error][] = [
    ...[0, ...PASSING_FAILURE_STATUSES, 500, 502, 503].map((status): [string, Error] => [
      status === 0 ? "no answer" : `HTTP ${status}`,
      new ApiError(status, { error: status === 0 ? "network" : "try_later" }),
    ]),
    ["a failed fetch", new TypeError("Failed to fetch")],
    // The server never judged the payment, so it isn't let go.
    ["a lapsed session, HTTP 401", new ApiError(401, { error: "signed_out" })],
    // Another window signed this browser in as someone else, whose session the ask went out on.
    ["someone else's session, HTTP 403", new ApiError(403, { error: "payment_not_yours" })],
  ];

  it.each(passing)("keeps a payment through %s, and asks again", async (_, failure) => {
    keepUnaddedPurchase("me", purchase(1));
    const api = server(failure);
    await expect(addUnaddedPurchases(api, "me")).resolves.toBeNull();
    await expect(addUnaddedPurchase(api, "me", purchase(1))).rejects.toBe(failure);
    expect(keptAtNextOpen()).toEqual([purchase(1)]);
    await addUnaddedPurchases(api, "me");
    expect(api.buyTickets).toHaveBeenCalledTimes(3);
  });

  it.each(REFUSAL_STATUSES)(
    "stops asking once the server refuses a payment for good (%i), keeping why until the checkout says it",
    async (status) => {
      keepUnaddedPurchase("me", purchase(1));
      const refused = new ApiError(status, { error: "payment_short", detail: "short" });
      const api = server(refused);
      await expect(addUnaddedPurchases(api, "me")).resolves.toBeNull();
      const [kept] = keptAtNextOpen();
      expect(kept?.refusal && refusalError(kept.refusal)).toMatchObject({
        status,
        code: "payment_short",
        detail: "short",
      });
      // Never asked for again, and gone once the checkout has said why.
      await addUnaddedPurchases(api, "me");
      expect(api.buyTickets).toHaveBeenCalledOnce();
      forgetUnaddedPurchase("me", purchase(1).digest);
      expect(keptAtNextOpen()).toEqual([]);
    },
  );

  it("keeps asking while Sui doesn't show a payment, until long after it was signed", async () => {
    const justSigned = { ...purchase(1), paidAt: Date.now() };
    const longAgo = { ...purchase(2), paidAt: Date.now() - PAYMENT_LANDS_WITHIN_MS };
    keepUnaddedPurchase("me", justSigned);
    keepUnaddedPurchase("me", longAgo);
    await addUnaddedPurchases(server(new ApiError(409, { error: "payment_not_landed" })), "me");
    expect(keptAtNextOpen().map((p) => p.refusal?.error)).toEqual([
      undefined,
      "payment_not_landed",
    ]);
    expect(keptRefusal("me", justSigned.digest)).toBeNull();
    expect(keptRefusal("me", longAgo.digest)?.code).toBe("payment_not_landed");
  });

  it("asks for each kept payment in turn, and one that fails again stays", async () => {
    keepUnaddedPurchase("me", purchase(1));
    keepUnaddedPurchase("me", purchase(2));
    const api = server(bought);
    api.buyTickets.mockRejectedValueOnce(new ApiError(502, { error: "sui_unavailable" }));
    await expect(addUnaddedPurchases(api, "me")).resolves.toEqual(bought);
    expect(api.buyTickets.mock.calls.map(([asked]) => asked.txDigest)).toEqual([
      purchase(1).digest,
      purchase(2).digest,
    ]);
    expect(keptAtNextOpen()).toEqual([purchase(1)]);
  });

  it("sends one request for a payment at a time, however many ask", async () => {
    // Its own payment, since the request never ends.
    const waiting = purchase(99);
    keepUnaddedPurchase("me", waiting);
    const api = server("never");
    void addUnaddedPurchases(api, "me");
    void addUnaddedPurchase(api, "me", waiting);
    await Promise.resolve();
    expect(api.buyTickets).toHaveBeenCalledOnce();
  });

  it(`keeps at most ${UNADDED_KEPT_MAX} for a person, letting the oldest go with its ID in the log`, () => {
    for (let n = 1; n <= UNADDED_KEPT_MAX + 1; n++) keepUnaddedPurchase("me", purchase(n));
    const kept = keptAtNextOpen();
    expect(kept).toHaveLength(UNADDED_KEPT_MAX);
    expect(kept[0]).toEqual(purchase(2));
    expect(console.error).toHaveBeenCalledWith(expect.any(String), purchase(1));
  });

  it("still keeps a payment in memory when storage refuses it", () => {
    // A stand-in storage: spying on happy-dom's own doesn't reach it.
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new DOMException("Full", "QuotaExceededError");
      },
    });
    keepUnaddedPurchase("me", purchase(1));
    expect(unaddedPurchasesFor("me")).toEqual([purchase(1)]);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(purchase(1).digest),
      expect.any(DOMException),
    );
  });

  it("keeps the readable ones of what storage holds, and logs the rest whole", () => {
    const text = JSON.stringify([purchase(1), { ...purchase(2), priceYen: "¥270" }]);
    localStorage.setItem(KEY, text);
    expect(keptAtNextOpen()).toEqual([purchase(1)]);
    expect(console.error).toHaveBeenCalledWith(expect.any(String), text);

    localStorage.setItem(KEY, "{not json");
    expect(keptAtNextOpen()).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(expect.any(String), "{not json");
  });
});
