import type { Explore, LeaderboardRow, Person } from "@drawing-app/api/client";
import type { TFunction } from "i18next";
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useMe } from "../api/meContext";
import { useApiQuery, type Query } from "../api/useApiQuery";
import { toPerson } from "../api/views";
import { errorDetail, errorMessage } from "../i18n/errorMessage";
import { formatCount, formatTimeOfDay, formatWeekday } from "../i18n/format";
import { Trans, useTranslation } from "../i18n/react";
import { At, StreakIcon, X } from "../icons";
import { formatHandle } from "../stickers/format";
import { PhotoSticker } from "../ui/PhotoSticker";
import { EASE_OUT } from "../ui/easing";
import { ErrorLine } from "../ui/ErrorLine";
import { REVEAL } from "../ui/reveal";
import { Skeleton } from "../ui/Skeleton";
import { useReducedMotion } from "../ui/useReducedMotion";
import { HitCounter } from "../ui/HitCounter";
import { matchIn } from "./handleMatch";
import { competitionRanks } from "./leaderboardRanks";
import { LiftedSticker } from "./LiftedSticker";
import { dayBadge, pileDays, ticketDayNumber, type PileSticker } from "./pileDays";
import { textWidth } from "./pileLayout";
import { pileOrigin } from "./pileOrigin";
import { StickerPile } from "./StickerPile";
import "./ExploreScreen.css";

interface Props {
  /**
   * A name's link opened the app: <boardOf>.croquis.eth's Sticker Board opens once it's found. App
   * lets go of it as Explore is left, so a later visit doesn't open that board again.
   */
  boardOf?: string;
  onOpenArtist: (person: Person) => void;
  onOpenMyBoard: () => void;
}

/** Search waits for a pause in typing before it asks the server. */
export const SEARCH_AFTER_MS = 250;
/** A week's leaderboards run from a Monday's start to the next one's, Japan keeping no daylight saving. */
const WEEK_MS = 7 * 24 * 60 * 60_000;

type View = "stickers" | "thisWeek";

const VIEWS: View[] = ["stickers", "thisWeek"];

type Leaderboard = "mostGratitude" | "bestCombo" | "longestStreak";

const LEADERBOARDS: Leaderboard[] = ["mostGratitude", "bestCombo", "longestStreak"];

/** Rows re-deal on a new leaderboard: the old ones fade out, the new ones stick on top down. */
const ROWS_OUT_MS = 90;
const ROW_IN_MS = 200;
const ROW_GAP_MS = 25;
/** Only the first rows are dealt one by one; the rest land with the last of them. */
const ROWS_DEALT = 5;
/** Reduced motion: the rows cross-fade. */
const ROWS_FADE_MS = 120;

/** Opens someone's sticker board: yours, or theirs. */
type Open = (person: Person) => void;

const boardLabel = (person: Person, meId: string, t: TFunction) =>
  person.id === meId
    ? t(($) => $.explore.stickerBoard.yours)
    : t(($) => $.explore.stickerBoard.theirs, { handle: formatHandle(person.handle ?? "") });

function Avatar({ person, size }: { person: Person; size: number }) {
  const view = toPerson(person);
  return <PhotoSticker src={view.pictureUrl} name={view.name} size={size} />;
}

/**
 * A handle with its natural breaks marked: after "_", "." or "-", as on the pile's name tags. The marks
 * are hidden from assistive tech, which would otherwise name the row with a space in the handle.
 */
function breakable(text: string): ReactNode[] {
  return text
    .split(/(?<=[_.-])/)
    .flatMap((part, i) => (i ? [<wbr key={i} aria-hidden="true" />, part] : [part]));
}

function PersonRow({
  person,
  meId,
  lead,
  name,
  trail,
  open,
}: {
  person: Person;
  meId: string;
  lead: ReactNode;
  name?: ReactNode;
  trail?: ReactNode;
  open: Open;
}) {
  const { t } = useTranslation();
  const boardId = useId();
  const isMe = person.id === meId;
  const handle = formatHandle(person.handle ?? "");
  return (
    <li className={isMe ? "me" : ""}>
      {/* The row's own text names it, so voice control can say what it sees. Where it goes is its
          description, kept outside the button so it stays out of the name. */}
      <button
        type="button"
        className="pressable artist-row"
        aria-describedby={boardId}
        data-press
        onClick={() => open(person)}
      >
        {lead}
        <span className="row-names">
          <b style={{ "--handle-w": textWidth(handle) }}>{name ?? breakable(handle)}</b>
          <span>{isMe ? t(($) => $.explore.you) : toPerson(person).name}</span>
        </span>
        {trail}
      </button>
      <span id={boardId} hidden>
        {boardLabel(person, meId, t)}
      </span>
    </li>
  );
}

