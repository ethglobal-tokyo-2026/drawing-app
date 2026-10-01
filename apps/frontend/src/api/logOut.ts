import { lineLogout } from "../line/liff";
import { serverSession } from "./serverClients";
import { sessionEndsOnPurpose } from "./sessionLoss";

/**
 * Logs out of LINE, ending the app's lasting session. A drawing in progress stays kept for its person
 * alone, so it's there again, with its ticket, when they sign back in.
 */
export const logOut = () =>
  lineLogout(async () => {
    sessionEndsOnPurpose();
    await serverSession.signOut();
  });
