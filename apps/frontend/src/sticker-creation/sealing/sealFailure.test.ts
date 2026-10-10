import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/apiClient";
import { describeSealFailure, sealFailure } from "./sealFailure";

describe("sealFailure", () => {
  const answered = (status: number, error: string) => sealFailure(new ApiError(status, { error }));

  it("lets the sheet change only once the server has refused the seal itself", () => {
    expect(answered(400, "invalid_request")).toBe("refused");
    expect(answered(404, "ticket_not_found")).toBe("refused");
    // Turned away before the ticket was looked at: an earlier try may still have sealed.
    expect(answered(401, "signed_out")).toBe("unknown");
    // Asked by a session that's someone else's, which says nothing of this person's seal.
    expect(answered(403, "ticket_not_yours")).toBe("unknown");
    // Saved, or maybe saved: sent again, the same request gets the sticker from the ticket use.
    expect(answered(503, "mint_failed")).toBe("unknown");
    expect(answered(0, "network")).toBe("unknown");
    expect(answered(409, "ticket_already_used")).toBe("unknown");
    expect(sealFailure(new SyntaxError("the answer isn't JSON"))).toBe("unknown");
    // The wait for the Sui address stops it before it leaves the phone.
    expect(answered(0, "line_token_expired")).toBe("unsent");
    expect(answered(0, "sui_wallet_not_ready")).toBe("unsent");
  });
});

describe("describeSealFailure", () => {
  const problem = (status: number, error: string) =>
    describeSealFailure(new ApiError(status, { error }), true).kind;

  it("sorts a failed seal by what the chip can tell the artist", () => {
    expect(problem(0, "network")).toBe("noAnswer");
    expect(problem(500, "internal_error")).toBe("serverProblem");
    expect(problem(503, "mint_failed")).toBe("notOnChain");
    expect(problem(0, "sui_wallet_not_ready")).toBe("suiAddress");
    expect(problem(0, "line_token_expired")).toBe("signInExpired");
    // A refusal is worded by its own message.
    expect(problem(404, "ticket_not_found")).toBe("refused");
  });

  it("blames the device only for a failure before the request left it", () => {
    expect(describeSealFailure(new Error("the cut failed"), false).kind).toBe("onThisDevice");
    expect(describeSealFailure(new SyntaxError("the answer isn't JSON"), true).kind).toBe(
      "noAnswer",
    );
  });
});
