import type { AccountSelection } from "@drawing-app/api/client";
import { assertAccountSelectionCurrent } from "./sessionContext";
import { lineLogout } from "../line/liff";
import { serverSession } from "./serverClients";
import { requestAccountRelease, sessionEndsOnPurpose } from "./sessionLoss";

/**
 * Logs out of LINE, ending the app's lasting session. A drawing in progress stays kept for its person
 * alone, so it's there again, with its ticket, when they sign back in.
 */
export const logOut = (selection: AccountSelection): Promise<void> => {
  // Validate this explicit request before its preservation pause suspends account readiness.
  assertAccountSelectionCurrent(selection);
  let ending: Promise<void> | undefined;
  requestAccountRelease(selection.userId, () => {
    ending = lineLogout(async () => {
      sessionEndsOnPurpose();
      await serverSession.signOut(selection);
    });
  });
  return ending ?? Promise.resolve();
};
