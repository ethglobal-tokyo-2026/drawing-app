import { useTranslation } from "../i18n/react";
import { openLinkInLine } from "../line/openLink";
import { AccountRow } from "./AccountRow";
import { suiscanAccountUrl } from "./explorers";
import { usePrivyStatus } from "./privy";
import { useSuiWalletFailure } from "./suiWallet";

/** The person's Privy account in full, each value with Copy: its ID and the Sui address Privy holds. */
export function PrivyAccount() {
  const { t } = useTranslation();
  const privy = usePrivyStatus();
  const suiFailure = useSuiWalletFailure();
  if (privy.state !== "signed-in") return null;
  const label = t(($) => $.identity.developer.suiAddress.label);
  return (
    <dl className="account-rows">
      <AccountRow label={t(($) => $.identity.developer.privyId)} value={privy.userId} copyable />
      {privy.suiWallet ? (
        <AccountRow label={label} value={privy.suiWallet} copyable>
          <a
            href={suiscanAccountUrl(privy.suiWallet)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openLinkInLine}
            aria-label={t(($) => $.identity.developer.onExplorer, {
              label,
              address: privy.suiWallet,
              explorer: t(($) => $.identity.developer.explorer.suiscan),
            })}
          >
            {privy.suiWallet}
          </a>
        </AccountRow>
      ) : (
        suiFailure && (
          <AccountRow
            label={label}
            value={t(($) => $.identity.developer.suiAddress.failed, { reason: suiFailure })}
          />
        )
      )}
    </dl>
  );
}
