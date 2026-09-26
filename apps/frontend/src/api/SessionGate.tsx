import { useEffect, useState, type ReactNode } from "react";
import { errorMessage } from "../i18n/errorMessage";
import { currentLanguage } from "../i18n/i18n";
import { followAccountLanguage } from "../i18n/pageLanguage";
import { useTranslation } from "../i18n/react";
import { lineIdToken, lineUserId } from "../line/liff";
import { reconnectLine } from "../line/reconnectLine";
import { Key } from "../ui/Key";
import { ApiError, apiError } from "./apiClient";
import type { Me } from "@drawing-app/api/client";
import { HandlePrompt } from "./HandlePrompt";
import type { SessionApi } from "./httpApi";
import { MeContext } from "./meContext";
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

/**
 * Resumes the current LINE user's server session before exchanging another ID token. Holds the app
 * until it is in that account's language and, when needed, the person has chosen a handle.
 */
export function SessionGate({
  session,
  idToken = lineIdToken,
  currentLineUserId = lineUserId,
  reconnect = reconnectLine,
  children,
}: {
  session: SessionApi;
  /** LINE's ID token; LIFF's, unless a test hands in its own. */
  idToken?: () => string | null;
  currentLineUserId?: () => string | null;
  reconnect?: () => Promise<void>;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<Session>({ step: "signing-in" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    const signingIn = (async () => {
      const expectedLineUserId = currentLineUserId();
      if (expectedLineUserId) {
        try {
          const resumed = await session.me(expectedLineUserId);
          await followAccountLanguage(resumed.me.languageChoice);
          return resumed;
        } catch (error) {
          // An outage isn't a reason to discard a session or start another LINE login.
          if (!(error instanceof ApiError) || error.status !== 401 || error.code !== "signed_out") {
            throw error;
          }
        }
      }
      if (!current) return null;
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
      const signedIn = await session.signIn({
        idToken: token,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: currentLanguage(),
      });
      // Before the app opens, so it opens in the account's language.
      await followAccountLanguage(signedIn.me.languageChoice);
      return signedIn;
    })();
    signingIn.then(
      (signedIn) => {
        if (current && signedIn) setState({ step: "ready", me: signedIn.me });
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
  }, [session, idToken, currentLineUserId, attempt]);

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
      <MeContext value={state.me}>{children}</MeContext>
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
