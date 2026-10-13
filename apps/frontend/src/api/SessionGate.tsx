import { useCallback, useEffect, useState, type ReactNode } from "react";
import { errorDetail, errorMessage, messageOf } from "../i18n/errorMessage";
import { followAccountLanguage, lineLanguage } from "../i18n/pageLanguage";
import { useTranslation } from "../i18n/react";
import { GateNotice, GateOpening, GatePaper } from "../line/GateParts";
import { lineClaims, lineAccessToken, lineUserId, type LineClaims } from "../line/liff";
import { reconnectLine } from "../line/reconnectLine";
import { Key } from "../ui/Key";
import { ApiError, apiError } from "./apiClient";
import type { Me, SessionEnvelope, AccountSelection } from "@drawing-app/api/client";
import { earlySession, type EarlySession } from "./earlySession";
import { HandlePrompt } from "./HandlePrompt";
import type { SessionApi } from "./httpApi";
import { MeContext, SetMeContext } from "./meContext";
import {
  acceptSession,
  onSessionRestoreRequested,
  suspendSession,
  selectionOf,
  selectionKey,
  SessionEnvelopeContext,
} from "./sessionContext";
import { onSessionLost, requestAccountRelease } from "./sessionLoss";

type Session =
  | { step: "signing-in" }
  | { step: "reconnecting" }
  | { step: "failed"; error: ApiError; expired?: boolean }
  | { step: "ready"; envelope: SessionEnvelope };

// Initial sign-in failures can require a fresh LINE login. Post-ready expiry requires Reload.
const needsLine = (error: ApiError) =>
  error.code === "line_token_invalid" ||
  error.code === "line_token_expired" ||
  error.code === "no_line_token" ||
  error.code === "line_reconnect_failed" ||
  error.code === "signed_out";

/** What signing in with LINE would change on your account: LINE's name and picture. */
const outOfDate = (me: SessionEnvelope["authenticated"], claims: LineClaims | null) =>
  claims !== null &&
  (me.lineDisplayName !== (claims.name ?? me.lineDisplayName) ||
    me.linePictureUrl !== (claims.picture ?? null));

/**
 * Signs you in to the app's server, inside LineGate, and holds the app until it has, it's in your
 * account's language and, when needed, you've chosen a handle. The session cookie from your last visit,
 * asked about as the app started, opens the app when it's the LINE user LIFF logged in; without that
 * early answer, GET /api/me resumes the session the server matches to LINE's user. Otherwise LINE's access
 * token signs you in. A request that later finds the session gone closes the account and asks for
 * Reload, so a background sign-in cannot replace another tab's newer session.
 */
