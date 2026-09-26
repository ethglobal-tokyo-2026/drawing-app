import { formatCount } from "../i18n/format";
import { useTranslation } from "../i18n/react";
import "./hit-counter.css";

interface Props {
  /** A combo's length, in hits. */
  hits: number;
  /** The numerals' size in px; HITS and the speed lines scale with it. */
  size?: number;
  className?: string;
}

/**
 * A combo's length the way fighting games show it: leaning numerals, HITS in small caps, and pink speed
 * lines off the number's left as if it had just slammed in. Never a ×, which is the multiplier's.
 */
export function HitCounter({ hits, size = 20, className }: Props) {
  const { t } = useTranslation();
  const count = formatCount(hits);
  return (
    <span
      className={["hit-counter", className].filter(Boolean).join(" ")}
      style={{ fontSize: size }}
    >
      <span className="visually-hidden">
        {t(($) => $.ui.hitCounter.spoken, { count: hits, hits: count })}
      </span>
      <span className="hit-counter__face" aria-hidden>
        <span className="hit-counter__lines">
          <i />
          <i />
          <i />
        </span>
        <span className="hit-counter__n">{count}</span>
        <span className="hit-counter__unit">{t(($) => $.ui.hitCounter.unit, { count: hits })}</span>
      </span>
    </span>
  );
}
