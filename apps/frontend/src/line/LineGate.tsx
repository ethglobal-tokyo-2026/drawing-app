import type { ReactNode } from "react";
import { useTranslation } from "../i18n/react";
import { Key } from "../ui/Key";
import { lineLogin, useLine } from "./liff";
import "./LineGate.css";

/** Holds the app until LINE has logged the person in, and says so when it can't. */
export function LineGate({ children }: { children: ReactNode }) {
  const line = useLine();
  const { t } = useTranslation();
  if (line.status === "ready") return children;
  return (
    <main className="line-gate" aria-busy={line.status === "loading"}>
      {line.status === "loading" ? (
        <p className="fine line-gate__opening" role="status">
          {t(($) => $.line.gate.opening)}
        </p>
      ) : line.status === "logged-out" ? (
        <>
          <h1 className="title-label">{t(($) => $.line.gate.title)}</h1>
          <p className="line-gate__lead">{t(($) => $.line.gate.lead)}</p>
          <Key onClick={lineLogin}>{t(($) => $.line.gate.logIn)}</Key>
        </>
      ) : (
        <>
          <h1 className="title-label">{t(($) => $.line.gate.didntStart)}</h1>
          <p className="line-gate__lead">{t(($) => $.line.gate.didntStartLead)}</p>
          <Key onClick={() => location.reload()}>{t(($) => $.line.gate.tryAgain)}</Key>
          <p className="fine line-gate__reason">{line.message}</p>
        </>
      )}
    </main>
  );
}
