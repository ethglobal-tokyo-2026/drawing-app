import "./address-papers.css";

// Ethereum's and Sui's marks from Simple Icons (CC0), pasted verbatim.
const MARK = {
  ethereum:
    "M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z",
  sui: "M17.636 10.009a7.16 7.16 0 0 1 1.565 4.474 7.2 7.2 0 0 1-1.608 4.53l-.087.106-.023-.135a7 7 0 0 0-.07-.349c-.502-2.21-2.142-4.106-4.84-5.642-1.823-1.034-2.866-2.278-3.14-3.693-.177-.915-.046-1.834.209-2.62.254-.787.631-1.446.953-1.843l1.05-1.284a.46.46 0 0 1 .713 0l5.28 6.456zm1.66-1.283L12.26.123a.336.336 0 0 0-.52 0L4.704 8.726l-.023.029a9.33 9.33 0 0 0-2.07 5.872C2.612 19.803 6.816 24 12 24s9.388-4.197 9.388-9.373a9.32 9.32 0 0 0-2.07-5.871zM6.389 9.981l.63-.77.018.142q.023.17.055.34c.408 2.136 1.862 3.917 4.294 5.297 2.114 1.203 3.345 2.586 3.7 4.103a5.3 5.3 0 0 1 .109 1.801l-.004.034-.03.014A7.2 7.2 0 0 1 12 21.67c-3.976 0-7.2-3.218-7.2-7.188 0-1.705.594-3.27 1.587-4.503z",
} as const;

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
