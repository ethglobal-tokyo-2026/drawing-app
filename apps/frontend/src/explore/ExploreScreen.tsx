import { Fragment, useEffect, useState, type ReactNode } from "react";
import { ArtistArt, type ArtKey } from "../artists/ArtistArt";
import { ArtistAvatarArt } from "../artists/ArtistAvatarArt";
import { ARTISTS, artistByHandle, latestArt, type Artist } from "../artists/demoArtists";
import { Label } from "../controls/controls";
import { usePress } from "../controls/usePress";
import { useToast } from "../controls/useToast";
import { AtIcon } from "../icons/AtIcon";
import { CloseIcon } from "../icons/CloseIcon";
import { PaperPlaneIcon } from "../icons/PaperPlaneIcon";
import { useIdentity } from "../identity/useIdentity";
import { formatClock, formatNo } from "../stickers/format";
import { listKeptStickers } from "../stickers/stickerStorage";
import {
  FEED,
  LEADERBOARDS,
  ME,
  THIS_WEEK,
  TODAYS_STICKERS,
  type FeedItem,
  type Leaderboard,
  type Standing,
  type Who,
} from "./exploreData";
import "./ExploreScreen.css";

interface Props {
  onOpenArtist: (handle: string) => void;
  onOpenMyBoard: () => void;
}

/** Days turn over at 4:00, so 2:00 still belongs to yesterday. */
const DAY_TURNOVER_MS = 4 * 60 * 60 * 1000;

const todayBadge = () => {
  const d = new Date(Date.now() - DAY_TURNOVER_MS);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};

const ago = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr`;

/** Someone as an Explore row shows them: a demo artist, or you with your newest sticker. */
interface RowArtist {
  handle: string;
  displayName: string;
  art: ArtKey;
  stickerUrl?: string;
  artist?: Artist;
}

function useMe(): RowArtist {
  const me = useIdentity();
  const [stickerUrl, setStickerUrl] = useState<string>();

  useEffect(() => {
    let url: string | undefined;
    let cancelled = false;
    listKeptStickers().then(
      ([newest]) => {
        if (cancelled || !newest) return;
        url = URL.createObjectURL(newest.blob);
        setStickerUrl(url);
      },
      (error: unknown) => console.error("Your newest sticker failed to load for Explore", error),
    );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  return { handle: me.handle, displayName: me.displayName, art: "sunset", stickerUrl };
}

const asRow = (artist: Artist): RowArtist => ({
  handle: artist.handle,
  displayName: artist.displayName,
  art: latestArt(artist),
  artist,
});

function lookup(who: Who, me: RowArtist, where: string): RowArtist | undefined {
  if (who === ME) return me;
  const artist = artistByHandle.get(who);
  if (!artist) console.error(`${where} names an unknown artist, @${who}`);
  return artist && asRow(artist);
}

function StickerArt({ row, className }: { row: RowArtist; className: string }) {
  return row.stickerUrl ? (
    <img src={row.stickerUrl} alt="" className={`artist-art ${className}`} />
  ) : (
    <ArtistArt art={row.art} className={className} />
  );
}

/** A tappable area that opens someone's sticker board; it presses like a tile. */
function Pressable({
  onPress,
  className,
  label,
  children,
}: {
  onPress: () => void;
  className: string;
  label: string;
  children: ReactNode;
}) {
  const { handlers } = usePress(onPress);
  return (
    <button type="button" className={`pressable ${className}`} aria-label={label} {...handlers}>
      {children}
    </button>
  );
}

function ArtistRow({
  row,
  isMe,
  lead,
  name,
  trail,
  onOpen,
}: {
  row: RowArtist;
  isMe: boolean;
  lead: ReactNode;
  name?: ReactNode;
  trail?: ReactNode;
  onOpen: () => void;
}) {
  return (
    <li className={isMe ? "me" : ""}>
      <Pressable
        className="artist-row"
        onPress={onOpen}
        label={isMe ? "Your sticker board" : `@${row.handle}'s sticker board`}
      >
        {lead}
        <span className="row-names">
          <b>{name ?? `@${row.handle}`}</b>
          <span>{isMe ? "You" : row.displayName}</span>
        </span>
        {trail}
      </Pressable>
    </li>
  );
}

function Figure({ board, value }: { board: Leaderboard; value: number }) {
  if (board === "best-combo") return <span className="figure">×{value}</span>;
  if (board === "longest-streak")
    return (
      <span className="figure">
        {value}
        <small>{value === 1 ? "day" : "days"}</small>
      </span>
    );
  return <span className="figure">{value.toLocaleString("en-US")}</span>;
}

