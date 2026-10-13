import liff from "@line/liff";
import { useContext, useMemo } from "react";
import { SessionEnvelopeContext } from "../api/sessionContext";
import { useLine } from "../line/liff";
import { liffGiftSender, type GiftSender } from "./giftSender";

/**
 * How a gift goes out here: LINE's picker, in the LINE app or a browser after LINE
 * Login, or null where LINE reports the picker unavailable.
 */
export function useGiftSender(): GiftSender | null {
  const session = useContext(SessionEnvelopeContext);
  const personAvailable =
    session?.personSwitchMode === "live" && session.allowedSelections.length === 2;
  const ready = useLine().status === "ready";
  return useMemo(
    () => (ready ? liffGiftSender(liff, personAvailable) : null),
    [ready, personAvailable],
  );
}
