import type { ChatMenuLink } from "@drawing-app/api/client";
import { useEffect, useSyncExternalStore } from "react";
import { createServerClient } from "../api/httpApi";
import { messageOf } from "../i18n/errorMessage";
import { jsonField } from "../identity/privy";

/**
 * The menu under the Official Account's chat: "Open Sticker Board" for someone new; for someone with
 * an account, Draw, My board and Explore, with the tickets they have left on the Draw key.
 */
export type ChatMenuStatus =
  | { state: "waiting" }
  | { state: "linking" }
  | { state: "answered"; link: ChatMenuLink }
  | { state: "failed"; reason: string };

let status: ChatMenuStatus = { state: "waiting" };
const listeners = new Set<() => void>();

function set(next: ChatMenuStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export const chatMenuStatus = () => status;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useChatMenuStatus(): ChatMenuStatus {
  return useSyncExternalStore(subscribe, chatMenuStatus);
}

let asked = false;

function fail(reason: string) {
  console.error(`The chat menu didn't link: ${reason}`);
  set({ state: "failed", reason });
}

/**
 * Asks the app's server to link your chat menu to the one for your language and the tickets you have
 * left, once per page load. The server asks LINE itself; the answer goes to the status, and this
 * never throws.
 */
export async function linkChatMenu(api = createServerClient()): Promise<void> {
  if (asked) return;
  asked = true;
  set({ state: "linking" });
  try {
    const response = await api["line-menu"].$post();
    if (response.ok) {
      set({ state: "answered", link: (await response.json()).chatMenu });
      return;
    }
    const error = jsonField(await response.json().catch(() => null), "error");
    fail(`HTTP ${response.status}${typeof error === "string" ? ` ${error}` : ""}`);
  } catch (error) {
    fail(`couldn’t reach the server: ${messageOf(error)}`);
  }
}

/** Links your chat menu once you're signed in to the app's server. It shows nothing. */
export function ChatMenuLink() {
  useEffect(() => {
    void linkChatMenu();
  }, []);
  return null;
}
