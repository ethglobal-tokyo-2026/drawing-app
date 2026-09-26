# Giving and Receiving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `docs/superpowers/specs/2026-09-26-giving-receiving-design.md`: Receiving (ReceiveGiftDialog), the rest of Giving, the gift message, foil and the artist chip, and Send gratitude's entry, on a data layer shaped like `docs/database-schema-and-rest-api.md`.

**Architecture:** `src/api/` holds the REST doc's shapes (`contract.ts`), an `ApiClient` interface with one method per route, `deviceApi` (the build, from device storage) and a dev-and-test mock composed from one overlay per feature. Screens load through `useApiQuery`; components take view models, never contract types. Streams build their parts alone in worktrees; the coordinator mounts them on the board last.

**Tech Stack:** React 19, TypeScript 7 (`erasableSyntaxOnly`: no enums or parameter properties), Vite 8, vitest 5 with happy-dom, oxlint and oxfmt, `@line/liff` 2.31, `@phosphor-icons/react` 2.1.10.

---

## Ground rules

- **The spec decides behavior, copy and numbers.** Sections below name its sections; don't restate or change them. Copy marked PROPOSED in the spec is approved.
- **Branches:** each stream works in its own worktree. An isolated subagent runs `git switch -c <branch> gifts/base` inside its worktree, then `pnpm install --frozen-lockfile --prefer-offline`. Never `git -C` another worktree. Report the branch; the coordinator merges.
- **Checks before reporting:** `pnpm --filter frontend lint`, `pnpm --filter frontend typecheck`, `pnpm --filter frontend test`, `pnpm exec oxfmt --check apps/frontend`. Not `check:full`.
- **AGENTS.MD holds:** its vocabulary (Sticker, Giving, Receiving, Gift Message, Gift Claim Token, Original Artist, Packaging, pull tab…), its banned words, its comment and test rules, American English. Approved code names: ReceiveGiftDialog, PendingGiftsNotificationBadge, GivenStickerSilhouette, UsedStickerSilhouette.
- **Never mention** where this app's code came from, in code, comments, commits or docs.
- **Commits:** conventional, one per task. No AI attribution lines.
- **Existing pieces to use, not rebuild:** `ui/Key`, `ui/LabelButton`, `ui/QuietLink`, `ui/Sheet`, `ui/PhotoSticker`, `ui/useFocusTrap`, `ui/useReducedMotion`, `ui/useBackToClose` (overlays on the Back stack), `stickers/StickerFigure`, `stickers/Duration` and `formatDuration`, `stickers/format.ts`, `giving/GiftBag`, `line/friendPicker.ts` (the one `liff.shareTargetPicker` call).
- **Screenshots:** 390 × 844, beside the drafts' renders in `~/projects/ethglobal-tokyo-2026-design-drafts/drawing-app/.impeccable/review/screens-local/` (files named by gallery step, e.g. `0NN-receive--…jpeg`). List every difference in the report.

## Status and what the streams build on

- **Wave 0 is done** on `gifts/base` (a227b8f, merged with `main` at 7315ac7, fixtures at a09bd17). What exists, as built:
  - `api/contract.ts`, `api/apiClient.ts` (`ApiClient`, `ApiError`, `apiError()`), `api/apiContext.ts`, `api/ApiProvider.tsx`, `api/useApi.ts`, `api/useApiQuery.ts`, `api/views.ts` (`PersonView`, `StickerView`, `toPerson`, `toSticker`, `toMs`), `api/deviceApi.ts`, `api/ApiRoot.tsx` (mounted in `main.tsx` inside `LineGate`), `api/testing.tsx` (`emptyApi(overrides)`, `renderWithApi(ui, client)`, `TEST_OWNER`), `gratitude/GratitudeMiniGamePlaceholder.tsx` (its props type is `GratitudeMiniGameProps`).
  - **The mock:** `api/mock/index.ts`'s `createMockApi({ base, latencyMs })` applies `receivingOverlay`, `givingOverlay` and `boardOverlay` in that order. An overlay is `(below: ApiClient) => Partial<ApiClient>`: it answers the methods it overrides and calls `below` for the rest. Overlays share state through their own module's exports (Receiving exports the stickers it gave out; Giving exports the gifts its pretend friend received; the board overlay reads both).
  - **Fixtures:** `people.mika`, `people.ken`, `people.bob` are Explore's demo artists (`artists/demoArtists.ts`) as `Person`s, with `avatarUrl` pictures; `imagesOf(artKey)` uses `stickerArtUrl`, 224 × 224, the art doubling as its mask.
