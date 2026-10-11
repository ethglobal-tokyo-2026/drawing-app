import { afterEach, expect, it, vi } from "vitest";

const line = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("@line/liff", () => ({ default: line }));
import { lineLogin } from "../../../../apps/frontend/src/line/liff";

afterEach(() => vi.restoreAllMocks());

it("records LINE login blocked by the optional auto-login marker exceeding storage quota", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage full", "QuotaExceededError");
  });
  expect(() => lineLogin("https://example.test/")).toThrow("Storage full");
  expect(line.login).not.toHaveBeenCalled();
});
