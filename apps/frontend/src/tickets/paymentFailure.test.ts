import { describe, expect, it } from "vitest";
import { ApiError } from "../api/apiClient";
import { PaymentFailed, SigningTimedOut } from "../payments/paymentErrors";
import { paymentFailureOf } from "./paymentFailure";

describe("paymentFailureOf", () => {
  it("names a payment that took too long to sign, with nothing to show as detail", () => {
    expect(paymentFailureOf(new SigningTimedOut())).toEqual({ kind: "timedOut", detail: "" });
  });

  it("names a payment Sui ran and failed, with Sui's own words as detail", () => {
    const failure = paymentFailureOf(new PaymentFailed("digest", "MoveAbort(MoveLocation {}, 3)"));
    expect(failure).toEqual({ kind: "rejected", detail: "MoveAbort(MoveLocation {}, 3)" });
  });

  it.each([
    ["Sui's failure", new PaymentFailed("digest", "InsufficientGas")],
    [
      "the SDK's, with no SUI coin to pay with",
      new Error("No valid gas coins found for the transaction."),
    ],
  ])("names a missing network fee from %s", (_source, error) => {
    expect(paymentFailureOf(error).kind).toBe("noNetworkFee");
  });

  it("names a request that never reached Sui as offline", () => {
    expect(paymentFailureOf(new TypeError("Failed to fetch"))).toEqual({
      kind: "offline",
      detail: "Failed to fetch",
    });
  });

  it("leaves the app's own code to its catalog message, with the server's detail", () => {
    const error = new ApiError(0, { error: "sui_wallet_not_ready", detail: "Privy is off" });
    expect(paymentFailureOf(error)).toEqual({ kind: "app", error, detail: "Privy is off" });
  });

  it("keeps the words of a failure it doesn't know", () => {
    expect(paymentFailureOf(new Error("Something odd"))).toEqual({
      kind: "other",
      detail: "Something odd",
    });
  });
});
