import { BRAND_MARKS as MARK } from "../../icons/brandMarks";
import "./address-papers.css";

// The top-left light's glint, laid along each mark's upper-left edge, inside the plastic.
const GLINT = {
  ethereum: { cx: 10.2, cy: 5.8, rx: 2.1, ry: 0.85, turn: -59 },
  sui: { cx: 8.6, cy: 5.8, rx: 1.8, ry: 0.75, turn: -51 },
} as const;

type Chain = keyof typeof MARK;

interface Props {
  chain: Chain;
  className?: string;
}

/** A push pin whose plastic head is the chain's mark, holding that chain's address paper to the cork. */
export function ChainPin({ chain, className }: Props) {
  const g = GLINT[chain];
  return (
    <svg
      className={["chain-pin", className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      width={22}
      height={22}
      aria-hidden
      focusable="false"
    >
      <path className="chain-pin__head" d={MARK[chain]} />
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
