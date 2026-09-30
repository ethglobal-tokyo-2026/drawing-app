import type { PersonView } from "../api/views";
import { openedFrom } from "../app/openedView";
import { parseStored, readStored, writeStored } from "../ui/deviceStorage";
import { assemblyOf, decodeImage } from "./boardComplete";
import type { BoardStickerView } from "./boardSticker";

/**
 * The last board this phone showed, kept in its storage for the person signed in, so the next open
 * draws it at once and swaps in the fresh board when that lands. It can be one refresh out of date
 * (decision 29). One board, for one person: signing in as someone else forgets it.
 *
 * It's kept for one build of the app, since the next may read a board's fields differently, and
 * without the stickers' outlines: they were most of its size, and the board draws without them.
 */
export interface KeptBoard {
  owner: PersonView;
  stickers: BoardStickerView[];
}

interface Kept {
  /** The build that kept it. */
  build: string;
  userId: string;
  board: KeptBoard;
}

const KEY = "draw.lastBoard";
/** This build: the address of its own code, which changes with every deploy. */
const BUILD = import.meta.url;

const isKept = (value: unknown): value is Kept =>
  typeof value === "object" &&
  value !== null &&
  "build" in value &&
  value.build === BUILD &&
  "userId" in value &&
  typeof value.userId === "string" &&
  "board" in value &&
  typeof value.board === "object" &&
  value.board !== null &&
  "owner" in value.board &&
  "stickers" in value.board &&
  Array.isArray(value.board.stickers);

/** The kept board as storage has it; another build's, or one that can't be read, is forgotten. */
function read(): Kept | null {
  const { text } = readStored(KEY, "The board kept on this phone couldn't be read");
  if (text === null) return null;
  const value = parseStored(text);
  if (isKept(value)) return value;
  if (value === undefined)
    console.error("The board kept on this phone isn't JSON, so it's forgotten:", text);
  // Not forget(): this runs as `kept` is first set, before it can be written.
  removeKept();
  return null;
}

const removeKept = () =>
  writeStored(KEY, null, "The board kept on this phone couldn't be forgotten");

function forget() {
  kept = null;
  removeKept();
}

/** Read once, as the app's code starts; kept up to date in memory from then on. */
let kept: Kept | null = read();

/** Forgets the kept board unless it's `userId`'s. */
export function forgetBoardUnlessFor(userId: string): void {
  if (kept && kept.userId !== userId) forget();
}

/** The last board this phone showed `userId`, or null. Someone else's is forgotten. */
export function keptBoardFor(userId: string): KeptBoard | null {
  forgetBoardUnlessFor(userId);
  return kept?.board ?? null;
}

/** Keeps the board as it shows now for `userId`'s next open, without the stickers' outlines. */
export function keepBoard(userId: string, board: KeptBoard): void {
  const stickers = board.stickers.map(({ outline: _outline, ...s }) => s);
  kept = { build: BUILD, userId, board: { owner: board.owner, stickers } };
  writeStored(
    KEY,
    JSON.stringify(kept),
    "The board couldn't be kept on this phone for its next open",
  );
}

/** For tests: reads storage again, as the app's code does when it starts. */
export function readKeptBoardAgain(): void {
  kept = read();
}

// As the app's code starts, and while LINE and the sign-in take their turns, the kept board's images
// start decoding (from the browser's cache, usually), so the board can draw them the moment it shows.
if (kept && openedFrom(location.pathname).view === "board") {
  for (const sticker of assemblyOf(kept.board.stickers)) {
    for (const url of sticker.urls) void decodeImage(url);
  }
}
