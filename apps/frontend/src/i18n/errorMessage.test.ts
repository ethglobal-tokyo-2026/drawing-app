import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "../api/apiClient";
import { errors as english } from "./en/errors";
import { errorMessage, errorReason } from "./errorMessage";
import { i18next } from "./i18n";
import { errors as japanese } from "./ja/errors";

afterEach(() => i18next.changeLanguage("en"));

describe("an error's message", () => {
  it("is its code's message in the app's language, falling back to English", async () => {
    await i18next.changeLanguage("ja");
    expect(errorMessage(new ApiError(404, { error: "sticker_not_found" }))).toBe(
      japanese.sticker_not_found,
    );
    expect(errorMessage(new ApiError(409, { error: "handle_taken" }))).toBe(english.handle_taken);
  });

  it("names a code the catalog doesn't have, and keeps the server's detail in fine print", () => {
    // The API answers route_not_found outside any route, so no route's type carries it.
    expect(errorMessage(new ApiError(404, { error: "route_not_found" }))).toBe(
      english.unknown.replace("{{code}}", "route_not_found"),
    );
    expect(
      errorReason(new ApiError(404, { error: "sticker_not_found", detail: "No sticker s1" })),
    ).toBe(`${english.sticker_not_found} (No sticker s1)`);
  });
});
