import type {
  ActivityEntry,
  Explore,
  LeaderboardRow,
  Person,
  Sticker,
} from "@drawing-app/api/client";
import { At, X } from "@phosphor-icons/react";
import type { TFunction } from "i18next";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { useMe } from "../api/meContext";
import { useApiQuery, type Query } from "../api/useApiQuery";
import { toPerson, toSticker } from "../api/views";
import { useMyAgeStatus } from "../identity/useMyAgeStatus";
import { errorReason } from "../i18n/errorMessage";
import { formatCount } from "../i18n/format";
import { Trans, useTranslation } from "../i18n/react";
import { Duration } from "../stickers/Duration";
import { formatHandle, formatMonthDay, formatNo } from "../stickers/format";
import { veiledFor } from "../stickers/nsfw";
import "../stickers/nsfw-img.css";
import { LabelButton } from "../ui/LabelButton";
import { PhotoSticker } from "../ui/PhotoSticker";
import { REVEAL, revealOnLoad } from "../ui/reveal";
import { Skeleton } from "../ui/Skeleton";
import "./ExploreScreen.css";

interface Props {
  /** A name's link opened the app: <boardOf>.croquis.eth's Sticker Board opens once it's found. */
  boardOf?: string;
  onOpenArtist: (person: Person) => void;
  onOpenMyBoard: () => void;
}

/** Days turn over at 4:00, so 2:00 still belongs to yesterday. */
const DAY_TURNOVER_MS = 4 * 60 * 60 * 1000;
/** Search waits for a pause in typing before it asks the server. */
const SEARCH_AFTER_MS = 250;

const todayBadge = () => formatMonthDay(Date.now() - DAY_TURNOVER_MS);

/** How long ago `at` was, in its largest whole unit; under a minute is just now. */
function ago(at: string, t: TFunction): string {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60_000));
  if (minutes === 0) return t(($) => $.explore.feed.ago.justNow);
  if (minutes < 60) return t(($) => $.explore.feed.ago.minutes, { minutes });
  const hours = Math.floor(minutes / 60);
  return hours < 24
    ? t(($) => $.explore.feed.ago.hours, { hours })
    : t(($) => $.explore.feed.ago.days, { days: Math.floor(hours / 24) });
}

type Leaderboard = "mostGratitude" | "bestCombo" | "longestStreak";

const LEADERBOARDS: Leaderboard[] = ["mostGratitude", "bestCombo", "longestStreak"];

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

/**
 * A handle as a Trans component, plain or bold. Handles can hold anything but "@", so none goes in
 * as a value: Trans would read a "<b>" in it as markup and a "{{x}}" as a variable.
 */
const handleOf = (person: Person) => <>{formatHandle(person.handle ?? "")}</>;
const boldHandleOf = (person: Person) => <b>{formatHandle(person.handle ?? "")}</b>;

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
  const [board, setBoard] = useState<Leaderboard>("mostGratitude");
  const rows: LeaderboardRow[] = leaderboards[board];

  return (
    <section className={`${REVEAL} explore-section`}>
      <header className="section-head">
        <h2>{t(($) => $.explore.thisWeek.title)}</h2>
        <span className="fine muted">{t(($) => $.explore.thisWeek.resets)}</span>
      </header>
      <div
        className="leaderboard-tabs"
        role="tablist"
        aria-label={t(($) => $.explore.thisWeek.leaderboards)}
      >
        {LEADERBOARDS.map((b) => (
          <button
            key={b}
            type="button"
            role="tab"
            aria-selected={board === b}
            className={board === b ? "selected" : ""}
            onClick={() => setBoard(b)}
          >
            {t(($) => $.explore.leaderboards[b])}
          </button>
        ))}
      </div>
      <ol className="leaderboard" role="tabpanel">
        {rows.length === 0 && (
          <li className="fine muted leaderboard-empty">{t(($) => $.explore.thisWeek.empty)}</li>
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
            trail={<Figure board={board} value={row.value} />}
          />
        ))}
      </ol>
    </section>
  );
}

function StickerImage({ sticker, className }: { sticker: Sticker; className: string }) {
  const myAge = useMyAgeStatus();
  const view = toSticker(sticker);
  const nsfw = view.nsfw ? `nsfw-img ${veiledFor(view, myAge) ? "is-veiled" : ""}` : "";
  return (
    <img
      ref={revealOnLoad}
      src={sticker.images.png}
      alt=""
      className={`sticker-image reveal-img ${nsfw} ${className}`}
    />
  );
}

