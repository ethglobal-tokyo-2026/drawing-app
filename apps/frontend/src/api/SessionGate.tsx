import { useCallback, useEffect, useState, type ReactNode } from "react";
import { errorMessage } from "../i18n/errorMessage";
import { currentLanguage } from "../i18n/i18n";
import { followAccountLanguage } from "../i18n/pageLanguage";
import { useTranslation } from "../i18n/react";
import { lineClaims, lineIdToken, lineUserId, type LineClaims } from "../line/liff";
import { reconnectLine } from "../line/reconnectLine";
import { Key } from "../ui/Key";
import { ApiError, apiError } from "./apiClient";
import type { Me } from "@drawing-app/api/client";
import { earlySession, type EarlySession } from "./earlySession";
import { HandlePrompt } from "./HandlePrompt";
import type { SessionApi } from "./httpApi";
import { MeContext, SetMeContext } from "./meContext";
import "../line/LineGate.css";

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Session =
  | { step: "signing-in" }
  | { step: "reconnecting" }
  | { step: "failed"; error: ApiError }
  | { step: "ready"; me: Me };

const needsLine = (error: ApiError) =>
  error.code === "line_token_invalid" ||
  error.code === "line_token_expired" ||
  error.code === "no_line_token" ||
  error.code === "line_reconnect_failed";

/** What signing in with LINE would change on your account: LINE's name and picture, and the language. */
const outOfDate = (me: Me, claims: LineClaims | null) =>
  claims !== null &&
  (me.lineDisplayName !== (claims.name ?? me.lineDisplayName) ||
    me.linePictureUrl !== (claims.picture ?? null) ||
    (me.languageChoice === null && me.language !== currentLanguage()));

/**
 * Signs you in to the app's server, inside LineGate, and holds the app until it has, it's in your
 * account's language and, when needed, you've chosen a handle. The session cookie from your last visit,
 * asked about as the app started, opens the app when it's the LINE user LIFF logged in; without that
 * early answer, GET /api/me resumes the session the server matches to LINE's user. Otherwise LINE's ID
 * token signs you in.
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
      return session.signIn({
        idToken: token,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: currentLanguage(),
      });
    };
    /** A session resumed without LINE's token; signing in again, behind it, brings LINE's news. */
    const resumed = async (me: Me) => {
      await followAccountLanguage(me.languageChoice);
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
      await followAccountLanguage(me.languageChoice);
      return me;
    })();
    signingIn.then(
      (me) => {
        if (current && me) setState({ step: "ready", me });
      },
      (error: unknown) => {
        const failure = apiError(error);
        console.error("Signing in to the app's server failed", failure);
        if (current) setState({ step: "failed", error: failure });
      },
    );
    return () => {
      current = false;
    };
  }, [session, idToken, claims, currentLineUserId, early, attempt]);

  const setReadyMe = useCallback((me: Me) => setState({ step: "ready", me }), []);

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
      <HandlePrompt
        me={state.me}
        setHandle={session.setHandle}
        onChosen={(me) => setState({ step: "ready", me })}
      />
    ) : (
      <MeContext value={state.me}>
        <SetMeContext value={setReadyMe}>{children}</SetMeContext>
      </MeContext>
    );
  }
  return (
    <main className="line-gate" aria-busy={state.step !== "failed"}>
      {state.step === "signing-in" || state.step === "reconnecting" ? (
        <p className="fine line-gate__opening" role="status">
          {state.step === "reconnecting"
            ? t(($) => $.api.signIn.reconnecting)
            : t(($) => $.api.signIn.opening)}
        </p>
      ) : (
        <>
          <h1 className="title-label">{t(($) => $.api.signIn.failed)}</h1>
          <p className="line-gate__lead">{errorMessage(state.error)}</p>
          <Key onClick={() => void retry()}>
            {needsLine(state.error)
              ? t(($) => $.api.signIn.reconnect)
              : t(($) => $.api.signIn.tryAgain)}
          </Key>
          <p className="fine line-gate__reason">
            {state.error.status > 0 && `${state.error.status} · `}
            {state.error.message}
          </p>
        </>
      )}
    </main>
  );
}
