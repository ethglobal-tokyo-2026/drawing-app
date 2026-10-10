import type { Person, PileSticker } from "@drawing-app/api/client";
import type { TFunction } from "i18next";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { toPerson, toSticker } from "../api/views";
import { errorDetail, errorMessage } from "../i18n/errorMessage";
import { currentLanguage } from "../i18n/i18n";
import { useTranslation } from "../i18n/react";
import { hash, type Shape } from "../sticker-board/tray/sheetPacking";
import { knownShape } from "../sticker-board/tray/stickerShape";
import { formatNo, handleOf } from "../stickers/format";
import { useMyNsfwOptIn, veiledFor } from "../stickers/nsfw";
import "../stickers/nsfw-img.css";
import { PhotoSticker } from "../ui/PhotoSticker";
import { EASE_PEEL } from "../ui/easing";
import { ErrorLine } from "../ui/ErrorLine";
import { REVEAL, revealOnLoad } from "../ui/reveal";
import { Skeleton } from "../ui/Skeleton";
import { useReducedMotion } from "../ui/useReducedMotion";
import { dayBadge, dayKey, spokenDay, type PileDay } from "./pileDays";
import type { PileEnd } from "./pilePages";
import {
  PILE_WIDTH,
  pileFit,
  pileStickers,
  tagGroup,
  type PiledSticker,
  type Tag,
  type TagGroup,
} from "./pileLayout";
import { arrivalsOf, lastSeen, markSeen } from "./pileVisits";
import "./sticker-pile.css";

/** Room between a day's perforation and the top of its heap, in pile units. */
const HEADROOM = 14;
/** An empty day's floor: room for the outline of the sticker that will land there. */
const EMPTY_HEAP = 150;
/** How long the fall waits for the falling stickers' images before it drops them anyway. */
const IMAGE_WAIT_MS = 700;
/** The fall: gravity for 620ms, then the landing's squash, rebound and stick. */
const FALL_MS = 620;
const LAND_MS = 280;
/** Each sticker drops this long after the one before. */
const FALL_GAP_MS = 55;
/** Gravity: slow off the top, fastest as it lands. */
const EASE_FALL = "cubic-bezier(0.55, 0, 1, 0.45)";
/** It spins this far into its turn as it falls. */
const SPIN_DEG = 24;
/** Reduced motion: the pile fades in instead. */
const FADE_MS = 150;

interface Props {
  /** Newest day first, from shownDays. */
  days: readonly PileDay[];
  /** Today's ticket day: its floor shows even before anyone seals. */
  today: number;
  /** What lies under the last layer. */
  end: PileEnd;
  /** The pile's end came within a screen of the view, while there may be older stickers. */
  onReachEnd: () => void;
  meId: string;
  onLift: (pile: PileSticker) => void;
}

interface Laid {
  pile: PileSticker;
  spot: PiledSticker;
  shape: Shape;
  name: string;
  givenTo: string | null;
  tags: TagGroup;
}

interface LaidDay {
  day: number;
  /** Newest first, as screen readers read them; later ones lie on top. */
  laid: Laid[];
  /** The heap box's height, in pile units: the heap and the room above it. */
  height: number;
}

const nameOf = (person: Person) => handleOf(toPerson(person));

/**
 * The "to @x" tag's whole label, from its template's words round <handle/>, so the layout measures
 * all of it: "to @ken", or "@kenさんへ".
 */
function toLabel(template: string, handle: string) {
  const [before, after = ""] = template.split("<handle/>");
  return `${before}${handle}${after}`;
}

/** Each day's heap, laid out once per payload and language. */
function layDays(
  days: readonly PileDay[],
  today: number,
  toTemplate: string,
  units: number,
): LaidDay[] {
  // Today's floor shows even before anyone seals.
  const withToday = days[0]?.day === today ? days : [{ day: today, stickers: [] }, ...days];
  return withToday.map(({ day, stickers }) => {
    const items = stickers.map((pile) => {
      const { sticker } = pile;
      const shape = knownShape({
        id: sticker.id,
        no: sticker.number,
        width: sticker.width,
        height: sticker.height,
        outline: sticker.outline,
      }) ?? { w: sticker.width, h: sticker.height, poly: [] };
      const name = nameOf(sticker.artist);
      const givenTo = pile.givenTo && nameOf(pile.givenTo);
      const tags = tagGroup(name, givenTo === null ? null : toLabel(toTemplate, givenTo));
      return { id: sticker.id, shape, tag: tags, tags, pile, name, givenTo };
    });
    const layer = pileStickers(items, { seed: dayKey(day), width: units });
    const laid = layer.items.map((spot, i) => ({ ...items[i], spot })).reverse();
    const height = stickers.length ? HEADROOM - layer.top : EMPTY_HEAP;
    return { day, laid, height };
  });
}