/** What happened, as one sentence with its people in bold. */
function FeedLine({ entry, meId }: { entry: ActivityEntry; meId: string }) {
  if (entry.type === "sealed")
    return (
      <Trans
        i18nKey={($) => $.explore.feed.sealed}
        components={{ artist: boldHandleOf(entry.sticker.artist) }}
      />
    );
  const giver = boldHandleOf(entry.giver);
  return entry.receiver.id === meId ? (
    <Trans i18nKey={($) => $.explore.feed.gaveYou} components={{ giver, b: <b /> }} />
  ) : (
    <Trans
      i18nKey={($) => $.explore.feed.gave}
      components={{ giver, receiver: boldHandleOf(entry.receiver) }}
    />
  );
}

function FeedPost({ entry, meId, open }: { entry: ActivityEntry; meId: string; open: Open }) {
  const { t } = useTranslation();
  const who = entry.type === "sealed" ? entry.sticker.artist : entry.giver;
  return (
    <article className="feed-post">
      <Pressable className="feed-head" onClick={() => open(who)} label={boardLabel(who, meId, t)}>
        <span className="feed-avatar">
          <Avatar person={who} size={36} />
        </span>
        <p>
          <FeedLine entry={entry} meId={meId} />
        </p>
        <span className="fine muted">{ago(entry.at, t)}</span>
      </Pressable>
      <StickerImage sticker={entry.sticker} className="feed-art" />
      <p className="fine muted feed-meta">
        <Trans
          i18nKey={($) => $.explore.feed.caption}
          values={{ number: formatNo(entry.sticker.number) }}
          components={{
            duration: <Duration seconds={entry.sticker.timeUsed} />,
            artist: handleOf(entry.sticker.artist),
          }}
        />
      </p>
    </article>
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

/** Explore's own sections in outline while it loads, so nothing jumps as they fill in. */
function TodayLoading() {
  const { t } = useTranslation();
  return (
    <>
      <p className="visually-hidden" role="status">
        {t(($) => $.explore.loading)}
      </p>
      <section className="explore-section" aria-hidden="true">
        <header className="section-head">
          <h2>{t(($) => $.explore.today.title)}</h2>
          <span className="date-badge">{todayBadge()}</span>
        </header>
        <ul className="todays-stickers">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="today-sticker">
              <Skeleton className="today-art" width={72} height={72} />
              <Skeleton width={52} height={10} />
            </li>
          ))}
        </ul>
      </section>
      <section className="explore-section" aria-hidden="true">
        <header className="section-head">
          <h2>{t(($) => $.explore.thisWeek.title)}</h2>
          <span className="fine muted">{t(($) => $.explore.thisWeek.resets)}</span>
        </header>
        <div className="leaderboard-tabs">
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
      <section className="explore-section feed" aria-hidden="true">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="feed-post">
            <div className="feed-head">
              <Skeleton width={36} height={36} round />
              <Skeleton width="55%" height={13} />
            </div>
            <Skeleton className="feed-art" width={112} height={112} />
            <Skeleton width={150} height={10} />
          </div>
        ))}
      </section>
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

function Today({ explore, meId, open }: { explore: Explore; meId: string; open: Open }) {
  const { t } = useTranslation();
  return (
    <>
      <section className={`${REVEAL} explore-section`}>
        <header className="section-head">
          <h2>{t(($) => $.explore.today.title)}</h2>
          <span className="date-badge">{todayBadge()}</span>
        </header>
        {explore.todaysStickers.length === 0 ? (
          <p className="fine muted">{t(($) => $.explore.today.none)}</p>
        ) : (
          <ul className="todays-stickers">
            {explore.todaysStickers.map((sticker) => (
              <li key={sticker.id}>
                <Pressable
                  className="today-sticker"
                  onClick={() => open(sticker.artist)}
                  label={boardLabel(sticker.artist, meId, t)}
                >
                  <StickerImage sticker={sticker} className="today-art" />
                  <span className="fine">{formatHandle(sticker.artist.handle ?? "")}</span>
                </Pressable>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ThisWeek leaderboards={explore.leaderboards} meId={meId} open={open} />

      <section className={`${REVEAL} explore-section feed`}>
        {explore.activity.map((entry) => (
          <FeedPost
            key={`${entry.type}-${entry.sticker.id}-${entry.at}`}
            entry={entry}
            meId={meId}
            open={open}
          />
        ))}
      </section>
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
  const explore = useApiQuery("explore", (api) => api.explore());
  const open: Open = (person) => (person.id === me.id ? onOpenMyBoard() : onOpenArtist(person));

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
      ) : explore.state === "ready" ? (
        <Today explore={explore.data} meId={me.id} open={open} />
      ) : explore.state === "failed" ? (
        <Failed title={t(($) => $.explore.failed.explore)} query={explore} />
      ) : (
        <TodayLoading />
      )}
    </div>
  );
}
