import { useImperativeHandle, useRef, type Ref } from "react";
import { DrawIcon } from "../icons";
import { useTranslation } from "../i18n/react";
import { NUDGE, NUDGE_MS } from "../sticker-creation/nudge";
import { EASE_OUT } from "../ui/easing";
import { Key } from "../ui/Key";
import { useReducedMotion } from "../ui/useReducedMotion";
import "./begin-key.css";

export interface BeginKeyHandle {
  /** A touch met the sheet before Begin: the key nudges, as the timer does for a paused sheet. */
  nudge: () => void;
}

interface Props {
  ref?: Ref<BeginKeyHandle>;
  /** The clock's length, which Begin starts. */
  minutes: number;
  onBegin: () => void;
}

/** Begin, the proctor's 始め: the screen's one key while the pair waits, at the sheet's foot. */
export function BeginKey({ ref, minutes, onBegin }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const holder = useRef<HTMLDivElement>(null);
  useImperativeHandle(
    ref,
    () => ({
      nudge() {
        if (!reduced) holder.current?.animate(NUDGE, { duration: NUDGE_MS, easing: EASE_OUT });
      },
    }),
    [reduced],
  );
  return (
    <div ref={holder} className="begin-key">
      <Key
        icon={<DrawIcon />}
        aria-label={t(($) => $.kyotoSeika.begin.label, { minutes })}
        onClick={onBegin}
      >
        {t(($) => $.kyotoSeika.begin.key)}
      </Key>
    </div>
  );
}