/** How long ago `at` was, in its largest whole unit: "just now", "5 min ago", "2 days ago". */
function ago(at: number, now: number, t: TFunction): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return t(($) => $.explore.pile.ago.justNow);
  if (minutes < 60) return t(($) => $.explore.pile.ago.minutes, { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t(($) => $.explore.pile.ago.hours, { hours });
  return t(($) => $.explore.pile.ago.days, { count: Math.floor(hours / 24) });
}

const percent = (n: number) => `${(n * 100).toFixed(2)}%`;

/** A cut line as a clip path over its image, so a tap lands only on the sticker itself. */
const clipOf = (shape: Shape) =>
  shape.poly.length > 2
    ? `polygon(${shape.poly.map(([u, v]) => `${percent(u)} ${percent(v)}`).join(", ")})`
    : undefined;

/** The cut's box inside its image, as shares of it, for the focus ring. */
function cutBox(shape: Shape): CSSProperties {
  if (shape.poly.length < 3) return { inset: 0 };
  const us = shape.poly.map(([u]) => u);
  const vs = shape.poly.map(([, v]) => v);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  return { left: percent(u0), top: percent(v0), width: percent(u1 - u0), height: percent(v1 - v0) };
}

/** A sticker's spot as custom properties, in pile units, for sticker-pile.css to scale. */
function spotStyle({ spot }: Laid, height: number): CSSProperties {
  const { x, y, w, h, r, n, tag } = spot;
  const left = x - w / 2;
  const top = height + y - h / 2;
  return {
    "--x": left,
    "--y": top,
    "--w": w,
    "--h": h,
    "--r": `${r}deg`,
    "--z": n + 1,
    "--tx": tag.x - left,
    "--ty": tag.y + height - top,
    "--tw": tag.w,
    "--th": tag.h,
    "--tr": `${tag.r}deg`,
  } as CSSProperties;
}

/** A tag's place and size in its group, in pile units, for sticker-pile.css to scale. */
const tagStyle = ({ x, y, w, h }: Tag) =>
  ({ "--tag-x": x, "--tag-y": y, "--tag-w": w, "--tag-h": h }) as CSSProperties;

/** A tag's words, a line at a time, as the layout broke them. */
function TagLines({ tag }: { tag: Tag }) {
  return (
    <span className="pile-tag__name">
      {tag.lines.map((line, i) => (
        <span key={i} className="pile-tag__line">
          {line}
        </span>
      ))}
    </span>
  );
}

/**
 * The artist's name tag, with their picture, or a plain dot without one; and the aqua tag of who it
 * was given to.
 */
function NameTags({ laid, fresh }: { laid: Laid; fresh: boolean }) {
  const view = toPerson(laid.pile.sticker.artist);
  const { name, to } = laid.tags;
  return (
    <span className="pile-tags" aria-hidden="true">
      <span className="pile-tag" style={tagStyle(name)}>
        {view.pictureUrl ? (
          <PhotoSticker src={view.pictureUrl} name={view.name} size={13} />
        ) : (
          <span className="pile-tag__dot" />
        )}
        <TagLines tag={name} />
        {fresh && <span className="pile-tag__new" />}
      </span>
      {to && (
        <span className="pile-tag pile-tag--to" style={tagStyle(to)}>
          <TagLines tag={to} />
        </span>
      )}
    </span>
  );
}

function PileSticker({
  laid,
  height,
  label,
  fresh,
  falling,
  onLift,
}: {
  laid: Laid;
  height: number;
  label: string;
  fresh: boolean;
  falling: "waiting" | "falling" | null;
  onLift: () => void;
}) {
  const { sticker } = laid.pile;
  const optedIn = useMyNsfwOptIn();
  const view = toSticker(sticker);
  const nsfw = view.nsfw ? ` nsfw-img${veiledFor(view, optedIn) ? " is-veiled" : ""}` : "";
  return (
    <li
      className="pile-sticker"
      style={spotStyle(laid, height)}
      data-pile-id={sticker.id}
      data-turn={laid.spot.r}
      data-falling={falling ?? undefined}
    >
      <button type="button" className="pile-sticker__button" aria-label={label} onClick={onLift}>
        <span className="pile-sticker__drop">
          <span className="pile-sticker__art">
            {falling && (
              <img
                className={`pile-sticker__air${nsfw}`}
                src={sticker.images.webp.sticker}
                alt=""
                draggable={false}
              />
            )}
            <img
              ref={revealOnLoad}
              className={`pile-sticker__image reveal-img${nsfw}`}
              src={sticker.images.webp.sticker}
              alt=""
              draggable={false}
              loading={falling ? "eager" : "lazy"}
              decoding="async"
            />
            <span className="pile-sticker__hit" style={{ clipPath: clipOf(laid.shape) }} />
            <span className="pile-sticker__ring" style={cutBox(laid.shape)} />
          </span>
          <NameTags laid={laid} fresh={fresh} />
        </span>
      </button>
    </li>
  );
}

/** A day's top edge: the perforation, with the day's dot badge stuck on it. */
function DayEdge({ day, today }: { day: number; today: number }) {
  const { t } = useTranslation();
  return (
    <div className="pile-day__edge" aria-hidden="true">
      <span className={`pile-day__badge ${day === today ? "is-today" : ""}`}>
        {day === today
          ? t(($) => $.explore.pile.todayBadge, { date: dayBadge(day) })
          : dayBadge(day)}
      </span>
    </div>
  );
}

function dayHeading(day: number, today: number, t: TFunction) {
  if (day === today) return t(($) => $.explore.pile.today);
  if (day === today - 1) return t(($) => $.explore.pile.yesterday);
  return spokenDay(day, currentLanguage());
}

/** Stops an animation; its `finished` then rejects, which nothing here waits on. */
function cancel(animation: Animation) {
  animation.finished.catch(() => {});
  animation.cancel();
}

/**
 * Plays the fall-in on `falling` once their images are in; under reduced motion, fades the pile.
 * `onDropped` is called as they start to fall and `onLanded` once the last has landed, or at once
 * where nothing falls.
 */
function useFallIn(
  root: RefObject<HTMLDivElement | null>,
  falling: readonly string[],
  reduced: boolean,
  onDropped: () => void,
  onLanded: () => void,
) {
  const dropped = useEffectEvent(onDropped);
  const landed = useEffectEvent(onLanded);
  // Played to its end, the fall-in doesn't play again when a hidden Explore shows the pile again.
  const fellIn = useRef(false);
  useEffect(() => {
    const pile = root.current;
    if (!pile || fellIn.current) return;
    if (reduced) {
      const fade = pile.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS });
      fade.finished.then(
        () => (fellIn.current = true),
        () => {},
      );
      landed();
      return () => cancel(fade);
    }
    if (!falling.length) return;
    const items = falling
      .map((id) => pile.querySelector<HTMLElement>(`[data-pile-id="${CSS.escape(id)}"]`))
      .filter((el) => el !== null);
    const images = items.map((el) => el.querySelector<HTMLImageElement>(".pile-sticker__image"));
    const played: Animation[] = [];
    let stopped = false;
    const decoded = Promise.all(
      images.map((img) => (img ? img.decode().catch(() => undefined) : Promise.resolve())),
    );
    const waited = new Promise((resolve) => setTimeout(resolve, IMAGE_WAIT_MS));
    void Promise.race([decoded, waited]).then(() => {
      if (stopped) return;
      const top = pile.getBoundingClientRect().top;
      items.forEach((el, i) => {
        const drop = el.querySelector<HTMLElement>(".pile-sticker__drop");
        const air = el.querySelector<HTMLElement>(".pile-sticker__air");
        if (!drop) return;
        // From just above the pile's top edge, where it's clipped, down to its spot.
        const fall = el.getBoundingClientRect().bottom - top + 24;
        const spin = (hash(el.dataset.pileId ?? "") % 2 ? 1 : -1) * SPIN_DEG;
        const duration = FALL_MS + LAND_MS;
        const landed = FALL_MS / duration;
        const timing = { duration, delay: i * FALL_GAP_MS, fill: "backwards" as const };
        played.push(
          drop.animate(
            [
              { transform: `translateY(${-fall}px) rotate(${spin}deg)`, easing: EASE_FALL },
              {
                transform: "translateY(0) rotate(0deg) scale(1.05, 0.93)",
                offset: landed,
                easing: EASE_PEEL,
              },
              {
                transform: "translateY(-5px) scale(0.985, 1.02)",
                offset: landed + 0.38 * (1 - landed),
              },
              { transform: "none" },
            ],
            timing,
          ),
        );
        // Its shadow while it's in the air, from the peeling offset to where it sticks, then gone.
        if (air)
          played.push(
            air.animate(
              [
                { transform: "translate(7px, 14px)", opacity: 0.2 },
                { transform: "translate(1px, 2px)", opacity: 0.12, offset: landed },
                { transform: "translate(1px, 2px)", opacity: 0 },
              ],
              timing,
            ),
          );
      });
      dropped();
      // A cancelled animation rejects: the fall was stopped, so nothing has landed.
      Promise.all(played.map((animation) => animation.finished)).then(
        () => {
          fellIn.current = true;
          landed();
        },
        () => {},
      );
    });
    return () => {
      stopped = true;
      for (const animation of played) cancel(animation);
    };
  }, [root, falling, reduced]);
}

