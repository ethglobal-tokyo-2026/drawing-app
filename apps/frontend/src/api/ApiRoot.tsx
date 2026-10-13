import { useMemo, type ReactNode } from "react";
import { TicketsProvider } from "../tickets/TicketsProvider";
import { BoardPlacementSavesProvider } from "../sticker-board/BoardPlacementSavesProvider";
import { ApiProvider } from "./ApiProvider";
import { createAccountApi, serverSession } from "./serverClients";
import { useSessionEnvelope, selectionOf, selectionKey } from "./sessionContext";
import { SessionGate } from "./SessionGate";
import { PersonSwitchProvider } from "./PersonSwitchProvider";

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
  const session = useSessionEnvelope();
  const id = session.me.id;
  const version = session.selectionVersion;
  const client = useMemo(
    () => createAccountApi({ userId: id, selectionVersion: version }),
    [id, version],
  );
  return (
    <ApiProvider key={selectionKey(selectionOf(session))} client={client}>
      <BoardPlacementSavesProvider>
        <PersonSwitchProvider>
          <TicketsProvider>{children}</TicketsProvider>
        </PersonSwitchProvider>
      </BoardPlacementSavesProvider>
    </ApiProvider>
  );
}
