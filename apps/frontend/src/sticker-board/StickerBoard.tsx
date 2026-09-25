import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Key } from "../controls/controls";
import { DrawIcon } from "../icons/DrawIcon";
import { useIdentity } from "../identity/useIdentity";
import { formatClock, formatNo } from "../stickers/format";
import { listStickers, updatePlacement, type Placement } from "../stickers/stickerStorage";
import type { BoardSticker } from "./boardSticker";
import { autoPlace, clamp, MAX_SCALE, MIN_SCALE } from "./placement";
import { ProfileCard } from "./ProfileCard";
import { StickerDetail } from "./StickerDetail";
import "./StickerBoard.css";

interface Props {
  /** The sticker that was just sealed; it lands with a "stick" animation. */
  freshId?: string;
  onDraw: () => void;
}

interface Gesture {
  id: string;
  pointers: Map<number, { x: number; y: number }>;
  /** Snapshot taken whenever the finger count changes. */
  start: { placement: Placement; pointers: Map<number, { x: number; y: number }> };
  moved: boolean;
}

const TAP_SLOP = 6;

const centroid = (pts: Map<number, { x: number; y: number }>) => {
  let x = 0;
  let y = 0;
  for (const p of pts.values()) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.size, y: y / pts.size };
};

const spread = (pts: Map<number, { x: number; y: number }>) => {
  const [a, b] = [...pts.values()];
  return b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
};