/** Where faint sticker shapes heap on a floor while its stickers load: x in %, y from the floor. */
const LOADING_HEAP = [
  { x: 14, y: 96, size: 84, turn: -8 },
  { x: 42, y: 90, size: 96, turn: 5 },
  { x: 70, y: 98, size: 80, turn: -4 },
  { x: 28, y: 168, size: 78, turn: 9 },
  { x: 57, y: 172, size: 88, turn: -6 },
];

/** A floor's heap in outline, while its stickers load. */
export function LoadingHeap() {
  return (
    <div className="pile-loading" aria-hidden="true">
      {LOADING_HEAP.map((spot) => (
        <Skeleton
          key={spot.x}
          className="pile-loading__sticker"
          width={spot.size}
          height={spot.size * 0.86}
          style={{ left: `${spot.x}%`, bottom: spot.y - spot.size, rotate: `${spot.turn}deg` }}
        />
      ))}
    </div>
  );
}

/** The nearest ancestor that scrolls, which an observer must look through to see what's coming. */
function scrollerOf(element: HTMLElement): HTMLElement | null {
  for (let at = element.parentElement; at; at = at.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(at).overflowY)) return at;
  }
  return null;
}

/**
 * Calls `onNear` while `watching`, whenever `target` comes within a screen of the view. Watching
 * again as the layers change asks again when a page has landed and the end is still near.
 */
