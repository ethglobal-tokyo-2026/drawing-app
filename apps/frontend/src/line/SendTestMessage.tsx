import liff from "@line/liff";
import { useState } from "react";
import { messageOf } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { PaperPlaneTilt } from "../icons";
import { LabelButton } from "../ui/LabelButton";
import { canOpenPicker, sendInLineChat } from "./friendPicker";
import "./send-test-message.css";

type Status =
  | { kind: "idle" }
  | { kind: "picking" }
  | { kind: "sent" }
  | { kind: "cancelled" }
  | { kind: "unknown" }
  | { kind: "failed"; reason: string };

/**
 * Tries LINE's friend picker end to end: pick a chat, and it gets a text from you, so LINE can
 * be tested before anyone has drawn.
 */
export function SendTestMessage({ senderName }: { senderName: string }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const available = canOpenPicker(liff);

  const send = async () => {
    setStatus({ kind: "picking" });
    try {
      const text = t(($) => $.line.developer.testMessage.message, { name: senderName });
      setStatus({ kind: await sendInLineChat(liff, [{ type: "text", text }]) });
    } catch (error) {
      console.error(error);
      setStatus({ kind: "failed", reason: messageOf(error) });
    }
  };

  return (
    <div className="test-message">
      <LabelButton
        block
        icon={<PaperPlaneTilt />}
        disabled={!available || status.kind === "picking"}
        onClick={send}
      >
        {t(($) => $.line.developer.testMessage.send)}
      </LabelButton>
      <p className="test-message-status" role="status">
        {!available
          ? t(($) => $.line.developer.testMessage.unavailable)
          : status.kind === "sent"
            ? t(($) => $.line.developer.testMessage.sent)
            : status.kind === "cancelled"
              ? t(($) => $.line.developer.testMessage.cancelled)
              : status.kind === "unknown"
                ? t(($) => $.line.developer.testMessage.unknown)
                : status.kind === "failed"
                  ? status.reason
                  : t(($) => $.line.developer.testMessage.pick)}
      </p>
    </div>
  );
}
