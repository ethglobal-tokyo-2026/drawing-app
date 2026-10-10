import { describe, expect, it, vi } from "vitest";
import { maskCache } from "./maskCache";

const MOST = 3;

describe("maskCache", () => {
  it("keeps the masks used last, and loads again only one it let go", async () => {
    const load = vi.fn((url: string) => Promise.resolve(url));
    const maskOf = maskCache(load, MOST);
    for (const url of ["a", "b", "c"]) await maskOf(url);
    // Used again, "a" is the newest, so "b" goes for "d".
    await maskOf("a");
    await maskOf("d");
    load.mockClear();

    for (const url of ["a", "c", "d"]) await maskOf(url);
    expect(load).not.toHaveBeenCalled();
    await maskOf("b");
    expect(load).toHaveBeenCalledWith("b");
  });

  it("tries a mask that failed to load again", async () => {
    const load = vi.fn((url: string) => Promise.resolve(url));
    load.mockRejectedValueOnce(new Error("Loading the mask answered 503"));
    const maskOf = maskCache(load, MOST);
    await expect(maskOf("a")).rejects.toThrow();
    await expect(maskOf("a")).resolves.toBe("a");
  });
});
