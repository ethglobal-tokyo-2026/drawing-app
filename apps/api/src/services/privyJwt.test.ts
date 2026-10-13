import { expect, it } from "vitest";
import { createPrivyJwtService } from "./privyJwt.ts";
import {
  verifyPrivyAssertion,
  type PrivyJwtAssertion,
} from "@drawing-app/line-auth/internalAssertion";
const secret = "b".repeat(64);
const assertion: PrivyJwtAssertion = {
  authenticatedUserId: "principal",
  authenticatedLineUserId: "line-principal",
  selectedUserId: "selected",
  selectedLineUserId: "line-selected",
  sessionId: "session",
  selectionVersion: null,
  scope: "croquis-privy-jwt",
  issuedAt: 1000,
  expiresAt: 1300,
};
it.each([
  "https://example.test/_internal/privy-jwt",
  "http://localhost/_internal/privy-jwt",
  "http://127.0.0.1/other",
  "http://user@127.0.0.1/_internal/privy-jwt",
  "http://127.0.0.1/_internal/privy-jwt?secret=x",
])("rejects non-loopback or ambiguous issuer %s", (url) => {
  expect(() => createPrivyJwtService({ url, secret })).toThrow();
});
it("authenticates API identity and delegates with the caller deadline", async () => {
  const signal = new AbortController().signal;
  const service = createPrivyJwtService({
    url: "http://127.0.0.1:8787/_internal/privy-jwt",
    secret,
    fetchImpl: async (_input, options) => {
      expect(options?.signal).toBe(signal);
      expect(options?.redirect).toBe("error");
      if (typeof options?.body !== "string") throw new Error("Expected assertion JSON");
      expect(verifyPrivyAssertion(JSON.parse(options.body), secret, 1000)).toEqual(assertion);
      return Response.json({ jwt: "private-jwt", subject: "line-subject", expiresAt: 1300 });
    },
  });
  expect(await service.issue(assertion, signal)).toEqual({
    jwt: "private-jwt",
    subject: "line-subject",
    expiresAt: 1300,
  });
});
it.each(["unavailable", "malformed", "excess-expiry", "timeout"])(
  "sanitizes %s issuer failure",
  async (failure) => {
    const controller = new AbortController();
    if (failure === "timeout") controller.abort(new Error("private-token"));
    const service = createPrivyJwtService({
      url: "http://127.0.0.1:8787/_internal/privy-jwt",
      secret,
      fetchImpl: async () => {
        if (failure === "unavailable") throw new Error("private-token");
        return failure === "malformed"
          ? new Response("private-token")
          : Response.json({ jwt: "private-jwt", subject: "line-subject", expiresAt: 1301 });
      },
    });
    await expect(service.issue(assertion, controller.signal)).rejects.toThrow(
      "Protected Privy issuer unavailable",
    );
  },
);
