// @vitest-environment happy-dom
import type ShareTargetPickerModule from "@line/liff/share-target-picker";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const pickerCjs = createRequire(
  createRequire(import.meta.url).resolve("@line/liff/share-target-picker"),
).resolve("@liff/share-target-picker");
const builds = {
  es: pickerCjs.replace(/index\.cjs\.js$/, "index.es.js"),
  cjs: pickerCjs,
};

const isPickerBuild = (
  loaded: unknown,
): loaded is { ShareTargetPickerModule: typeof ShareTargetPickerModule } =>
  typeof loaded === "object" && loaded !== null && "ShareTargetPickerModule" in loaded;

/** A real SDK picker with synthetic initialization and no requests allowed to reach LINE. */
async function picker(build: string) {
  const loaded: unknown = await import(build);
  if (!isPickerBuild(loaded)) throw new Error(`${build} has no ShareTargetPickerModule`);
  Object.assign(window, { __liffConfig: { liffId: "liff-under-test" } });
  localStorage.setItem("LIFF_STORE:liff-under-test:accessToken", JSON.stringify("test-token"));
  localStorage.setItem(
    "LIFF_STORE:liff-under-test:context",
    JSON.stringify({ availability: { shareTargetPicker: { permission: true } } }),
  );
  return new loaded.ShareTargetPickerModule().install();
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe.each(Object.entries(builds))(
  "@liff/share-target-picker's %s build, patched",
  (_, build) => {
    it("keeps the SDK's blocked-popup code instead of an empty generic exception", async () => {
      const send = await picker(build);
      vi.spyOn(window, "open").mockReturnValue(null);
      vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ ott: "test-ott" })));

      await expect(send([{ type: "text", text: "test message" }])).rejects.toMatchObject({
        code: "CREATE_SUBWINDOW_FAILED",
        message: "",
      });
    });

    it("keeps the SDK's token-request code and message", async () => {
      const send = await picker(build);
      vi.spyOn(window, "open").mockReturnValue(null);
      vi.stubGlobal(
        "fetch",
        async () =>
          new Response(JSON.stringify({ error: "FORBIDDEN", message: "Token request refused" }), {
            status: 403,
          }),
      );

      await expect(send([{ type: "text", text: "test message" }])).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Token request refused",
      });
    });

    it("keeps a blank unknown failure as the original cause of the generic exception", async () => {
      const send = await picker(build);
      const cause = new Error("");
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(window, "open").mockReturnValue(null);
      vi.stubGlobal("fetch", async () => {
        throw cause;
      });

      await expect(send([{ type: "text", text: "test message" }])).rejects.toMatchObject({
        code: "EXCEPTION_IN_SUBWINDOW",
        message: "",
        cause,
      });
      expect(logged).toHaveBeenCalledWith("This is the cause of LiffError described below.", cause);
    });
  },
);
