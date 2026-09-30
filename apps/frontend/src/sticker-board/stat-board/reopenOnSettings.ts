const KEY = "draw.reopenOnSettings";

/**
 * Marks the restart a language change makes, so the app opens again on the stat board's Settings and
 * the person sees their pick take. It lasts one page session, and one start.
 */
export function reopenOnSettingsNextStart(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch (error) {
    // The language is saved either way; only the return to Settings is lost.
    console.error("Couldn't note that the app should reopen on Settings", error);
  }
}

/** True once, at the start a language change made; reading it clears the mark. */
export function takeReopenOnSettings(): boolean {
  try {
    const marked = sessionStorage.getItem(KEY) !== null;
    if (marked) sessionStorage.removeItem(KEY);
    return marked;
  } catch (error) {
    console.error("Couldn't read whether the app should reopen on Settings", error);
    return false;
  }
}
