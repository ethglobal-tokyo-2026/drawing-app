import liff from "@line/liff";
import { lineLogin, liffMockActive } from "./liff";

const RECONNECT_TIMEOUT_MS = 15_000;

/** Explicitly restarts LINE authentication, coming back to `to`: the current gift or app page by default. */
export async function reconnectLine(to: string = location.href): Promise<void> {
  if (liffMockActive) {
    if (to === location.href) location.reload();
    else location.assign(to);
    return;
  }

  if (!liff.isInClient()) {
    // Discard the rejected credentials before LINE Login can reuse them.
    liff.logout();
    lineLogin(to);
    return;
  }

  // LINE Login is unavailable in the LIFF browser; reenter through its permanent link.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("LINE reconnect timed out")), RECONNECT_TIMEOUT_MS);
  });
  try {
    const permanentUrl = await Promise.race([liff.permanentLink.createUrlBy(to), expired]);
    // liff.init never replaces tokens this tab's LIFF already holds, so the stale ones go first.
    // Not before the link is made: making it reads what logging out clears.
    liff.logout();
    location.replace(permanentUrl);
  } finally {
    clearTimeout(timer);
  }
}
