import { useEffect, useState, type ReactNode } from "react";
import { errorMessage } from "../i18n/errorMessage";
import { currentLanguage } from "../i18n/i18n";
import { followAccountLanguage } from "../i18n/pageLanguage";
import { useTranslation } from "../i18n/react";
import { lineClaims, lineIdToken, type LineClaims } from "../line/liff";
import { Key } from "../ui/Key";
import { ApiError, apiError } from "./apiClient";
import type { Me } from "@drawing-app/api/client";
import { earlySession, type EarlySession } from "./earlySession";
import { HandlePrompt } from "./HandlePrompt";
import type { SessionApi } from "./httpApi";
import { MeContext } from "./meContext";
import "../line/LineGate.css";

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Session =
  | { step: "signing-in" }
  | { step: "failed"; error: ApiError }
  | { step: "ready"; me: Me };

/** What signing in with LINE would change on your account: LINE's name and picture, and the language. */
const outOfDate = (me: Me, claims: LineClaims) =>
  me.lineDisplayName !== (claims.name ?? me.lineDisplayName) ||
  me.linePictureUrl !== (claims.picture ?? null) ||
  (me.languageChoice === null && me.language !== currentLanguage());

/**
 * Signs you in to the app's server, inside LineGate, and holds the app until it has and it's in your
 * account's language. The cookie from your last visit, asked about as the app started, opens the app
 * when it's the LINE user LIFF logged in; otherwise LINE's ID token signs you in. A first sign-in whose
 * LINE name is someone's handle asks for another before the app opens.
 */
export function SessionGate({
  session,
  idToken = lineIdToken,
  claims = lineClaims,
  early = earlySession(),
  children,
}: {
  session: SessionApi;
  /** LINE's ID token; LIFF's, unless a test hands in its own. */
  idToken?: () => string | null;
  /** Who LINE's ID token names; LIFF's, unless a test hands in its own. */
  claims?: () => LineClaims | null;
  /** The cookie's session, asked for as the app started; null when there was none to ask about. */
  early?: EarlySession | null;
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
    const signingIn = (async () => {
      const line = claims();
      const resumed = early ? await early.me : null;
      if (resumed && line && resumed.lineUserId === line.sub) {
        early?.accept(resumed);
        await followAccountLanguage(resumed.languageChoice);
        // Signing in again brings LINE's new name or picture, or a new language, to the account;
        // the app doesn't wait for it.
        if (current && outOfDate(resumed, line)) {
          signIn().then(
            (signedIn) => {
              if (current) setState({ step: "ready", me: signedIn.me });
            },
            (error: unknown) =>
              console.warn("Bringing LINE's profile to your account failed", apiError(error)),
          );
        }
        return resumed;
      }
      early?.drop();
      const { me } = await signIn();
      // Before the app opens, so it opens in the account's language.
      await followAccountLanguage(me.languageChoice);
      return me;
    })();
    signingIn.then(
      (me) => {
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
  }, [session, idToken, claims, early, attempt]);

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
          {t(($) => $.api.signIn.opening)}
        </p>
      ) : (
        <>
          <h1 className="title-label">{t(($) => $.api.signIn.failed)}</h1>
          <p className="line-gate__lead">{errorMessage(state.error)}</p>
          <Key
            onClick={() => {
              setState({ step: "signing-in" });
              setAttempt((n) => n + 1);
            }}
          >
            {t(($) => $.api.signIn.tryAgain)}
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
