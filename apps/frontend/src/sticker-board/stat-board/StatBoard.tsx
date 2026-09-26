import { SignOut } from "@phosphor-icons/react";
import { useState, type Ref } from "react";
import type { StickerGiftStatus } from "../../giving/giftStore";
import { retryPrivySignIn, usePrivyStatus, type PrivyStatus } from "../../identity/privy";
import { PrivyAccount } from "../../identity/PrivyAccount";
import { firstSeen } from "../../identity/profile";
import { useIdentity } from "../../identity/useIdentity";
import { LineDetails } from "../../line/LineDetails";
import { lineLogout } from "../../line/liff";
import { SendTestMessage } from "../../line/SendTestMessage";
import type { StickerRecord } from "../../stickers/stickerStorage";
import { formatRefillTime } from "../../tickets/refill";
import { nextRefill, ticketDay } from "../../tickets/tickets";
import { LabelButton } from "../../ui/LabelButton";
import { PhotoSticker } from "../../ui/PhotoSticker";
import { QuietLink } from "../../ui/QuietLink";
import { GratitudeDemoControls } from "./GratitudeDemoControls";
import { StatCork, type CorkFigures, type StatCorkHandle } from "./StatCork";
import { joinedAt, streakOf } from "./userStats";

// The developer slip, LINE's and Privy's details for testing them from the board. The dev server shows
// it unless `.env` says "off"; a build shows it only when it's "on".
const DEV_SLIP = import.meta.env.VITE_DEV_SLIP
  ? import.meta.env.VITE_DEV_SLIP === "on"
  : import.meta.env.DEV;

export type StatBoardHandle = StatCorkHandle;

interface Props {
  /** Null when they didn't load, so nothing drawn from them can be known. */
  stickers: readonly Pick<StickerRecord, "id" | "createdAt">[] | null;
  gifts: ReadonlyMap<string, StickerGiftStatus>;
  onFlipBack: () => void;
  flipBackRef: Ref<HTMLButtonElement>;
  /** Opens the gratitude mini-game for the newest sticker, from the developer slip; null with none. */
  onTryGratitudeMiniGame: (() => void) | null;
  ref?: Ref<StatBoardHandle>;
}

/**
 * Your stat board: the Sticker Board's back, with your User Stats pinned on the cork. Gratitude
 * and received stickers show their empty values until receiving and gratitude exist.
 */
export function StatBoard({
  stickers,
  gifts,
  onFlipBack,
  flipBackRef,
  onTryGratitudeMiniGame,
  ref,
}: Props) {
  const me = useIdentity();
  const [firstVisit] = useState(firstSeen);

  const now = new Date();
  const streak =
    stickers &&
    streakOf(
      stickers.map((s) => ticketDay(new Date(s.createdAt))),
      ticketDay(now),
    );
  const given = stickers && stickers.filter((s) => gifts.get(s.id)?.state === "sent").length;

  const figures: CorkFigures = {
    name: me.displayName,
    handle: me.handle,
    picture: <PhotoSticker src={me.pictureUrl} name={me.displayName} size={42} />,
    own: true,
    streak,
    streakRule: !streak
      ? "Your stickers didn’t load."
      : streak.current > 0
        ? `Miss a day and it drops by one, not back to zero. Days turn over at ${formatRefillTime(nextRefill(now))}.`
        : "Draw a sticker today to start one. Miss a day later and it drops by one.",
    stamps: { made: stickers && stickers.length, received: 0, given },
    bestCombo: null,
    mostThanksInADay: null,
    since: joinedAt(firstVisit, stickers ?? []),
  };

  return (
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
            onClick={lineLogout}
          >
            Log out of LINE
          </LabelButton>
        )
      }
    >
      {DEV_SLIP && (
        <section className="stat-board__note stat-board__slip" aria-label="LINE and Privy">
          <div className="stat-board__paper">
            <h3 className="fine stat-board__slip-h">LINE and Privy</h3>
            <SendTestMessage senderName={me.displayName} />
            <LineDetails />
            <PrivyLine />
            <PrivyAccount />
            <GratitudeDemoControls onTry={onTryGratitudeMiniGame} />
          </div>
          <i className="stat-board__washi" aria-hidden />
        </section>
      )}
    </StatCork>
  );
}

function privyText(privy: PrivyStatus): string {
  switch (privy.state) {
    case "signed-in":
      return "Signed in to Privy";
    case "signing-in":
      return "Signing in to Privy…";
    case "failed":
      return `Privy sign-in failed: ${privy.reason}`;
    case "off":
      return `Privy is off: ${privy.reason}`;
  }
}

/** The Privy sign-in. After a failure it waits for Try again, since Privy's SDK would retry in a loop. */
function PrivyLine() {
  const privy = usePrivyStatus();
  return (
    <div className="stat-board__privy">
      <p className="stat-board__privy-status">{privyText(privy)}</p>
      {privy.state === "failed" && <QuietLink onClick={retryPrivySignIn}>Try again</QuietLink>}
    </div>
  );
}
