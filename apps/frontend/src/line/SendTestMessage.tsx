import liff from "@line/liff";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { useState } from "react";
import { LabelButton } from "../ui/LabelButton";
import { canOpenPicker, sendInLineChat } from "./friendPicker";
import "./send-test-message.css";

type Status =
  | { kind: "idle" }
  | { kind: "picking" }
  | { kind: "sent" }
  | { kind: "cancelled" }
  | { kind: "failed"; reason: string };

/**
 * Tries LINE's friend picker end to end: pick a chat, and it gets a text from you, so LINE can
 * be tested before anyone has drawn.
 */
export function SendTestMessage({ senderName }: { senderName: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const available = canOpenPicker(liff);

  const send = async () => {
    setStatus({ kind: "picking" });
    try {
      const text = `Test message from Sticker Board, sent by ${senderName} through LINE’s friend picker.`;
      setStatus({ kind: await sendInLineChat(liff, [{ type: "text", text }]) });
    } catch (error) {
      console.error(error);
      setStatus({ kind: "failed", reason: error instanceof Error ? error.message : String(error) });
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
        Send a test message
      </LabelButton>
      <p className="test-message-status" role="status">
        {!available
          ? "LINE’s friend list isn’t available here. It needs LINE Login, in LINE or a browser."
          : status.kind === "sent"
            ? "Sent. It’s in your chat with the friend you picked."
            : status.kind === "cancelled"
              ? "Nothing sent: the friend list was closed."
              : status.kind === "failed"
                ? status.reason
                : "Pick one LINE friend and they get a test message from you."}
      </p>
    </div>
  );
}
