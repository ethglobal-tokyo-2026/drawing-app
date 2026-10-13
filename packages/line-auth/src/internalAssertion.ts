import { createHmac, timingSafeEqual } from "node:crypto";
import { PRIVY_JWT_LIFETIME_S } from "./line-privy-jwt.ts";

export interface PrivyJwtResult {
  jwt: string;
  subject: string;
  expiresAt: number;
}
export interface PrivyJwtAssertion {
  authenticatedUserId: string;
  authenticatedLineUserId: string;
  selectedUserId: string;
  selectedLineUserId: string;
  sessionId: string;
  selectionVersion: string | null;
  scope: "croquis-privy-jwt";
  issuedAt: number;
  expiresAt: number;
}
const fields = [
  "authenticatedUserId",
  "authenticatedLineUserId",
  "selectedUserId",
  "selectedLineUserId",
  "sessionId",
  "selectionVersion",
  "scope",
  "issuedAt",
  "expiresAt",
] as const;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const text = (value: unknown) =>
  typeof value === "string" && value.length > 0 && value.length <= 128;
function canonical(assertion: PrivyJwtAssertion) {
  return JSON.stringify(Object.fromEntries(fields.map((key) => [key, assertion[key]])));
}
export class PrivyAssertionError extends Error {
  constructor() {
    super("Invalid internal Privy authorization");
  }
}
export function authenticatePrivyAssertion(
  assertion: PrivyJwtAssertion,
  secret: string,
): { assertion: PrivyJwtAssertion; mac: string } {
  if (secret.length < 32) throw new PrivyAssertionError();
  return {
    assertion,
    mac: createHmac("sha256", secret).update(canonical(assertion)).digest("hex"),
  };
}
function isPrivyJwtAssertion(value: unknown, nowSeconds: number): value is PrivyJwtAssertion {
  return (
    object(value) &&
    exact(value, fields) &&
    fields.slice(0, 5).every((key) => text(value[key])) &&
    (value.selectionVersion === null || text(value.selectionVersion)) &&
    value.scope === "croquis-privy-jwt" &&
    typeof value.issuedAt === "number" &&
    Number.isSafeInteger(value.issuedAt) &&
    typeof value.expiresAt === "number" &&
    Number.isSafeInteger(value.expiresAt) &&
    value.issuedAt <= nowSeconds &&
    value.expiresAt > nowSeconds &&
    value.expiresAt > value.issuedAt &&
    value.expiresAt - value.issuedAt <= PRIVY_JWT_LIFETIME_S
  );
}
export function verifyPrivyAssertion(
  body: unknown,
  secret: string,
  nowSeconds: number,
): PrivyJwtAssertion {
  if (
    !object(body) ||
    !exact(body, ["assertion", "mac"]) ||
    !isPrivyJwtAssertion(body.assertion, nowSeconds) ||
    typeof body.mac !== "string" ||
    !/^[0-9a-f]{64}$/.test(body.mac)
  )
    throw new PrivyAssertionError();
  const expected = authenticatePrivyAssertion(body.assertion, secret).mac;
  if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(body.mac, "hex")))
    throw new PrivyAssertionError();
  return body.assertion;
}
