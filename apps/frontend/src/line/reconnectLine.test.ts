// @vitest-environment happy-dom
import liff from "@line/liff";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reconnectLine } from "./reconnectLine";

const mock = vi.hoisted(() => ({ active: false }));
const navigation = {
  replace: vi.fn<(url: string | URL) => void>(),
  reload: vi.fn<() => void>(),
};

vi.mock("./liff", () => ({
  get liffMockActive() {
    return mock.active;
  },
}));

vi.mock("@line/liff", () => ({
  default: {
    isInClient: vi.fn(),
    logout: vi.fn(),
    login: vi.fn(),
    permanentLink: { createUrlBy: vi.fn() },
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mock.active = false;
  history.replaceState(null, "", "/gift/claim-token?lang=ja#open");
  vi.spyOn(location, "replace").mockImplementation(navigation.replace);
  vi.spyOn(location, "reload").mockImplementation(navigation.reload);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("reconnecting LINE", () => {
  it("reenters the LIFF browser through a permanent link for the current deep link", async () => {
    vi.mocked(liff.isInClient).mockReturnValue(true);
    const currentUrl = location.href;
    const permanentUrl = "https://liff.line.me/app-id/gift/claim-token?lang=ja#open";
    vi.mocked(liff.permanentLink.createUrlBy).mockResolvedValue(permanentUrl);

    await reconnectLine();

    expect(liff.permanentLink.createUrlBy).toHaveBeenCalledExactlyOnceWith(currentUrl);
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith(permanentUrl);
    expect(liff.login).not.toHaveBeenCalled();
    expect(liff.logout).not.toHaveBeenCalled();
  });

  it("discards external-browser credentials before signing in at the current deep link", async () => {
    vi.mocked(liff.isInClient).mockReturnValue(false);
    vi.mocked(liff.login).mockImplementation(() => {
      expect(liff.logout).toHaveBeenCalledOnce();
    });

    await reconnectLine();

    expect(liff.login).toHaveBeenCalledExactlyOnceWith({ redirectUri: location.href });
    expect(liff.permanentLink.createUrlBy).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("leaves the current page in place when permanent-link creation fails", async () => {
    vi.mocked(liff.isInClient).mockReturnValue(true);
    const failure = new Error("LINE permanent link unavailable");
    vi.mocked(liff.permanentLink.createUrlBy).mockRejectedValue(failure);

    await expect(reconnectLine()).rejects.toBe(failure);

    expect(navigation.replace).not.toHaveBeenCalled();
    expect(liff.login).not.toHaveBeenCalled();
  });

  it("times out a stalled permanent link and ignores its late result", async () => {
    vi.useFakeTimers();
    vi.mocked(liff.isInClient).mockReturnValue(true);
    let resolveUrl: ((url: string) => void) | undefined;
    vi.mocked(liff.permanentLink.createUrlBy).mockReturnValue(
      new Promise((resolve) => {
        resolveUrl = resolve;
      }),
    );

    const rejected = expect(reconnectLine()).rejects.toThrow("LINE reconnect timed out");
    await vi.runAllTimersAsync();
    await rejected;
    resolveUrl?.("https://liff.line.me/app-id/gift/claim-token");
    await Promise.resolve();

    expect(navigation.replace).not.toHaveBeenCalled();
    expect(liff.login).not.toHaveBeenCalled();
  });

  it("lets external-browser login failures reach the caller", async () => {
    vi.mocked(liff.isInClient).mockReturnValue(false);
    const failure = new Error("LINE Login unavailable");
    vi.mocked(liff.login).mockImplementation(() => {
      throw failure;
    });

    await expect(reconnectLine()).rejects.toBe(failure);

    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("reloads the current page under LIFF Mock without real authentication", async () => {
    mock.active = true;
    const currentUrl = location.href;

    await reconnectLine();

    expect(navigation.reload).toHaveBeenCalledOnce();
    expect(location.href).toBe(currentUrl);
    expect(liff.isInClient).not.toHaveBeenCalled();
    expect(liff.login).not.toHaveBeenCalled();
    expect(liff.logout).not.toHaveBeenCalled();
    expect(liff.permanentLink.createUrlBy).not.toHaveBeenCalled();
  });
});
