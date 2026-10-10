# Sticker Board and Explore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close findings 1, 11, 12, 14, 15, and 21 without losing arrangements or hiding failures.

**Architecture:** Own placement writes and reconciliation above tab mounts, within the authenticated account's provider. Keep Explore's pile mounted through search and retain its scroll marker. Repair small interaction and test defects independently.

**Tech Stack:** TypeScript, React, Vitest/happy-dom, existing API query and browser history helpers.

**Spec:** [Functional frontend fixes design](../specs/2026-10-10-functional-frontend-fixes-design.md), “Sticker Board and Explore.”

## Global Constraints

- Retain the current dependency lockfile; no dependency upgrades are part of these fixes.
- Use existing Croquis vocabulary and American English in identifiers, comments, and documentation.
- Put new user-facing copy in `apps/frontend/src/i18n/strings/`, with English, Japanese, and the required interaction comment; follow the Japanese glossary. Developer-slip strings stay English as required by the repository.
- Preserve recoverable user data. Storage uncertainty must produce an explicit recovery state, never silently attach data to another session or discard it.
- All other global constraints in the spec apply to every task.

## Review Focus

- A GET can start before a pending save and finish after that save is acknowledged (B1).
- Derived Large layout writes and manual phone/Large layout edits can overlap on the same sticker (B1).
- A forgotten NSFW image cache or given-away sticker must not reappear through placement reconciliation (B1).
- Search can hide the pile before a scroll debounce fires, or span a screen rotation or opt-in change (B2).
- A repeat callback can synchronously unmount its button and must not schedule another timer (B4).

---

### B1: Preserve board save ordering across mounts — finding 1

**Dependency:** G1's immutable account-bound client and scoped session recovery. This task owns the board-provider addition to `ApiRoot.tsx` after G1 lands.

**Files:** Create `apps/frontend/src/sticker-board/boardPlacementSaves.ts`, `boardPlacementSaves.test.ts`, `BoardPlacementSavesProvider.tsx`. Modify `StickerBoard.tsx`, `StickerBoard.test.tsx`, `useMyStickerBoard.ts`, `largeLayout.ts` in that directory; `apps/frontend/src/api/ApiRoot.tsx`, `testing.tsx`. Retain existing placement/cache tests in verification.

**Interfaces:** Preserve `ApiClient.saveStickerPlacement(stickerId: string, spots: PlacementsRequest): Promise<StickerPlacement>` and `saveLargeLayout(entries: readonly LargeLayoutEntry[]): Promise<StickerPlacement[]>`. Create:

```ts
interface BoardPlacementFailure {
  error: ApiError;
  layouts: ReadonlySet<BoardLayout>;
}
interface BoardPlacementState {
  version: number;
  unsaved: ReadonlyMap<string, BoardPlacementFailure>;
}
class BoardPlacementSaves {
  constructor(api: ApiClient, accountId: string);
  subscribe(changed: () => void): () => void;
  read(): BoardPlacementState;
  activate(): () => void;
  save(sticker: Pick<BoardSticker, "id" | "no">, spots: Spots): void;
  saveDerived(derived: readonly LargeSpot[]): Promise<StickerPlacement[]>;
  readBoard(): Promise<ApiStickerBoard>;
  overridesFor(answer: ApiStickerBoard): ReadonlyMap<string, Spots>;
  pendingSpots(): ReadonlyMap<string, Spots>;
  adopted(answer: ApiStickerBoard): void;
}
```

`ApiStickerBoard` is the API contract's `StickerBoard`, imported with an alias. `Spots`, `BoardLayout`, `LargeSpot`, `BoardSticker` reuse existing feature types. Export `BoardPlacementSavesProvider({children}: {children: ReactNode}): ReactNode` and `useBoardPlacementSaves(): {saves: BoardPlacementSaves; state: BoardPlacementState}`. Extend `useMyStickerBoard({ownLoadOnly = false, placements}: {ownLoadOnly?: boolean; placements?: BoardPlacementSaves} = {}): Query<ApiStickerBoard>` without changing other callers.

