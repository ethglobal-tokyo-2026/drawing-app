import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/react";
import "./censor-bar.css";

/** How long the label under a tapped bar stays before it peels off. */
const WHY_MS = 2400;

/**
 * A word blacked out with an ink bar, like a manga's censor bar (伏せ字). A tap lifts the bar's corner and
 * peels on a label saying why, without passing the tap to the switch whose name it's in. Decorative to
 * screen readers: the switch carries a spoken name of its own.
 */
export function CensorBar({ hidden }: { hidden: string }) {
  const { t } = useTranslation();
  const [why, setWhy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <span
      className={`censor-bar${why ? " is-lifted" : ""}`}
      aria-hidden="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setWhy(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setWhy(false), WHY_MS);
      }}
    >
      <span className="censor-bar__word">{hidden}</span>
      {why && <span className="censor-bar__why">{t(($) => $.kyotoSeika.censor.why)}</span>}
    </span>
  );
}
