import type { GiftMessage } from "./giftMessage";

// Under LIFF Mock no LINE chat carries a Gift Message, so the tab keeps each one its picker sent, and
// the developer slip's next Switch opens it as the person switched to, as "Open your gift" would.
const KEY = "draw.liffMockGiftMessages";

/** The path a Gift Message's "Open your gift" link opens: /g/{Gift Claim Token}. */
const giftPathIn = (message: GiftMessage) =>
  /liff\.line\.me\/[\w-]+(\/g\/[\w-]+)/.exec(JSON.stringify(message))?.[1] ?? null;

function readKept(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    const kept: unknown[] = Array.isArray(parsed) ? parsed : [];
    return kept.filter((path): path is string => typeof path === "string");
  } catch (error) {
    console.error("LIFF Mock's Gift Messages couldn't be read", error);
    return [];
  }
}

function writeKept(paths: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(paths));
  } catch (error) {
    console.error("LIFF Mock's Gift Messages couldn't be kept", error);
  }
}

/** Keeps a Gift Message LIFF Mock's picker sent, for the next Switch to open. */
export function keepMockGiftMessage(message: GiftMessage) {
  const path = giftPathIn(message);
  if (!path) {
    console.error("The Gift Message carries no gift link", message);
    return;
  }
  writeKept([...readKept(), path]);
}

/** The oldest kept Gift Message's path, which it forgets; null with none. */
export function takeMockGiftMessage(): string | null {
  const [oldest, ...rest] = readKept();
  if (oldest === undefined) return null;
  writeKept(rest);
  return oldest;
}
