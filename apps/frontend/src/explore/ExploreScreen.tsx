import type { Explore, LeaderboardRow, Person } from "@drawing-app/api/client";
import type { TFunction } from "i18next";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { useMe } from "../api/meContext";
import { useApiQuery, type Query } from "../api/useApiQuery";
import { toPerson } from "../api/views";
import { errorDetail, errorMessage } from "../i18n/errorMessage";
import { formatCount, formatTimeOfDay, formatWeekday } from "../i18n/format";
import { Trans, useTranslation } from "../i18n/react";
import { ArrowRight, At, GratitudeIcon, HandPointing, StreakIcon, X } from "../icons";
import { formatHandle } from "../stickers/format";
import { useNsfwOptInKey } from "../stickers/nsfw";
import { PhotoSticker } from "../ui/PhotoSticker";
import { EASE_OUT } from "../ui/easing";
import { ErrorLine } from "../ui/ErrorLine";
import { REVEAL } from "../ui/reveal";
import { Skeleton } from "../ui/Skeleton";
import { useReducedMotion } from "../ui/useReducedMotion";
import { HitCounter } from "../ui/HitCounter";
import { useExploreColumns } from "./exploreColumns";
import { matchIn } from "./handleMatch";
import { competitionRanks } from "./leaderboardRanks";
import { LiftedSticker } from "./LiftedSticker";
import { dayBadge, ticketDayNumber } from "./pileDays";
import { textWidth } from "./pileLayout";
import { pileOrigin } from "./pileOrigin";
import { shownDays, usePilePages } from "./pilePages";
import { LoadingHeap, StickerPile } from "./StickerPile";
import { useKeptPlace } from "./useKeptPlace";
import "./ExploreScreen.css";

interface Props {
  onOpenArtist: (person: Person) => void;
  onOpenMyBoard: () => void;
  /** An artist's board covers Explore while its loaded pages stay mounted. */
  covered: boolean;
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
          <span className="row-names__detail">
            <span className={isMe ? "artist-row__you" : undefined}>
              {isMe ? t(($) => $.explore.you) : toPerson(person).name}
            </span>
            {trail && <ArrowRight className="artist-row__arrow" size={12} aria-hidden />}
          </span>
        </span>
        {trail ?? <ArrowRight className="artist-row__arrow" size={18} aria-hidden />}
      </button>
      <span id={boardId} hidden>
        {boardLabel(person, meId, t)}
      </span>
    </li>
  );
}

