import { afterEach, expect, it, vi } from "vitest";
import { setPrivyStatus } from "./privy";
import { waitForPrivy } from "./waitForPrivy";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("ends an automatic wallet wait after provider failure without reloading or asking again", async () => {
  const reload = vi.fn();
  const askAgain = vi.fn();
  vi.stubGlobal("location", { reload });
  setPrivyStatus({ state: "failed", reason: "Wallet provider stopped", reloadRequired: true });

  const result = waitForPrivy({
    current: () => null,
    failure: () => null,
    subscribe: () => () => {},
    askAgain,
  });
  await expect(
    Promise.race([result, new Promise((resolve) => setTimeout(resolve, 100))]),
  ).rejects.toMatchObject({ code: "sui_wallet_not_ready" });
  expect(askAgain).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
});