export function SessionGate({
  session,
  accessToken = lineAccessToken,
  claims = lineClaims,
  currentLineUserId = lineUserId,
  early = earlySession(),
  reconnect = reconnectLine,
  children,
}: {
  session: SessionApi;
  /** LINE's access token; LIFF's, unless a test hands in its own. */
  accessToken?: () => string | null;
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
  // Only an open account takes a newer profile: late saves never reopen a closed account.
  const setReadyMe = useCallback(
    (me: Me) =>
      setState((state) =>
        state.step === "ready" && state.envelope.me.id === me.id
          ? { ...state, envelope: { ...state.envelope, me } }
          : state,
      ),
    [],
  );

  useEffect(() => {
    let current = true;
    let refreshFailure: ApiError | undefined;
    const signIn = async (expected?: AccountSelection) => {
      let token: string | null;
      try {
        token = accessToken();
      } catch (error) {
        throw new ApiError(0, { error: "no_line_token", detail: messageOf(error) });
      }
      if (!token) {
        throw new ApiError(0, {
          error: "no_line_token",
          detail: "LINE gave no access token, though it's logged in",
        });
      }
      // LINE's language, never one this phone kept: a new account starts in it.
      const request = { accessToken: token, language: lineLanguage() };
      return expected === undefined ? session.signIn(request) : session.signIn(request, expected);
    };
    /** A session resumed without LINE's token; signing in again, behind it, brings LINE's news. */
    const validate = (envelope: SessionEnvelope) => {
      const principal = currentLineUserId();
      if (!principal || envelope.authenticated.lineUserId !== principal)
        throw new ApiError(409, { error: "session_account_changed" });
      return envelope;
    };
    const resumed = async (envelope: SessionEnvelope) => {
      validate(envelope);
      const { me } = envelope;
      await followAccountLanguage(me.language);
      if (current && outOfDate(envelope.authenticated, claims())) {
        signIn(selectionOf(envelope)).then(
          (signedIn) => {
            if (!current) return;
            // A handle chosen while the profile request was in flight is newer than its answer.
            setState((state) =>
              state.step === "ready" &&
              state.envelope.me === me &&
              signedIn.me.id === me.id &&
              signedIn.selectionVersion === envelope.selectionVersion
                ? {
                    ...state,
                    envelope: {
                      ...state.envelope,
                      me: signedIn.me,
                      authenticated: signedIn.authenticated,
                    },
                  }
                : state,
            );
          },
          (error: unknown) => {
            const failure = apiError(error);
            console.warn("Bringing LINE's profile to your account failed", failure);
            if (current && failure.code === "session_account_changed") {
              refreshFailure = failure;
              requestAccountRelease(me.id, () =>
                setState((state) =>
                  state.step === "ready" && state.envelope.me.id === me.id
                    ? { step: "failed", error: failure }
                    : state,
                ),
              );
            }
          },
        );
      }
      return envelope;
    };
    const signingIn = (async (): Promise<SessionEnvelope | null> => {
      const lineUser = currentLineUserId();
      if (early && attempt === 0) {
        // Asked as the app started, before LINE's user was known, so checked here: nothing of
        // another person's reaches the screen.
        let cookies: SessionEnvelope | null;
        try {
          cookies = await early.me;
        } catch (error) {
          early.drop();
          throw error;
        }
        if (cookies && lineUser && cookies.authenticated.lineUserId === lineUser) {
          early.accept(cookies);
          return resumed(cookies);
        }
        early.drop();
      } else if (lineUser) {
        try {
          // Retries check the cookie again; the early answer may predate a completed sign-in.
          // The server matches the session to LINE's user.
          const answer = await session.me(lineUser);
          return await resumed(answer);
        } catch (error) {
          // An outage isn't a reason to discard a session or start another LINE login.
          if (!(error instanceof ApiError) || error.status !== 401 || error.code !== "signed_out") {
            throw error;
          }
        }
      }
      if (!current) return null;
      const envelope = validate(await signIn());
      const { me } = envelope;
      // Before the app opens, so it opens in the account's language.
      await followAccountLanguage(me.language);
      return envelope;
    })();
    signingIn.then(
      (envelope) => {
        if (!current || !envelope) return;
        if (refreshFailure) {
          setState({ step: "failed", error: refreshFailure });
          return;
        }
        acceptSession(envelope);
        setState({ step: "ready", envelope });
      },
      (error: unknown) => {
        const failure = apiError(error);
        console.error("Signing in to the app's server failed", failure);
        if (current) setState({ step: "failed", error: failure });
      },
    );
    return () => {
      current = false;
      suspendSession();
    };
  }, [session, accessToken, claims, currentLineUserId, early, attempt]);

  // Once ready, session loss closes this account until the user explicitly reloads the page.
  useEffect(() => {
    if (state.step !== "ready") return;
    let handled = false;
    return onSessionLost((error, expected) => {
      if (handled || expected !== state.envelope.me.id) return;
      handled = true;
      suspendSession();
      if (error.code === "session_account_changed") {
        console.warn("The account changed; reload to open the current session", error);
        setState({ step: "failed", error });
        return;
      }
      console.warn("The session ended; reload to continue", error);
      setState({ step: "failed", error, expired: true });
    });
  }, [state]);

  useEffect(() => {
    if (state.step !== "ready") return;
    return onSessionRestoreRequested((envelope) => {
      if (
        envelope.authenticated.lineUserId !== currentLineUserId() ||
        envelope.authenticated.id !== state.envelope.authenticated.id ||
        selectionKey(selectionOf(envelope)) !== selectionKey(selectionOf(state.envelope))
      ) {
        throw new ApiError(409, { error: "session_account_changed" });
      }
      acceptSession(envelope);
      setState({ step: "ready", envelope });
    });
  }, [state, currentLineUserId]);

  const retry = async () => {
    if (state.step !== "failed") return;
    if (state.expired || state.error.code === "session_account_changed") {
      requestAccountRelease(undefined, () => location.reload());
      return;
    }
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
    return state.envelope.me.needsHandle ? (
      <HandlePrompt
        me={state.envelope.me}
        setHandle={(handle) => session.setHandle(handle, selectionOf(state.envelope))}
        onChosen={setReadyMe}
      />
    ) : (
      <SessionEnvelopeContext value={state.envelope}>
        <MeContext key={selectionKey(selectionOf(state.envelope))} value={state.envelope.me}>
          <SetMeContext value={setReadyMe}>{children}</SetMeContext>
        </MeContext>
      </SessionEnvelopeContext>
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
          title={t(($) => (state.expired ? $.api.signIn.sessionEnded : $.api.signIn.failed))}
          lead={state.expired ? t(($) => $.api.signIn.sessionExpired) : errorMessage(state.error)}
          detail={errorDetail(state.error)}
        >
          <Key onClick={() => void retry()}>
            {state.expired || state.error.code === "session_account_changed"
              ? t(($) => $.api.signIn.reload)
              : needsLine(state.error)
                ? t(($) => $.api.signIn.reconnect)
                : t(($) => $.api.signIn.tryAgain)}
          </Key>
        </GateNotice>
      )}
    </GatePaper>
  );
}
