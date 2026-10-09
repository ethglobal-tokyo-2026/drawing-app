import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { errorDetail, errorMessage } from "../i18n/errorMessage";
import { followAccountLanguage, lineLanguage } from "../i18n/pageLanguage";
import { useTranslation } from "../i18n/react";
import { GateNotice, GateOpening, GatePaper } from "../line/GateParts";
import { lineClaims, lineIdToken, lineUserId, type LineClaims } from "../line/liff";
import { reconnectLine } from "../line/reconnectLine";
import { Key } from "../ui/Key";
import { ApiError, apiError } from "./apiClient";
import type { Me } from "@drawing-app/api/client";
import { earlySession, type EarlySession } from "./earlySession";
import { HandlePrompt } from "./HandlePrompt";
import type { SessionApi } from "./httpApi";
import { MeContext, SetMeContext } from "./meContext";
import { onSessionLost } from "./sessionLoss";

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Session =
  | { step: "signing-in" }
  | { step: "reconnecting" }
  | { step: "failed"; error: ApiError }
  | { step: "ready"; me: Me };

/**
 * A session lost this soon after signing in again to recover it isn't being kept, as when the
 * browser drops the cookie, and signing in once more would only loop.
 */
export const RECOVERY_HOLD_MS = 30_000;

// `signed_out` gets here only when signing in again didn't hold, which LINE's own login can fix.
const needsLine = (error: ApiError) =>
  error.code === "line_token_invalid" ||
  error.code === "line_token_expired" ||
  error.code === "no_line_token" ||
  error.code === "line_reconnect_failed" ||
  error.code === "signed_out";

/** What signing in with LINE would change on your account: LINE's name and picture. */
const outOfDate = (me: Me, claims: LineClaims | null) =>
  claims !== null &&
  (me.lineDisplayName !== (claims.name ?? me.lineDisplayName) ||
    me.linePictureUrl !== (claims.picture ?? null));

/**
 * Signs you in to the app's server, inside LineGate, and holds the app until it has, it's in your
 * account's language and, when needed, you've chosen a handle. The session cookie from your last visit,
 * asked about as the app started, opens the app when it's the LINE user LIFF logged in; without that
 * early answer, GET /api/me resumes the session the server matches to LINE's user. Otherwise LINE's ID
 * token signs you in. A request that later finds the session gone, on any screen, sends the app back
 * through the same sign-in, so no screen dead-ends on being signed out.
 */
