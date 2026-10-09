// @vitest-environment happy-dom
import type LoginModule from "@line/liff/login";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

// The pnpm patch to @liff/login (patches/) that lets liff.login turn LINE's auto login off. The app
// reaches @liff/login only through @line/liff; the browser bundle runs its ES build, Node its CJS one.
const loginCjs = createRequire(createRequire(import.meta.url).resolve("@line/liff/login")).resolve(
  "@liff/login",
);
const builds = {
  es: loginCjs.replace(/index\.cjs\.js$/, "index.es.js"),
  cjs: loginCjs,
};

type LoginConfig = Parameters<ReturnType<LoginModule["install"]>>[0];
const isLoginBuild = (loaded: unknown): loaded is { LoginModule: typeof LoginModule } =>
  typeof loaded === "object" && loaded !== null && "LoginModule" in loaded;

/** Where the build's login sends this browser when asked with `config`, without going there. */
async function authorizeUrl(build: string, config: LoginConfig) {
  const loaded: unknown = await import(build);
  if (!isLoginBuild(loaded)) throw new Error(`${build} has no LoginModule`);
  // LIFF keeps liff.init's config on the window.
  Object.assign(window, { __liffConfig: { liffId: "liff-under-test" } });
  const navigate = vi.spyOn(location, "href", "set").mockImplementation(() => {});
  new loaded.LoginModule().install()(config);
  const to = navigate.mock.lastCall?.[0];
  if (to === undefined) throw new Error("LIFF's login didn't navigate");
  return new URL(to);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(Object.entries(builds))("@liff/login's %s build, patched", (_, build) => {
  it("asks LINE Login to skip auto login only when told to", async () => {
    const redirectUri = "https://croquis.test/board";
    const skipped = await authorizeUrl(build, { redirectUri, disableAutoLogin: true });
    expect(skipped.searchParams.get("disable_auto_login")).toBe("true");
    expect(skipped.searchParams.get("redirect_uri")).toBe(redirectUri);
    const auto = await authorizeUrl(build, { redirectUri });
    expect(auto.searchParams.has("disable_auto_login")).toBe(false);
  });
});
