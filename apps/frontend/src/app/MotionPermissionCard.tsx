import { Vibrate } from "../icons";
import { useTranslation } from "../i18n/react";
import { Key } from "../ui/Key";
import { QuietLink } from "../ui/QuietLink";
import { Sheet } from "../ui/Sheet";
import { askForMotion, declineMotion, useMotionPermission } from "../ui/motionPermission";
import { pressCommitted } from "../ui/press";
import "./motion-permission-card.css";

/**
 * Asks once, where the platform asks at all (iOS), whether the app may read the device's motion.
 * iOS shows its prompt only from inside a tap, and the shared press fires a key's click just after
 * the release, so Allow asks on a pointerup that commits the press as well; asking twice doesn't
 * prompt twice. On a large screen it's the shared card, so its keys keep a phone's width.
 */
export function MotionPermissionCard() {
  const { t } = useTranslation();
  const permission = useMotionPermission();
  if (permission !== "unasked") return null;
  const allow = () => void askForMotion();
  return (
    <Sheet label={t(($) => $.app.motionPermission.label)} onClose={declineMotion} card>
      <div className="motion-card">
        <p className="motion-card__text">{t(($) => $.app.motionPermission.question)}</p>
        <Key
          icon={<Vibrate />}
          onPointerUp={(e) => {
            if (pressCommitted(e.currentTarget)) allow();
          }}
          onClick={allow}
          // The card appears with no other way in but a tap, so Allow takes focus as it's shown.
          data-autofocus
        >
          {t(($) => $.app.motionPermission.allow)}
        </Key>
        <QuietLink onClick={declineMotion}>{t(($) => $.app.motionPermission.dontAllow)}</QuietLink>
      </div>
    </Sheet>
  );
}
