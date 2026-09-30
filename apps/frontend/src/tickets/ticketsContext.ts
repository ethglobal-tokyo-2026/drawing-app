import type { TicketKind, Tickets, TicketUse } from "@drawing-app/api/client";
import { createContext } from "react";
import type { ApiError } from "../api/apiClient";

/**
 * What the drawing screen's sheet needs from Draw: "fresh" when Draw starts a new sheet, which spends a ticket;
 * "held" when the sheet already has one (a drawing in progress, or a spend on its way); null until the drawing
 * screen has said, while its code loads or a drawing kept across a reload comes back.
 */
export type Sheet = "fresh" | "held" | null;

export interface TicketsValue {
  /** Null until they first load. */
  tickets: Tickets | null;
  /** Why the last load failed; null once one lands. */
  error: ApiError | null;
  /** Loads them again: after a seal, a failure, or the refill. */
  refresh: () => void;
  /**
   * Spends one of the kind the person agreed to; the server refuses it if that's not the next kind.
   * Every try until its ticket use is kept is the same spend, so a retry or a second tap never spends
   * another.
   */
  spend: (kind: TicketKind) => Promise<TicketUse>;
  /** A spend's key is still kept: that spend may have landed, and no sheet has kept its ticket use. */
  hasKeptSpend: () => boolean;
  /** The drawing screen kept the ticket use a spend answered with, so that spend's key goes. */
  forgetKeptSpend: () => void;
  /** Takes the tickets a purchase answered with. */
  set: (tickets: Tickets) => void;
  /** What Draw means for the drawing screen's sheet, as the drawing screen last said. */
  sheet: Sheet;
  setSheet: (sheet: Sheet) => void;
  /**
   * Draw on the sticker board spends the ticket at once, for the fresh sheet the drawing screen then opens on;
   * the drawing screen takes the spend, on its way or landed, rather than spending another.
   */
  spendForSheet: (kind: TicketKind) => void;
  /** Whether Draw started a spend for the fresh sheet that the drawing screen hasn't taken yet. */
  hasSheetSpend: () => boolean;
  /** The spend Draw started for the fresh sheet, once; null when there's none. */
  takeSheetSpend: () => Promise<TicketUse> | null;
}

export const TicketsContext = createContext<TicketsValue | null>(null);