export function StickerBoard({ freshId, onDraw }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [stickers, setStickers] = useState<BoardSticker[] | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [open, setOpen] = useState<BoardSticker | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const me = useIdentity();
  const gesture = useRef<Gesture | null>(null);
  const stickersRef = useRef<BoardSticker[]>([]);
  useLayoutEffect(() => {
    stickersRef.current = stickers ?? [];
  });

  useEffect(() => {
    let cancelled = false;
    let urls: string[] = [];
    listStickers().then(
      (records) => {
        if (cancelled) return;
        // Oldest first, so newer stickers stack on top by default.
        const placed: BoardSticker[] = [];
        records.reverse().forEach((r, i) => {
          const placement =
            r.placement ??
            autoPlace(
              r.id,
              placed.map((p) => p.placement),
              i + 1,
            );
          // Save first-time spots so they don't shift when others move.
          if (!r.placement) void updatePlacement(r.id, placement);
          placed.push({ ...r, url: URL.createObjectURL(r.blob), placement });
        });
        urls = placed.map((p) => p.url);
        setStickers(placed);
      },
      (error: unknown) => {
        console.error("Stickers failed to load", error);
        if (!cancelled) setStickers([]);
      },
    );
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => setSize({ w: board.clientWidth, h: board.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    measure();
    return () => observer.disconnect();
  }, []);

  const setPlacement = (id: string, placement: Placement) =>
    setStickers((list) => list?.map((s) => (s.id === id ? { ...s, placement } : s)) ?? null);

  const placementOf = (id: string) => stickersRef.current.find((s) => s.id === id)?.placement;

  const rebase = (g: Gesture) => {
    const placement = placementOf(g.id);
    if (!placement) return;
    g.start = { placement, pointers: new Map(g.pointers) };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g) {
      // A second finger anywhere on the board pinches the held sticker.
      if (g.pointers.size >= 2) return;
      g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      g.moved = true;
      rebase(g);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (!(e.target instanceof Element)) return;
    const el = e.target.closest<HTMLElement>("[data-sticker]");
    if (!el) return;
    const id = el.dataset.sticker;
    if (!id) return;
    const current = placementOf(id);
    if (!current) return;
    e.preventDefault();
    const topZ = Math.max(0, ...stickersRef.current.map((s) => s.placement.z));
    const placement = current.z === topZ ? current : { ...current, z: topZ + 1 };
    setPlacement(id, placement);
    stickersRef.current = stickersRef.current.map((s) => (s.id === id ? { ...s, placement } : s));
    const pointers = new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]);
    gesture.current = {
      id,
      pointers,
      start: { placement, pointers: new Map(pointers) },
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || !g.pointers.has(e.pointerId) || !size.w) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const from = centroid(g.start.pointers);
    const to = centroid(g.pointers);
    if (!g.moved && Math.hypot(to.x - from.x, to.y - from.y) < TAP_SLOP) return;
    g.moved = true;
    const s = g.start.placement;
    const ratio =
      g.pointers.size === 2 && spread(g.start.pointers) > 0
        ? spread(g.pointers) / spread(g.start.pointers)
        : 1;
    setPlacement(g.id, {
      ...s,
      x: clamp(s.x + (to.x - from.x) / size.w, 0.02, 0.98),
      y: clamp(s.y + (to.y - from.y) / size.h, 0.02, 0.98),
      scale: clamp(s.scale * ratio, MIN_SCALE, MAX_SCALE),
    });
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || !g.pointers.delete(e.pointerId)) return;
    if (g.pointers.size > 0) {
      // Lifting one finger of a pinch continues as a drag.
      rebase(g);
      return;
    }
    gesture.current = null;
    const sticker = stickersRef.current.find((s) => s.id === g.id);
    if (!sticker) return;
    if (!g.moved && e.type === "pointerup") setOpen(sticker);
    else void updatePlacement(sticker.id, sticker.placement);
  };

  // Desktop: scroll (or trackpad-pinch) over a sticker to resize it.
  const wheelSave = useRef(0);
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>("[data-sticker]");
      if (!el) return;
      e.preventDefault();
      const id = el.dataset.sticker;
      if (!id) return;
      const p = stickersRef.current.find((s) => s.id === id)?.placement;
      if (!p) return;
      const next = {
        ...p,
        scale: clamp(
          p.scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)),
          MIN_SCALE,
          MAX_SCALE,
        ),
      };
      stickersRef.current = stickersRef.current.map((s) =>
        s.id === id ? { ...s, placement: next } : s,
      );
      setPlacement(id, next);
      window.clearTimeout(wheelSave.current);
      wheelSave.current = window.setTimeout(() => void updatePlacement(id, next), 300);
    };
    board.addEventListener("wheel", onWheel, { passive: false });
    return () => board.removeEventListener("wheel", onWheel);
  }, []);

  const newestUrl = stickers?.reduce<BoardSticker | undefined>(
    (a, s) => (!a || s.createdAt > a.createdAt ? s : a),
    undefined,
  )?.url;
  const avatarUrl = me.pictureUrl ?? newestUrl;

  return (
    <div className="board">
      <button
        className={`board-header ${profileOpen ? "open" : ""}`}
        onClick={() => setProfileOpen((v) => !v)}
        aria-expanded={profileOpen}
        aria-label={`@${me.handle}, open your profile`}
      >
        <span className="photo-sticker" aria-hidden>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className={me.pictureUrl ? "photo" : ""} />
          ) : (
            me.handle[0]?.toUpperCase()
          )}
        </span>
        <span className="board-name">@{me.handle}</span>
      </button>

      {profileOpen && (
        <div className="profile-backdrop" onClick={() => setProfileOpen(false)}>
          <ProfileCard
            made={stickers?.length ?? 0}
            avatarUrl={newestUrl}
            onClose={() => setProfileOpen(false)}
          />
        </div>
      )}

      <div
        className="board-frame"
        ref={boardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        {stickers?.length === 0 && (
          <div className="board-empty">
            <div className="empty-slot">
              Stickers you make
              <br />
              or receive land here.
            </div>
          </div>
        )}

        {size.w > 0 &&
          stickers?.map((s) => {
            const p = s.placement;
            return (
              <div
                key={s.id}
                data-sticker={s.id}
                className={`free-sticker ${s.id === freshId ? "fresh" : ""}`}
                style={{
                  width: p.scale * size.w,
                  zIndex: p.z,
                  transform: `translate(${p.x * size.w}px, ${p.y * size.h}px) translate(-50%, -50%) rotate(${s.rotation}deg)`,
                }}
                role="button"
                aria-label={`${formatNo(s.no)}, drawn in ${formatClock(s.timeUsed)}`}
              >
                <img
                  src={s.url}
                  alt=""
                  draggable={false}
                  style={{ aspectRatio: `${s.width} / ${s.height}` }}
                />
              </div>
            );
          })}

        {!!stickers?.length && (
          <div className="board-hint fine">Drag to move · pinch to resize</div>
        )}
      </div>

      {/* A new artist's first visit: the key hops inside a pulse ring, under a first-sticker hint. */}
      <div className={`board-draw ${stickers?.length === 0 ? "first-visit" : ""}`}>
        {stickers?.length === 0 && (
          <div className="draw-hint" id="draw-hint" role="note">
            Make your first sticker
          </div>
        )}
        <Key
          size="sm"
          icon={<DrawIcon size={20} />}
          onPress={onDraw}
          aria-describedby={stickers?.length === 0 ? "draw-hint" : undefined}
        >
          Draw
        </Key>
      </div>

      {open && (
        <StickerDetail
          sticker={open}
          onClose={() => setOpen(null)}
          onPeeledOff={(id) => {
            setOpen(null);
            setStickers((list) => list?.filter((x) => x.id !== id) ?? null);
          }}
        />
      )}
    </div>
  );
}