- [ ] Port the two retained StickerBoard regression assertions. Hold A, queue B, hide/remount the Board child under the same provider, request C, then release A. Assert one in-flight write per sticker, no older B after C, and newest placement on screen/server. Repeat with a stale GET returning before and after the pending save's acknowledgement. Confirm red with `pnpm --filter frontend exec vitest run src/sticker-board/boardPlacementSaves.test.ts src/sticker-board/StickerBoard.test.tsx`.
- [ ] Implement per-sticker serialization and per-layout local revisions. Merge queued placements with latest revision winning. A response clears only the layouts/revisions it actually sent; retain failed layouts until retry or a newer edit retries them. Different stickers may save concurrently. Keep a stable immutable `read()` snapshot until a transition for `useSyncExternalStore`.
- [ ] Implement read checkpoints in `readBoard`: capture pending/failed revisions at GET start and associate them with the returned response through a WeakMap. Overlay those revisions and newer edits even if an acknowledgement arrived meanwhile. `adopted(answer)` retires acknowledged overrides only after a post-acknowledgement read is adopted; retain the checkpoint's needed values so older answers remain safe. Test a later external placement is accepted after acknowledgement, preventing permanent local overrides.
- [ ] Construct the store once per account/client provider instance above tab mounts; no process-global queue or account registry. `activate` cleanup pauses dispatch and is idempotent under StrictMode. A real account/session departure abandons the controller, stops unsent dispatch, and isolates late completions; a transient StrictMode setup/cleanup reactivates the same store. G1's server guard prevents an already-dispatched request using another account's cookie. This task guarantees tab/remount survival within the account lifetime, not durable delivery after page closure or session teardown; retain the existing cache and visible unsaved warnings without claiming a disk outbox.
- [ ] Route derived Large layout initialization through the store, reserving the affected stickers until its API-sized batch settles. Preserve server conditional initialization; manual edits queued afterward win. Reconcile pending spots into initial cache hydration and server adoption, while newer uncommitted gesture positions win. Remove the component's duplicate queue/failure state. Extend `renderWithApi` with the real provider so remount tests exercise its actual lifetime.
- [ ] Add tests for failed writes while absent and explicit retry, opposite-layout failures, derived initialization overlapping manual edits/remount, batches at `MAX_LARGE_LAYOUT_BATCH + 1`, StrictMode, two concurrent different stickers, account change, and missing/given-away stickers. For NSFW opt-out/`forgetKeptBoard`, assert no obsolete image URLs or prohibited cache writes return through placement overlays.
- [ ] Run `pnpm --filter frontend exec vitest run src/sticker-board/boardPlacementSaves.test.ts src/sticker-board/StickerBoard.test.tsx src/sticker-board/largeLayout.test.ts src/sticker-board/boardSticker.test.ts src/sticker-board/lastBoard.test.ts`; expect all pass, including both stale-GET orderings. Commit: `fix: preserve board saves across tab changes`.

### B2: Preserve Explore pages and position through search — finding 11

**Files:** Modify `apps/frontend/src/explore/ExploreScreen.tsx`, `useKeptPlace.ts`, `ExploreScreen.test.tsx`; create `useKeptPlace.test.tsx` in that directory.

**Interfaces:** `useKeptPlace(explore: RefObject<HTMLElement | null>, columns: 1 | 2, options: {visible: boolean; resetKey: string}): {keepPlace: () => void}`. Reuse the existing `useNsfwOptInKey('explore')` as the query/reset key and current marker restoration helpers.

- [ ] Port the retained Explore regression for phone search. Load an older page, scroll, enter and clear search, then assert the same sticker IDs, day, position and continuation cursor with no repeated older-page request. Run this for Today and This week, and one/two columns. Establish red with `pnpm --filter frontend exec vitest run src/explore/ExploreScreen.test.tsx`.
- [ ] Keep the existing pile mounted with `hidden` during search, preserving the intentional query/opt-in resets. Call `keepPlace()` synchronously before empty search becomes nonempty, so the latest scroll is recorded before geometry disappears. Ignore hidden scroll events, cancel pending hidden measurements, and restore on showing with the existing bounded restoration timings. Clear the marker when resetKey changes.
- [ ] Test search immediately after scrolling, rotation while searching, typing/deleting and Clear, older-page error/retry, and NSFW opt-out during search. Assert the hidden pile is inaccessible to focus/screen readers and does not trigger page requests from hidden geometry. Search-result scroll must not replace the pile's saved marker. Switching Today/This week keeps its current intentional reset behavior; each view's search round trip is covered.
- [ ] Run `pnpm --filter frontend exec vitest run src/explore/ExploreScreen.test.tsx src/explore/keptPlace.test.ts src/explore/useKeptPlace.test.tsx src/explore/pilePages.test.ts`; expect all pass. Commit: `fix: preserve Explore pages and position through search`.

### B3: Show incoming-gift request failures — finding 14

**Files:** Modify `apps/frontend/src/sticker-board/StickerBoard.tsx`, `StickerBoard.test.tsx`, and `apps/frontend/src/i18n/strings/stickerBoard.ts`. Run after B1 to avoid conflicting board edits.

