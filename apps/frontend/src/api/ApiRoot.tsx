import type { ReactNode } from "react";
import { TicketsProvider } from "../tickets/TicketsProvider";
import { ApiProvider } from "./ApiProvider";
import { createHttpApi, createSessionApi } from "./httpApi";
import { SessionGate } from "./SessionGate";
import { withSmartWallet } from "./smartWalletApi";

// The server's clients hold no state of their own: the session is the cookie.
const serverSession = createSessionApi();
const serverApi = withSmartWallet(createHttpApi());

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
