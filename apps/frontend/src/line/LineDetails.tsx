import liff from "@line/liff";
import { useEffect, useState } from "react";
import { AccountRow } from "../identity/AccountRow";
import { useChatMenuStatus, type ChatMenuStatus } from "./chatMenu";
import { describeLiffError, LIFF_ID, useLine } from "./liff";

type Context = NonNullable<ReturnType<typeof liff.getContext>>;

const OPENED_FROM: Record<Context["type"], string> = {
  utou: "a one-to-one chat",
  group: "a group chat",
  room: "a multi-person chat",
  square_chat: "an OpenChat",
  none: "LINE, outside any chat",
  external: "a browser",
};

// "Checking…" until LINE answers; its answer or its error otherwise.
type Lookup = { state: "checking" } | { state: "done"; text: string };

/** Asks LINE once, after it has started. */
function useLineLookup(ask: () => Promise<string>): Lookup {
  const [lookup, setLookup] = useState<Lookup>({ state: "checking" });
  useEffect(() => {
    let live = true;
    ask().then(
      (text) => live && setLookup({ state: "done", text }),
      (error: unknown) =>
        live && setLookup({ state: "done", text: `Couldn’t check: ${describeLiffError(error)}` }),
    );
    return () => {
      live = false;
    };
  }, [ask]);
  return lookup;
}

const CHAT_MENU: Record<ChatMenuStatus["state"], (s: ChatMenuStatus) => string> = {
  waiting: () => "Switches after the Privy sign-in",
  switching: () => "Checking…",
  returning: () => "Draw · My board · Explore",
  new: (s) =>
    s.state === "new" && s.reason === "not_a_friend"
      ? "Open Sticker Board: add the official account as a friend to switch"
      : "Open Sticker Board: not signed up yet",
  failed: (s) => `Didn’t switch: ${s.state === "failed" ? s.reason : ""}`,
};

const friendship = async () =>
  (await liff.getFriendship()).friendFlag ? "Added as a friend" : "Not a friend yet";
const permissions = async () => (await liff.permission.getGrantedAll()).join(", ") || "None";

/** What LINE says about the person and where the app is open, for checking LINE from the board. */
export function LineDetails() {
  const line = useLine();
  const officialAccount = useLineLookup(friendship);
  const granted = useLineLookup(permissions);
  const chatMenu = useChatMenuStatus();
  // When the slip first showed, so the ID token reads as expired or not as of then.
  const [shownAt] = useState(() => Date.now());
  if (line.status !== "ready") return null;

  const context = liff.getContext();
  const os = liff.getOS() ?? "an unknown OS";
  const opened = line.inClient
    ? ["The LINE app", liff.getLineVersion(), "on", os].filter(Boolean).join(" ")
    : `A browser on ${os}, through LINE Login`;
  const expiry = liff.getDecodedIDToken()?.exp;
  const idToken = expiry
    ? `${expiry * 1000 > shownAt ? "Expires" : "Expired"} ${new Date(expiry * 1000).toLocaleTimeString()}`
    : "None";
  const text = (lookup: Lookup) => (lookup.state === "done" ? lookup.text : "Checking…");

  return (
    <dl className="account-rows">
      <AccountRow label="LINE user ID" value={line.profile.userId} copyable />
      <AccountRow label="LINE name" value={line.profile.displayName} />
      {line.profile.statusMessage && (
        <AccountRow label="Status message" value={line.profile.statusMessage} />
      )}
      <AccountRow label="Opened in" value={opened} />
      <AccountRow
        label="Opened from"
        value={context ? OPENED_FROM[context.type] : "LINE didn’t say"}
      />
      <AccountRow label="Official account" value={text(officialAccount)} />
      <AccountRow label="Chat menu" value={CHAT_MENU[chatMenu.state](chatMenu)} />
      <AccountRow label="Permissions" value={text(granted)} />
      <AccountRow label="ID token" value={idToken} />
      <AccountRow label="LIFF app" value={`${LIFF_ID} · SDK ${liff.getVersion()}`} />
    </dl>
  );
}