function useNearEnd(
  target: RefObject<HTMLElement | null>,
  watching: boolean,
  layers: readonly LaidDay[],
  onNear: () => void,
) {
  const near = useEffectEvent(onNear);
  useEffect(() => {
    const element = target.current;
    if (!watching || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) near();
      },
      { root: scrollerOf(element), rootMargin: "0px 0px 100% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, watching, layers]);
}

/**
 * Under the last layer: the next day's floor in outline while older stickers may be on their way,
 * an error line in its place when they didn't load, or the bare perforation once nothing's older.
 */
function PileEndFloor({ end, floor }: { end: PileEnd; floor: RefObject<HTMLDivElement | null> }) {
  const { t } = useTranslation();
  if (end.state === "end") return <div className="pile-floor" aria-hidden="true" />;
  if (end.state === "failed")
    return (
      <ErrorLine className="pile-older-failed" detail={errorDetail(end.error)} onRetry={end.retry}>
        {t(($) => $.explore.pile.older.failed, { reason: errorMessage(end.error) })}
      </ErrorLine>
    );
  return (
    <div ref={floor} className="pile-older">
      <p className="visually-hidden" role="status">
        {end.state === "loading" ? t(($) => $.explore.pile.older.loading) : ""}
      </p>
      <div className="pile-day__edge" aria-hidden="true">
        <Skeleton className="pile-older__badge" width={38} height={20} />
      </div>
      <LoadingHeap />
    </div>
  );
}

/**
 * Explore's stickers as a pile: each day a heap on its own perforated floor, newest day first,
 * every sticker wearing a name tag. Today's newest fall in on a first look, and after that only
 * what's new since the last one. Older days come a page at a time as the pile's end comes near.
 */
export function StickerPile({ days, today, end, onReachEnd, meId, onLift }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const floor = useRef<HTMLDivElement>(null);
  const [now] = useState(() => Date.now());
  const toTemplate = t(($) => $.explore.pile.to);
  /** The pile's width in units, from pileFit. */
  const [units, setUnits] = useState(PILE_WIDTH);
  const laidDays = useMemo(
    () => layDays(days, today, toTemplate, units),
    [days, today, toTemplate, units],
  );
  // Read once as the pile opens: the last look, what's new since, and what falls.
  const [seen] = useState(() => lastSeen(meId));
  const [arrivals] = useState(() => arrivalsOf(days, today, seen));
  const [dropping, setDropping] = useState<"waiting" | "falling" | "done">(
    arrivals.falling.length ? "waiting" : "done",
  );
  const falling = useMemo(() => new Set(arrivals.falling), [arrivals]);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (arrivals.newest !== null) markSeen(meId, arrivals.newest);
    if (!arrivals.fresh.size) return;
    // Said once the live region is in the page, so screen readers hear it change.
    const say = setTimeout(() =>
      setAnnouncement(t(($) => $.explore.pile.arrivals, { count: arrivals.fresh.size })),
    );
    return () => clearTimeout(say);
  }, [arrivals, meId, t]);

  // Older days laid out under the pile are announced by the oldest of them.
  const oldest = laidDays[laidDays.length - 1].day;
  const announcedBack = useRef(oldest);
  useEffect(() => {
    if (oldest >= announcedBack.current) return;
    announcedBack.current = oldest;
    setAnnouncement(
      t(($) => $.explore.pile.older.arrived, { day: spokenDay(oldest, currentLanguage()) }),
    );
  }, [oldest, t]);

  useNearEnd(floor, end.state === "more" || end.state === "loading", laidDays, onReachEnd);

  // A pile is PILE_WIDTH units across, scaled to its width up to about a phone's scale; a wider one
  // spans as many units as fit.
  useLayoutEffect(() => {
    const pile = root.current;
    if (!pile) return;
    const fit = () => {
      const { k, units } = pileFit(pile.clientWidth);
      pile.style.setProperty("--k", String(k));
      setUnits(units);
    };
    fit();
    const resized = new ResizeObserver(fit);
    resized.observe(pile);
    return () => resized.disconnect();
  }, []);

  useFallIn(
    root,
    arrivals.falling,
    reduced,
    () => setDropping((was) => (was === "waiting" ? "falling" : was)),
    () => setDropping("done"),
  );

  const labelOf = ({ pile, name, givenTo }: Laid) => {
    const values = {
      number: formatNo(pile.sticker.number),
      artist: name,
      ago: ago(Date.parse(pile.sticker.sealedAt), now, t),
    };
    return givenTo
      ? t(($) => $.explore.pile.stickerGiven, { ...values, receiver: givenTo })
      : t(($) => $.explore.pile.sticker, values);
  };

  const quiet = !arrivals.falling.length && !reduced;
  return (
    <div ref={root} className={`sticker-pile ${quiet ? REVEAL : ""}`}>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
      {laidDays.map(({ day, laid, height }) => (
        <section key={day} className="pile-day" aria-labelledby={`pile-day-${day}`}>
          <h2 id={`pile-day-${day}`} className="visually-hidden">
            {dayHeading(day, today, t)}
          </h2>
          <DayEdge day={day} today={today} />
          {laid.length ? (
            <ol className="pile-day__heap" style={{ "--hh": height } as CSSProperties}>
              {laid.map((item) => (
                <PileSticker
                  key={item.pile.sticker.id}
                  laid={item}
                  height={height}
                  label={labelOf(item)}
                  fresh={seen !== null && Date.parse(item.pile.sticker.sealedAt) > seen}
                  falling={
                    falling.has(item.pile.sticker.id) && dropping !== "done"
                      ? dropping === "waiting"
                        ? "waiting"
                        : "falling"
                      : null
                  }
                  onLift={() => onLift(item.pile)}
                />
              ))}
            </ol>
          ) : (
            <EmptyFloor height={height}>{t(($) => $.explore.pile.empty)}</EmptyFloor>
          )}
        </section>
      ))}
      <PileEndFloor end={end} floor={floor} />
    </div>
  );
}

/** A day with no stickers yet: a faint kiss-cut outline where the first will land. */
function EmptyFloor({ height, children }: { height: number; children: ReactNode }) {
  return (
    <div className="pile-day__empty" style={{ "--hh": height } as CSSProperties}>
      <svg className="pile-day__outline" viewBox="0 0 100 86" aria-hidden="true">
        <path d="M50 4c14 0 22 9 30 12s17 9 16 24-9 20-12 28-14 15-32 14S16 76 10 66 2 50 5 38s12-20 21-26S38 4 50 4Z" />
      </svg>
      <p className="keep-phrases">{children}</p>
    </div>
  );
}
