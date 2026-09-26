import type { Explore, LeaderboardRow, Person } from "@drawing-app/api/client";
import { At, X } from "@phosphor-icons/react";
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
} from "react";
import { useMe } from "../api/meContext";
import { useApiQuery, type Query } from "../api/useApiQuery";
import { toPerson } from "../api/views";
import { errorReason } from "../i18n/errorMessage";
import { formatCount } from "../i18n/format";
import { Trans, useTranslation } from "../i18n/react";
import { formatHandle } from "../stickers/format";
import { LabelButton } from "../ui/LabelButton";
import { PhotoSticker } from "../ui/PhotoSticker";
import { REVEAL } from "../ui/reveal";
import { Skeleton } from "../ui/Skeleton";
import { useReducedMotion } from "../ui/useReducedMotion";
import { dayBadge, exploreDay, pileDays, type PileSticker } from "./pileDays";
import { StickerPile } from "./StickerPile";
import "./ExploreScreen.css";

interface Props {
  /** A name's link opened the app: <boardOf>.croquis.eth's Sticker Board opens once it's found. */
  boardOf?: string;
  onOpenArtist: (person: Person) => void;
  onOpenMyBoard: () => void;
}

/** Search waits for a pause in typing before it asks the server. */
const SEARCH_AFTER_MS = 250;

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
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Opens someone's sticker board: yours, or theirs. */
type Open = (person: Person) => void;

/** A tappable area that opens someone's sticker board; `data-press` gives it the shared press. */
function Pressable({
  onClick,
  className,
  label,
  children,
}: {
  onClick: () => void;
  className: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`pressable ${className}`}
      aria-label={label}
      data-press
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const boardLabel = (person: Person, meId: string, t: TFunction) =>
  person.id === meId
    ? t(($) => $.explore.stickerBoard.yours)
    : t(($) => $.explore.stickerBoard.theirs, { handle: formatHandle(person.handle ?? "") });

function Avatar({ person, size }: { person: Person; size: number }) {
  const view = toPerson(person);
  return <PhotoSticker src={view.pictureUrl} name={view.name} size={size} />;
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
  const isMe = person.id === meId;
  return (
    <li className={isMe ? "me" : ""}>
      <Pressable
        className="artist-row"
        onClick={() => open(person)}
        label={boardLabel(person, meId, t)}
      >
        {lead}
        <span className="row-names">
          <b>{name ?? formatHandle(person.handle ?? "")}</b>
          <span>{isMe ? t(($) => $.explore.you) : toPerson(person).name}</span>
        </span>
        {trail}
      </Pressable>
    </li>
  );
}

function Figure({ board, value }: { board: Leaderboard; value: number }) {
  const { t } = useTranslation();
  if (board === "bestCombo")
    return <span className="figure">{t(($) => $.explore.figure.hits, { hits: value })}</span>;
  if (board === "longestStreak")
    return (
      <span className="figure">
        <Trans
          i18nKey={($) => $.explore.figure.streak}
          count={value}
          components={{ small: <small /> }}
        />
      </span>
    );
  return <span className="figure">{formatCount(value)}</span>;
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
    fade.finished.then(
      () => dealRows(fading.current?.to ?? to),
      // Cancelled: the list went away mid-fade.
      () => {},
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
            <li className="leaderboard-empty fine muted">{t(($) => $.explore.thisWeek.empty)}</li>
          )}
          {rows.map((row, i) => (
            <PersonRow
              key={row.person.id}
              person={row.person}
              meId={meId}
              open={open}
              lead={
                <>
                  <span className="rank">{i + 1}</span>
                  <Avatar person={row.person} size={40} />
                </>
              }
              trail={<Figure board={shown} value={row.value} />}
            />
          ))}
        </ol>
      </div>
      <p className="fine muted week-resets">{t(($) => $.explore.thisWeek.resets)}</p>
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
  const [date] = useState(() => dayBadge(exploreDay(Date.now())));
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
function Failed({ title, query }: { title: string; query: Query<unknown> }) {
  const { t } = useTranslation();
  if (query.state !== "failed") return null;
  return (
    <section className="explore-section" role="alert">
      <h2>{title}</h2>
      <p className="fine muted">{errorReason(query.error)}</p>
      <LabelButton size="sm" onClick={query.retry}>
        {t(($) => $.explore.failed.tryAgain)}
      </LabelButton>
    </section>
  );
}

/** Handles starting with the search first, then ones containing it, A to Z, as the server sorts. */
function SearchResults({ query, meId, open }: { query: string; meId: string; open: Open }) {
  const { t } = useTranslation();
  const results = useApiQuery(`users?handle=${query}`, (api) => api.searchUsers(query));
  if (results.state === "loading")
    return (
      <section className="explore-section">
        <p className="visually-hidden" role="status">
          {t(($) => $.explore.search.searching)}
        </p>
        <ul className="search-results" aria-hidden="true">
          <PersonRowsLoading rows={3} ranked={false} />
        </ul>
      </section>
    );
  if (results.state === "failed")
    return <Failed title={t(($) => $.explore.failed.searchResults)} query={results} />;
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
          const handle = person.handle ?? "";
          const at = handle.toLowerCase().indexOf(query.toLowerCase());
          return (
            <PersonRow
              key={person.id}
              person={person}
              meId={meId}
              open={open}
              name={
                at < 0 ? (
                  formatHandle(handle)
                ) : (
                  <>
                    {formatHandle(handle.slice(0, at))}
                    <mark>{handle.slice(at, at + query.length)}</mark>
                    {handle.slice(at + query.length)}
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

/** The pile, once Explore has arrived. */
function Stickers({ explore, meId, open }: { explore: Explore; meId: string; open: Open }) {
  const days = useMemo(() => pileDays(explore), [explore]);
  // Lane W5b's LiftedSticker lifts the tapped sticker off the pile here. Until it lands, a tap
  // opens its artist's sticker board, as the strip this replaces did.
  const lift = (pile: PileSticker) => open(pile.sticker.artist);
  return <StickerPile days={days} meId={meId} onLift={lift} />;
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
      title={t(($) => $.explore.failed.ensName, { name: `${label}.croquis.eth` })}
      query={person}
    />
  );
}

export function ExploreScreen({ boardOf, onOpenArtist, onOpenMyBoard }: Props) {
  const { t } = useTranslation();
  const me = useMe();
  const [query, setQuery] = useState("");
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
      <Failed title={t(($) => $.explore.failed.explore)} query={explore} />
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
    <div className="explore">
      {boardOf && <OpenBoardOf label={boardOf} open={open} />}
      <label className="artist-search">
        <At size={20} />
        <input
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
            onClick={() => setQuery("")}
          >
            <X size={16} />
          </button>
        )}
      </label>

      {q ? (
        searched && <SearchResults query={searched} meId={me.id} open={open} />
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
