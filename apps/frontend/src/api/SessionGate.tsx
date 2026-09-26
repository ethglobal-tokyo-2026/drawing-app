import { useEffect, useState, type ReactNode } from "react";
import { currentLanguage } from "../i18n/i18n";
import { lineIdToken } from "../line/liff";
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
  | { step: "failed"; error: ApiError }
  | { step: "ready"; me: Me };

/**
 * Signs you in to the app's server with LINE's ID token, inside LineGate, and holds the app until it
 * has. A first sign-in whose LINE name is someone's handle asks for another before the app opens.
 */
export function SessionGate({
  session,
  idToken = lineIdToken,
  children,
}: {
  session: SessionApi;
  /** LINE's ID token; LIFF's, unless a test hands in its own. */
  idToken?: () => string | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<Session>({ step: "signing-in" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    const signingIn = (async () => {
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
    })();
    signingIn.then(
      ({ me }) => {
        if (current) setState({ step: "ready", me });
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
  }, [session, idToken, attempt]);

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
    <main className="line-gate" aria-busy={state.step === "signing-in"}>
      {state.step === "signing-in" ? (
        <p className="fine line-gate__opening" role="status">
          Opening your sticker board…
        </p>
      ) : (
        <>
          <h1 className="title-label">Couldn’t sign you in</h1>
          <p className="line-gate__lead">
            {state.error.code === "no_line_token"
              ? "LINE didn’t give this app a way to sign you in."
              : "Your sticker board opens once the app’s server answers. Check your connection, then try again."}
          </p>
          <Key
            onClick={() => {
              setState({ step: "signing-in" });
              setAttempt((n) => n + 1);
            }}
          >
            Try again
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
