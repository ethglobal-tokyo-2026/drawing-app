import { describe, expect, it } from "vitest";
import { createApiClient } from "./client.ts";

const API_ORIGIN = "https://api.test";

describe("createApiClient", () => {
  it("calls each route under /api on the origin it's given", () => {
    const api = createApiClient(API_ORIGIN);
    expect(api.me.$url().href).toBe(`${API_ORIGIN}/api/me`);
    expect(api["sticker-boards"][":userId"].$url({ param: { userId: "me" } }).href).toBe(
      `${API_ORIGIN}/api/sticker-boards/me`,
    );
  });
});