function Figure({ board, value }: { board: Leaderboard; value: number }) {
  const { t } = useTranslation();
  if (board === "bestCombo") return <HitCounter hits={value} size={23} className="figure" />;
  if (board === "longestStreak")
    return (
      <span className="figure figure--streak">
        <StreakIcon size={17} />
        <span aria-hidden="true">
          <Trans
            i18nKey={($) => $.explore.figure.streak}
            count={value}
            components={{ small: <small /> }}
          />
        </span>
        <span className="visually-hidden">
          {t(($) => $.explore.figure.streakSpoken, { count: value })}
        </span>
      </span>
    );
  return (
    <span className="figure">
      <Trans
        i18nKey={($) => $.explore.figure.gratitude}
        values={{ amount: formatCount(value) }}
        components={{ hidden: <span className="visually-hidden" /> }}
      />
    </span>
  );
}

/**
 * Tabs as one label sliding along a track to the current tab, which the arrow keys move too. Each
 * tab takes the shared press, since they're selectable labels.
 */
function SlidingTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  labelOf,
  id,
  className,
  disabled = false,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (tab: T) => void;
  label: string;
  labelOf: (tab: T) => string;
  /** Starts the tabs' ids and names their panel, `${id}-panel`. */
  id: string;
  className: string;
  disabled?: boolean;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, tabs.indexOf(value));
  const move = (to: number) => {
    const next = (to + tabs.length) % tabs.length;
    onChange(tabs[next]);
    buttons.current[next]?.focus();
  };
  return (
    <div
      className={`sliding-tabs ${className}`}
      role="tablist"
      aria-label={label}
      data-selected={value}
      style={{ "--i": index, "--n": tabs.length } as CSSProperties}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") move(index + 1);
        else if (event.key === "ArrowLeft") move(index - 1);
        else if (event.key === "Home") move(0);
        else if (event.key === "End") move(tabs.length - 1);
        else return;
        event.preventDefault();
      }}
    >
      <span className="sliding-tabs__label" aria-hidden="true" />
      {tabs.map((tab, i) => (
        <button
          key={tab}
          ref={(button) => {
            buttons.current[i] = button;
          }}
          type="button"
          role="tab"
          id={`${id}-${tab}`}
          aria-selected={tab === value}
          aria-controls={`${id}-panel`}
          tabIndex={tab === value ? 0 : -1}
          className={tab === value ? "selected" : ""}
          data-press
          disabled={disabled}
          onClick={() => onChange(tab)}
        >
          {labelOf(tab)}
        </button>
      ))}
    </div>
  );
}

/**
 * A new leaderboard's rows re-deal: the old list fades out, then the new rows stick on from the
 * top. Taps during the fade go straight to the last one tapped. Under reduced motion they cross-fade.
 */
function useRowDeal(first: Leaderboard) {
  const reduced = useReducedMotion();
  const [board, setBoard] = useState(first);
  const [shown, setShown] = useState(first);
  // Counts deals, so one lands even when the rows it deals are the ones already shown.
  const [deals, setDeals] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  const fading = useRef<{ to: Leaderboard; fade: Animation } | null>(null);
  const deal = useRef(false);

  useEffect(() => () => fading.current?.fade.cancel(), []);

  const dealRows = (to: Leaderboard) => {
    deal.current = true;
    setShown(to);
    setDeals((n) => n + 1);
  };

  const select = (to: Leaderboard) => {
    if (to === board) return;
    setBoard(to);
    const rows = list.current;
    if (fading.current) {
      fading.current.to = to;
      return;
    }
    if (!rows || reduced) {
      dealRows(to);
      return;
    }
    const fade = rows.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: ROWS_OUT_MS,
      easing: "linear",
      fill: "forwards",
    });
    fading.current = { to, fade };
    const next = () => fading.current?.to ?? to;
    fade.finished.then(
      () => dealRows(next()),
      // Cancelled: the list went out of sight mid-fade, so the rows it was heading for go in now.
      () => {
        const rows = next();
        fading.current = null;
        dealRows(rows);
      },
    );
  };

  useLayoutEffect(() => {
    const rows = list.current;
    if (!deal.current || !rows) return;
    deal.current = false;
    // The new rows are in, so the faded list can show again under them.
    fading.current?.fade.cancel();
    fading.current = null;
    if (reduced) {
      rows.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ROWS_FADE_MS });
      return;
    }
    [...rows.children].forEach((row, i) =>
      row.animate(
        [
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: ROW_IN_MS,
          delay: Math.min(i, ROWS_DEALT - 1) * ROW_GAP_MS,
          easing: EASE_OUT,
          fill: "backwards",
        },
      ),
    );
  }, [deals, reduced]);

  return { board, shown, select, list };
}

