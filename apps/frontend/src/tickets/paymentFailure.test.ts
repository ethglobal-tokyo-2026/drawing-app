import { describe, expect, it } from "vitest";
import { ApiError } from "../api/apiClient";
import { SigningTimedOut } from "../identity/signingTimedOut";
import { paymentFailureOf } from "./paymentFailure";

describe("paymentFailureOf", () => {
  it("names a payment that took too long to sign, with nothing to show as detail", () => {
    expect(paymentFailureOf(new SigningTimedOut())).toEqual({ kind: "timedOut", detail: "" });
  });

  it("leaves the app's or the server's own code to its catalog message, with the detail", () => {
    const error = new ApiError(409, { error: "transaction_failed", detail: "MoveAbort(…, 3)" });
    expect(paymentFailureOf(error)).toEqual({ kind: "app", error, detail: "MoveAbort(…, 3)" });
  });

  it("keeps the words of a failure it doesn't know", () => {
    expect(paymentFailureOf(new Error("The wallet closed"))).toEqual({
      kind: "other",
      detail: "The wallet closed",
    });
  });
});
