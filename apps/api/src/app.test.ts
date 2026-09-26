import { users } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorBodySchema, validate } from "./errors.ts";
import { setSessionCookie, type AppEnv } from "./session.ts";
import { createTestApp, type TestApp } from "./testing/createTestApp.ts";

const probeBodySchema = z.object({ handle: z.string(), placement: z.object({ x: z.number() }) });
const probeBody = { handle: "alice", placement: { x: 0.5 } };
const probeFailure = new Error("The probe route failed on purpose");

/** A tiny protected route group, standing in for a real one. */
const probeRoutes = new Hono<AppEnv>()
  .post("/", validate("json", probeBodySchema), (c) => c.json({ userId: c.var.userId }))
  .get("/failure", () => {
    throw probeFailure;
  });

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
  test.app.route("/probe", probeRoutes);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  test.app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const signedIn = async () => test.signInAs(insertUser(test.db));

/** The status and ErrorBody a request was refused with. */
const refusal = async (response: Response) => ({
  status: response.status,
  ...errorBodySchema.parse(await response.json()),
});

describe("sessions", () => {
  it("refuse a protected route without the session cookie", async () => {
    expect(await refusal(await post("/api/probe", probeBody))).toEqual({
      status: 401,
      error: "signed_out",
    });
  });

  it("accept the signed cookie signInAs makes, and name the person", async () => {
    const userId = insertUser(test.db);
    const response = await post("/api/probe", probeBody, await test.signInAs(userId));
    expect(response.status).toBe(200);
    expect(z.object({ userId: z.string() }).parse(await response.json()).userId).toBe(userId);
  });

  it("start with the HttpOnly cookie setSessionCookie sets", async () => {
    const userId = insertUser(test.db);
    const signIn = new Hono().post("/", async (c) => {
      await setSessionCookie(c, test.deps.sessionSecret, userId);
      return c.body(null, 204);
    });
    const setCookie = (await signIn.request("/", { method: "POST" })).headers.get("set-cookie");
    expect(setCookie).toMatch(/; HttpOnly(;|$)/);
    const [cookie = ""] = (setCookie ?? "").split(";");
    expect((await post("/api/probe", probeBody, { Cookie: cookie })).status).toBe(200);
  });

  it("refuse a cookie the session secret didn't sign", async () => {
    const userId = insertUser(test.db);
    const unsigned = await post("/api/probe", probeBody, { Cookie: `session=${userId}` });
    expect(await refusal(unsigned)).toMatchObject({ status: 401, error: "signed_out" });
  });

  it("end when the account is deleted", async () => {
    const userId = insertUser(test.db);
    const headers = await test.signInAs(userId);
    test.db
      .update(users)
      .set({ deletedAt: new Date(), lineUserId: null, lineDisplayName: null, linePictureUrl: null })
      .where(eq(users.id, userId))
      .run();
    expect(await refusal(await post("/api/probe", probeBody, headers))).toMatchObject({
      status: 401,
      error: "signed_out",
    });
  });

  it("aren't needed to sign in, and only there", async () => {
    const signIn = await refusal(await post("/api/session", {}));
    expect(signIn.error).not.toBe("signed_out");
    const other = await refusal(await test.app.request("/api/session"));
    expect(other.error).toBe("signed_out");
  });
});

describe("errors", () => {
  it("answer a body that fails its schema with 400 invalid_request, naming the field", async () => {
    const body = { ...probeBody, placement: { x: "left" } };
    const answer = await refusal(await post("/api/probe", body, await signedIn()));
    expect(answer).toMatchObject({ status: 400, error: "invalid_request" });
    expect(answer.detail).toContain("placement.x");
  });

  it("answer a body that isn't JSON with 400 invalid_request", async () => {
    const answer = await refusal(await post("/api/probe", "{", await signedIn()));
    expect(answer).toMatchObject({ status: 400, error: "invalid_request" });
  });

  it("answer an error a route didn't catch with 500 internal_error, and log it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await test.app.request("/api/probe/failure", { headers: await signedIn() });
    expect(await refusal(response)).toEqual({ status: 500, error: "internal_error" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("/api/probe/failure"), probeFailure);
  });
});
