import { Vibrate } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { useTranslation } from "../i18n/react";
import { Key } from "../ui/Key";
import { QuietLink } from "../ui/QuietLink";
import { Sheet } from "../ui/Sheet";
import { askForMotion, declineMotion, useMotionPermission } from "../ui/motionPermission";
import "./motion-permission-card.css";

/**
 * Asks once, where the platform asks at all (iOS), whether the app may read the phone's motion.
 * iOS shows its prompt only from inside a tap, and the shared press fires a key's click just after
 * the release, so Allow asks on pointerup as well; asking twice doesn't prompt twice.
 */
export function MotionPermissionCard() {
  const { t } = useTranslation();
  const permission = useMotionPermission();
  const root = useRef<HTMLDivElement>(null);
  // The card appears with no other way in but a tap, so Allow takes focus as soon as it's shown.
  useEffect(() => {
    root.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [permission]);
  if (permission !== "unasked") return null;
  const allow = () => void askForMotion();
  return (
    <Sheet label={t(($) => $.app.motionPermission.label)} onClose={declineMotion}>
      <div className="motion-card" ref={root}>
        <p className="motion-card__text">{t(($) => $.app.motionPermission.question)}</p>
        <Key icon={<Vibrate />} onPointerUp={allow} onClick={allow} data-autofocus>
          {t(($) => $.app.motionPermission.allow)}
        </Key>
        <QuietLink onClick={declineMotion}>{t(($) => $.app.motionPermission.dontAllow)}</QuietLink>
      </div>
    </Sheet>
  );
}
