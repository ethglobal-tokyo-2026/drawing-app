import { SignOut } from "@phosphor-icons/react";
import type { Ref } from "react";
import { retryPrivySignIn, usePrivyStatus, type PrivyStatus } from "../../identity/privy";
import { PrivyAccount } from "../../identity/PrivyAccount";
import { useIdentity } from "../../identity/useIdentity";
import { LineDetails } from "../../line/LineDetails";
import { lineLogout } from "../../line/liff";
import { SendTestMessage } from "../../line/SendTestMessage";
import { LabelButton } from "../../ui/LabelButton";
import { PhotoSticker } from "../../ui/PhotoSticker";
import { QuietLink } from "../../ui/QuietLink";
import { useMe } from "../../api/meContext";
import { useApiQuery } from "../../api/useApiQuery";
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
  ref?: Ref<StatBoardHandle>;
}

/** Your stat board: the Sticker Board's back, with your User Stats pinned on the cork. */
export function StatBoard({ onFlipBack, flipBackRef, ref }: Props) {
  const me = useIdentity();
  const account = useMe();
  // Loaded each time the board mounts, so a turn after drawing or giving shows the new counts.
  const stats = useApiQuery("user-stats/me", (api) => api.userStats());

  const figures: CorkFigures = {
    name: me.displayName,
    handle: account.handle ?? me.displayName,
    picture: <PhotoSticker src={me.pictureUrl} name={me.displayName} size={42} />,
    own: true,
    ...statFigures(stats.state === "ready" ? stats.data : null, true, new Date()),
    since: Date.parse(stats.state === "ready" ? stats.data.since : account.createdAt),
  };
  if (stats.state === "failed")
    figures.streakRule = `Your stats didn’t load: ${stats.error.message}`;

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
