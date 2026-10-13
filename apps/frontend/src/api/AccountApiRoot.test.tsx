// @vitest-environment happy-dom
import { sessionEnvelope } from "./sessionTestFixtures";
import { act, useContext, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import type { Me } from "@drawing-app/api/client";
import { AccountApiRoot } from "./ApiRoot";
import { ApiContext } from "./apiContext";
import type { ApiClient } from "./apiClient";
import { MeContext } from "./meContext";
import { SessionEnvelopeContext } from "./sessionContext";
import { emptyApi, TEST_ME } from "./testing";

vi.mock("./serverClients", () => ({
  createAccountApi: () => emptyApi(),
  serverSession: {},
}));

it("keeps the client and children through profile edits and replaces both for another account", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  let api: ApiClient | null = null;
  let mounts = 0;
  let disposals = 0;
  function Probe() {
    const current = useContext(ApiContext);
    useEffect(() => {
      api = current;
    }, [current]);
    useEffect(() => {
      mounts++;
      return () => {
        disposals++;
      };
    }, []);
    return null;
  }
  const render = (me: Me, selectionVersion: string | null = null) =>
    act(async () =>
      root.render(
        <SessionEnvelopeContext value={sessionEnvelope(me, { selectionVersion })}>
          <MeContext value={me}>
            <AccountApiRoot>
              <Probe />
            </AccountApiRoot>
          </MeContext>
        </SessionEnvelopeContext>,
      ),
    );
  try {
    await render(TEST_ME);
    const original = api;
    await render({ ...TEST_ME, handle: "new-handle" });
    expect(api).toBe(original);
    expect(mounts).toBe(1);
    expect(disposals).toBe(0);
    await render({ ...TEST_ME, id: "bob" });
    expect(api).not.toBe(original);
    expect(mounts).toBe(2);
    expect(disposals).toBe(1);
    const bobClient = api;
    await render({ ...TEST_ME, id: "bob" }, "later");
    expect(api).not.toBe(bobClient);
    expect(mounts).toBe(3);
    expect(disposals).toBe(2);
  } finally {
    act(() => root.unmount());
  }
});
