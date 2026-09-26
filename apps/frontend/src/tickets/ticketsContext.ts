import type { TicketKind, Tickets, TicketUse } from "@drawing-app/api/client";
import { createContext } from "react";
import type { ApiError } from "../api/apiClient";

export interface TicketsValue {
  /** Null until they first load. */
  tickets: Tickets | null;
  /** Why the last load failed; null once one lands. */
  error: ApiError | null;
  /** Loads them again: after a seal, a failure, or the refill. */
  refresh: () => void;
  /** Spends one of the kind the person agreed to; the server refuses it if that's not the next kind. */
  spend: (kind: TicketKind) => Promise<TicketUse>;
  /** Takes the tickets a purchase answered with. */
  set: (tickets: Tickets) => void;
}

export const TicketsContext = createContext<TicketsValue | null>(null);
