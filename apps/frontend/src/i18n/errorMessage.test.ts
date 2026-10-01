import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "../api/apiClient";
import { errorDetail, errorMessage, joinedDetails, problemOf } from "./errorMessage";
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

  it("names a code the catalog doesn't have, free to wrap after its underscores", () => {
    // The API answers route_not_found outside any route, so no route's type carries it.
    const message = errorMessage(new ApiError(404, { error: "route_not_found" }));
    expect(message.replaceAll("​", "")).toBe(
      errors.unknown.en.replace("{{code}}", "route_not_found"),
    );
    expect(message).toContain("route_​not_​found");
  });
});

describe("a failure as a problem", () => {
  it("says an API error's message and keeps the status, code and server's detail apart for a report", () => {
    const error = new ApiError(404, { error: "sticker_not_found", detail: "No sticker s1" });
    expect(problemOf(error)).toEqual({
      message: errors.sticker_not_found.en,
      detail: "404 · sticker_not_found: No sticker s1",
    });
    expect(errorDetail(new ApiError(0, { error: "network" }))).toBe("network");
  });

  it("says one line in the app's language for anything else, whose English stays in the detail", async () => {
    const error = new DOMException("The quota has been exceeded", "QuotaExceededError");
    expect(problemOf(error)).toEqual({
      message: errors.unexpected.en,
      detail: "QuotaExceededError: The quota has been exceeded",
    });
    await i18next.changeLanguage("ja");
    expect(problemOf(error).message).toBe(errors.unexpected.ja);
  });
});

describe("several failures' details", () => {
  it("are one line of each distinct detail, or none", () => {
    expect(joinedDetails(["a", undefined, "b", "a"])).toBe("a; b");
    expect(joinedDetails([undefined])).toBeUndefined();
  });
});
