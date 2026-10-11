import { describe, expect, it } from "vitest";
import { createIpadSessionObservation } from "./ipadSessionProbe";

describe("iPad Safari session observations", () => {
  it("matches the actual request cookie to its HttpOnly, Secure response without returning its value", () => {
    const probe = createIpadSessionObservation();
    probe.observe(["session=signed-alice; Path=/api; HttpOnly; Secure; SameSite=Lax"]);
    const before = probe.read("other=value; session=signed-alice");
    expect(before.cookie).toMatch(/^[a-f0-9]{64}$/);
    expect(before.httpOnly).toBe(true);
    expect(before.secure).toBe(true);
    expect(JSON.stringify(before)).not.toContain("signed-alice");
    expect(probe.read("session=signed-alice; other=changed")).toEqual(before);
    expect(probe.read("session=signed-bob").cookie).not.toBe(before.cookie);
  });

  it("does not certify a missing, unobserved, or non-HttpOnly session cookie", () => {
    const probe = createIpadSessionObservation();
    expect(probe.read("unrelated=value")).toEqual({ cookie: "", httpOnly: false, secure: false });
    expect(probe.read("session=unobserved").httpOnly).toBe(false);
    probe.observe(["session=visible; Path=/api; Secure"]);
    expect(probe.read("session=visible").httpOnly).toBe(false);
    probe.observe(["session=insecure; Path=/api; HttpOnly"]);
    expect(probe.read("session=insecure").secure).toBe(false);
  });
});
