import type { AccountSelection } from "@drawing-app/api/client";
import { openedFrom } from "../app/openedView";
import { liffMockActive } from "../line/liff";
import { startEarlySession, withEarlyAnswers } from "./earlySession";
import { createHttpApi, createSessionApi, createServerClient } from "./httpApi";
import type { ApiClient } from "./apiClient";
import { withSuiWallet } from "./suiWalletApi";

export const serverSession = createSessionApi();
// LIFF Mock has no Privy sign-in; the local API supplies the matching mock chain behavior.
export function createAccountApi(selection: AccountSelection): ApiClient {
  selection = Object.freeze({ ...selection });
  const httpApi = createHttpApi(createServerClient(fetch, selection));
  return withEarlyAnswers(liffMockActive ? httpApi : withSuiWallet(httpApi, selection), selection);
}

/**
 * Asks the server who the session cookie signs in, with your tickets and the board when the app opens
 * on it, while LIFF starts. SessionGate holds the answers until LINE's user is the cookie's.
 */
export function openSessionEarly() {
  startEarlySession(serverSession, (id) => createHttpApi(createServerClient(fetch, id)), {
    opensOnBoard: openedFrom(location.pathname).view === "board",
    search: location.search,
  });
}
