import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ failed: true, renders: 0 }));
vi.mock("../../../../apps/frontend/src/identity/PrivySession", () => ({
  default: () => {
    sdk.renders++;
    if (sdk.failed) throw new Error("Wallet provider failed to initialize");
    return "wallet ready";
  },
}));
it("reproduces a retry that leaves the failed wallet provider unmounted", async () => {
  vi.stubEnv("VITE_LIFF_MOCK", "off");
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { PrivySignIn } = await import("../../../../apps/frontend/src/identity/PrivySignIn");
  const { startPrivy } = await import("../../../../apps/frontend/src/identity/privyStart");
  const { retryPrivySignIn, privyStatus } =
    await import("../../../../apps/frontend/src/identity/privy");
  const host = document.createElement("div");
  const root = createRoot(host);
  act(() => startPrivy("wallet-needed"));
  await act(async () => root.render(<PrivySignIn />));
  await act(() => vi.dynamicImportSettled());
  expect(privyStatus().state).toBe("failed");
  const renders = sdk.renders;
  sdk.failed = false;
  await act(async () => retryPrivySignIn());
  await act(async () => root.render(<PrivySignIn />));
  expect(privyStatus().state).toBe("signing-in");
  expect(host.textContent).toBe("");
  expect(sdk.renders).toBe(renders);
  act(() => root.unmount());
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
