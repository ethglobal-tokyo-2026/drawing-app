import liff from "@line/liff";
import { useMemo } from "react";
import { useLine } from "../line/liff";
import { liffGiftSender, type GiftSender } from "./giftSender";

/**
 * How a gift goes out here: LINE's one-friend picker, in the LINE app or a browser after LINE
 * Login, or null where LINE reports the picker unavailable.
 */
export function useGiftSender(): GiftSender | null {
  const ready = useLine().status === "ready";
  return useMemo(() => (ready ? liffGiftSender(liff) : null), [ready]);
}