function ThisWeek({
  leaderboards,
  meId,
  open,
}: {
  leaderboards: Explore["leaderboards"];
  meId: string;
  open: Open;
}) {
  const { t } = useTranslation();
  const { board, shown, select, list } = useRowDeal("mostGratitude");
  const rows: LeaderboardRow[] = leaderboards[shown];
  const ranks = competitionRanks(rows.map((row) => row.value));
  // In the person's own time, as the tickets' refill line is, from the week that began in Tokyo.
  const resets = new Date(Date.parse(leaderboards.weekStart) + WEEK_MS);

  return (
    <section className={`${REVEAL} explore-section`}>
      <h2 className="visually-hidden">{t(($) => $.explore.thisWeek.title)}</h2>
      <SlidingTabs
        tabs={LEADERBOARDS}
        value={board}
        onChange={select}
        label={t(($) => $.explore.thisWeek.leaderboards)}
        labelOf={(b) => t(($) => $.explore.leaderboards[b])}
        id="leaderboard"
        className="leaderboard-tabs"
      />
      <div role="tabpanel" id="leaderboard-panel" aria-labelledby={`leaderboard-${board}`}>
        <ol ref={list} className="leaderboard">
          {rows.length === 0 && (
            <li className="leaderboard-empty">{t(($) => $.explore.thisWeek.empty[shown])}</li>
          )}
          {rows.map((row, i) => (
            <PersonRow
              key={row.person.id}
              person={row.person}
              meId={meId}
              open={open}
              lead={
                <>
                  <span className="rank">{ranks[i]}</span>
                  <Avatar person={row.person} size={40} />
                </>
              }
              trail={<Figure board={shown} value={row.value} />}
            />
          ))}
        </ol>
      </div>
      {/* Streaks are counted as they stand, so they don't start over with the week. */}
      {shown !== "longestStreak" && (
        <p className="fine muted week-resets">
          {t(($) => $.explore.thisWeek.resets, {
            day: formatWeekday(resets),
            time: formatTimeOfDay(resets),
          })}
        </p>
      )}
    </section>
  );
}

/** Rows of a person list while it loads: a rank or nothing, a photo, a name and a handle. */
function PersonRowsLoading({ rows, ranked }: { rows: number; ranked: boolean }) {
  return Array.from({ length: rows }, (_, i) => (
    <li key={i}>
      <div className="artist-row">
        {ranked && <Skeleton className="rank" width={16} height={14} />}
        <Skeleton width={40} height={40} round />
        <span className="row-names is-loading">
          <Skeleton width="45%" height={13} />
          <Skeleton width="30%" height={10} />
        </span>
      </div>
    </li>
  ));
}

/** The one line a screen reader hears while Explore loads. */
function LoadingStatus() {
  const { t } = useTranslation();
  return (
    <p className="visually-hidden" role="status">
      {t(($) => $.explore.loading)}
    </p>
  );
}

/** This week in outline while it loads. */
function ThisWeekLoading() {
  const { t } = useTranslation();
  return (
    <>
      <LoadingStatus />
      <section className="explore-section" aria-hidden="true">
        <div
          className="sliding-tabs leaderboard-tabs"
          style={{ "--i": 0, "--n": 3 } as CSSProperties}
        >
          <span className="sliding-tabs__label" />
          {LEADERBOARDS.map((b, i) => (
            <button key={b} type="button" className={i === 0 ? "selected" : ""} disabled>
              {t(($) => $.explore.leaderboards[b])}
            </button>
          ))}
        </div>
        <ol className="leaderboard">
          <PersonRowsLoading rows={3} ranked />
        </ol>
      </section>
    </>
  );
}

