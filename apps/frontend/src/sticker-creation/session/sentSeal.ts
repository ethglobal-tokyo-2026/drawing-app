/**
 * The ticket use whose seal request went out with no answer yet, kept on this device so a reload
 * doesn't reopen a sheet the server may already have sealed: it comes back locked, for the seal key.
 */
const SENT_SEAL_KEY = "draw.sentSeal";

export function keepSentSeal(ticketUseId: number): void {
  try {
    localStorage.setItem(SENT_SEAL_KEY, String(ticketUseId));
  } catch (error) {
    console.error(
      `Can't note that ticket use ${ticketUseId}'s seal went out; a reload before its answer reopens the sheet`,
      error,
    );
  }
}

export function forgetSentSeal(): void {
  try {
    localStorage.removeItem(SENT_SEAL_KEY);
  } catch (error) {
    console.error("Can't clear the note of a seal that went out from this device", error);
  }
}

/** Whether `ticketUseId`'s seal went out and no answer was kept since. */
export function sealWentOut(ticketUseId: number | null): boolean {
  if (ticketUseId === null) return false;
  try {
    return localStorage.getItem(SENT_SEAL_KEY) === String(ticketUseId);
  } catch (error) {
    console.error("Can't tell whether a seal went out from this device", error);
    return false;
  }
}
