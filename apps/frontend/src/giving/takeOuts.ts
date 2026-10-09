import { useSyncExternalStore } from "react";
import { apiError, type ApiClient, type ApiError } from "../api/apiClient";
import { forget as forgetKeptBoard } from "../sticker-board/lastBoard";
import { myStickerBoardChanged } from "../sticker-board/useMyStickerBoard";
import { takeOutGift } from "./giftBackend";

/** A take-out from a sticker's detail: on its way, or why it failed. */
export type TakeOut =
  | { giftId: string; step: "takingOut" }
  | { giftId: string; step: "failed"; error: ApiError };

/**
 * Take-outs started from a sticker's detail, by sticker, for this visit: one goes on after its detail
 * closes, and a failure stays on that detail until it's tried again or dismissed. The gift's state is
 * the server's, so a reload reads it again from the board.
 */
const takeOuts = new Map<string, TakeOut>();
const listeners = new Set<() => void>();
const landed = new Set<(stickerId: string) => void>();

function set(stickerId: string, takeOut: TakeOut | null) {
  if (takeOut) takeOuts.set(stickerId, takeOut);
  else takeOuts.delete(stickerId);
  for (const listener of listeners) listener();
}

/** Takes `stickerId`'s gift `giftId` back out, unless that's already on its way. */
export function takeOutFromDetail(
  deps: { api: ApiClient; userId: string },
  stickerId: string,
  giftId: string,
) {
  if (takeOuts.get(stickerId)?.step === "takingOut") return;
  set(stickerId, { giftId, step: "takingOut" });
  takeOutGift(deps, giftId).then(
    () => {
      set(stickerId, null);
      // The board, and the board kept on this device, still hold the gift.
      forgetKeptBoard();
      myStickerBoardChanged();
      for (const listener of landed) listener(stickerId);
    },
    (error: unknown) => {
      const failure = apiError(error);
      console.error(`Sticker ${stickerId}'s gift ${giftId} wasn't taken out`, failure);
      set(stickerId, { giftId, step: "failed", error: failure });
    },
  );
}

/** Clears a failed take-out's alert. */
export function dismissTakeOut(stickerId: string) {
  if (takeOuts.get(stickerId)?.step === "failed") set(stickerId, null);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** The take-out of `stickerId`'s gift from its detail, while one is on its way or failed. */
export const useTakeOut = (stickerId: string | null) =>
  useSyncExternalStore(subscribe, () => (stickerId ? (takeOuts.get(stickerId) ?? null) : null));

/** Tells `listener` each sticker whose take-out landed. Returns what stops it. */
export function onTakenOut(listener: (stickerId: string) => void) {
  landed.add(listener);
  return () => void landed.delete(listener);
}
