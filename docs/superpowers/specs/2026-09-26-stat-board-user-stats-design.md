# The stat board's User Stats: design

2026-09-26, split out of `2026-09-26-giving-receiving-design.md`, which builds the data layer this uses (`src/api/`). Not scheduled: someone may be working on the stat board now. Before building it, check `sticker-board/stat-board/` on `main` against this.

**Sources.** `DESIGN` = the design drafts' `drawing-app/` directory; `P` = `DESIGN/prototype`. `DESIGN/DESIGN.md` "The cork back" and "Hit counter", `DESIGN/research/stats-flip-brief.md` and `hits-brief.md`, `P/screens/sketchbook.js` (the cork back), `P/css/components.css` (the hit counter), `docs/database-schema-and-rest-api.md` ("User Stats", `GET /api/sticker-boards/:userId/user-stats`).

**Needs:** the giving and receiving spec's `ApiClient`, with a `userStats` method for `GET /api/sticker-boards/me/user-stats`, and its `deviceApi` and mock.

## The stat board

`StatBoard` draws User Stats from `userStats`, in place of today's `stickers` and `gifts` props. The papers, the turn and the layout stay as they are.

**Props:**

```ts
interface Props {
  /** Whose board: the name card. From `stickerBoard`'s `owner`. */
  person: PersonView;
  /** The REST doc's `UserStats`, mapped; null while loading; the error when the load failed. */
  stats: UserStatsView | ApiError | null;
  onRetry: () => void;
  onFlipBack: () => void;
  flipBackRef: Ref<HTMLButtonElement>;
  ref?: Ref<StatBoardHandle>;
}
```

**What each paper shows:**

| Paper                      | Shows                                                                                           | From                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| The name card              | Picture, LINE name, "@alice · name and picture from LINE"                                       | `person`                                                           |
| The receipt                | "@ALICE" and today's date on top; one row per kind above 0, each with its dot and reason; TOTAL | `gratitude`                                                        |
| The calendar leaf          | The streak in days, and its rule                                                                | `streak`                                                           |
| The notebook scrap (Bests) | Longest streak, Best combo as a hit counter, Most thanks in a day; "None yet" for each at 0     | `bests.longestStreak`, `bests.bestCombo`, `bests.mostThanksInADay` |
| The stamps                 | Made, received, given                                                                           | `made`, `received`, `given`                                        |
| The label-maker tape       | "Since 2026.08.12"                                                                              | `since`                                                            |

**The receipt's rows** (reasons from `P/screens/sketchbook.js:436-438`):

| Row           | Dot   | Reason                                             | Amount                                                                                                   |
| ------------- | ----- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Inspired      | pink  | "Thanks for stickers you gave."                    | `inspired`: your part of tap combos on gifts you gave                                                    |
| Magic         | grape | "Thanks sent a special way."                       | `magic`: your part of stroke and shake combos                                                            |
| As the artist | aqua  | "Came to you when others passed on your stickers." | `asOriginalArtist`: Original Artist Gratitude Shares from gifts of stickers you drew, given on by others |

A row at 0 is left off. With every row at 0, the receipt reads "No gratitude yet. It arrives when someone you give a sticker to thanks you for it." over a TOTAL of 0. The Daily row is gone (the REST doc: only the Mini-game makes gratitude).

**The streak's rule**, under the server's reset (proposed copy):

- With a streak: "Miss a day and it starts over. Days turn over at 4:00 AM."
- Without one: "Not started", then "Draw a sticker today to start one."

**Other changes from today's stat board:**

- **The receipt's rows** get the drafts' styles: a 9px dot, the name at 700 14px, the reason at 12px Graphite indented 16px (`P/screens/sketchbook.css:530-535`).
- **Best combo** is a `HitCounter` (`ui/HitCounter.tsx`, new, 20px here): Figure numerals leaning 11°, HITS in small caps, three pink speed lines off the left, no × (DESIGN.md "Hit counter", `P/css/components.css:356-365`).
- **Flip back** takes Phosphor's arrow-counter-clockwise, as in the drafts.
- **No ENS tape:** there's no ENS name until ENS lands.
- **Loading:** the papers show "–" (read as "not known") until the stats arrive.
- **A failed load** stays on the receipt as a line saying what failed, with Try again as small label stock. The drafts' toast and automatic flip back would make the error vanish.

**`deviceApi`'s User Stats:** `made` is the stickers on this device; `received` and `given` are 0, since nothing can be received without the server; `streak` and `bests.longestStreak` come from seal days under the reset rule; gratitude, `bestCombo` and `mostThanksInADay` are 0; `since` is the earlier of the first visit and the oldest sticker.

## A change to the REST doc

`bests.mostThanksInADay` counts the person's ticket days, from 4:00 in their zone, as the streak does. Proposed; not yet in the doc.
