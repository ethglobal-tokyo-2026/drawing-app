import { useContext } from "react";
import { TicketsContext, type TicketsValue } from "./ticketsContext";

/** Your tickets, from the TicketsProvider above. */
export function useTickets(): TicketsValue {
  const value = useContext(TicketsContext);
  if (!value) throw new Error("useTickets() needs a TicketsProvider above it");
  return value;
}