function ThisWeek({ me, open }: { me: RowArtist; open: (who: Who) => void }) {
  const [board, setBoard] = useState<Leaderboard>("most-thanked");
  const standings = THIS_WEEK[board];

  const row = (s: Standing, i: number) => {
    const r = lookup(s.who, me, "A leaderboard row");
    if (!r) return null;
    const gap = i > 0 && s.rank > standings[i - 1].rank + 1;
    return (
      <Fragment key={`${board}-${s.rank}`}>
        {gap && <li className="rank-gap" aria-hidden />}
        <ArtistRow
          row={r}
          isMe={s.who === ME}
          onOpen={() => open(s.who)}
          lead={
            <>
              <span className="rank">{s.rank}</span>
              <StickerArt row={r} className="row-art" />
            </>
          }
          trail={<Figure board={board} value={s.value} />}
        />
      </Fragment>
    );
  };

  return (
    <section className="explore-section">
      <header className="section-head">
        <h2>This week</h2>
        <span className="fine muted">Resets Monday 4:00</span>
      </header>
      <div className="leaderboard-tabs" role="tablist" aria-label="This week's leaderboards">
        {LEADERBOARDS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={board === b.id}
            className={board === b.id ? "selected" : ""}
            onClick={() => setBoard(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>
      <ol className="leaderboard" role="tabpanel">
        {standings.map(row)}
      </ol>
    </section>
  );
}

function FeedPost({ item, me, open }: { item: FeedItem; me: RowArtist; open: (who: Who) => void }) {
  const artist = artistByHandle.get(item.who);
  if (!artist) {
    console.error(`A feed post names an unknown artist, @${item.who}`);
    return null;
  }
  const to = item.kind === "gave" ? (item.to === me.handle ? "you" : `@${item.to}`) : null;
  return (
    <article className="feed-post">
      <Pressable
        className="feed-head"
        onPress={() => open(item.who)}
        label={`@${artist.handle}'s sticker board`}
      >
        <ArtistAvatarArt avatar={artist.avatar} className="feed-avatar" />
        <p>
          <b>@{artist.handle}</b>{" "}
          {to ? (
            <>
              gave a sticker to <b>{to}</b>
            </>
          ) : (
            "made a sticker"
          )}
        </p>
        <span className="fine muted">{ago(item.minutesAgo)}</span>
      </Pressable>
      <ArtistArt art={latestArt(artist)} className="feed-art" />
      <p className="fine muted feed-meta">
        {formatNo(item.no)} · {formatClock(item.timeUsed)} · @{artist.handle}
      </p>
    </article>
  );
}

const DemoNote = () => (
  <p className="fine muted demo-note">Demo material · artists, stickers and figures are authored</p>
);

/** Handles are exact, so search matches from the start of one; results run A to Z. */
function SearchResults({
  query,
  me,
  open,
}: {
  query: string;
  me: RowArtist;
  open: (who: Who) => void;
}) {
  const toast = useToast();
  const q = query.toLowerCase();
  const people: { row: RowArtist; who: Who }[] = [
    { row: me, who: ME },
    ...ARTISTS.map((a) => ({ row: asRow(a), who: a.handle })),
  ];
  const matches = people
    .filter((p) => p.row.handle.toLowerCase().startsWith(q))
    .sort((a, b) => a.row.handle.localeCompare(b.row.handle));

  if (!matches.length)
    return (
      <section className="explore-section search-empty">
        <h2>No one here is @{query} yet</h2>
        <p>
          Handles are exact, so check the spelling with them. If they’re your LINE friend, give them
          a sticker in your chat: accepting it brings them in.
        </p>
        <Label
          small
          hue="aqua"
          icon={<PaperPlaneIcon size={18} />}
          onPress={() => toast.show("Giving in a LINE chat isn’t built yet")}
        >
          Give in a LINE chat
        </Label>
        <DemoNote />
        {toast.node}
      </section>
    );

  return (
    <section className="explore-section">
      <p className="fine muted results-count">
        {matches.length} {matches.length === 1 ? "artist" : "artists"} · A to Z
      </p>
      <ul className="search-results">
        {matches.map(({ row, who }) => (
          <ArtistRow
            key={row.handle}
            row={row}
            isMe={who === ME}
            onOpen={() => open(who)}
            name={
              <>
                @<mark>{row.handle.slice(0, query.length)}</mark>
                {row.handle.slice(query.length)}
              </>
            }
            lead={
              row.artist ? (
                <ArtistAvatarArt avatar={row.artist.avatar} className="result-avatar" />
              ) : (
                <StickerArt row={row} className="result-avatar" />
              )
            }
            trail={
              row.artist && (
                <span className="result-stickers" aria-hidden>
                  {row.artist.board
                    .filter((s) => !s.by)
                    .slice(0, 3)
                    .map((s) => (
                      <ArtistArt key={s.no} art={s.art} className="result-sticker" />
                    ))}
                </span>
              )
            }
          />
        ))}
      </ul>
      <DemoNote />
    </section>
  );
}

export function ExploreScreen({ onOpenArtist, onOpenMyBoard }: Props) {
  const me = useMe();
  const [query, setQuery] = useState("");
  const q = query.trim().replace(/^@/, "");
  const open = (who: Who) => (who === ME ? onOpenMyBoard() : onOpenArtist(who));

  return (
    <div className="explore">
      <label className="artist-search">
        <AtIcon size={20} />
        <input
          type="search"
          placeholder="search artists"
          aria-label="Search artists by handle"
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
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            <CloseIcon size={16} />
          </button>
        )}
      </label>

      {q ? (
        <SearchResults query={q} me={me} open={open} />
      ) : (
        <>
          <section className="explore-section">
            <header className="section-head">
              <h2>Today’s stickers</h2>
              <span className="date-badge">{todayBadge()}</span>
            </header>
            <ul className="todays-stickers">
              {TODAYS_STICKERS.map((who) => {
                const r = lookup(who, me, "Today's stickers");
                if (!r) return null;
                return (
                  <li key={r.handle}>
                    <Pressable
                      className="today-sticker"
                      onPress={() => open(who)}
                      label={who === ME ? "Your sticker board" : `@${r.handle}'s sticker board`}
                    >
                      <StickerArt row={r} className="today-art" />
                      <span className="fine">@{r.handle}</span>
                    </Pressable>
                  </li>
                );
              })}
            </ul>
          </section>

          <ThisWeek me={me} open={open} />

          <section className="explore-section feed">
            {FEED.map((item) => (
              <FeedPost key={item.no} item={item} me={me} open={open} />
            ))}
            <DemoNote />
          </section>
        </>
      )}
    </div>
  );
}
