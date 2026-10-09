import type { ReactNode } from "react";
import { useTranslation } from "../i18n/react";
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
    <GatePaper aria-busy={line.status === "loading"}>
      {line.status === "loading" ? (
        <GateOpening
          label={t(($) => $.line.gate.opening)}
          stillLabel={t(($) => $.line.gate.stillOpening)}
        />
      ) : line.status === "logged-out" ? (
        <GateNotice title={t(($) => $.line.gate.title)} lead={t(($) => $.line.gate.lead)}>
          <Key onClick={lineLogin}>{t(($) => $.line.gate.logIn)}</Key>
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
