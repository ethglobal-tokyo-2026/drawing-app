// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { personKey } from "../ui/deviceStorage";
import { keepDealt, readDealtRecently, RECENT_DEALT } from "./dealtRecently";

const USER = "user-1";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("the words dealt lately", () => {
  it("keeps the newest RECENT_DEALT, newest last, for each person", () => {
    const words = Array.from({ length: RECENT_DEALT + 5 }, (_, i) => `word${i}`);
    keepDealt(USER, words.slice(0, 3));
    keepDealt(USER, words.slice(3));
    expect(readDealtRecently(USER)).toEqual(words.slice(-RECENT_DEALT));
    expect(readDealtRecently("someone-else")).toEqual([]);
  });

  it("reads an unreadable record as none dealt, and says so", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(personKey("kyotoSeika.dealt", USER), '["風", 7]');
    expect(readDealtRecently(USER)).toEqual([]);
    expect(error).toHaveBeenCalledOnce();
  });
});
