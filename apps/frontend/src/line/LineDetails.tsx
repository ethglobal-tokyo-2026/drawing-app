import liff from "@line/liff";
import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "../i18n/react";
import { AccountRow } from "../identity/AccountRow";
import { useChatMenuStatus, type ChatMenuStatus } from "./chatMenu";
import { describeLiffError, LIFF_ID, useLine } from "./liff";

// "Checking…" until LINE answers; then its answer, or why it couldn't give one.
type Lookup<T> =
  | { state: "checking" }
  | { state: "answered"; answer: T }
  | { state: "failed"; reason: string };

/** Asks LINE once, after it has started. */
function useLineLookup<T>(ask: () => Promise<T>): Lookup<T> {
  const [lookup, setLookup] = useState<Lookup<T>>({ state: "checking" });
  useEffect(() => {
    let live = true;
    ask().then(
      (answer) => live && setLookup({ state: "answered", answer }),
      (error: unknown) => live && setLookup({ state: "failed", reason: describeLiffError(error) }),
    );
    return () => {
      live = false;
    };
  }, [ask]);
  return lookup;
}

function chatMenuText(menu: ChatMenuStatus, t: TFunction): string {
  switch (menu.state) {
    case "waiting":
      return t(($) => $.line.developer.chatMenu.waiting);
    case "switching":
      return t(($) => $.line.developer.checking);
    case "returning":
      return t(($) => $.line.developer.chatMenu.returning);
    case "new":
      return menu.reason === "not_a_friend"
        ? t(($) => $.line.developer.chatMenu.notAFriend)
        : t(($) => $.line.developer.chatMenu.notSignedUp);
    case "failed":
      return t(($) => $.line.developer.chatMenu.failed, { reason: menu.reason });
  }
}

const isFriend = async () => (await liff.getFriendship()).friendFlag;
const grantedPermissions = () => liff.permission.getGrantedAll();

/** What LINE says about the person and where the app is open, for checking LINE from the board. */
export function LineDetails() {
  const { t } = useTranslation();
  const line = useLine();
  const friend = useLineLookup(isFriend);
  const granted = useLineLookup(grantedPermissions);
  const chatMenu = useChatMenuStatus();
  // When the slip first showed, so the ID token reads as expired or not as of then.
  const [shownAt] = useState(() => Date.now());
  if (line.status !== "ready") return null;

  const context = liff.getContext();
  const os = liff.getOS() ?? t(($) => $.line.developer.openedIn.unknownOs);
  const version = liff.getLineVersion();
  const opened = !line.inClient
    ? t(($) => $.line.developer.openedIn.browser, { os })
    : version
      ? t(($) => $.line.developer.openedIn.lineApp, { version, os })
      : t(($) => $.line.developer.openedIn.lineAppUnknownVersion, { os });
  const exp = liff.getDecodedIDToken()?.exp;
  const expiry = exp ? new Date(exp * 1000) : null;
  const idToken = !expiry
    ? t(($) => $.line.developer.none)
    : expiry.getTime() > shownAt
      ? t(($) => $.line.developer.idToken.expires, { time: expiry.toLocaleTimeString() })
      : t(($) => $.line.developer.idToken.expired, { time: expiry.toLocaleTimeString() });
  const text = <T,>(lookup: Lookup<T>, answerText: (answer: T) => string) =>
    lookup.state === "answered"
      ? answerText(lookup.answer)
      : lookup.state === "failed"
        ? t(($) => $.line.developer.couldntCheck, { reason: lookup.reason })
        : t(($) => $.line.developer.checking);

  return (
    <dl className="account-rows">
      <AccountRow label={t(($) => $.line.developer.userId)} value={line.profile.userId} copyable />
      <AccountRow label={t(($) => $.line.developer.name)} value={line.profile.displayName} />
      {line.profile.statusMessage && (
        <AccountRow
          label={t(($) => $.line.developer.statusMessage)}
          value={line.profile.statusMessage}
        />
      )}
      <AccountRow label={t(($) => $.line.developer.openedIn.label)} value={opened} />
      <AccountRow
        label={t(($) => $.line.developer.openedFrom.label)}
        value={
          context
            ? t(($) => $.line.developer.openedFrom.contextType[context.type])
            : t(($) => $.line.developer.openedFrom.unknown)
        }
      />
      <AccountRow
        label={t(($) => $.line.developer.officialAccount.label)}
        value={text(friend, (added) =>
          added
            ? t(($) => $.line.developer.officialAccount.friend)
            : t(($) => $.line.developer.officialAccount.notFriend),
        )}
      />
      <AccountRow
        label={t(($) => $.line.developer.chatMenu.label)}
        value={chatMenuText(chatMenu, t)}
      />
      <AccountRow
        label={t(($) => $.line.developer.permissions)}
        value={text(granted, (names) => names.join(", ") || t(($) => $.line.developer.none))}
      />
      <AccountRow label={t(($) => $.line.developer.idToken.label)} value={idToken} />
      <AccountRow
        label={t(($) => $.line.developer.liffApp.label)}
        value={t(($) => $.line.developer.liffApp.value, {
          id: LIFF_ID,
          version: liff.getVersion(),
        })}
      />
    </dl>
  );
}
