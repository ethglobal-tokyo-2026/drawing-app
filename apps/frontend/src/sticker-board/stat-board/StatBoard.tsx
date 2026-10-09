import { memo, useCallback, useEffect, useMemo, useRef, useState, type Ref } from "react";
import { logOut } from "../../api/logOut";
import { useMe } from "../../api/meContext";
import { useApiQuery } from "../../api/useApiQuery";
import { problemOf } from "../../i18n/errorMessage";
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
import { AddressPapers } from "./AddressPapers";
import { useSuiAddress } from "./addresses";
import { DeveloperSlip } from "./DeveloperSlip";
import { DeviceDetails } from "./DeviceDetails";
import { GratitudeEventsSheet } from "./GratitudeEvents";
import { CreasesControls } from "./CreasesControls";
import { GratitudeDemoControls } from "./GratitudeDemoControls";
import { PerformanceRecorderControls } from "./PerformanceRecorderControls";
import { SettingsNote } from "./SettingsNote";
import { StatCork, type CorkFigures, type StatCorkHandle } from "./StatCork";
import { SwitchPersonControls } from "./SwitchPersonControls";
import { statFigures } from "./statFigures";

// The developer slip, LINE's and Privy's details for testing them from the board. The dev server shows
// it unless `.env` says "off"; a build shows it only when it's "on".
const DEV_SLIP = import.meta.env.VITE_DEV_SLIP
  ? import.meta.env.VITE_DEV_SLIP === "on"
  : import.meta.env.DEV;

export type StatBoardHandle = StatCorkHandle;

interface Props {
  /** The board is turned over, showing this side. */
  turned: boolean;
  onFlipBack: () => void;
  flipBackRef: Ref<HTMLButtonElement>;
  /** Opens the gratitude mini-game for the newest sticker, from the developer slip; null with none. */
  onTryGratitudeMiniGame: (() => void) | null;
  ref?: Ref<StatBoardHandle>;
}

/**
 * Your stat board: the Sticker Board's back, with your User Stats pinned on the cork. Memoized: it stays
 * mounted behind the board, which re-renders on every selection, hold and drop.
 */
export const StatBoard = memo(function StatBoard({
  turned,
  onFlipBack,
  flipBackRef,
  onTryGratitudeMiniGame,
  ref,
}: Props) {
  const { t } = useTranslation();
  const me = useIdentity();
  const account = useMe();
  const stats = useApiQuery("user-stats/me", (api) => api.userStats());
  // The board stays mounted between turns, so each turn reloads the counts: gratitude, a gift received
  // or a seal may have come in since. The last counts show until the new ones land.
  const shown = useRef(turned);
  useEffect(() => {
    if (turned && !shown.current && stats.state === "ready") stats.refresh();
    shown.current = turned;
  }, [turned, stats]);

  // The cork's props, and the papers pinned to it, stay the same objects while nothing they show
  // changes, so a turn of the board alone redraws none of them.
  const loading = stats.state === "loading";
  const data = stats.state === "ready" ? stats.data : null;
  const error = stats.state === "failed" ? stats.error : null;
  const retry = stats.state === "failed" ? stats.retry : null;
  const figures = useMemo<CorkFigures>(
    () => ({
      name: me.displayName,
      handle: account.handle ?? me.displayName,
      own: true,
      loading,
      failure: error && retry ? { ...problemOf(error), retry } : null,
      ...statFigures(data),
      since: Date.parse(data ? data.since : account.createdAt),
    }),
    [me.displayName, account.handle, account.createdAt, loading, data, error, retry],
  );

  const [showingGratitude, setShowingGratitude] = useState(false);
  const showGratitude = useCallback(() => setShowingGratitude(true), []);
  const sui = useSuiAddress();
  const suiPaper = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const openAddress = useCallback(() => setOpen(true), []);
  const held = open && sui.state === "ready" ? sui.address : null;
  // The address lost while its dialog is up, as when Privy signs you out, takes the dialog with it for
  // good, so it doesn't reopen by itself when the address comes back.
  if (open && !held) setOpen(false);
  const lifted = held !== null;

  const logOutButton = useMemo(
    () =>
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
      ),
    [me.inClient, t],
  );
  const papers = useMemo(
    () => (
      <>
        {/* Settings first, since it's the paper people come back to. */}
        <SettingsNote />
        <AddressPapers sui={sui} lifted={lifted} paperRef={suiPaper} onOpen={openAddress} />
        {DEV_SLIP && (
          <DeveloperSlip>
            <SwitchPersonControls />
            <SendTestMessage senderName={me.displayName} />
            <LineDetails />
            <DeviceDetails />
            <PrivyLine />
            <PrivyAccount />
            <GratitudeDemoControls onTry={onTryGratitudeMiniGame} />
            <PerformanceRecorderControls />
            <CreasesControls />
          </DeveloperSlip>
        )}
      </>
    ),
    [sui, lifted, openAddress, me.displayName, onTryGratitudeMiniGame],
  );

  return (
    <>
      <StatCork
        ref={ref}
        figures={figures}
        onFlipBack={onFlipBack}
        flipBackRef={flipBackRef}
        onShowGratitude={showGratitude}
        afterFlipBack={logOutButton}
      >
        {papers}
      </StatCork>
      {/* Beside the cork rather than in it, so its taps and Escape never reach the cork's own. */}
      {held && <AddressDialog address={held} from={suiPaper} onClose={() => setOpen(false)} />}
      {showingGratitude && <GratitudeEventsSheet onClose={() => setShowingGratitude(false)} />}
    </>
  );
});

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
