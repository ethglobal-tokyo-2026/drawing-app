import type { PersonView } from "../api/views";
import { openedFrom } from "../app/openedView";
import { parseStored, readStored, writeStored } from "../ui/deviceStorage";
import { assemblyOf, decodeImage } from "./boardComplete";
import { shownIn, type PlacedBoardSticker } from "./boardSticker";
import { boardLayoutNow } from "./useBoardSize";

/**
 * The last board this phone showed, kept in its storage for the person signed in, so the next open
 * draws it at once and swaps in the fresh board when that lands. It can be one refresh out of date.
 * One board, for one person: signing in as someone else forgets it.
 *
 * It's kept for one build of the app, since the next may read a board's fields differently, and
 * without the stickers' outlines: they were most of its size, and the board draws without them.
 */
export interface KeptBoard {
  owner: PersonView;
  stickers: PlacedBoardSticker[];
}

interface Kept {
  /** The build that kept it. */
  build: string;
  userId: string;
  board: KeptBoard;
}

/** Where the board kept on this device is stored. */
export const KEPT_BOARD_KEY = "draw.lastBoard";
/** This build: the address of its own code, which changes with every deploy. */
const BUILD = import.meta.url;
/** The longest a kept board waits for an idle moment to be written. */
export const KEEP_WRITE_WITHIN_MS = 2000;

/** A kept sticker holds its spot in each layout. The dev server keeps one build across edits. */
const hasSpots = (s: unknown) => typeof s === "object" && s !== null && "placements" in s;

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
  Array.isArray(value.board.stickers) &&
  value.board.stickers.every(hasSpots);

/** The kept board as storage has it; another build's, or one that can't be read, is forgotten. */
function read(): Kept | null {
  const { text } = readStored(KEPT_BOARD_KEY, "The board kept on this phone couldn't be read");
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
  writeStored(KEPT_BOARD_KEY, null, "The board kept on this phone couldn't be forgotten");

/**
 * Forgets the kept board, whoever's it is: its images are the other kind once the NSFW opt-in
 * changes, so the next open waits for the board from the server.
 */
export function forget() {
  forgets += 1;
  kept = null;
  dropWrite();
  removeKept();
}

/** Times the kept board was forgotten: a board loaded before the latest is what it was forgotten for. */
let forgets = 0;
/** How many times the kept board has been forgotten so far. */
export const forgetsSoFar = () => forgets;

/** Read once, as the app's code starts; kept up to date in memory from then on. */
let kept: Kept | null = read();
/** `kept` has changed since storage last had it. */
let unwritten = false;
let cancelWrite: (() => void) | null = null;

function dropWrite() {
  unwritten = false;
  cancelWrite?.();
  cancelWrite = null;
}

function writeKept() {
  const due = unwritten && kept;
  dropWrite();
  if (due)
    writeStored(
      KEPT_BOARD_KEY,
      JSON.stringify(due),
      "The board couldn't be kept on this phone for its next open",
    );
}

/** Safari has no requestIdleCallback, so there the write waits out the longest wait. */
function writeWhenIdle() {
  if (cancelWrite) return;
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(writeKept, { timeout: KEEP_WRITE_WITHIN_MS });
    cancelWrite = () => cancelIdleCallback(id);
  } else {
    const id = setTimeout(writeKept, KEEP_WRITE_WITHIN_MS);
    cancelWrite = () => clearTimeout(id);
  }
}

// A hidden page can be ended without another word, so a board still waiting is written as it hides.
addEventListener("pagehide", writeKept);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") writeKept();
});

/** Forgets the kept board unless it's `userId`'s. */
export function forgetBoardUnlessFor(userId: string): void {
  if (kept && kept.userId !== userId) forget();
}

/** The last board this phone showed `userId`, or null. Someone else's is forgotten. */
export function keptBoardFor(userId: string): KeptBoard | null {
  forgetBoardUnlessFor(userId);
  return kept?.board ?? null;
}

/**
 * Keeps the board as it shows now for `userId`'s next open, without the stickers' outlines, unless it
 * was loaded before the kept board was last forgotten: `loadedAfter` is forgetsSoFar() as its load
 * went out. Storage gets it once the page is idle, or as it's hidden, so a tap or a drop doesn't
 * wait on the write.
 */
export function keepBoard(userId: string, board: KeptBoard, loadedAfter: number): void {
  if (loadedAfter !== forgets) return;
  const stickers = board.stickers.map(({ outline: _outline, ...s }) => s);
  kept = { build: BUILD, userId, board: { owner: board.owner, stickers } };
  unwritten = true;
  writeWhenIdle();
}

/** For tests: reads storage again, as the app's code does when it starts. */
export function readKeptBoardAgain(): void {
  dropWrite();
  kept = read();
}

// As the app's code starts, and while LINE and the sign-in take their turns, the kept board's images
// start decoding (from the browser's cache, usually), so the board can draw them the moment it shows.
if (kept && openedFrom(location.pathname).view === "board") {
  for (const sticker of assemblyOf(shownIn(boardLayoutNow(), kept.board.stickers))) {
    for (const url of sticker.urls) void decodeImage(url);
  }
}
