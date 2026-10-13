import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  authenticatePrivyAssertion,
  verifyPrivyAssertion,
  type PrivyJwtAssertion,
} from "../src/internalAssertion.ts";

const secret = "a".repeat(64);
const assertion: PrivyJwtAssertion = {
  authenticatedUserId: "principal",
  authenticatedLineUserId: "line-principal",
  selectedUserId: "selected",
  selectedLineUserId: "line-selected",
  sessionId: "session",
  selectionVersion: "version",
  scope: "croquis-privy-jwt",
  issuedAt: 1000,
  expiresAt: 1300,
};
describe("protected Privy assertion", () => {
  it("accepts a canonical authenticated assertion regardless of object insertion order", () => {
    const signed = authenticatePrivyAssertion(assertion, secret);
    expect(
      verifyPrivyAssertion(
        { ...signed, assertion: Object.fromEntries(Object.entries(assertion).reverse()) },
        secret,
        1000,
      ),
    ).toEqual(assertion);
  });
  it.each(Object.keys(assertion))("rejects an altered %s", (key) => {
    const signed = authenticatePrivyAssertion(assertion, secret);
    expect(() =>
      verifyPrivyAssertion(
        { ...signed, assertion: { ...assertion, [key]: "altered" } },
        secret,
        1000,
      ),
    ).toThrow();
  });
  it.each([
    { expiresAt: 1000 },
    { expiresAt: 1301 },
    { issuedAt: 1001 },
    { issuedAt: 999.5 },
    { scope: "other" },
    { selectedUserId: "" },
    { selectionVersion: 1 },
    { extra: "identity" },
  ])("rejects invalid signed fields %j", (changes) => {
    const invalid = { ...assertion, ...changes };
    const mac = createHmac("sha256", secret).update(JSON.stringify(invalid)).digest("hex");
    expect(() => verifyPrivyAssertion({ assertion: invalid, mac }, secret, 1000)).toThrow();
  });
  it.each(["absent", "missing-mac", "wrong-mac", "extra"])(
    "rejects %s internal authentication",
    (kind) => {
      const body =
        kind === "absent"
          ? {}
          : kind === "missing-mac"
            ? { assertion }
            : {
                ...authenticatePrivyAssertion(assertion, secret),
                ...(kind === "wrong-mac" ? { mac: "0".repeat(64) } : { extra: true }),
              };
      expect(() => verifyPrivyAssertion(body, secret, 1000)).toThrow();
    },
  );
});
