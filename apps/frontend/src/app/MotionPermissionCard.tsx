import { Vibrate } from "@phosphor-icons/react";
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
  const permission = useMotionPermission();
  if (permission !== "unasked") return null;
  const allow = () => void askForMotion();
  return (
    <Sheet label="Motion" onClose={declineMotion}>
      <div className="motion-card">
        <p className="motion-card__text">
          Sticker Board uses motion for some animations and interactions in the app. Would you like
          to grant permissions for motion controls?
        </p>
        <Key icon={<Vibrate />} onPointerUp={allow} onClick={allow}>
          Allow
        </Key>
        <QuietLink onClick={declineMotion}>Not now</QuietLink>
      </div>
    </Sheet>
  );
}