- **Already on `main` from the Explore work (a teammate's PR), which this plan builds on rather than duplicating:**
  - `sticker-board/ArtistBoard.tsx`: someone else's board, with an interim foil (`.placed-sticker.is-foiled`, a static colored drop-shadow edge in `StickerBoard.css`) and a local `ArtistChip` function.
  - `PlacedSticker`'s `foil` and `glow` props.
  - `giving/GiveSheet.tsx` and `StickerPicker.tsx`: giving to a demo artist in the app. It records the gift as `sent` with a `to` handle in the device's gift store, and `giftTag(from, to)` prints "For @mika". `GivenStickerSilhouette` takes `to`.
  - `stickers/useKeptStickers.ts`, `sticker-board/stat-board/StatCork.tsx`.
- **The Foil stream replaces the interim foil and chip:** `StickerFoil` goes where `.is-foiled` is (PlacedSticker's `foil` prop now renders it), the drop-shadow rule goes, and `ArtistBoard.tsx` imports the shared `ArtistChip` in place of its local one. One foil, one chip.

## File structure

| Path (under `apps/frontend/src/`)                   | Responsibility                                                                                                              | Wave / stream  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `api/contract.ts`                                   | The REST doc's shapes and these routes' requests and responses                                                              | 0              |
| `api/apiClient.ts`                                  | `ApiClient`, `ApiError`, `apiError()`                                                                                       | 0              |
| `api/ApiProvider.tsx`                               | The client in React context; `useApi()`                                                                                     | 0              |
| `api/useApiQuery.ts` (+test)                        | One load: loading, failed with retry, ready with refresh                                                                    | 0              |
| `api/deviceApi.ts` (+test)                          | The build's client until the server exists                                                                                  | 0              |
| `api/views.ts` (+test)                              | Contract → view models shared by several screens (`PersonView`, `StickerView`)                                              | 0              |
| `api/mock/index.ts`                                 | `createMockApi()`: `deviceApi` plus each feature's overlay, with latency                                                    | 0              |
| `api/mock/fixtures.ts`                              | Fixture builders (`sticker`, `boardSticker`, `gift`, `imagesOf`) and `people` (mika, ken, bob), from Explore's demo artists | 0              |
| `api/mock/receiving.ts`, `giving.ts`, `board.ts`    | Each feature's overlay                                                                                                      | 1: that stream |
| `api/testing.tsx`                                   | `renderWithApi()` for UI tests                                                                                              | 0              |
| `gratitude/GratitudeMiniGamePlaceholder.tsx` (+css) | Stands in for the Mini-game                                                                                                 | 0              |
| `receiving/*`                                       | ReceiveGiftDialog, the pull tab, the refusals, the Send gratitude sheet                                                     | 1: Receiving   |
| `giving/*` (new files), `line/friendPicker.ts`      | "Can't find them?", the badge, the giver's notice, the gift message                                                         | 1: Giving      |
| `stickers/StickerFoil.*`, `stickers/ArtistChip.*`   | Foil and the artist chip                                                                                                    | 1: Foil        |
| `sticker-board/*` (listed in its section)           | The board on the client, silhouettes, the detail's states                                                                   | 1: Board data  |
| `public/terms.html`, `public/privacy.html`          | The placeholder pages                                                                                                       | 1: Receiving   |

---

## Wave 0 (coordinator): the data layer

Branch `gifts/base` from `main`. Everything later branches from it.

### Task 0.1: The contract

**Files:** Create `api/contract.ts`.

- [ ] Transcribe the REST doc's shared shapes and these routes exactly, times as `IsoTime` strings:

```ts
/**
 * The REST API's shapes, as docs/database-schema-and-rest-api.md writes them, for the routes the app
 * calls. Temporary: once the Hono routes exist the app takes these from Hono's client, and this goes.
 */
export type IsoTime = string;

/** Anyone, as other signed-in people see them. */
export interface Person {
  id: string;
  handle: string | null;
  /** Null after account deletion. */
  lineDisplayName: string | null;
  linePictureUrl: string | null;
}

export interface Sticker {
  id: string;
  /** Printed as No.0147. */
  number: number;
  /** The Original Artist. */
  artist: Person;
  ownerId: string;
  /** Seconds on the drawing clock. */
  timeUsed: number;
  width: number;
  height: number;
  /** The cut line, an SVG path in image pixels. */
  outline: string;
  contentHash: string;
  /** CDN URLs. */
  images: { png: string; mask: string; spec: string; rim: string; flat: string };
  tokenId: string | null;
  mintTxHash: string | null;
  sealedAt: IsoTime;
}

export interface Placement {
  /** False: waiting in the sticker tray. */
  onBoard: boolean;
  x: number;
  y: number;
  scale: number;
  /** Degrees, clockwise. */
  rotation: number;
  z: number;
}

export interface StickerPlacement {
  stickerId: string;
  /** Null until your board first places it. */
  placement: Placement | null;
  /** Null shows NEW. */
  seenAt: IsoTime | null;
  /** The sticker tray's order. */
  arrivedAt: IsoTime;
}

export type GiftStatus = "packed" | "sent" | "received" | "taken_out" | "returned";
export type EscrowStatus = "missing" | "pending" | "claimed" | "rejected" | "expired_returned";

export interface Gift {
  id: string;
  stickerId: string;
  giverId: string;
  receiverId: string | null;
  status: GiftStatus;
  escrowStatus: EscrowStatus;
  packedAt: IsoTime;
  expiresAt: IsoTime;
  sentAt: IsoTime | null;
  takenOutAt: IsoTime | null;
  receivedAt: IsoTime | null;
  returnedAt: IsoTime | null;
}

export interface Gratitude {
  giftId: string;
  method: "tap" | "stroke" | "shake";
  hits: number;
  total: number;
  peakMult: number;
  peakTier: 0 | 1 | 2 | 3 | 4;
  originalArtistGratitudeShare: number;
  gameConfigVersion: string;
  recordedAt: IsoTime;
  seenByGiverAt: IsoTime | null;
}

export interface BoardSticker extends StickerPlacement {
  sticker: Sticker;
  /** False: given away; a GivenStickerSilhouette on the board, an empty spot in the tray. */
  held: boolean;
  /** Set when held is false. */
  givenTo: { receiver: Person; receivedAt: IsoTime } | null;
  openGift: { id: string; status: "packed" | "sent" } | null;
}

export interface TransferTrailEntry {
  giftId: string;
  giver: Person;
  receiver: Person;
  receivedAt: IsoTime;
  gratitude: Gratitude | null;
}

export type LiffContextType = "utou" | "room" | "group" | "square_chat" | "external" | "none";

export type ReceiveRefusal =
  | "group_chat"
  | "own_gift"
  | "already_received"
  | "taken_back"
  | "gift_returned"
  | "gift_expired"
  | "not_deposited";

export interface ErrorBody {
  /** Stable snake_case code. */
  error: string;
  detail?: string;
}

/** GET /api/sticker-boards/:userId */
export interface StickerBoardResponse {
  owner: Person;
  /** In the sticker tray's order. */
  boardStickers: BoardSticker[];
}
/** GET /api/stickers/:stickerId */
export interface StickerDetailResponse {
  sticker: Sticker;
  owner: Person;
  /** Newest first. */
  transferTrail: TransferTrailEntry[];
}
/** GET /api/gifts/pending: your packed and sent gifts, newest first. */
export interface PendingGiftsResponse {
  gifts: Array<{ gift: Gift; sticker: Sticker }>;
}
/** POST /api/gifts/preview and /receive take the same body. */
export interface GiftClaimRequest {
  giftClaimToken: string;
  liffContextType: LiffContextType;
}
export interface GiftPreviewResponse {
  giver: Person;
  expiresAt: IsoTime;
  receivable: boolean;
  refusal: ReceiveRefusal | null;
  /** Only when receivable. */
  sticker: Sticker | null;
}
export interface ReceiveGiftResponse {
  gift: Gift;
  sticker: Sticker;
  stickerPlacement: StickerPlacement;
}
```

- [ ] `pnpm --filter frontend typecheck`. Commit: `feat: add the REST API's shapes for the gift screens`.

### Task 0.2: The client, its errors and its provider

**Files:** Create `api/apiClient.ts`, `api/ApiProvider.tsx`.

```ts
// api/apiClient.ts
export interface ApiClient {
  /** GET /api/sticker-boards/me */
  stickerBoard: () => Promise<StickerBoardResponse>;
  /** PATCH /api/sticker-boards/me/sticker-placements/:stickerId */
  saveStickerPlacement: (stickerId: string, placement: Placement) => Promise<StickerPlacement>;
  /** POST /api/sticker-boards/me/sticker-tray/seen */
  markTraySeen: (stickerIds: readonly string[]) => Promise<{ newStickerCount: number }>;
  /** GET /api/stickers/:stickerId */
  stickerDetail: (stickerId: string) => Promise<StickerDetailResponse>;
  /** GET /api/gifts/pending */
  pendingGifts: () => Promise<PendingGiftsResponse>;
  /** POST /api/gifts/preview */
  previewGift: (body: GiftClaimRequest) => Promise<GiftPreviewResponse>;
  /** POST /api/gifts/receive */
  receiveGift: (body: GiftClaimRequest) => Promise<ReceiveGiftResponse>;
}

/** A refused or failed request: the HTTP status and the REST doc's error body. Status 0 is no answer. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: string;
  constructor(status: number, body: ErrorBody) {
    super(body.detail ? `${body.error}: ${body.detail}` : body.error);
    this.name = "ApiError";
    this.status = status;
    this.code = body.error;
    this.detail = body.detail;
  }
}

/** Any failure as an ApiError, so screens switch on one shape. */
export const apiError = (error: unknown): ApiError =>
  error instanceof ApiError
    ? error
    : new ApiError(0, {
        error: "network",
        detail: error instanceof Error ? error.message : String(error),
      });
```

`ApiProvider` takes `client: ApiClient` and puts it in a context; `useApi()` throws `"useApi() needs an ApiProvider"` outside one.

- [ ] Typecheck; commit `feat: add the API client interface and its errors`.

### Task 0.3: `useApiQuery` (TDD)

**Files:** Create `api/useApiQuery.ts`, `api/useApiQuery.test.tsx`.

```ts
export type Query<T> =
  | { state: "loading" }
  | { state: "failed"; error: ApiError; retry: () => void }
  | { state: "ready"; data: T; refresh: () => void };

/** Loads once per `key`; `retry` and `refresh` load again. A stale answer (the key moved on) is dropped. */
export function useApiQuery<T>(key: string, load: (api: ApiClient) => Promise<T>): Query<T>;
```

- [ ] Tests (happy-dom, `renderWithApi` from Task 0.6): ready with the data; a rejection becomes `failed` with an `ApiError` (a plain `Error` becomes status 0, `network`), and `retry` loads again; a new `key` drops the old answer; `refresh` keeps the old data shown until the new one lands. Run, watch them fail, implement, pass. Commit `feat: load API data per screen with retry`.

### Task 0.4: View models

**Files:** Create `api/views.ts`, `api/views.test.ts`.

```ts
export interface PersonView {
  id: string;
  /** Printed with formatHandle; null until the handle prompt is answered. */
  handle: string | null;
  /** The LINE name; the handle when LINE's is gone. */
  name: string;
  pictureUrl?: string;
}
export interface StickerView {
  id: string;
  no: number;
  artist: PersonView;
  timeUsed: number;
  width: number;
  height: number;
  outline: string;
  urls: StickerUrls; // stickers/stickerUrls.ts
  /** Milliseconds. */
  sealedAt: number;
}
export const toPerson: (p: Person) => PersonView;
export const toSticker: (s: Sticker) => StickerView; // an empty image URL is none
export const toMs: (t: IsoTime) => number;
```

- [ ] Tests: `toSticker` maps `number` to `no`, ISO to ms, and leaves out empty `mask`, `spec` and `rim`; `toPerson` falls back to `@handle`, then "Someone", for the name. Commit `feat: map API shapes to what screens draw`.

### Task 0.5: `deviceApi` (TDD)

**Files:** Create `api/deviceApi.ts`, `api/deviceApi.test.ts`.

`createDeviceApi({ me, listStickers, updatePlacement, gifts, seen })`, with today's storage passed in (`stickers/stickerStorage.ts`, `giving/giftStore.ts`'s `deviceGiftStore()`, `sticker-board/tray/traySeen.ts`), so tests pass fakes. `me` is `() => Person` with id `"me"`, from LINE's profile.

- **`stickerBoard`:** every stored sticker, oldest first, as a `BoardSticker`: the sticker (artist and owner `me`, `number` from `no`, images as object URLs made once per sticker and kept for the page, empty where the record has none; `flat` falls back to the PNG), `placement` from the record's (`on`→`onBoard`, `s`→`scale`, `r`→`rotation`) or null, `seenAt` from `readSeen()`, `arrivedAt` the seal, `held: true`, `givenTo: null`, `openGift` from `giftStatusBySticker` (packed or sent).
- **`saveStickerPlacement`:** `updatePlacement` with the record's names; returns the `StickerPlacement`.
- **`markTraySeen`:** adds the IDs to `saveSeen`; `newStickerCount` counts the rest unseen.
- **`stickerDetail`:** the sticker, owner `me`, an empty `transferTrail`; 404 `sticker_not_found` for an unknown ID.
- **`pendingGifts`:** packed and sent gifts from the gift store, newest first, each as a `Gift` (the store's times as ISO; `escrowStatus` `pending`) with its sticker.
- **`previewGift`, `receiveGift`:** reject `new ApiError(501, { error: "needs_server", detail: "Opening a gift needs the app's server, which isn't running yet." })`.
- [ ] Tests over fakes for each rule above. Commit `feat: answer the API from this device until the server exists`.

### Task 0.6: The mock's frame, fixtures and the test render

**Files:** Create `api/mock/index.ts`, `api/mock/fixtures.ts`, `api/mock/receiving.ts`, `api/mock/giving.ts`, `api/mock/board.ts`, `api/mock/stickers/{sunset,cat,koi}.svg`, `api/testing.tsx`. Modify `main.tsx`, `env.d.ts`, `apps/frontend/.env.example`.

- **Overlays:** each feature file exports `(base: ApiClient, fixtures: Fixtures) => Partial<ApiClient>`; wave 0 leaves them returning `{}`. `createMockApi({ base, latencyMs })` spreads them over `base` and delays every call by `latencyMs` (default 250).
- **Fixtures:** people `alice` ("Alice Sato", @alice), `ken` ("Ken Mori", @ken), `bob` ("Bob Tanaka", @bob), each with an SVG face; builders `person()`, `sticker()`, `boardSticker()`, `gift()` taking overrides. The three SVG stickers carry their own white die-cut edge, 240 × 240, and double as their masks.
- **`main.tsx`:** inside `LineGate`, `ApiProvider` gets `createDeviceApi(...)` in a build. On the dev server (`import.meta.env.DEV && import.meta.env.VITE_API_MOCK !== "off"`), it gets `createMockApi` from a dynamic `import("./api/mock")`, so the build drops the mock; the app renders once the client is ready.
- **`api/testing.tsx`:** `emptyApi(overrides?)`, an `ApiClient` whose board and gifts are empty and whose preview and receive reject `needs_server`, with any method replaced by `overrides`; and `renderWithApi(ui, client = emptyApi())`, which renders under `ApiProvider` and returns the root for `act`.
- [ ] Add `VITE_API_MOCK` to `env.d.ts` and `.env.example` ("off" uses this device's data on the dev server). Build, then `rg -n "Alice Sato" apps/frontend/dist` finds nothing. Commit `feat: add the dev server's and the tests' API mock`.

### Task 0.7: The Mini-game's placeholder

**Files:** Create `gratitude/GratitudeMiniGamePlaceholder.tsx`, `gratitude/gratitude-placeholder.css`.

Props: `{ giftId: string; sticker: GratitudeMiniGame's sticker prop; giver: { handle; displayName; pictureUrl? }; onClose: () => void }`. Over the whole phone (portal to `.phone`), on the Liner: "The gratitude Mini-game is being built", the props as indented JSON in a scrolling `pre`, and a Close label. On the Back stack; Escape closes. Commit `feat: stand in for the gratitude Mini-game until it lands`.

---

## Wave 1, stream Receiving

Branch `gifts/receiving`. Spec: "Opening a gift link", "Receiving: ReceiveGiftDialog", "Send gratitude: the Mini-game's entry" (the sheet only), "The Terms and Privacy Policy placeholders".

### Task R1: The pull tab's physics (TDD)

**Files:** Create `receiving/pullTab.ts`, `receiving/pullTab.test.ts`.

```ts
export const PULL = {
  travelPx: 250,
  gain: 0.82,
  snapAt: 0.86,
  ticks: 40,
  spring: { stiffness: 340, damping: 32 },
  keyStep: 0.2,
  holdMs: 520,
  holdSlopPx: 10,
  doubleTapMs: 340,
  autoTearMs: 720,
} as const;
/** The tear a drag asks for: from where it started, dx along the strip, clamped to 0..1. */
export function tearTarget(start: number, dx: number): number;
/** One spring step toward the target; returns the new tear and its velocity. */
export function springStep(
  tear: number,
  velocity: number,
  target: number,
  dtMs: number,
): { tear: number; velocity: number };
/** Ticks passed between two tears. */
export function ticksBetween(from: number, to: number): number;
/** Snapped: at or past snapAt. */
export const snapped: (tear: number) => boolean;
/** The tear after an arrow key: ±keyStep; the fifth press from 0 reaches the snap. */
export function keyTear(
  tear: number,
  key: "ArrowRight" | "ArrowUp" | "ArrowLeft" | "ArrowDown",
): number;
```

- [ ] Tests: a 250px drag from 0 reaches 0.82, clamped at 1 and 0; the spring settles on its target and never overshoots past 1; `ticksBetween(0, 0.1)` is 4; `snapped` at 0.86 and not at 0.85; five right arrows from 0 snap. Implement; commit `feat: add the pull tab's physics`.

### Task R2: The dialog's flow (TDD)

**Files:** Create `receiving/receiveFlow.ts`, `receiving/receiveFlow.test.ts`.

A pure reducer:

```ts
export type ReceiveScreen =
  | { step: "opening" }
  | { step: "sealed"; preview: GiftPreviewView }
  | { step: "torn"; preview: GiftPreviewView; accepting: boolean; failed?: string }
  | { step: "received"; stickerId: string }
  | { step: "refused"; refusal: RefusalKind; giver: PersonView | null }
  | { step: "failed"; message: string };
export type RefusalKind = ReceiveRefusal | "gift_not_found" | "needs_server";
/** A receivable preview, mapped: `sticker` is set, since only a receivable preview has one. */
export interface GiftPreviewView {
  giver: PersonView;
  sticker: StickerView;
  expiresAt: number;
}
```

Events: `previewed` (a receivable preview → sealed; a refusal → refused), `previewFailed` (an `ApiError`: `gift_not_found`, `needs_server` and the refusal codes → refused; anything else → failed), `tore` (sealed → torn), `accept` (torn → accepting), `received`, `acceptFailed` (a refusal code → refused; else back to torn with `failed`).

- [ ] Tests, one per transition; the refusal codes are the REST doc's (a contract with the server). Commit `feat: add Receiving's steps`.

### Task R3: The bag's receive additions

**Files:** Modify `giving/GiftBag.tsx`, `giving/GiftBag.css`.

- `size?: "give" | "receive"` (the spec's receive dimensions); `tear?: number` as `--gift-tear` driving the tape's shortening, the tab's travel and tip, the loop and the split; `state` gains `"torn"` (tab gone, film gone, mouth open) and `"opened"` (empty); `stamp?: "one-to-one" | "opened" | "taken-back" | "returned"`; `insideUrl?` (the sticker blurred inside, for the split's tint).
- The tab becomes a real `button` with `role="slider"`, outside the bag's `aria-hidden` art, only when `onTear` is passed; Giving's uses stay as they are.
- [ ] Giving's tests still pass; screenshot the bag at tears 0, 0.5 and torn. Commit `feat: let the gift bag tear open`.

### Task R4: ReceiveGiftDialog

**Files:** Create `receiving/ReceiveGiftDialog.tsx`, `receiving/receive-gift-dialog.css`, `receiving/refusals.ts`, `receiving/ReceiveGiftDialog.test.tsx`.

Props: `{ giftClaimToken: string; onClose: (receivedStickerId?: string) => void }`. It reads the context (`liff.getContext()?.type ?? "none"`), calls `previewGift` then `receiveGift` through `useApi()`, runs `receiveFlow`, and draws each screen per the spec: the sealed bag with the hint, the pull (pointer, hold, double-tap, keys, all through `pullTab.ts`), the reveal with `StickerFigure`, the Accept sheet (`Sheet`; Accept a grape large `Key` with `HandHeart`; Not now a `QuietLink` with `X`; the terms line linking `/terms.html` and `/privacy.html` through `liff.openWindow({ url, external: false })`), accepting, and the refusal table's screens (`refusals.ts` maps a `RefusalKind` to title, line, stamp and button). On the Back stack (`useBackToClose`), portaled to `.phone`, LINE's header "A gift from @alice". Reduced motion as the spec says.

- [ ] UI tests with `renderWithApi` and a client whose `previewGift`/`receiveGift` are fakes: each refusal kind shows its title; the slider's End key tears it and shows Accept; Accept calls `receiveGift` once and `onClose` gets the sticker ID; a network failure on Accept shows the line and a second Accept retries; Not now calls `onClose()` with nothing. Commit `feat: add ReceiveGiftDialog`.

### Task R5: The gift path, LIFF Mock's context and the mock's gifts

**Files:** Modify `app/openedView.ts` (+test), `app/App.tsx`, `line/liff.ts`, `api/mock/receiving.ts`.

- `viewFromPath` becomes `openedFrom(pathname): { view: View; giftClaimToken?: string }`: `/g/{token}` is the board with that token. App resets the address to `/` for it too, and renders `ReceiveGiftDialog` over the board while it holds a token; `onClose(id)` clears it and, with an ID, passes it to the board as `freshId`.
- `initMock` sets LIFF Mock's `getContext` to `{ type: "utou", … }`.
- `api/mock/receiving.ts`: the spec's "The mock's gift links", from the fixtures; a received demo gift joins the mock's board overlay's received list (export `receivedStickers` from `api/mock/receiving.ts` for `board.ts` to read).
- [ ] Tests: `openedFrom` for `/g/abc`, `/draw`, `/explore`, `/`. Commit `feat: open a gift message's link in ReceiveGiftDialog`.

### Task R6: The Send gratitude sheet

**Files:** Create `receiving/SendGratitudeSheet.tsx`, `receiving/send-gratitude-sheet.css` (+test).

Props: `{ gift: { id: string }; sticker: StickerView; giver: PersonView; onSend: () => void; onLater: () => void }`. The spec's copy (the artist-or-giver variant), a pink large `Key` "Send gratitude" (`Heart` fill), a `QuietLink` "Later" (`Clock`), in a floating `Sheet`. The coordinator mounts it after the landing.

- [ ] Test: the drew-it and from-someone variants; the key and the link call their props. Commit `feat: ask to send gratitude after receiving`.

### Task R7: The placeholder pages

**Files:** Create `apps/frontend/public/terms.html`, `apps/frontend/public/privacy.html`.

- Standalone HTML in the Liner and Mona Sans (the Google Fonts link from `index.html`), with the Seal Yellow placeholder label at the top.
- Terms: the GNU Manifesto verbatim from `curl -s https://www.gnu.org/gnu/manifesto.en.html`, body text only, with its copyright and permission notice unchanged.
- Privacy: the "I'd just like to interject for a moment" copypasta, under the note the spec gives.
- [ ] Open both on the dev server. Commit `feat: add placeholder Terms and Privacy Policy pages`.

---

## Wave 1, stream Giving

Branch `gifts/giving`. Spec: "Giving" (all of it) and "The gift message".

### Task G1: The picker's full list (TDD)

**Files:** Modify `line/friendPicker.ts`, `line/friendPicker.test.ts`.

- `sendToOneFriend(line, messages, { anyChat?: boolean })`: `isMultiple: anyChat === true`. The name stays; one call.
- [ ] Test: the option reaches `shareTargetPicker` as `isMultiple: true`, and its absence as `false`. Commit `feat: let LINE's picker show every chat`.

### Task G2: "Can't find them?"

**Files:** Create `giving/CantFindThem.tsx` (+test); modify `giving/Giving.tsx`, `giving/giveFlow.ts` (+test), `giving/Giving.css`.

- The quiet link under "Send in a LINE chat" swaps the sheet's content to CantFindThem, with a back button; both rows per the spec. "Show all my chats" calls `flow.chooseLineChat({ anyChat: true })`, and the flow remembers it for "Send in LINE". "Not friends in LINE yet?" calls `liff.openWindow({ url: "https://line.me/R/nv/addFriends", external: true })`.
- [ ] Tests: the full-list choice reaches the sender; back returns to the give sheet. Commit `feat: help find a friend who isn't in LINE's list`.

### Task G3: The gift message and its hero (TDD)

**Files:** Modify `giving/giftMessage.ts` (+test), `giving/localGiftBackend.ts`, `giving/Giving.tsx`; create `giving/gift-message-hero.png`; delete `giving/config.ts`; remove `VITE_GIFT_MESSAGE_HERO_URL` from `env.d.ts` and `.env.example`.

- The spec's table. `heroUrl` comes from `new URL(heroPng, location.origin)` (the imported PNG), sent only when it's `https:`.
- The hero: render `GiftBag` sealed, with no tag, at 1040 × 1040 on the Liner in a one-shot page on the dev server, screenshot it with Playwright, keep the PNG under 1 MB, then delete the page.
- [ ] Tests: the texts; no hero over http; one over https. Commit `feat: redesign the gift message`.

### Task G4: PendingGiftsNotificationBadge

**Files:** Create `giving/PendingGiftsNotificationBadge.tsx`, `giving/pending-gifts-badge.css` (+test), `api/mock/giving.ts`.

Props: `{ gifts: Array<{ giftId: string; sticker: StickerView }>; onOpen: (stickerId: string) => void }` (sent gifts, newest first; the coordinator passes them). The spec's look, text, label and press.

- `api/mock/giving.ts`: a pretend friend (fixture `bob`) receives each gift you send 5s after it's sent: the overlay's `pendingGifts` drops it, and it keeps a `receivedGifts` map (sticker ID → receiver and time) that `board.ts` reads for `held: false` and `givenTo`.
- [ ] Tests: one and several; the label; a tap opens the newest. Commit `feat: show gifts on their way`.

### Task G5: The giver's notice and the sent line

**Files:** Create `giving/GiftReceivedNotice.tsx`, `giving/gift-received-notice.css`, `giving/noticedGifts.ts` (+tests); modify `giving/Giving.tsx`.

- Props: `{ sticker: StickerView; receiver: PersonView; receivedAt: number; mask?: string; onClose: () => void }`. The spec's copy, prop and motion; portaled to `.phone`, on the Back stack.
- `noticedGifts.ts`: which received gifts this device has shown the notice for (localStorage, like `traySeen.ts`); `nextToNotice(received)` returns the newest unnoticed and marks all.
- "Sealed and sent" takes the spec's line.
- [ ] Tests: `nextToNotice` shows the newest once; the notice's copy. Commit `feat: tell the giver who received their sticker`.

---

## Wave 1, stream Foil

Branch `gifts/foil`. Spec: "Foil and the artist chip".

### Task F1: StickerFoil

**Files:** Create `stickers/StickerFoil.tsx`, `stickers/sticker-foil.css`; modify `stickers/StickerFigure.tsx` (a `foil?: "board" | "detail" | "sheet"` prop, placing `StickerFoil` first), `styles/tokens.css` (the six foil colors, if missing).

- The spec's band, bands, motion (`--foil-i` from the sticker's No. for the stagger), curls and reduced motion.
- [ ] Screenshot a fixture sticker with foil at each width, still and mid-glint. Commit `feat: add holo foil for stickers someone else drew`.

### Task F2: ArtistChip

**Files:** Create `stickers/ArtistChip.tsx`, `stickers/artist-chip.css` (+test).

Props: `{ artist: PersonView; variant?: "artist" | "by"; bare?: boolean }`. The spec's sizes, ring, copy and accessibility.

- [ ] Test: role, label and both variants' text. Commit `feat: add the artist chip`.

### Task F3: The first-load chip layer

**Files:** Create `sticker-board/ArtistChipLayer.tsx`, `sticker-board/artist-chip-layer.css` (+test).

Props: `{ chips: Array<{ id: string; artist: PersonView; box: { x: number; y: number; w: number; h: number } }>; board: { W: number; H: number }; onDone: () => void; reduced: boolean }`. The spec's placement, overlap drop, stagger, `by-flash`, removal on `animationend`, z-index 900, `aria-hidden`.

- [ ] Test: overlapping chips drop 46px; placement clamps. Commit `feat: name the artists of foil stickers as the board opens`.

---

## Wave 1, stream Board data

Branch `gifts/board`, from `gifts/base` merged with `main` once the cleanup's bundle split and review fixes land. Spec: "The board, the tray and the detail", "Send gratitude: the Mini-game's entry" (the detail's key).

### Task B1: The board's stickers from the client

**Files:** Modify `sticker-board/boardSticker.ts` (+test), `sticker-board/StickerBoard.tsx`, `sticker-board/tray/StickerTray.tsx`, `sticker-board/tray/traySeen.ts` callers; create `api/mock/board.ts`'s overlay.

- `boardSticker.ts`: `toBoardSticker(b: ApiBoardSticker): BoardSticker` (import the contract's as `ApiBoardSticker`) (the view: today's fields plus `artist: PersonView`, `held`, `givenTo`, `openGift`), and `placeUnplaced(list)` giving null placements a `freeSpot`, which the board saves through `saveStickerPlacement`.
- The board loads with `useApiQuery("sticker-board", (api) => api.stickerBoard())`; saves go through the client. `owner` is kept for foil.
- [ ] Left: the tray's NEW still reads and writes `traySeen` itself (the same storage `deviceApi.markTraySeen` uses); move it to `markTraySeen`.
- `api/mock/board.ts`: `stickerBoard` is the base's plus received stickers (from `receiving.ts`), with `held: false` and `givenTo` for gifts `giving.ts`'s friend received.
- [x] Tests: the mapping; unplaced stickers get spots once. The board's existing tests pass. Commit `feat: load the Sticker Board through the API client`.

### Task B2: Where a gift is

**Files:** Modify `sticker-board/StickerBoard.tsx`, `sticker-board/GivenStickerSilhouette.tsx` (+test), `sticker-board/StickerDetail.tsx` (+test).

- The spec's table: `openGift.status === "sent"` leaves the board and the tray; `held === false` draws the silhouette with `givenTo` ("No.0147 → @bob", its label); the detail's "On its way" note and "You gave it to @bob · 9.23".
- [x] The detail's rows: "On its way" and "You gave it to @bob"; a received gift's silhouette from `givenTo`.
- [ ] The board's and tray's `sent` row (gone, the badge has it): waits for G4's badge. Until then a sent sticker keeps its silhouette, and opens among your stickers.

### Task B3: The detail's Send gratitude

**Files:** Modify `sticker-board/StickerDetail.tsx` (+test).

- For a sticker you hold that someone else gave you: `stickerDetail` when it opens; the Transfer Trail's newest entry to you with no gratitude makes Send gratitude the key (pink, `Heart` fill) and Give label stock under it. `onSendGratitude(gift, sticker, giver)` is a new prop the coordinator connects to the placeholder.
- [x] Tests: thanked and unthanked. Commit `feat: send gratitude from a received sticker's detail`.

---

## Wave 2 (coordinator): on the board

- [ ] Merge the four streams into `gifts/base` in the order Foil, Giving, Receiving, Board data, running the checks after each.
- [ ] Mount in `StickerBoard.tsx`: the badge (from `pendingGifts`' sent gifts) in the header opposite the name, kept clear by the knob and toolbar; the notice (`nextToNotice` over `givenTo`); `ArtistChipLayer` on open and for a landing; foil on held stickers whose artist isn't the owner (board 5px, detail 6px, tray sheets 3px); the chip in `StickerToolbar`'s top row and the detail's fine print; ", by @alice" in `PlacedSticker`'s label.
- [ ] After a received sticker lands, `SendGratitudeSheet`; Send gratitude there and in the detail opens `GratitudeMiniGamePlaceholder`.
- [ ] Screenshots of every new screen at 390 × 844 beside the drafts, differences listed; 360 and 430 for the dialog and the badge.
- [ ] `superpowers:requesting-code-review` over the whole branch; fix what it finds.
- [ ] The checks, the build, and `rg -n "Alice Sato" apps/frontend/dist` finding nothing.
- [ ] Squash into a few commits, merge into `main`, remove the worktrees, and drop this plan.
