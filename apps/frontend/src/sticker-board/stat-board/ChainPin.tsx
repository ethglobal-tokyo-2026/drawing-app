import { BRAND_MARKS } from "../../icons/brandMarks";
import "./address-papers.css";

// The top-left light's glint, laid along the mark's upper-left edge, inside the plastic.
const GLINT = { cx: 8.6, cy: 5.8, rx: 1.8, ry: 0.75, turn: -51 };

/** A push pin whose plastic head is Sui's mark, holding the Sui address paper to the cork. */
export function ChainPin({ className }: { className?: string }) {
  const g = GLINT;
  return (
    <svg
      className={["chain-pin", className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      width={22}
      height={22}
      aria-hidden
      focusable="false"
    >
      <path className="chain-pin__head" d={BRAND_MARKS.sui} />
      <ellipse
        className="chain-pin__glint"
        cx={g.cx}
        cy={g.cy}
        rx={g.rx}
        ry={g.ry}
        transform={`rotate(${g.turn} ${g.cx} ${g.cy})`}
      />
    </svg>
  );
}