**Interfaces:** Use existing query `gifts-for-you:${giftClosures}` and its failed `{error, retry}` branch. No API or query-state changes.

- [ ] Reject only `giftsForYou` while board and tickets succeed. Assert a persistent localized alert with diagnostic details and Retry; there must be no fabricated zero-count success. Establish red with `pnpm --filter frontend exec vitest run src/sticker-board/StickerBoard.test.tsx`.
- [ ] Include this failed query in the board-alert region and render `ErrorLine`, `errorDetail`, `errorMessage`, and `forYou.retry`. Add `stickerBoard.board.giftsDidntLoad` with documented English/Japanese copy; verify terminology against the glossary. Reuse query error logging.
- [ ] Test repeated retry failure, successful retry clearing the error and showing the badge, language change while failed, and simultaneous ticket/placement errors. Assert retry requests only the failed inbox and existing gift-closure invalidation still works. Rerun the focused file; expect all pass. Commit: `fix: expose failed incoming gift loads`.

### B4: Stop held controls when interrupted — finding 15

**Files:** Modify `apps/frontend/src/ui/useHeldRepeat.ts`, `apps/frontend/src/sticker-board/StickerToolbar.test.tsx`; create `apps/frontend/src/ui/useHeldRepeat.test.tsx`.

**Interfaces:** Preserve `useHeldRepeat(act: () => void)`; add `onLostPointerCapture` to its returned handlers. Existing StepTile handler spreading consumes it. Retain the current repeat timing constants.

- [ ] Port the real-toolbar reproduction with expected no further scale changes after blur. Parameterize hidden, lost capture, pagehide, and interruption before the first repeat. Run `pnpm --filter frontend exec vitest run src/ui/useHeldRepeat.test.tsx src/sticker-board/StickerToolbar.test.tsx` and confirm red.
- [ ] Use one cancellation function for timers and interruption state; install/remove blur, visibility, and pagehide listeners symmetrically. Preserve the existing release-click suppression after a repeat and apply it to interruption. Use a press generation check after invoking `act` so an unmount during that callback cannot reschedule work. Do not introduce new pointer capture behavior.
- [ ] Assert showing/focusing never resumes a hold, a new primary down does, interrupted release/click adds no step, and taps/keyboard activation still work once. Verify unmount leaves no timers/listeners and a callback that unmounts cannot reschedule. Run the focused command plus `src/sticker-board/useBoardGestures.test.tsx`; expect all pass. Commit: `fix: stop held arrangement actions on interruption`.

### B5: Wait for actual sticker-detail closing — finding 12

**Files:** Modify only `apps/frontend/src/sticker-board/StickerDetail.test.tsx`.

**Interfaces:** No production changes. Keep the existing fixture and close callback.

- [ ] Add a controlled animation case: Escape while opening, immediate closing state, no close callback until the held reverse animation completes, then exactly one callback. Confirm the original zero-delay assertion is insufficient with deferred animation completion.
- [ ] Replace that Escape test's `settle()` assumption with `vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce(), {timeout: 1000})`. The timeout is a test failure bound, not a production animation delay. Keep unresolved-request setup and flush React work with awaited `act` when needed; do not globally lengthen sleeps or disable motion.
- [ ] Run `pnpm --filter frontend exec vitest run src/sticker-board/StickerDetail.test.tsx`; expect all pass, including controlled completion. Commit: `test: wait for sticker detail close completion`.

### B6: Make the sheet count assertion independent — finding 21

**Files:** Modify `apps/frontend/src/sticker-board/tray/StickerTray.test.tsx` and the retained review mutation runner only to update its expected outcomes while it remains evidence.

**Interfaces:** No production changes. Expected counts come from fixture construction, never from the status text being tested.

- [ ] Replace the circular count extraction with the current fixture's independently known expected `3`. Add fixture-based cases for one sheet and enough sheets to require the hidden `+N` depth indicator. Keep translation and filter wording assertions separate.
- [ ] Run `pnpm --filter frontend exec vitest run src/sticker-board/tray/StickerTray.test.tsx`; baseline must pass. Reintroduce the retained `999` count mutation in memory; the repaired original test must fail with `999` versus `3`.
- [ ] Update `docs/reviews/2026-10-10-functional-frontend/evidence/board-test-count-mutation.py` to require the original test to fail under mutation, then run it. Its old success criterion intentionally accepted the false pass and is no longer valid. Test the filter's supported empty-state behavior without inventing an unavailable empty filter. Commit: `test: assert Sticker tray sheet counts independently`.
