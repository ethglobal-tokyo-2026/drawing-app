import type { ReactNode } from "react";
import "./artists.css";

/** Placeholder sticker and avatar art for the demo artists until their stickers come from the server. */
export type ArtKey =
  | "sleepy-cat"
  | "sunset"
  | "lightning"
  | "onigiri"
  | "jellyfish"
  | "fox"
  | "ghost"
  | "planet"
  | "bird"
  | "rain-cloud"
  | "umbrella"
  | "fish"
  | "dango"
  | "cherry"
  | "moon"
  | "bunny"
  | "mushroom"
  | "sailboat"
  | "daruma"
  | "girl"
  | "boy";

const INK = "#1c1824";
const line = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const Face = ({ x, y, gap = 12 }: { x: number; y: number; gap?: number }) => (
  <g {...line} fill="none" strokeWidth={2.6}>
    <path d={`M${x - gap - 4} ${y} q4 3 8 0`} />
    <path d={`M${x + gap - 4} ${y} q4 3 8 0`} />
    <path d={`M${x - 3} ${y + 7} q3 3 6 0`} />
    <ellipse cx={x - gap - 6} cy={y + 7} rx={4} ry={2.4} fill="#ff9bb8" stroke="none" />
    <ellipse cx={x + gap + 6} cy={y + 7} rx={4} ry={2.4} fill="#ff9bb8" stroke="none" />
  </g>
);

