import { lineLogout } from "../line/liff";
import { serverSession } from "./serverClients";

/** Logs out of LINE, and ends the app's lasting session with it. */
export const logOut = () => lineLogout(serverSession.signOut);
