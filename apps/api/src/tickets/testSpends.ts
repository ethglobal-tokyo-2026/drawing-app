import { randomUUID } from "node:crypto";
import type { SpendTicket, TicketKind } from "./tickets.ts";

/** A POST /api/tickets/spend body for `kind`: a new spend's, unless `idempotencyKey` repeats one. */
export const spendBody = (
  kind: TicketKind,
  idempotencyKey: string = randomUUID(),
): SpendTicket => ({
  kind,
  idempotencyKey,
});
