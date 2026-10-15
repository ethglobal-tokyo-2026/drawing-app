// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { personKey } from "../ui/deviceStorage";
import { keepDealt, readDealtSubjects } from "./dealtSubjects";

const USER = "user-1";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("the words dealt before", () => {
  it("keeps every word dealt, each once, a word dealt again moving to the end", () => {
    const words = Array.from({ length: 5000 }, (_, i) => `word${i}`);
    keepDealt(USER, words);
    keepDealt(USER, ["word0", "new"]);
    expect(readDealtSubjects(USER)).toEqual([...words.slice(1), "word0", "new"]);
    expect(readDealtSubjects("someone-else")).toEqual([]);
  });

  it("reads an unreadable record as none dealt, and says so", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(personKey("kyotoSeika.dealt", USER), '["風", 7]');
    expect(readDealtSubjects(USER)).toEqual([]);
    expect(error).toHaveBeenCalledOnce();
  });
});
