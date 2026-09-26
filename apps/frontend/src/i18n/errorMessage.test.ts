import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "../api/apiClient";
import { errorMessage, errorReason } from "./errorMessage";
import { i18next } from "./i18n";
import { errors } from "./strings/errors";

afterEach(() => i18next.changeLanguage("en"));

describe("an error's message", () => {
  it("is its code's message in the app's language", async () => {
    const error = new ApiError(409, { error: "handle_taken" });
    expect(errorMessage(error)).toBe(errors.handle_taken.en);
    await i18next.changeLanguage("ja");
    expect(errorMessage(error)).toBe(errors.handle_taken.ja);
  });

  it("names a code the catalog doesn't have, and keeps the server's detail in fine print", () => {
    // The API answers route_not_found outside any route, so no route's type carries it.
    expect(errorMessage(new ApiError(404, { error: "route_not_found" }))).toBe(
      errors.unknown.en.replace("{{code}}", "route_not_found"),
    );
    expect(
      errorReason(new ApiError(404, { error: "sticker_not_found", detail: "No sticker s1" })),
    ).toBe(`${errors.sticker_not_found.en} (No sticker s1)`);
  });
});
