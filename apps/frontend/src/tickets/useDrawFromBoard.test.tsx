// @vitest-environment happy-dom
import type { Tickets } from "@drawing-app/api/client";
import { act, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { newIdempotencyKey } from "../api/idempotencyKey";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME } from "../api/testing";
import { keepSpend } from "./spendKey";
import type { Sheet } from "./ticketsContext";
import { PEEL_MS, useDrawFromBoard } from "./useDrawFromBoard";
import { useTickets } from "./useTickets";

const onDraw = vi.fn();
const spendTicket = vi.fn();

/** Tickets with `daily` daily tickets and `reserve` reserve tickets left. */
const tickets = (daily: number, reserve: number): Tickets => ({
  ...FRESH_TICKETS,
  dailyLeft: daily,
  reserveLeft: reserve,
});

/** The board's Draw key, over a drawing screen that says its sheet is `sheet`. */
function Board({ sheet }: { sheet: Sheet }) {
  const { setSheet } = useTickets();
  useEffect(() => setSheet(sheet), [setSheet, sheet]);
  const draw = useDrawFromBoard(onDraw);
  return (
    <>
      <button type="button" data-draw onClick={draw.draw} />
      <span data-peeling={draw.peeling} />
      {draw.overBoard}
    </>
  );
}

let view: ReturnType<typeof renderWithApi> | undefined;
/** Lets the API answer. */
const settle = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));
const open = async (state: Tickets, sheet: Sheet = "fresh") => {
  spendTicket.mockResolvedValue({ ticketUse: { id: 7 }, tickets: state });
  view = renderWithApi(
    <Board sheet={sheet} />,
    emptyApi({ tickets: () => Promise.resolve(state), spendTicket }),
  );
  await settle();
};
/** The board opens again, with the tickets as the server has them now. */
const reload = async (state: Tickets) => {
  view?.unmount();
  onDraw.mockClear();
  await open(state);
};
const tapDraw = () => act(() => document.querySelector<HTMLButtonElement>("[data-draw]")?.click());
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

/** Draw on a phone still showing a ticket spent elsewhere: the server refuses its spend. */
const drawRefused = async () => {
  await open(tickets(1, 0));
  spendTicket.mockRejectedValueOnce(new ApiError(409, { error: "no_tickets_left" }));
  tapDraw();
  await settle();
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  localStorage.clear();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("Draw on the sticker board", () => {
  it("asks for the tickets again as it opens the canvas when they didn't load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const load = vi
      .fn<ApiClient["tickets"]>()
      .mockRejectedValueOnce(new ApiError(0, { error: "network" }))
      .mockResolvedValue(tickets(2, 0));
    view = renderWithApi(<Board sheet="fresh" />, emptyApi({ tickets: load, spendTicket }));
    await act(async () => void (await vi.advanceTimersByTimeAsync(0)));
    expect(load).toHaveBeenCalledOnce();
    tapDraw();
    expect(load).toHaveBeenCalledTimes(2);
    expect(onDraw).toHaveBeenCalledOnce();
    expect(spendTicket).not.toHaveBeenCalled();
  });

  it("spends a daily ticket at once, with no card: its ticket peels, then the canvas opens", async () => {
    await open(tickets(2, 5));
    tapDraw();
    expect(spendTicket).toHaveBeenCalledWith(expect.objectContaining({ kind: "daily" }));
    expect(document.querySelector("[data-peeling]")?.getAttribute("data-peeling")).toBe("true");
    expect(document.querySelector("[role=dialog]")).toBeNull();
    expect(onDraw).not.toHaveBeenCalled();
    wait(PEEL_MS);
    expect(onDraw).toHaveBeenCalledOnce();
  });

  it("leaves a reserve ticket to the ask on the canvas", async () => {
    await open(tickets(0, 5));
    tapDraw();
    expect(spendTicket).not.toHaveBeenCalled();
    expect(onDraw).toHaveBeenCalledOnce();
  });

  it("opens a drawing in progress without spending anything", async () => {
    await open(tickets(2, 0), "held");
    tapDraw();
    expect(spendTicket).not.toHaveBeenCalled();
    expect(onDraw).toHaveBeenCalledOnce();
  });

  it("with no tickets, puts the out-of-tickets card over the board, and never opens the canvas", async () => {
    await open(tickets(0, 0));
    tapDraw();
    expect(onDraw).not.toHaveBeenCalled();
    expect(document.querySelector(".out-of-tickets__title")?.textContent).toBe(
      "Out of tickets for today",
    );
    const back = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Back to My board",
    );
    act(() => back?.click());
    expect(document.querySelector("[role=dialog]")).toBeNull();
    expect(onDraw).not.toHaveBeenCalled();
  });

  it("with no tickets left but a spend's key kept, opens the canvas, which sends the key again", async () => {
    // A spend from before a reload, whose answer never came: it may have spent the last ticket.
    keepSpend(TEST_ME.id, { key: newIdempotencyKey(), refused: false });
    await open(tickets(0, 0));
    tapDraw();
    expect(document.querySelector("[role=dialog]")).toBeNull();
    expect(onDraw).toHaveBeenCalledOnce();
  });

  it("with no tickets, puts the out-of-tickets card over the board once the server refused the kept key's spend, after a reload too", async () => {
    await drawRefused();
    await reload(tickets(0, 0));
    tapDraw();
    expect(onDraw).not.toHaveBeenCalled();
    expect(document.querySelector("[role=dialog]")).not.toBeNull();
  });

  it("opens the canvas again with none left once the refused key is sent again and no answer comes, since that spend may have landed", async () => {
    await drawRefused();
    // A ticket came back, and Draw's spend with the same key got no answer.
    await reload(tickets(1, 0));
    spendTicket.mockReturnValueOnce(new Promise(() => {}));
    tapDraw();
    await reload(tickets(0, 0));
    tapDraw();
    expect(document.querySelector("[role=dialog]")).toBeNull();
    expect(onDraw).toHaveBeenCalledOnce();
  });
});
