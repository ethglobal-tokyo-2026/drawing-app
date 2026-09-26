import type { ReactNode } from "react";
import { TicketsProvider } from "../tickets/TicketsProvider";
import { ApiProvider } from "./ApiProvider";
import { serverApi, serverSession } from "./serverClients";
import { SessionGate } from "./SessionGate";

/** The app's API client, for everything inside LineGate, once you're signed in to the server. */
export function ApiRoot({ children }: { children: ReactNode }) {
  return (
    <SessionGate session={serverSession}>
      <ApiProvider client={serverApi}>
        <TicketsProvider>{children}</TicketsProvider>
      </ApiProvider>
    </SessionGate>
  );
}
