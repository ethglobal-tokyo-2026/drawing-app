import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useState } from "react";
import { createPortal } from "react-dom";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { useTranslation } from "../i18n/react";
import { QuietLink } from "../ui/QuietLink";
import { checkSponsorship, type SponsorshipResult } from "./sponsorship";
import { SPONSORSHIP_CHECK_TARGET_ID } from "./sponsorship-target";

const publicClient = createPublicClient({ chain: sepolia, transport: http() });

type CheckState =
  | { state: "ready" }
  | { state: "sending" }
  | { state: "passed"; result: SponsorshipResult }
  | { state: "failed"; reason: string };

/** Developer-only proof that Privy's paymaster sponsors a real smart-account transaction. */
export function SponsorshipCheck() {
  const { t } = useTranslation();
  const { client, getClientForChain } = useSmartWallets();
  const [check, setCheck] = useState<CheckState>({ state: "ready" });

  // PrivySession is lazy, so the board and this developer-only target are already mounted.
  const target = document.getElementById(SPONSORSHIP_CHECK_TARGET_ID);
  if (!target) return null;

  const run = async () => {
    setCheck({ state: "sending" });
    try {
      const sepoliaClient = await getClientForChain({ id: sepolia.id });
      if (!sepoliaClient?.account) {
        throw new Error("The Ethereum Sepolia smart account is not ready");
      }
      const result = await checkSponsorship(
        {
          address: sepoliaClient.account.address,
          chainId: sepolia.id,
          sendTransaction: (transaction) => sepoliaClient.sendTransaction(transaction),
        },
        publicClient,
      );
      setCheck({ state: "passed", result });
    } catch (error) {
      console.error("Privy gas sponsorship check failed", error);
      setCheck({
        state: "failed",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return createPortal(
    <div className="stat-board__privy">
      <QuietLink onClick={run} disabled={!client || check.state === "sending"}>
        {check.state === "sending"
          ? t(($) => $.identity.developer.sponsorshipCheck.checking)
          : t(($) => $.identity.developer.sponsorshipCheck.check)}
      </QuietLink>
      {!client && (
        <p className="stat-board__privy-status">
          {t(($) => $.identity.developer.sponsorshipCheck.waitingForSmartAccount)}
        </p>
      )}
      {check.state === "failed" && (
        <p className="stat-board__privy-status">
          {t(($) => $.identity.developer.sponsorshipCheck.failed, { reason: check.reason })}
        </p>
      )}
      {check.state === "passed" && (
        <p className="stat-board__privy-status">
          {t(($) => $.identity.developer.sponsorshipCheck.passed)}{" "}
          <a
            href={`https://sepolia.etherscan.io/tx/${check.result.hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t(($) => $.identity.developer.sponsorshipCheck.viewTransaction)}
          </a>
        </p>
      )}
    </div>,
    target,
  );
}