/** Where faint sticker shapes heap on today's floor while the pile loads: x in %, y from the floor. */
const LOADING_HEAP = [
  { x: 14, y: 96, size: 84, turn: -8 },
  { x: 42, y: 90, size: 96, turn: 5 },
  { x: 70, y: 98, size: 80, turn: -4 },
  { x: 28, y: 168, size: 78, turn: 9 },
  { x: 57, y: 172, size: 88, turn: -6 },
];

/** Today's floor in outline while the pile loads; the stickers fall in once it has. */
function PileLoading() {
  const { t } = useTranslation();
  const [date] = useState(() => dayBadge(ticketDayNumber(Date.now())));
  return (
    <>
      <LoadingStatus />
      <div className="sticker-pile" aria-hidden="true">
        <div className="pile-day__edge">
          <span className="pile-day__badge is-today">
            {t(($) => $.explore.pile.todayBadge, { date })}
          </span>
        </div>
        <div className="pile-loading">
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
      </div>
    </>
  );
}

/** What didn't load and why, with a way to ask again. */
function Failed({ said, query }: { said: (reason: string) => string; query: Query<unknown> }) {
  if (query.state !== "failed") return null;
  return (
    <section className="explore-section">
      <ErrorLine detail={errorDetail(query.error)} onRetry={query.retry}>
        {said(errorMessage(query.error))}
      </ErrorLine>
    </section>
  );
}

/** What the status line says of a search: that it's out, how many it found, or that it found no one. */
function searchSaid(results: Query<Person[]>, query: string, t: TFunction): string {
  if (results.state === "loading") return t(($) => $.explore.search.searching);
  // A failure speaks for itself, as an alert.
  if (results.state === "failed") return "";
  if (!results.data.length)
    return t(($) => $.explore.search.notFound.title, { handle: formatHandle(query) });
  return t(($) => $.explore.search.artists, { count: results.data.length });
}

/** Handles starting with the search first, then ones containing it, A to Z, as the server sorts. */
function SearchResults({
  query,
  meId,
  open,
  announce,
}: {
  query: string;
  meId: string;
  open: Open;
  /** Sets Explore's status line, which is in the page before a search says anything. */
  announce: (text: string) => void;
}) {
  const { t } = useTranslation();
  const results = useApiQuery(`users?handle=${query}`, (api) => api.searchUsers(query));
  const said = searchSaid(results, query, t);
  useEffect(() => {
    announce(said);
    return () => announce("");
  }, [announce, said]);

  if (results.state === "loading")
    return (
      <section className="explore-section">
        <ul className="search-results" aria-hidden="true">
          <PersonRowsLoading rows={3} ranked={false} />
        </ul>
      </section>
    );
  if (results.state === "failed")
    return (
      <Failed
        said={(reason) => t(($) => $.explore.failed.searchResults, { reason })}
        query={results}
      />
    );
  const people = results.data;

  if (!people.length)
    return (
      <section className={`${REVEAL} explore-section search-empty`}>
        <h2>{t(($) => $.explore.search.notFound.title, { handle: formatHandle(query) })}</h2>
        <p>{t(($) => $.explore.search.notFound.lead)}</p>
      </section>
    );

  return (
    <section className={`${REVEAL} explore-section`}>
      <p className="fine muted results-count">
        {t(($) => $.explore.search.artists, { count: people.length })}
      </p>
      <ul className="search-results">
        {people.map((person) => {
          const found = matchIn(person.handle ?? "", query);
          return (
            <PersonRow
              key={person.id}
              person={person}
              meId={meId}
              open={open}
              name={
                found && (
                  <>
                    {breakable(formatHandle(found.before))}
                    <mark>{breakable(found.match)}</mark>
                    {breakable(found.after)}
                  </>
                )
              }
              lead={
                <span className="result-avatar">
                  <Avatar person={person} size={40} />
                </span>
              }
            />
          );
        })}
      </ul>
    </section>
  );
}

