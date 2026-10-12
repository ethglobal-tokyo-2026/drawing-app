import type { ReactNode } from "react";
import { useTranslation } from "../i18n/react";
import { DrawIcon } from "../icons";
import { Key } from "../ui/Key";
import { GateNotice, GateOpening, GatePaper } from "./GateParts";
import { lineLogin, START_TIMEOUT_MS, useLine } from "./liff";
import "./LineGate.css";

/** Holds the app until LINE has logged the person in, and says so when it can't. */
export function LineGate({ children }: { children: ReactNode }) {
  const line = useLine();
  const { t } = useTranslation();
  if (line.status === "ready") return children;
  return (
    <GatePaper
      className={line.status === "logged-out" ? "line-gate--sign-in" : undefined}
      aria-busy={line.status === "loading"}
    >
      {line.status === "loading" ? (
        <GateOpening
          label={t(($) => $.line.gate.opening)}
          stillLabel={t(($) => $.line.gate.stillOpening)}
        />
      ) : line.status === "logged-out" ? (
        <GateNotice
          title={
            <span className="line-gate__brand">
              <DrawIcon size={72} />
              <span lang="en">{t(($) => $.line.gate.title)}</span>
            </span>
          }
          lead={line.strayAnswer ? t(($) => $.line.gate.strayAnswer) : undefined}
        >
          <Key tone="line" className="line-login" onClick={() => lineLogin()}>
            <span className="line-login__icon" aria-hidden="true">
              <img src="/brands/line/login-icon.png" alt="" width={40} height={40} />
            </span>
            <span className="line-login__label">{t(($) => $.line.gate.logIn)}</span>
          </Key>
        </GateNotice>
      ) : (
        <GateNotice
          title={t(($) => $.line.gate.didntStart)}
          lead={t(($) => $.line.gate.didntStartLead)}
          detail={
            line.failure.kind === "no-answer"
              ? t(($) => $.line.gate.noAnswer, { seconds: START_TIMEOUT_MS / 1000 })
              : line.failure.message
          }
        >
          <Key onClick={() => location.reload()}>{t(($) => $.line.gate.tryAgain)}</Key>
        </GateNotice>
      )}
    </GatePaper>
  );
}
