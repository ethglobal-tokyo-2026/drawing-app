import { useMemo, type ReactNode } from "react";
import { TicketsProvider } from "../tickets/TicketsProvider";
import { BoardPlacementSavesProvider } from "../sticker-board/BoardPlacementSavesProvider";
import { ApiProvider } from "./ApiProvider";
import { createAccountApi, serverSession } from "./serverClients";
import { useMe } from "./meContext";
import { SessionGate } from "./SessionGate";

/** The app's API client, for everything inside LineGate, once you're signed in to the server. */
export function ApiRoot({ children }: { children: ReactNode }) {
  return (
    <SessionGate session={serverSession}>
      <AccountApiRoot>{children}</AccountApiRoot>
    </SessionGate>
  );
}

/** One immutable client and provider lifetime for the account the gate accepted. */
export function AccountApiRoot({ children }: { children: ReactNode }): ReactNode {
  const { id } = useMe();
  const client = useMemo(() => createAccountApi(id), [id]);
  return (
    <ApiProvider key={id} client={client}>
      <BoardPlacementSavesProvider>
        <TicketsProvider>{children}</TicketsProvider>
      </BoardPlacementSavesProvider>
    </ApiProvider>
  );
}