const ART: Record<ArtKey, ReactNode> = {
  "sleepy-cat": (
    <>
      <path
        d="M22 80c-6-12-4-30 4-40l-2-18 16 10c6-2 14-2 20 0l16-10-2 18c8 10 10 28 4 40z"
        fill="#f79a3e"
        {...line}
      />
      <path d="M28 34l-1-8 7 5M72 34l1-8-7 5" fill="#ffc9a0" stroke="none" />
      <path d="M40 38l3 8M50 36v8M60 38l-3 8" {...line} stroke="#c9661c" />
      <ellipse cx={50} cy={70} rx={16} ry={9} fill="#fff4e6" stroke="none" />
      <Face x={50} y={58} gap={13} />
      <path d="M76 70c10-2 14 8 6 12" fill="none" {...line} />
      <text x={70} y={22} fontSize={16} fontWeight={900} fill={INK}>
        z
      </text>
      <text x={80} y={12} fontSize={12} fontWeight={900} fill={INK}>
        z
      </text>
    </>
  ),
  sunset: (
    <>
      <path d="M22 58a28 28 0 0 1 56 0z" fill="#ffb13b" {...line} />
      <path d="M30 46a22 22 0 0 1 40 0" fill="#ffd93b" stroke="none" />
      <path
        d="M58 34c2-8 14-8 16-1 7-1 10 7 4 10H56c-5-1-4-8 2-9z"
        fill="#fff"
        {...line}
        strokeWidth={2.5}
      />
      <path
        d="M26 30c1-5 9-5 10 0 4 0 5 5 1 6H25c-3-1-3-5 1-6z"
        fill="#fff"
        {...line}
        strokeWidth={2.5}
      />
      <path d="M12 58h76c2 10-4 22-20 24H30c-16-2-20-14-18-24z" fill="#2f4a9e" {...line} />
      <path
        d="M24 66q5-3 10 0t10 0M52 66q5-3 10 0t10 0M36 74q5-3 10 0t10 0"
        fill="none"
        stroke="#7fb0ff"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </>
  ),
  lightning: (
    <>
      <path d="M56 8L24 54h20l-8 38 36-50H50l10-34z" fill="#ffd93b" {...line} />
      <path
        d="M52 16L34 48h14"
        fill="none"
        stroke="#fff6b0"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path d="M16 30l6 4M80 24l-6 5M84 62l-7-1M14 72l7-3" {...line} />
      <circle cx={78} cy={42} r={2.5} fill={INK} />
      <circle cx={22} cy={50} r={2.5} fill={INK} />
    </>
  ),
  onigiri: (
    <>
      <path
        d="M50 12c8 0 38 52 36 64-1 8-8 10-36 10S15 84 14 76c-2-12 28-64 36-64z"
        fill="#fff"
        {...line}
      />
      <path d="M34 62h32v24H34z" fill="#26303a" {...line} />
      <circle cx={42} cy={50} r={2.8} fill={INK} />
      <circle cx={58} cy={50} r={2.8} fill={INK} />
      <path d="M47 55q3 3 6 0" fill="none" {...line} strokeWidth={2.4} />
      <ellipse cx={36} cy={56} rx={4} ry={2.2} fill="#ff9bb8" />
      <ellipse cx={64} cy={56} rx={4} ry={2.2} fill="#ff9bb8" />
    </>
  ),
  jellyfish: (
    <>
      <path
        d="M36 58c-2 10 4 14 0 26M46 60c-2 10 4 14 0 24M56 60c-2 10 4 14 0 24M66 58c-2 10 4 14 0 26"
        fill="none"
        stroke="#9b7bff"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path
        d="M36 58c-2 10 4 14 0 26M46 60c-2 10 4 14 0 24M56 60c-2 10 4 14 0 24M66 58c-2 10 4 14 0 26"
        fill="none"
        {...line}
        strokeWidth={1.5}
      />
      <path d="M20 58c0-22 14-36 31-36s31 14 31 36c-10 4-52 4-62 0z" fill="#c9b6ff" {...line} />
      <path
        d="M32 36c4-6 10-8 16-8"
        fill="none"
        stroke="#fff"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <circle cx={42} cy={46} r={2.8} fill={INK} />
      <circle cx={60} cy={46} r={2.8} fill={INK} />
      <path d="M48 51q3 3 6 0" fill="none" {...line} strokeWidth={2.4} />
    </>
  ),
  fox: (
    <>
      <path
        d="M50 88c-20 0-32-14-32-32 0-8 2-14 4-18l-2-22 18 12c8-3 16-3 24 0l18-12-2 22c2 4 4 10 4 18 0 18-12 32-32 32z"
        fill="#f79a3e"
        {...line}
      />
      <path d="M26 26l2 12 8-5zM74 26l-2 12-8-5z" fill="#fff4e6" stroke="none" />
      <path
        d="M22 60c6 14 16 22 28 22s22-8 28-22c-8 6-18 2-28 8-10-6-20-2-28-8z"
        fill="#fff4e6"
        stroke="none"
      />
      <circle cx={38} cy={54} r={3} fill={INK} />
      <circle cx={62} cy={54} r={3} fill={INK} />
      <ellipse cx={50} cy={64} rx={4} ry={3} fill={INK} />
      <path d="M50 67v3M45 71q5 3 10 0" fill="none" {...line} strokeWidth={2.4} />
    </>
  ),
  ghost: (
    <>
      <path
        d="M22 84V44c0-18 12-30 28-30s28 12 28 30v40l-7-6-7 6-7-6-7 6-7-6-7 6-7-6z"
        fill="#fff"
        {...line}
      />
      <circle cx={40} cy={44} r={3.2} fill={INK} />
      <circle cx={58} cy={44} r={3.2} fill={INK} />
      <ellipse cx={49} cy={56} rx={4} ry={5} fill="#ff9bb8" {...line} strokeWidth={2.4} />
      <path d="M14 42l6 2M84 26l-4 5M86 44l-6 1" {...line} />
      <path d="M80 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd93b" {...line} strokeWidth={2} />
    </>
  ),
  planet: (
    <>
      <circle cx={50} cy={50} r={26} fill="#9b7bff" {...line} />
      <path
        d="M32 40c6-10 18-14 28-10"
        fill="none"
        stroke="#c9b6ff"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path
        d="M36 58c8 4 20 4 30-2"
        fill="none"
        stroke="#6d4fd6"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path
        d="M26 48C6 58 6 70 24 66c14-3 40-16 54-28 8-8 4-14-6-12"
        fill="none"
        stroke="#ffd93b"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <path
        d="M26 48C6 58 6 70 24 66c14-3 40-16 54-28 8-8 4-14-6-12"
        fill="none"
        {...line}
        strokeWidth={1.8}
      />
    </>
  ),
  bird: (
    <>
      <path
        d="M50 16c20 0 34 16 34 36S70 86 50 86 16 72 16 52s14-36 34-36z"
        fill="#7cc8ff"
        {...line}
      />
      <path
        d="M28 64c6 12 18 16 30 14 12-2 20-10 22-20-8 8-22 12-52 6z"
        fill="#e8f6ff"
        stroke="none"
      />
      <path d="M50 16c-2-6 2-10 8-10-2 4 0 6 2 8" fill="#7cc8ff" {...line} strokeWidth={2.5} />
      <circle cx={40} cy={44} r={3.2} fill={INK} />
      <path d="M52 46l10 4-10 4z" fill="#ffb13b" {...line} strokeWidth={2.4} />
      <path d="M68 56c8-2 14 4 12 10" fill="none" {...line} />
      <ellipse cx={34} cy={54} rx={4} ry={2.4} fill="#ff9bb8" />
    </>
  ),
  "rain-cloud": (
    <>
      <path
        d="M26 58c-10 0-14-14-4-18 0-12 14-18 22-10 6-10 22-10 26 2 12-2 18 12 10 20-2 4-6 6-10 6z"
        fill="#e6e0ff"
        {...line}
      />
      <circle cx={42} cy={44} r={2.6} fill={INK} />
      <circle cx={58} cy={44} r={2.6} fill={INK} />
      <path d="M47 49q3 3 6 0" fill="none" {...line} strokeWidth={2.4} />
      <path
        d="M30 70c-3 5 0 9 3 9s5-4 2-9l-2-5zM48 74c-3 5 0 9 3 9s5-4 2-9l-2-5zM66 70c-3 5 0 9 3 9s5-4 2-9l-2-5z"
        fill="#5ab8ff"
        {...line}
        strokeWidth={2.2}
      />
    </>
  ),
  umbrella: (
    <>
      <path
        d="M14 50C16 28 32 16 50 16s34 12 36 34c-6-4-12-4-18 0-6-4-12-4-18 0-6-4-12-4-18 0-6-4-12-4-18 0z"
        fill="#ff7eb6"
        {...line}
      />
      <path
        d="M50 16c-8 10-10 22-10 34M50 16c8 10 10 22 10 34"
        fill="none"
        {...line}
        strokeWidth={2.2}
      />
      <path d="M50 50v28c0 8-12 8-12 0" fill="none" {...line} />
      <path
        d="M78 64c-3 5 0 9 3 9s5-4 2-9l-2-5zM22 66c-3 5 0 9 3 9s5-4 2-9l-2-5z"
        fill="#5ab8ff"
        {...line}
        strokeWidth={2.2}
      />
    </>
  ),
  fish: (
    <>
      <path
        d="M12 50c10-18 36-24 56-10l18-12-4 22 4 22-18-12C48 74 22 68 12 50z"
        fill="#fff"
        {...line}
      />
      <path
        d="M40 34c6 4 8 10 6 16M56 40c-4 6-4 14 2 20"
        fill="none"
        stroke="#ff7a3c"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <path d="M68 40l18-12-4 22 4 22-18-12z" fill="#ff7a3c" {...line} />
      <circle cx={26} cy={46} r={3.2} fill={INK} />
      <path d="M16 56q4 2 8 0" fill="none" {...line} strokeWidth={2.2} />
    </>
  ),
  dango: (
    <>
      <path d="M28 92L72 8" {...line} stroke="#b07a3a" strokeWidth={5} />
      <circle cx={40} cy={70} r={14} fill="#d4f0a0" {...line} />
      <circle cx={50} cy={50} r={14} fill="#fff" {...line} />
      <circle cx={60} cy={30} r={14} fill="#ffb6cf" {...line} />
      <path d="M56 28h1M64 28h1M46 48h1M54 48h1M36 68h1M44 68h1" {...line} strokeWidth={4} />
      <path d="M58 34q2 2 4 0M48 54q2 2 4 0M38 74q2 2 4 0" fill="none" {...line} strokeWidth={2} />
    </>
  ),
  cherry: (
    <>
      <path
        d="M36 62C40 40 50 24 64 14M66 58c-2-18-2-32-2-44"
        fill="none"
        {...line}
        stroke="#3d7a2c"
        strokeWidth={3.5}
      />
      <path d="M64 14c10-6 20-2 22 6-10 4-18 2-22-6z" fill="#7ccf5a" {...line} strokeWidth={2.5} />
      <circle cx={34} cy={70} r={16} fill="#ff4d5e" {...line} />
      <circle cx={66} cy={66} r={16} fill="#ff4d5e" {...line} />
      <path
        d="M26 64c2-4 6-6 10-6M58 60c2-4 6-6 10-6"
        fill="none"
        stroke="#fff"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    </>
  ),
  moon: (
    <>
      <path
        d="M62 12C40 16 26 34 28 56s22 34 44 32C56 80 46 64 48 44s10-28 14-32z"
        fill="#ffd93b"
        {...line}
      />
      <path d="M40 52q4 3 8 0" fill="none" {...line} strokeWidth={2.4} />
      <path
        d="M74 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM80 62l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z"
        fill="#fff6b0"
        {...line}
        strokeWidth={2}
      />
    </>
  ),
  bunny: (
    <>
      <path
        d="M34 44c-6-16-6-32 2-34s12 16 10 32M66 44c6-16 6-32-2-34s-12 16-10 32"
        fill="#fff"
        {...line}
      />
      <path
        d="M36 38c-2-8-2-18 0-22M64 38c2-8 2-18 0-22"
        fill="none"
        stroke="#ffb6cf"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <ellipse cx={50} cy={62} rx={28} ry={24} fill="#fff" {...line} />
      <circle cx={40} cy={60} r={3} fill={INK} />
      <circle cx={60} cy={60} r={3} fill={INK} />
      <path d="M47 67q3 3 6 0" fill="none" {...line} strokeWidth={2.4} />
      <ellipse cx={32} cy={68} rx={4} ry={2.4} fill="#ff9bb8" />
      <ellipse cx={68} cy={68} rx={4} ry={2.4} fill="#ff9bb8" />
    </>
  ),
  mushroom: (
    <>
      <path d="M38 56h24l4 22c0 6-6 10-16 10s-16-4-16-10z" fill="#fff4e6" {...line} />
      <path d="M12 56c0-24 18-40 38-40s38 16 38 40c-8 4-68 4-76 0z" fill="#ff5a4a" {...line} />
      <circle cx={34} cy={36} r={6} fill="#fff" />
      <circle cx={60} cy={30} r={7} fill="#fff" />
      <circle cx={72} cy={48} r={4} fill="#fff" />
      <circle cx={24} cy={52} r={3.5} fill="#fff" />
      <circle cx={44} cy={70} r={2.4} fill={INK} />
      <circle cx={56} cy={70} r={2.4} fill={INK} />
    </>
  ),
  sailboat: (
    <>
      <circle cx={50} cy={50} r={40} fill="#cfe9ff" stroke="none" />
      <path d="M50 18v44M50 20L28 58h22zM54 30l18 28H54z" fill="#fff" {...line} strokeWidth={2.6} />
      <path d="M24 64h52l-8 12H32z" fill="#ff5a4a" {...line} strokeWidth={2.6} />
      <path
        d="M12 80q6-4 12 0t12 0 12 0 12 0 12 0 12 0"
        fill="none"
        stroke="#2f7bd6"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    </>
  ),
  daruma: (
    <>
      <path
        d="M50 12c22 0 36 18 36 40 0 22-16 36-36 36S14 74 14 52c0-22 14-40 36-40z"
        fill="#e8322e"
        {...line}
      />
      <ellipse cx={50} cy={48} rx={22} ry={20} fill="#fff4e6" {...line} strokeWidth={2.6} />
      <circle cx={41} cy={46} r={6} fill="#fff" {...line} strokeWidth={2.2} />
      <circle cx={59} cy={46} r={6} fill="#fff" {...line} strokeWidth={2.2} />
      <circle cx={41} cy={46} r={2.6} fill={INK} />
      <path
        d="M34 36q6-4 12 0M54 36q6-4 12 0M42 58q8 5 16 0"
        fill="none"
        {...line}
        strokeWidth={2.4}
      />
      <path d="M40 76h20" {...line} stroke="#ffd93b" strokeWidth={4} />
    </>
  ),
  girl: (
    <>
      <path d="M18 92c0-26 12-38 32-38s32 12 32 38z" fill="#ffd93b" {...line} />
      <path
        d="M22 70C14 30 30 12 50 12s36 18 28 58c-4-12-8-22-10-30H32c-2 8-6 18-10 30z"
        fill="#1c1824"
        stroke="none"
      />
      <ellipse cx={50} cy={48} rx={20} ry={23} fill="#ffe0c8" {...line} />
      <path d="M30 40c6-12 30-16 40 0-10-4-26-4-40 0z" fill="#1c1824" />
      <circle cx={42} cy={50} r={2.6} fill={INK} />
      <circle cx={58} cy={50} r={2.6} fill={INK} />
      <path d="M46 60q4 3 8 0" fill="none" {...line} strokeWidth={2.4} />
      <ellipse cx={37} cy={57} rx={3.5} ry={2} fill="#ff9bb8" />
      <ellipse cx={63} cy={57} rx={3.5} ry={2} fill="#ff9bb8" />
    </>
  ),
  boy: (
    <>
      <path d="M18 92c0-26 12-38 32-38s32 12 32 38z" fill="#38d3dc" {...line} />
      <ellipse cx={50} cy={52} rx={21} ry={22} fill="#ffe0c8" {...line} />
      <path d="M26 44c0-18 10-30 24-30s24 12 24 30z" fill="#ff5a36" {...line} />
      <path d="M24 44h52" {...line} strokeWidth={6} stroke="#c63c1e" />
      <circle cx={50} cy={12} r={5} fill="#ffd93b" {...line} strokeWidth={2.2} />
      <circle cx={42} cy={56} r={2.6} fill={INK} />
      <circle cx={58} cy={56} r={2.6} fill={INK} />
      <path d="M45 64q5 4 10 0" fill="none" {...line} strokeWidth={2.4} />
    </>
  ),
};

export function ArtistArt({ art, className = "" }: { art: ArtKey; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`artist-art ${className}`} aria-hidden>
      {ART[art]}
    </svg>
  );
}
