import { useRef, useState, type Ref } from "react";
import { logOut } from "../../api/logOut";
import { useMe } from "../../api/meContext";
import { useApiQuery } from "../../api/useApiQuery";
import { errorReason } from "../../i18n/errorMessage";
import { useTranslation } from "../../i18n/react";
import { SignOut } from "../../icons";
import { retryPrivySignIn, usePrivyStatus, type PrivyStatus } from "../../identity/privy";
import { PrivyAccount } from "../../identity/PrivyAccount";
import { useIdentity } from "../../identity/useIdentity";
import { LineDetails } from "../../line/LineDetails";
import { SendTestMessage } from "../../line/SendTestMessage";
import { LabelButton } from "../../ui/LabelButton";
import { QuietLink } from "../../ui/QuietLink";
import { AddressDialog } from "./AddressDialog";
import { AgeVerificationNote } from "./AgeVerificationNote";
import { AddressPapers } from "./AddressPapers";
import { useBoardAddress, useSuiAddress, type Chain } from "./addresses";
import { DeveloperSlip } from "./DeveloperSlip";
import { GratitudeDemoControls } from "./GratitudeDemoControls";
import { PerformanceRecorderControls } from "./PerformanceRecorderControls";
import { SettingsNote } from "./SettingsNote";
import { StatCork, type CorkFigures, type StatCorkHandle } from "./StatCork";
import { statFigures } from "./statFigures";

// The developer slip, LINE's and Privy's details for testing them from the board. The dev server shows
// it unless `.env` says "off"; a build shows it only when it's "on".
const DEV_SLIP = import.meta.env.VITE_DEV_SLIP
  ? import.meta.env.VITE_DEV_SLIP === "on"
  : import.meta.env.DEV;

export type StatBoardHandle = StatCorkHandle;

interface Props {
  onFlipBack: () => void;
  flipBackRef: Ref<HTMLButtonElement>;
  /** Opens the gratitude mini-game for the newest sticker, from the developer slip; null with none. */
  onTryGratitudeMiniGame: (() => void) | null;
  ref?: Ref<StatBoardHandle>;
}

/** Your stat board: the Sticker Board's back, with your User Stats pinned on the cork. */
export function StatBoard({ onFlipBack, flipBackRef, onTryGratitudeMiniGame, ref }: Props) {
  const { t } = useTranslation();
  const me = useIdentity();
  const account = useMe();
  // Loaded each time the board mounts, so a turn after drawing or giving shows the new counts.
  const stats = useApiQuery("user-stats/me", (api) => api.userStats());

  const figures: CorkFigures = {
    name: me.displayName,
    handle: account.handle ?? me.displayName,
    ensName: account.ensName,
    own: true,
    failure:
      stats.state === "failed"
        ? t(($) => $.stickerBoard.statBoard.didntLoadOwnBecause, {
            reason: errorReason(stats.error),
          })
        : null,
    ...statFigures(stats.state === "ready" ? stats.data : null),
    since: Date.parse(stats.state === "ready" ? stats.data.since : account.createdAt),
  };

  const board = useBoardAddress();
  const sui = useSuiAddress();
  const boardPaper = useRef<HTMLButtonElement>(null);
  const suiPaper = useRef<HTMLButtonElement>(null);
  const papers = { ethereum: boardPaper, sui: suiPaper };
  const [open, setOpen] = useState<Chain | null>(null);
  const opened = open && { ethereum: board, sui }[open];
  const held = open && opened?.state === "ready" ? { chain: open, address: opened.address } : null;
  // An address lost while its dialog is up, as when Privy signs you out, takes the dialog with it for
  // good, so it doesn't reopen by itself when the address comes back.
  if (open && !held) setOpen(null);

  return (
    <>
      <StatCork
        ref={ref}
        figures={figures}
        onFlipBack={onFlipBack}
        flipBackRef={flipBackRef}
        afterFlipBack={
          // Outside LINE's app it's the only way to switch LINE accounts, so it's never behind the dev flag.
          !me.inClient && (
            <LabelButton
              size="sm"
              icon={<SignOut />}
              className="stat-board__logout"
              onClick={() => void logOut()}
            >
              {t(($) => $.stickerBoard.statBoard.logOut)}
            </LabelButton>
          )
        }
      >
        {/* Settings first, since it's the paper people come back to. */}
        <SettingsNote />
        <AddressPapers
          board={board}
          sui={sui}
          lifted={held?.chain ?? null}
          paperRefs={papers}
          onOpen={setOpen}
        />
        <AgeVerificationNote />
        {DEV_SLIP && (
          <DeveloperSlip>
            <SendTestMessage senderName={me.displayName} />
            <LineDetails />
            <PrivyLine />
            <PrivyAccount />
            <GratitudeDemoControls onTry={onTryGratitudeMiniGame} />
            <PerformanceRecorderControls />
          </DeveloperSlip>
        )}
      </StatCork>
      {/* Beside the cork rather than in it, so its taps and Escape never reach the cork's own. */}
      {held && (
        <AddressDialog
          key={held.chain}
          chain={held.chain}
          address={held.address}
          from={papers[held.chain]}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

type Translate = ReturnType<typeof useTranslation>["t"];

function privyText(t: Translate, privy: PrivyStatus): string {
  switch (privy.state) {
    case "signed-in":
      return t(($) => $.stickerBoard.developer.privy.signedIn);
    case "signing-in":
      return t(($) => $.stickerBoard.developer.privy.signingIn);
    case "failed":
      return t(($) => $.stickerBoard.developer.privy.failed, { reason: privy.reason });
    case "off":
      return t(($) => $.stickerBoard.developer.privy.off);
  }
}

/** The Privy sign-in. After a failure it waits for Try again, since Privy's SDK would retry in a loop. */
function PrivyLine() {
  const { t } = useTranslation();
  const privy = usePrivyStatus();
  return (
    <div className="stat-board__privy">
      <p className="stat-board__privy-status">{privyText(t, privy)}</p>
      {privy.state === "failed" && (
        <QuietLink onClick={() => retryPrivySignIn()}>
          {t(($) => $.stickerBoard.developer.privy.tryAgain)}
        </QuietLink>
      )}
    </div>
  );
}
