import { lineLogout } from "../line/liff";
import { forgetKeptSession } from "../sticker-creation/session/keptSession";
import { serverSession } from "./serverClients";

/** Logs `userId` out of LINE, ending the app's lasting session and forgetting their drawing kept on this device. */
export const logOut = (userId: string) =>
  lineLogout(async () => {
    await forgetKeptSession(userId);
    await serverSession.signOut();
  });
