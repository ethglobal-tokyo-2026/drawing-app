// @vitest-environment happy-dom
import { act, useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "./apiClient";
import { emptyApi, renderWithApi } from "./testing";
import { QueryAnswers, useApiQuery, type Query } from "./useApiQuery";

const probe: { query: Query<string> } = { query: { state: "loading" } };
function Probe({
  id,
  load,
  answers,
  ownLoadOnly,
}: {
  id: string;
  load: (api: ApiClient) => Promise<string>;
  answers?: QueryAnswers<string>;
  ownLoadOnly?: boolean;
}) {
  const query = useApiQuery(id, load, answers, { ownLoadOnly });
  useLayoutEffect(() => {
    probe.query = query;
  });
  return null;
}

/** A load that waits to be answered, so each test decides when and how. */
function pending() {
  const calls: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];
  const load = vi.fn(
    () =>
      new Promise<string>((resolve, reject) => {
        calls.push({ resolve, reject });
      }),
  );
  return { load, calls };
}

const settle = () => act(() => Promise.resolve());
let unmount = () => {};
afterEach(() => unmount());
vi.spyOn(console, "error").mockImplementation(() => {});

describe("useApiQuery", () => {
  it("is loading until the answer, then ready with it", async () => {
    const { load, calls } = pending();
    ({ unmount } = renderWithApi(<Probe id="a" load={load} />, emptyApi()));
    expect(probe.query.state).toBe("loading");
    calls[0]?.resolve("data");
    await settle();
    expect(probe.query).toMatchObject({ state: "ready", data: "data" });
  });

  it("fails with an ApiError, and retry loads again", async () => {
    const { load, calls } = pending();
    ({ unmount } = renderWithApi(<Probe id="a" load={load} />, emptyApi()));
    calls[0]?.reject(new Error("offline"));
    await settle();
    if (probe.query.state !== "failed")
      throw new Error(`expected failed, got ${probe.query.state}`);
    expect(probe.query.error).toBeInstanceOf(ApiError);
    expect(probe.query.error).toMatchObject({ status: 0, code: "network", detail: "offline" });
    act(() => {
      if (probe.query.state === "failed") probe.query.retry();
    });
    expect(probe.query.state).toBe("loading");
    calls[1]?.resolve("second");
    await settle();
    expect(probe.query).toMatchObject({ state: "ready", data: "second" });
  });

  it("drops an answer for a key that has moved on", async () => {
    const { load, calls } = pending();
    const view = renderWithApi(<Probe id="a" load={load} />, emptyApi());
    unmount = view.unmount;
    view.rerender(<Probe id="b" load={load} />);
    calls[0]?.resolve("for a");
    await settle();
    expect(probe.query.state).toBe("loading");
    calls[1]?.resolve("for b");
    await settle();
    expect(probe.query).toMatchObject({ state: "ready", data: "for b" });
  });

  it("with answers, shows the key's last answer at once on a remount, and loads it again", async () => {
    const { load, calls } = pending();
    const answers = new QueryAnswers<string>();
    const view = renderWithApi(<Probe id="a" load={load} answers={answers} />, emptyApi());
    unmount = view.unmount;
    calls[0]?.resolve("first");
    await settle();
    view.rerender(null);
    view.rerender(<Probe id="a" load={load} answers={answers} />);
    expect(probe.query).toMatchObject({ state: "ready", data: "first" });
    calls[1]?.resolve("second");
    await settle();
    expect(probe.query).toMatchObject({ state: "ready", data: "second" });
  });

  it("with answers and ownLoadOnly, waits for its own load on a remount, and keeps it for the others", async () => {
    const { load, calls } = pending();
    const answers = new QueryAnswers<string>();
    const view = renderWithApi(<Probe id="a" load={load} answers={answers} />, emptyApi());
    unmount = view.unmount;
    calls[0]?.resolve("first");
    await settle();
    view.rerender(null);
    view.rerender(<Probe id="a" load={load} answers={answers} ownLoadOnly />);
    expect(probe.query.state).toBe("loading");
    calls[1]?.resolve("second");
    await settle();
    view.rerender(null);
    view.rerender(<Probe id="a" load={load} answers={answers} />);
    expect(probe.query).toMatchObject({ state: "ready", data: "second" });
  });

  it("keeps the last data showing while it refreshes", async () => {
    const { load, calls } = pending();
    ({ unmount } = renderWithApi(<Probe id="a" load={load} />, emptyApi()));
    calls[0]?.resolve("old");
    await settle();
    act(() => {
      if (probe.query.state === "ready") probe.query.refresh();
    });
    expect(probe.query).toMatchObject({ state: "ready", data: "old" });
    calls[1]?.resolve("new");
    await settle();
    expect(probe.query).toMatchObject({ state: "ready", data: "new" });
  });
});