/** The pile, once Explore has arrived; a tapped sticker lifts off it into a sheet. */
function Stickers({ explore, meId, open }: { explore: Explore; meId: string; open: Open }) {
  const days = useMemo(() => pileDays(explore), [explore]);
  // Paging in the sheet runs in the pile's reading order: newest day, newest sticker first.
  const order = useMemo(() => days.flatMap(({ stickers }) => stickers.toReversed()), [days]);
  const [lifted, setLifted] = useState<number | null>(null);
  const lift = (pile: PileSticker) =>
    setLifted(order.findIndex((p) => p.sticker.id === pile.sticker.id));
  return (
    <>
      <StickerPile days={days} meId={meId} onLift={lift} />
      {lifted !== null && lifted >= 0 && (
        <LiftedSticker
          stickers={order}
          index={lifted}
          onIndexChange={setLifted}
          onClose={() => setLifted(null)}
          onGoToBoard={(artist) => {
            setLifted(null);
            open(artist);
          }}
          originOf={pileOrigin}
        />
      )}
    </>
  );
}

/** Finds whoever a name's link names and opens their board, once; says so when there's nobody. */
function OpenBoardOf({ label, open }: { label: string; open: Open }) {
  const { t } = useTranslation();
  const person = useApiQuery(`ens-person/${label}`, (api) => api.personByEnsLabel(label));
  const opened = useRef(false);
  const openPerson = useEffectEvent(open);
  useEffect(() => {
    if (person.state !== "ready" || opened.current) return;
    opened.current = true;
    openPerson(person.data);
  }, [person]);
  return (
    <Failed
      said={(reason) =>
        t(($) => $.explore.failed.ensName, { name: `${label}.croquis.eth`, reason })
      }
      query={person}
    />
  );
}

export function ExploreScreen({ boardOf, onOpenArtist, onOpenMyBoard }: Props) {
  const { t } = useTranslation();
  const me = useMe();
  const page = useRef<HTMLDivElement>(null);
  const scrolledTo = useRef(0);
  // Hidden between visits, Explore has no layout, so it loses where it was scrolled to: kept here.
  useLayoutEffect(() => {
    const scroller = page.current;
    if (!scroller) return;
    scroller.scrollTop = scrolledTo.current;
    return () => {
      scrolledTo.current = scroller.scrollTop;
    };
  }, []);
  const [query, setQuery] = useState("");
  const field = useRef<HTMLInputElement>(null);
  // What a search says to screen readers. Its line is in the page from the start, so a change to it
  // is heard.
  const [searchStatus, setSearchStatus] = useState("");
  const q = query.trim().replace(/^@/, "");
  const [searched, setSearched] = useState(q);
  useEffect(() => {
    const id = setTimeout(() => setSearched(q), SEARCH_AFTER_MS);
    return () => clearTimeout(id);
  }, [q]);
  const [view, setView] = useState<View>("stickers");
  const explore = useApiQuery("explore", (api) => api.explore());
  const open: Open = (person) => (person.id === me.id ? onOpenMyBoard() : onOpenArtist(person));

  const shown =
    explore.state === "failed" ? (
      <Failed said={(reason) => t(($) => $.explore.failed.explore, { reason })} query={explore} />
    ) : view === "stickers" ? (
      explore.state === "ready" ? (
        <Stickers explore={explore.data} meId={me.id} open={open} />
      ) : (
        <PileLoading />
      )
    ) : explore.state === "ready" ? (
      <ThisWeek leaderboards={explore.data.leaderboards} meId={me.id} open={open} />
    ) : (
      <ThisWeekLoading />
    );

  return (
    <div ref={page} className="explore">
      {boardOf && <OpenBoardOf label={boardOf} open={open} />}
      <label className="artist-search">
        <At size={20} aria-hidden />
        <input
          ref={field}
          type="search"
          placeholder={t(($) => $.explore.search.placeholder)}
          aria-label={t(($) => $.explore.search.label)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            aria-label={t(($) => $.explore.search.clear)}
            onClick={() => {
              setQuery("");
              // The button goes with the query, so focus moves to where a new search starts.
              field.current?.focus();
            }}
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </label>
      <p className="visually-hidden" role="status">
        {searchStatus}
      </p>

      {q ? (
        searched && (
          <SearchResults query={searched} meId={me.id} open={open} announce={setSearchStatus} />
        )
      ) : (
        <>
          <SlidingTabs
            tabs={VIEWS}
            value={view}
            onChange={setView}
            label={t(($) => $.explore.views.label)}
            labelOf={(v) => t(($) => $.explore.views[v])}
            id="explore-view"
            className="view-switch"
          />
          <div
            className="explore-view"
            role="tabpanel"
            id="explore-view-panel"
            aria-labelledby={`explore-view-${view}`}
          >
            {shown}
          </div>
        </>
      )}
    </div>
  );
}
