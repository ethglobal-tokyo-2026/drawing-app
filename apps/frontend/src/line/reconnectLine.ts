import liff from "@line/liff";
import { liffMockActive } from "./liff";

const RECONNECT_TIMEOUT_MS = 15_000;

/** Explicitly restarts LINE authentication while keeping the current gift or app page. */
export async function reconnectLine(): Promise<void> {
  if (liffMockActive) {
    location.reload();
    return;
  }

  if (!liff.isInClient()) {
    // Discard the rejected credentials before LINE Login can reuse them.
    liff.logout();
    liff.login({ redirectUri: location.href });
    return;
  }

  // LINE Login is unavailable in the LIFF browser; reenter through its permanent link.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("LINE reconnect timed out")), RECONNECT_TIMEOUT_MS);
  });
  try {
    const permanentUrl = await Promise.race([
      liff.permanentLink.createUrlBy(location.href),
      expired,
    ]);
    location.replace(permanentUrl);
  } finally {
    clearTimeout(timer);
  }
}