export function SessionGate({
  session,
  idToken = lineIdToken,
  claims = lineClaims,
  currentLineUserId = lineUserId,
  early = earlySession(),
  reconnect = reconnectLine,
  children,
}: {
  session: SessionApi;
  /** LINE's ID token; LIFF's, unless a test hands in its own. */
  idToken?: () => string | null;
  /** Who LINE's ID token names; LIFF's, unless a test hands in its own. */
  claims?: () => LineClaims | null;
  currentLineUserId?: () => string | null;
  /** The cookie's session, asked for as the app started; null when there was none to ask about. */
  early?: EarlySession | null;
  reconnect?: () => Promise<void>;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<Session>({ step: "signing-in" });
  const [attempt, setAttempt] = useState(0);
  /** A sign-in that answers a lost session is under way, and when the last one opened the app. */
  const recovering = useRef(false);
  const recoveredAt = useRef<number | null>(null);
  // Only an open app takes a newer you: a save that answers while signing in again never reopens it.
  const setReadyMe = useCallback(
    (me: Me) => setState((state) => (state.step === "ready" ? { step: "ready", me } : state)),
    [],
  );

  useEffect(() => {
    let current = true;
    const signIn = async () => {
      let token: string | null;
      try {
        token = idToken();
      } catch (error) {
        throw new ApiError(0, { error: "no_line_token", detail: describe(error) });
      }
      if (!token) {
        throw new ApiError(0, {
          error: "no_line_token",
          detail: "LINE gave no ID token, though it's logged in",
        });
      }
      // LINE's language, never one this phone kept: a new account starts in it.
      return session.signIn({ idToken: token, language: lineLanguage() });
    };
    /** A session resumed without LINE's token; signing in again, behind it, brings LINE's news. */
    const resumed = async (me: Me) => {
      await followAccountLanguage(me.language);
      if (current && outOfDate(me, claims())) {
        signIn().then(
          (signedIn) => {
            if (!current) return;
            // A handle chosen while the profile request was in flight is newer than its answer.
            setState((state) =>
              state.step === "ready" && state.me === me
                ? { step: "ready", me: signedIn.me }
                : state,
            );
          },
          (error: unknown) =>
            console.warn("Bringing LINE's profile to your account failed", apiError(error)),
        );
      }
      return me;
    };
    const signingIn = (async (): Promise<Me | null> => {
      const lineUser = currentLineUserId();
      if (early && attempt === 0) {
        // Asked as the app started, before LINE's user was known, so checked here: nothing of
        // another person's reaches the screen.
        let cookies: Me | null;
        try {
          cookies = await early.me;
        } catch (error) {
          early.drop();
          throw error;
        }
        if (cookies && lineUser && cookies.lineUserId === lineUser) {
          early.accept(cookies);
          return resumed(cookies);
        }
        early.drop();
      } else if (lineUser) {
        try {
          // Retries check the cookie again; the early answer may predate a completed sign-in.
          // The server matches the session to LINE's user.
          return await resumed((await session.me(lineUser)).me);
        } catch (error) {
          // An outage isn't a reason to discard a session or start another LINE login.
          if (!(error instanceof ApiError) || error.status !== 401 || error.code !== "signed_out") {
            throw error;
          }
        }
      }
      if (!current) return null;
      const { me } = await signIn();
      // Before the app opens, so it opens in the account's language.
      await followAccountLanguage(me.language);
      return me;
    })();
    signingIn.then(
      (me) => {
        if (!current || !me) return;
        if (recovering.current) {
          recovering.current = false;
          recoveredAt.current = Date.now();
        }
        setState({ step: "ready", me });
      },
      (error: unknown) => {
        const failure = apiError(error);
        console.error("Signing in to the app's server failed", failure);
        recovering.current = false;
        if (current) setState({ step: "failed", error: failure });
      },
    );
    return () => {
      current = false;
    };
  }, [session, idToken, claims, currentLineUserId, early, attempt]);

  // A request that finds the session gone, on any screen, signs in again the way the app opened.
  useEffect(() => {
    if (state.step !== "ready") return;
    let handled = false;
    return onSessionLost((error) => {
      if (handled) return;
      handled = true;
      const recoveredRecently =
        recoveredAt.current !== null && Date.now() - recoveredAt.current < RECOVERY_HOLD_MS;
      if (recoveredRecently) {
        console.error("The session was lost again right after signing in again", error);
        setState({ step: "failed", error });
        return;
      }
      console.warn("The session ended, so the app signs in again", error);
      recovering.current = true;
      setState({ step: "signing-in" });
      setAttempt((n) => n + 1);
    });
  }, [state.step]);

  const retry = async () => {
    if (state.step !== "failed") return;
    if (!needsLine(state.error)) {
      setState({ step: "signing-in" });
      setAttempt((n) => n + 1);
      return;
    }
    setState({ step: "reconnecting" });
    try {
      // Explicit user action only: never loop redirects or resubmit a rejected cached token.
      await reconnect();
    } catch (error) {
      console.error("Restarting LINE sign-in failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      setState({
        step: "failed",
        error: new ApiError(0, { error: "line_reconnect_failed" }),
      });
    }
  };

  if (state.step === "ready") {
    return state.me.needsHandle ? (
      <HandlePrompt me={state.me} setHandle={session.setHandle} onChosen={setReadyMe} />
    ) : (
      <MeContext value={state.me}>
        <SetMeContext value={setReadyMe}>{children}</SetMeContext>
      </MeContext>
    );
  }
  return (
    <GatePaper aria-busy={state.step !== "failed"}>
      {state.step === "signing-in" ? (
        <GateOpening
          label={t(($) => $.api.signIn.opening)}
          stillLabel={t(($) => $.api.signIn.stillOpening)}
        />
      ) : state.step === "reconnecting" ? (
        <GateOpening label={t(($) => $.api.signIn.reconnecting)} />
      ) : (
        <GateNotice
          title={t(($) => $.api.signIn.failed)}
          lead={errorMessage(state.error)}
          detail={errorDetail(state.error)}
        >
          <Key onClick={() => void retry()}>
            {needsLine(state.error)
              ? t(($) => $.api.signIn.reconnect)
              : t(($) => $.api.signIn.tryAgain)}
          </Key>
        </GateNotice>
      )}
    </GatePaper>
  );
}
