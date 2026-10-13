import type { AccountSelection, SessionEnvelope } from "@drawing-app/api/client";
import { ApiError, apiError } from "./apiClient";

export interface PersonSwitchNotice extends AccountSelection {
  authenticatedUserId: string;
  phase: "suspended" | "selected";
}
export interface PersonSwitchOptions {
  session: SessionEnvelope;
  api: {
    selectPerson: (userId: string, selection: AccountSelection) => Promise<SessionEnvelope>;
    me: (lineUserId?: string) => Promise<SessionEnvelope>;
  };
  principal: () => string | null;
  settle: (signal: AbortSignal) => Promise<void>;
  blockers: () => string[];
  suspend: () => void;
  restore: (session: SessionEnvelope) => void;
  navigate: (path: string) => void;
  notice: (notice: PersonSwitchNotice) => void;
}

/** Matches the ordinary API request deadline, including work that has no HTTP request of its own. */
const REQUEST_TIMEOUT_MS = 15_000;
const changed = () => new ApiError(409, { error: "session_account_changed" });

function principalMatches(session: SessionEnvelope, options: PersonSwitchOptions): boolean {
  const principal = options.principal();
  return (
    principal !== null &&
    principal === session.authenticated.lineUserId &&
    session.authenticated.id === options.session.authenticated.id
  );
}

/** A bounded transition keeps unfinished saves running, while ending only its wait for them. */
async function bounded<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const deadline = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new ApiError(0, { error: "timeout" }));
      deadline.abort();
    }, REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([run(deadline.signal), expired]);
  } finally {
    clearTimeout(timer);
  }
}

/** Pauses this device, drains saves, and lets the server choose the next person before reloading. */
export async function requestPersonSwitch(
  targetUserId: string,
  options: PersonSwitchOptions,
): Promise<void> {
  const { session } = options;
  const linePrincipal = options.principal();
  if (
    session.personSwitchMode === "off" ||
    !session.allowedSelections.some((person) => person.id === targetUserId)
  )
    throw new ApiError(403, { error: "person_switch_forbidden" });
  if (!linePrincipal || !principalMatches(session, options)) throw changed();
  const blocked = options.blockers();
  if (blocked.length)
    throw new ApiError(409, {
      error: "person_switch_ownership_pending",
      detail: blocked.join("; "),
    });
  const selection = { userId: session.me.id, selectionVersion: session.selectionVersion };
  options.suspend();
  let selectionRequested = false;
  try {
    options.notice({
      ...selection,
      authenticatedUserId: session.authenticated.id,
      phase: "suspended",
    });
    await bounded(options.settle);
    if (!principalMatches(session, options)) throw changed();
    const remaining = options.blockers();
    if (remaining.length)
      throw new ApiError(409, {
        error: "person_switch_ownership_pending",
        detail: remaining.join("; "),
      });
    selectionRequested = true;
    const selected = await bounded(() => options.api.selectPerson(targetUserId, selection));
    if (!principalMatches(selected, options) || selected.me.id !== targetUserId) throw changed();
    options.notice({
      userId: selected.me.id,
      selectionVersion: selected.selectionVersion,
      authenticatedUserId: selected.authenticated.id,
      phase: "selected",
    });
    options.navigate("/");
  } catch (error) {
    const failure = apiError(error);
    // A lost response may already have changed the cookie. Never sign in again over that selection.
    let recovered: SessionEnvelope;
    try {
      recovered = await bounded(() => options.api.me(linePrincipal));
      if (!principalMatches(recovered, options)) throw changed();
    } catch (recovery) {
      if (failure.code !== "person_switch_placement_preservation_failed") throw recovery;
      // Recovery cannot make unpreserved positions safe. Retain their primary failure and report the secondary check.
      const secondary = apiError(recovery);
      console.error(
        "Authoritative person recovery failed while sticker positions could not be preserved",
        { status: secondary.status, code: secondary.code },
      );
      throw failure;
    }
    const same =
      recovered.me.id === selection.userId &&
      recovered.selectionVersion === selection.selectionVersion;
    if (!same) {
      options.notice({
        userId: recovered.me.id,
        selectionVersion: recovered.selectionVersion,
        authenticatedUserId: recovered.authenticated.id,
        phase: "selected",
      });
      options.navigate("/");
      if (selectionRequested && recovered.me.id === targetUserId && failure.status === 0) return;
    } else {
      options.restore(recovered);
    }
    throw failure;
  }
}

/** Other tabs stop signing and writing. They require authoritative bootstrap on Reload. */
export function receivePersonSwitchNotice(
  notice: unknown,
  session: SessionEnvelope,
  suspend: () => void,
  stop: (error: ApiError, userId?: string) => void,
): void {
  if (
    !notice ||
    typeof notice !== "object" ||
    !("authenticatedUserId" in notice) ||
    !("userId" in notice) ||
    !("selectionVersion" in notice) ||
    !("phase" in notice)
  )
    return;
  if (
    notice.authenticatedUserId !== session.authenticated.id ||
    typeof notice.userId !== "string" ||
    (typeof notice.selectionVersion !== "string" && notice.selectionVersion !== null) ||
    (notice.phase !== "suspended" && notice.phase !== "selected")
  )
    return;
  if (
    notice.phase === "selected" &&
    notice.userId === session.me.id &&
    notice.selectionVersion === session.selectionVersion
  )
    return;
  suspend();
  stop(changed(), session.me.id);
}
