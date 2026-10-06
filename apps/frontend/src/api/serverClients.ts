import { openedFrom } from "../app/openedView";
import { liffMockActive } from "../line/liff";
import { startEarlySession, withEarlyAnswers } from "./earlySession";
import { createHttpApi, createSessionApi } from "./httpApi";
import { withSuiWallet } from "./suiWalletApi";

// The server's clients hold no state of their own: the session is the cookie.
export const serverSession = createSessionApi();
const httpApi = createHttpApi();
// LIFF Mock has no Privy sign-in; the local API supplies the matching mock chain behavior.
export const serverApi = withEarlyAnswers(liffMockActive ? httpApi : withSuiWallet(httpApi));

/**
 * Asks the server who the session cookie signs in, with your tickets and the board when the app opens
 * on it, while LIFF starts. SessionGate holds the answers until LINE's user is the cookie's.
 */
export function openSessionEarly() {
  startEarlySession(serverSession, httpApi, {
    opensOnBoard: openedFrom(location.pathname).view === "board",
    search: location.search,
  });
}
