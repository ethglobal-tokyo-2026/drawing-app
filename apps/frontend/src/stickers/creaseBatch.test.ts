import { describe, expect, it, vi } from "vitest";
import type { CreaseBatch, CreaseJob, CreaseReply } from "./creaseWorker";
import { createCreaseBatchHandler } from "./creaseBatch";

const job = (id: string, key: string): CreaseJob => ({
  id,
  key,
  width: 1,
  height: 1,
  scale: 1,
  own: { url: "mask.png", grow: 0 },
  under: [],
});
const batch = (board: string, number: number, jobs: CreaseJob[]): CreaseBatch => ({
  board,
  batch: number,
  jobs,
  start: true,
});
const success = (board: string, of: CreaseJob): CreaseReply => ({
  ok: true,
  board,
  id: of.id,
  key: of.key,
  crease: null,
  timings: { decode: 0, draw: 0, shade: 0, encode: 0, total: 0 },
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

describe("crease worker batches", () => {
  it("shares a pending bake with the next batch and does not repost its completed result", async () => {
    const first = job("a", "one");
    const second = job("b", "two");
    const a = deferred<CreaseReply>();
    const b = deferred<CreaseReply>();
    const bake = vi.fn((_board: string, of: CreaseJob) => (of.id === "a" ? a.promise : b.promise));
    const post = vi.fn<(reply: CreaseReply) => void>();
    const receive = createCreaseBatchHandler(bake, post);

    receive(batch("board", 1, [first, second]));
    await settle();
    receive(batch("board", 2, [first, second]));
    await settle();
    expect(bake).toHaveBeenCalledTimes(1);

    a.resolve(success("board", first));
    await settle();
    expect(bake).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledTimes(1);
    b.resolve(success("board", second));
    await settle();
    expect(post.mock.calls.map(([reply]) => reply.id)).toEqual(["a", "b"]);

    receive(batch("board", 3, [first, second]));
    await settle();
    expect(bake).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("drops an invalidated reply and bakes a key again when it returns", async () => {
    const first = job("a", "one");
    const changed = job("a", "two");
    const calls = [deferred<CreaseReply>(), deferred<CreaseReply>(), deferred<CreaseReply>()];
    const bake = vi.fn(() => calls[bake.mock.calls.length - 1].promise);
    const post = vi.fn<(reply: CreaseReply) => void>();
    const receive = createCreaseBatchHandler(bake, post);

    receive(batch("board", 1, [first]));
    await settle();
    receive(batch("board", 2, [changed]));
    await settle();
    receive(batch("board", 3, [first]));
    await settle();
    expect(bake).toHaveBeenCalledTimes(3);

    calls[0].resolve(success("board", first));
    calls[1].resolve(success("board", changed));
    await settle();
    expect(post).not.toHaveBeenCalled();
    calls[2].resolve(success("board", first));
    await settle();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(success("board", first));
  });

  it("observes a changed key during the settle delay without starting its bake", async () => {
    const first = job("a", "one");
    const changed = job("a", "two");
    const bake = vi.fn(async (board: string, of: CreaseJob) => success(board, of));
    const post = vi.fn<(reply: CreaseReply) => void>();
    const receive = createCreaseBatchHandler(bake, post);

    receive(batch("board", 1, [first]));
    await settle();
    expect(bake).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(1);

    receive({ ...batch("board", 2, [changed]), start: false });
    await settle();
    expect(bake).toHaveBeenCalledTimes(1);
    receive({ ...batch("board", 3, [first]), start: false });
    await settle();
    expect(bake).toHaveBeenCalledTimes(1);

    receive(batch("board", 4, [first]));
    await settle();
    expect(bake).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("drops a cleared board's answer without affecting another board", async () => {
    const of = job("a", "same");
    const left = deferred<CreaseReply>();
    const right = deferred<CreaseReply>();
    const bake = vi.fn((board: string) => (board === "left" ? left.promise : right.promise));
    const post = vi.fn<(reply: CreaseReply) => void>();
    const receive = createCreaseBatchHandler(bake, post);

    receive(batch("left", 1, [of]));
    receive(batch("right", 2, [of]));
    await settle();
    receive(batch("left", 3, []));
    left.resolve(success("left", of));
    right.resolve(success("right", of));
    await settle();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(success("right", of));

    receive(batch("left", 4, [of]));
    await settle();
    expect(bake).toHaveBeenCalledTimes(3);
  });

  it("invalidates a pending bake when the board wants no creases", async () => {
    const of = job("a", "same");
    const old = deferred<CreaseReply>();
    const fresh = deferred<CreaseReply>();
    const bake = vi.fn(() => (bake.mock.calls.length === 1 ? old.promise : fresh.promise));
    const post = vi.fn<(reply: CreaseReply) => void>();
    const receive = createCreaseBatchHandler(bake, post);

    receive(batch("board", 1, [of]));
    await settle();
    receive({ ...batch("board", 2, []), start: false });
    receive(batch("board", 3, [of]));
    await settle();
    expect(bake).toHaveBeenCalledTimes(2);

    old.resolve(success("board", of));
    await settle();
    expect(post).not.toHaveBeenCalled();
    fresh.resolve(success("board", of));
    await settle();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("posts one failure for a still-wanted key and bakes a changed key", async () => {
    const first = job("a", "one");
    const changed = job("a", "two");
    const failed = deferred<CreaseReply>();
    const bake = vi.fn((_board: string, of: CreaseJob) =>
      of.key === "one" ? failed.promise : Promise.resolve(success("board", changed)),
    );
    const post = vi.fn<(reply: CreaseReply) => void>();
    const receive = createCreaseBatchHandler(bake, post);

    receive(batch("board", 1, [first]));
    await settle();
    receive(batch("board", 2, [first]));
    await settle();
    failed.reject(new Error("mask unavailable"));
    await settle();
    expect(post).toHaveBeenCalledWith({
      ok: false,
      board: "board",
      id: "a",
      key: "one",
      error: "mask unavailable",
    });
    receive(batch("board", 3, [first]));
    await settle();
    expect(bake).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(1);

    receive(batch("board", 4, [changed]));
    await settle();
    expect(bake).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenLastCalledWith(success("board", changed));
  });

  it("reports a completed reply that could not be posted", async () => {
    const of = job("a", "one");
    const bake = vi.fn(async (board: string, item: CreaseJob) => success(board, item));
    const post = vi.fn<(reply: CreaseReply) => void>();
    post.mockImplementationOnce(() => {
      throw new Error("image could not be cloned");
    });
    const receive = createCreaseBatchHandler(bake, post);

    receive(batch("board", 1, [of]));
    await settle();
    expect(post).toHaveBeenLastCalledWith({
      ok: false,
      board: "board",
      id: "a",
      key: "one",
      error: "image could not be cloned",
    });
    receive(batch("board", 2, [of]));
    await settle();
    expect(bake).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(2);
  });
});
