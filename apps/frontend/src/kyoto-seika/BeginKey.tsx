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
  /** Two subjects are picked. Until then Begin stays sunk and says so: a sheet begun without its pair could never seal. */
  ready: boolean;
  onBegin: () => void;
}

/**
 * Begin, the proctor's 始め: the screen's one key while the pair waits, at the sheet's foot, under one
 * quiet line saying what the test asks of the pair.
 */
export function BeginKey({ ref, minutes, ready, onBegin }: Props) {
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
    <div className="begin-key">
      <div ref={holder}>
        <Key
          icon={<DrawIcon />}
          aria-label={
            ready
              ? t(($) => $.kyotoSeika.begin.label, { minutes })
              : t(($) => $.kyotoSeika.begin.pick)
          }
          disabled={!ready}
          onClick={() => {
            if (ready) onBegin();
          }}
        >
          {ready ? t(($) => $.kyotoSeika.begin.key) : t(($) => $.kyotoSeika.begin.pick)}
        </Key>
      </div>
    </div>
  );
}
