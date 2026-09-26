import type { Me, StickerBoard } from "@drawing-app/api/client";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./apiClient";
import { openEarly, withEarlyAnswers } from "./earlySession";
import type { SessionApi } from "./httpApi";
import { emptyApi, FRESH_TICKETS, TEST_ME, TEST_OWNER } from "./testing";

const board = (ownerId: string): StickerBoard => ({
  owner: { ...TEST_OWNER, id: ownerId },
  boardStickers: [],
});

/** The session client as the cookie finds it: you, or 401 signed_out. */
const cookieFor = (you: Me | null): SessionApi => ({
  signIn: () => Promise.reject(new Error("not expected")),
  me: () =>
    you ? Promise.resolve({ me: you }) : Promise.reject(new ApiError(401, { error: "signed_out" })),
  setHandle: () => Promise.reject(new Error("not expected")),
  signOut: () => Promise.resolve(),
});

/** An early opening on a clock the test moves, with its server asked through spies. */
function opening({ you = TEST_ME as Me | null, withBoard = true } = {}) {
  let time = 0;
  const server = emptyApi({
    stickerBoard: vi.fn(() => Promise.resolve(board(TEST_ME.id))),
    tickets: vi.fn(() => Promise.resolve(FRESH_TICKETS)),
  });
  const early = openEarly(cookieFor(you), server, { board: withBoard, now: () => time });
  return {
    early,
    server,
    later: (ms: number) => {
      time += ms;
    },
  };
}

describe("the early session", () => {
  it("asks who the cookie signs in, the tickets and the board at once", async () => {
    const { early, server } = opening();
    expect(server.stickerBoard).toHaveBeenCalledOnce();
    expect(server.tickets).toHaveBeenCalledOnce();
    await expect(early.me).resolves.toEqual(TEST_ME);
  });

  it("finds no one when the cookie holds no session, and leaves the board when the app opens elsewhere", async () => {
    const { early, server } = opening({ you: null, withBoard: false });
    await expect(early.me).resolves.toBeNull();
    expect(server.stickerBoard).not.toHaveBeenCalled();
  });

  it("gives nothing before SessionGate accepts it", () => {
    const { early } = opening();
    expect(early.takeBoard()).toBeUndefined();
    expect(early.takeTickets()).toBeUndefined();
  });

  it("gives each accepted answer once", async () => {
    const { early } = opening();
    early.accept(TEST_ME);
    await expect(early.takeBoard()).resolves.toEqual(board(TEST_ME.id));
    await expect(early.takeTickets()).resolves.toEqual(FRESH_TICKETS);
    expect(early.takeBoard()).toBeUndefined();
    expect(early.takeTickets()).toBeUndefined();
  });

  it("gives nothing once it's stale", () => {
    const { early, later } = opening();
    early.accept(TEST_ME);
    later(5_000);
    expect(early.takeBoard()).toBeUndefined();
    expect(early.takeTickets()).toBeUndefined();
  });

  it("gives nothing once dropped, even if accepted after", () => {
    const { early } = opening();
    early.drop();
    early.accept(TEST_ME);
    expect(early.takeBoard()).toBeUndefined();
    expect(early.takeTickets()).toBeUndefined();
  });

  it("refuses a board that isn't the accepted person's", async () => {
    const { early } = opening();
    early.accept({ ...TEST_ME, id: "someone-else" });
    await expect(early.takeBoard()).rejects.toThrow("someone else's");
  });
});

describe("the client with early answers", () => {
  it("answers your first board and tickets from the early session, and asks the server after", async () => {
    const { early, server } = opening();
    early.accept(TEST_ME);
    const client = withEarlyAnswers(server, () => early);
    await client.stickerBoard();
    await client.tickets();
    expect(server.stickerBoard).toHaveBeenCalledOnce();
    expect(server.tickets).toHaveBeenCalledOnce();
    await client.stickerBoard();
    await client.tickets();
    expect(server.stickerBoard).toHaveBeenCalledTimes(2);
    expect(server.tickets).toHaveBeenCalledTimes(2);
  });

  it("asks the server for someone else's board, and for a board that isn't yours", async () => {
    const { early, server } = opening();
    early.accept({ ...TEST_ME, id: "someone-else" });
    const client = withEarlyAnswers(server, () => early);
    await client.stickerBoard("u2");
    expect(server.stickerBoard).toHaveBeenLastCalledWith("u2");
    await expect(client.stickerBoard()).resolves.toEqual(board(TEST_ME.id));
    expect(server.stickerBoard).toHaveBeenCalledTimes(3);
  });

  it("asks again when an early answer failed, rather than showing its failure", async () => {
    const server = emptyApi({
      stickerBoard: vi
        .fn<() => Promise<StickerBoard>>()
        .mockRejectedValueOnce(new ApiError(0, { error: "network" }))
        .mockResolvedValue(board(TEST_ME.id)),
    });
    const early = openEarly(cookieFor(TEST_ME), server, { board: true });
    early.accept(TEST_ME);
    const client = withEarlyAnswers(server, () => early);
    await expect(client.stickerBoard()).resolves.toEqual(board(TEST_ME.id));
    expect(server.stickerBoard).toHaveBeenCalledTimes(2);
  });

  it("asks the server when there's no early session", async () => {
    const server = emptyApi({ tickets: vi.fn(() => Promise.resolve(FRESH_TICKETS)) });
    await withEarlyAnswers(server, () => null).tickets();
    expect(server.tickets).toHaveBeenCalledOnce();
  });
});
