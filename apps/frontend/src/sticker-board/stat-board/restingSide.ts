import { createContext, useContext } from "react";

export type BoardSide = "front" | "back";

/**
 * The side a turning board rests on, or null outside one. It changes when a turn lands, not as it
 * starts, so a face can put itself back in order while it's out of sight.
 */
export const RestingSide = createContext<BoardSide | null>(null);

export const useRestingSide = () => useContext(RestingSide);