/** A row's figure; the complete Gratitude amount sizes itself to the row's available room. */
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
  const amount = formatCount(value);
  return (
    <span className="figure figure--gratitude" style={{ "--figure-length": amount.length }}>
      <GratitudeIcon size={17} />
      <Trans
        i18nKey={($) => $.explore.figure.gratitude}
        values={{ amount }}
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
  markOf,
  id,
  className,
  disabled = false,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (tab: T) => void;
  label: string;
  labelOf: (tab: T) => string;
  markOf?: (tab: T) => ReactNode;
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
          data-tab={tab}
          data-press
          disabled={disabled}
          onClick={() => onChange(tab)}
        >
          {markOf?.(tab)}
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

  useEffect(
    () => () => {
      const pending = fading.current;
      fading.current = null;
      pending?.fade.cancel();
    },
    [],
  );

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
    const settleFade = () => {
      const pending = fading.current;
      if (pending?.fade !== fade) return;
      // The list may have left the screen. Release its fade before updating the selected rows,
      // so a later metric starts a new transition even when no list is currently attached.
      fading.current = null;
      fade.cancel();
      dealRows(pending.to);
    };
    // Cancellation is an interrupted transition: show the latest selection just as on completion.
    fade.finished.then(settleFade, settleFade);
  };

  useLayoutEffect(() => {
    const rows = list.current;
    if (!deal.current) return;
    deal.current = false;
    if (!rows) return;
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

/** One board's rows, ranked; a board nobody is on yet says so. */
function LeaderboardRows({
  board,
  rows,
  meId,
  open,
  listRef,
}: {
  board: Leaderboard;
  rows: LeaderboardRow[];
  meId: string;
  open: Open;
  listRef?: Ref<HTMLOListElement>;
}) {
  const { t } = useTranslation();
  const ranks = competitionRanks(rows.map((row) => row.value));
  return (
    <ol ref={listRef} className="leaderboard" data-board={board}>
      {rows.length === 0 && (
        <li className="leaderboard-empty">{t(($) => $.explore.thisWeek.empty[board])}</li>
      )}
      {rows.map((row, i) => (
        <PersonRow
          key={row.person.id}
          person={row.person}
          meId={meId}
          open={open}
          lead={
            <>
              <span className="rank" data-rank={ranks[i]}>
                {ranks[i]}
              </span>
              <Avatar person={row.person} size={40} />
            </>
          }
          trail={<Figure board={board} value={row.value} />}
        />
      ))}
    </ol>
  );
}

/**
 * When the week's boards start over: Tokyo's Monday midnight, in the person's own time, as the tickets'
 * refill line is. Streaks are counted as they stand, so Streak has no such line.
 */
function WeekResets({ weekStart }: { weekStart: string }) {
  const { t } = useTranslation();
  const resets = new Date(Date.parse(weekStart) + WEEK_MS);
  return (
    <p className="fine muted week-resets">
      {t(($) => $.explore.thisWeek.resets, {
        day: formatWeekday(resets),
        time: formatTimeOfDay(resets),
      })}
    </p>
  );
}

interface WeekProps {
  leaderboards: Explore["leaderboards"];
  meId: string;
  open: Open;
  board: Leaderboard;
  shown: Leaderboard;
  onSelect: (board: Leaderboard) => void;
  listRef: Ref<HTMLOListElement>;
  showTitle: boolean;
}

/** The metric's own mark: a heart, the hit counter's speed lines, or the streak's flame. */
function LeaderboardMark({ board }: { board: Leaderboard }) {
  if (board === "mostGratitude")
    return <GratitudeIcon className="leaderboard-mark" size={18} aria-hidden />;
  if (board === "longestStreak")
    return <StreakIcon className="leaderboard-mark" size={18} aria-hidden />;
  return (
    <span className="leaderboard-mark leaderboard-mark--combo" aria-hidden>
      <span className="hit-counter__lines">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

/** Metric index tabs and their ranking share one paper, on a phone or beside the pile on an iPad. */
function ThisWeek({
  leaderboards,
  meId,
  open,
  board,
  shown,
  onSelect,
  listRef,
  showTitle,
}: WeekProps) {
  const { t } = useTranslation();
  return (
    <section className={`${REVEAL} explore-section this-week`}>
      {showTitle && (
        <h2 className="title-label week-title">{t(($) => $.explore.thisWeek.title)}</h2>
      )}
      <div className="leaderboard-paper">
        <SlidingTabs
          tabs={LEADERBOARDS}
          value={board}
          onChange={onSelect}
          label={t(($) => $.explore.thisWeek.leaderboards)}
          labelOf={(b) => t(($) => $.explore.leaderboards[b])}
          markOf={(b) => <LeaderboardMark board={b} />}
          id="leaderboard"
          className="leaderboard-tabs"
        />
        <div role="tabpanel" id="leaderboard-panel" aria-labelledby={`leaderboard-${board}`}>
          <LeaderboardRows
            board={shown}
            rows={leaderboards[shown]}
            meId={meId}
            open={open}
            listRef={listRef}
          />
        </div>
      </div>
      {shown !== "longestStreak" && <WeekResets weekStart={leaderboards.weekStart} />}
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

/** This week in outline while it loads, with the same selected metric and paper in every layout. */
function ThisWeekLoading({ board, showTitle }: { board: Leaderboard; showTitle: boolean }) {
  const { t } = useTranslation();
  return (
    <section className="explore-section this-week" aria-hidden="true">
      {showTitle && (
        <h2 className="title-label week-title">{t(($) => $.explore.thisWeek.title)}</h2>
      )}
      <div className="leaderboard-paper">
        <div
          className="sliding-tabs leaderboard-tabs"
          data-selected={board}
          style={{ "--i": LEADERBOARDS.indexOf(board), "--n": 3 } as CSSProperties}
        >
          <span className="sliding-tabs__label" />
          {LEADERBOARDS.map((b) => (
            <button
              key={b}
              type="button"
              data-tab={b}
              className={b === board ? "selected" : ""}
              disabled
            >
              <LeaderboardMark board={b} />
              {t(($) => $.explore.leaderboards[b])}
            </button>
          ))}
        </div>
        <ol className="leaderboard" data-board={board}>
          <PersonRowsLoading rows={3} ranked />
        </ol>
      </div>
    </section>
  );
}

/** Today's floor in outline while the pile loads; the stickers fall in once it has. */
function PileLoading() {
  const { t } = useTranslation();
  const [date] = useState(() => dayBadge(ticketDayNumber(Date.now())));
  return (
    <div className="sticker-pile" aria-hidden="true">
      <div className="pile-day__edge">
        <span className="pile-day__badge is-today">
          {t(($) => $.explore.pile.todayBadge, { date })}
        </span>
      </div>
      <LoadingHeap />
    </div>
  );
}

/** A quiet invitation to lift a sticker and find its Original Artist. */
function PileIntro() {
  const { t } = useTranslation();
  return (
    <p className="pile-intro">
      <HandPointing size={18} weight="bold" aria-hidden />
      <span className="keep-phrases">{t(($) => $.explore.pile.invitation)}</span>
    </p>
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
        <h2 className="keep-phrases">
          {t(($) => $.explore.search.notFound.title, { handle: formatHandle(query) })}
        </h2>
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
function Stickers({
  explore,
  meId,
  open,
  visible,
}: {
  explore: Explore;
  meId: string;
  open: Open;
  visible: boolean;
}) {
  const { loaded, end, reachEnd } = usePilePages(explore.pile);
  const [now] = useState(() => Date.now());
  const newest = loaded.stickers[0];
  // This phone's day, unless the server's newest sticker is already on a later one.
  const today = Math.max(
    ticketDayNumber(now),
    newest ? ticketDayNumber(Date.parse(newest.sticker.sealedAt)) : -Infinity,
  );
  const days = useMemo(() => shownDays(loaded, today), [loaded, today]);
  // Paging in the sheet runs in the pile's reading order: newest day, newest sticker first.
  const order = useMemo(() => days.flatMap(({ stickers }) => stickers.toReversed()), [days]);
  // By id, so a fresh first page landing above it doesn't swap the sticker in the sheet.
  const [liftedId, setLiftedId] = useState<string | null>(null);
  const lifted = order.findIndex((pile) => pile.sticker.id === liftedId);
  return (
    <>
      <StickerPile
        days={days}
        today={today}
        end={end}
        onReachEnd={() => {
          if (visible) reachEnd();
        }}
        meId={meId}
        onLift={(pile) => setLiftedId(pile.sticker.id)}
        visible={visible && lifted < 0}
      />
      {lifted >= 0 && (
        <LiftedSticker
          stickers={order}
          index={lifted}
          onIndexChange={(index) => setLiftedId(order[index]?.sticker.id ?? null)}
          onClose={() => setLiftedId(null)}
          onGoToBoard={(artist) => {
            setLiftedId(null);
            open(artist);
          }}
          originOf={pileOrigin}
        />
      )}
    </>
  );
}

export function ExploreScreen({ onOpenArtist, onOpenMyBoard, covered }: Props) {
  const { t } = useTranslation();
  const me = useMe();
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
  // The metric belongs to Explore, so switching views, searching, or turning an iPad keeps it.
  const { board, shown, select, list } = useRowDeal("mostGratitude");
  // The pile's images are picked by your NSFW opt-in: a change loads it from its first page again,
  // and the old pages go with <Stickers>, which the loading state unmounts.
  const resetKey = useNsfwOptInKey("explore");
  const explore = useApiQuery(resetKey, (api) => api.explore());
  const open: Open = (person) => (person.id === me.id ? onOpenMyBoard() : onOpenArtist(person));

  const scroller = useRef<HTMLDivElement>(null);
  const columns = useExploreColumns(scroller);
  const showsPile = columns === 2 || view === "stickers";
  const { keepPlace } = useKeptPlace(scroller, columns, {
    visible: showsPile && q === "",
    resetKey,
  });

  // Beside each other both show; otherwise the switch picks one.
  const showsWeek = columns === 2 || view === "thisWeek";
  const week = !showsWeek ? null : explore.state === "ready" ? (
    <ThisWeek
      leaderboards={explore.data.leaderboards}
      meId={me.id}
      open={open}
      board={board}
      shown={shown}
      onSelect={select}
      listRef={list}
      showTitle={columns === 2}
    />
  ) : explore.state === "loading" ? (
    <ThisWeekLoading board={board} showTitle={columns === 2} />
  ) : null;
  const pile = !showsPile ? null : explore.state === "ready" ? (
    <Stickers explore={explore.data} meId={me.id} open={open} visible={!covered && q === ""} />
  ) : explore.state === "loading" ? (
    <PileLoading />
  ) : null;
  // With no switch there's no tab panel either.
  const panel =
    columns === 1
      ? { role: "tabpanel", id: "explore-view-panel", "aria-labelledby": `explore-view-${view}` }
      : {};

  return (
    <div ref={scroller} className="explore" data-columns={columns}>
      {/* The search runs across the top: over the view switch in one column, over the pile and This
          week in two. */}
      <div className="explore-search">
        <label className="text-field artist-search">
          <At size={20} aria-hidden />
          <input
            ref={field}
            type="search"
            placeholder={t(($) => $.explore.search.placeholder)}
            aria-label={t(($) => $.explore.search.label)}
            value={query}
            onChange={(e) => {
              if (!q && e.target.value.trim().replace(/^@/, "")) keepPlace();
              setQuery(e.target.value);
            }}
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
      </div>
      {columns === 1 && !q && (
        <SlidingTabs
          tabs={VIEWS}
          value={view}
          onChange={setView}
          label={t(($) => $.explore.views.label)}
          labelOf={(v) => t(($) => $.explore.views[v])}
          id="explore-view"
          className="view-switch"
        />
      )}
      {/* A search's results take the whole screen in one column, and the pile's column in two, with
          This week staying beside them. */}
      {q ? (
        <div className="explore-results">
          {searched ? (
            <SearchResults query={searched} meId={me.id} open={open} announce={setSearchStatus} />
          ) : null}
        </div>
      ) : null}
      {/* Search hides the pile without unmounting its pages or resetting its cursor. */}
      <div className="explore-view" hidden={q !== ""} {...panel}>
        {/* One loading line for the view, however many columns it shows. */}
        {explore.state === "loading" && <LoadingStatus />}
        {explore.state === "failed" ? (
          <Failed
            said={(reason) => t(($) => $.explore.failed.explore, { reason })}
            query={explore}
          />
        ) : (
          <>
            {columns === 1 && week}
            {showsPile && <PileIntro />}
            {pile}
          </>
        )}
      </div>
      {columns === 2 && <div className="explore-week">{week}</div>}
    </div>
  );
}
