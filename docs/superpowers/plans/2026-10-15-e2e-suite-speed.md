# E2E Suite Speed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the e2e suite's wall time and its stuck-test cost without dropping coverage: stuck actions fail fast, the seal helpers skip the seal ceremony, the slowest specs build their state through the API, and the sealPreview flake is fixed at its cause.

**Architecture:** Test-side changes in `apps/frontend/e2e/` and `playwright.config.ts`, a stored-sticker fixture sealed through the real `POST /api/stickers`, and one app fix in the stat board's cork. Four lanes, each on its own branch and worktree; lane C starts from lane B's fixture commit.

**Tech Stack:** Playwright 1.64 (Chromium + WebKit projects), Vite dev server, Hono API on SQLite, vitest for the app fix.

---

## Measured (2026-10-15, full run at 4 workers: 859 tests, 83.6 worker-min, 21.2 min wall)

- Clicks are 21–24% of test time. 63% of click time is Playwright's retry backoff (0/20/100/100/500 ms) while a target moves or is covered; 55% of all click time is "Back to My board" on the sealed card, covered by the seal ceremony (2.58 s timeline, keys up at 2.32 s).
- `personSwitching.e2e.ts` round trip: 54–62 s; seal 5.8 s, two replays watched to their end 4.2 s, return combo played 3.5 s, slip-hidden proof repeated on 4 switches.
- `timelapse.e2e.ts`: drawing the erased-marks sticker through the UI is 10.8–18.8 s per test (6 tests × 2 browsers); natural playback 3.9–4.7 s.
- No `actionTimeout`: a never-clickable target waits out the whole test (sealPreview's own 90 s). Longest passing action: click 2.8 s, navigation 2.0 s.
- sealPreview `ja` variants fail in WebKit under load: the board turns back from its stat board during the click on 右手. Playwright checks the hit target only on the first event of a click; the Settings note was still reflowing after the switch to Japanese (Zen Kaku Gothic New arrives from Google Fonts in many glyph-range files mid-test); a click whose mousedown and mouseup land on different elements fires on their common ancestor, and the cork flips the board back on any click outside a note or control (`StatCork.tsx` `onCorkClick`). To be confirmed in Task 6.
- 8 workers is no faster than 4 on this Mac (per-test ×2); keep 4.

## Lanes

| Lane | Branch / worktree                             | Tasks | Ports (`E2E_APP_PORT`/`E2E_API_PORT`) |
| ---- | --------------------------------------------- | ----- | ------------------------------------- |
| A    | `e2e-timeouts-ceremony`                       | 1, 2  | 5601 / 9201                           |
| B    | `e2e-stored-stickers`                         | 3, 4  | 5611 / 9211                           |
| C    | `e2e-timelapse` (from lane B's Task 3 commit) | 5     | 5621 / 9221                           |
| D    | `stat-board-cork-press`                       | 6     | 5631 / 9231                           |

Every lane: its own worktree (`git worktree add -b <branch> .claude/worktrees/<branch> main`, then `pnpm install --frozen-lockfile --prefer-offline`), runs only the specs it touches with `E2E_WORKERS=2` and its ports, runs `pnpm check` before reporting, commits per task (conventional commits, no AI attribution). Other lanes and another session run suites at the same time: a timeout in an untouched spec or `ERR_SOCKET_NOT_CONNECTED` is load; rerun only the failed tests once.

To time a spec, add the scratch timing reporter: `--reporter=line,/tmp/e2e-invest/timingReporter.mjs` with `TIMING_OUT=<file>.jsonl` (one JSON line per test with its step tree). Baseline per-test durations for every test: `/tmp/e2e-invest/run1.jsonl`.

---

### Task 1: Actions and navigations fail after 15 s; tests keep the default budget (lane A)

**Files:**

- Modify: `apps/frontend/playwright.config.ts` (`use`)
- Modify: `apps/frontend/e2e/sealPreview.e2e.ts` (the inspect tests' `test.setTimeout(90_000)`)
- Modify: `apps/frontend/e2e/layers.e2e.ts` (`test.setTimeout(180_000)` in "measures repeated empty previews…")
- Modify: `apps/frontend/e2e/stickerFoil.e2e.ts` (`test.setTimeout(120_000)`)
- Modify: `apps/frontend/e2e/layerControlsVisual.e2e.ts` (two `test.setTimeout(90_000)`)
- Modify: `apps/frontend/e2e/layerLayouts.e2e.ts` (`test.setTimeout(90_000)`)

`personSwitching.e2e.ts`'s timeouts are lane B's (Task 4), to keep its edits in one lane.

- [ ] **Step 1:** In `playwright.config.ts`, add to `use`:

```ts
    // A click, wait or load that takes this long has stuck: it fails with its own call log instead
    // of spending the test's whole budget.
    actionTimeout: 15_000,
    navigationTimeout: 15_000,
```

- [ ] **Step 2:** Delete the six `test.setTimeout(...)` lines listed above. Grep for any action or wait given its own timeout over 15 s (`rg -n 'timeout: [0-9_]{5,}' apps/frontend/e2e`): expects and `expect.poll` keep theirs; an action or `waitFor` over 15 s needs a comment saying why, or goes.
- [ ] **Step 3:** Run the changed specs in both browsers: `E2E_APP_PORT=5601 E2E_API_PORT=9201 E2E_WORKERS=2 pnpm --filter frontend test:e2e sealPreview.e2e.ts layers.e2e.ts stickerFoil.e2e.ts layerControlsVisual.e2e.ts layerLayouts.e2e.ts`. Expected: pass (the sealPreview `ja` flake is Task 6's; if it shows, note it and rerun those tests once).
- [ ] **Step 4:** Commit `test(e2e): actions and navigations fail after 15 s, and tests keep the 60 s budget`.

### Task 2: The seal helpers skip the seal ceremony once the sticker is sealed (lane A)

**Files:**

- Modify: `apps/frontend/e2e/helpers.ts` (`sealOnSheet`, `drawAndSeal`)
- Modify: `apps/frontend/e2e/coreLoop.e2e.ts` (keeps watching the whole ceremony)

The ceremony (`src/sticker-creation/sealing/SealCeremony.tsx`) skips on Escape, Enter or Space (a `document` keydown listener) or a press on it, until the sealed card's first key is up. A skip goes to the end only once the server has sealed and the card is mounted (`recorded()`); before that it goes to the wait. The card (`SealedCard.tsx`, `section.sealed-card[role=dialog]`) mounts with the server's answer and is `inert` until its keys are up; once they are, the card's focus trap takes Escape as Back to My board. So Escape is pressed only while the card is mounted and still inert.

- [ ] **Step 1:** Check that Escape reaches the ceremony's `document` listener while it plays, in both browsers: nothing focused under the leaving seal sheet or the drawing screen stops its propagation (`rg -n "Escape" apps/frontend/src/sticker-creation`). If something does, use Space or Enter instead and say why in the comment.
- [ ] **Step 2:** Change `sealOnSheet` and `drawAndSeal`:

```ts
/**
 * The seal sheet's Seal, which seals. Resolves with the sealed card and the sticker's number. The seal
 * ceremony is skipped once the sticker is sealed, as a person can, unless `watch`.
 */
export async function sealOnSheet(page: Page, language: Language, { watch = false } = {}) {
  await sealSheet(page)
    .getByRole("button", { name: say(stickerCreation.sealSheet.seal, language), exact: true })
    .click();
  const card = page.getByRole("dialog", {
    name: startsWith(say(stickerCreation.sealedCard.title, language)),
  });
  if (!watch) {
    // The card mounts with the server's answer and stays inert until its first key is up: Escape
    // skips the ceremony to its end until then, and goes back to the board after.
    const mounted = page.locator(".sealed-card");
    await mounted.waitFor({ state: "attached" });
    if ((await mounted.getAttribute("inert")) !== null) await page.keyboard.press("Escape");
  }
  await expect(card).not.toHaveAttribute("inert");
  const finePrint = card.getByText(/No\.\d+/);
  await expect(finePrint).toBeVisible();
  const no = (await finePrint.textContent())?.match(/No\.\d+/)?.[0];
  if (!no) throw new Error("The sealed card names no sticker number");
  return { card, no };
}

/** Draws a stroke and seals it, 18+ or not. Resolves with the sealed card and the sticker's number. */
export async function drawAndSeal(
  page: Page,
  language: Language,
  { nsfw = false, reach = 1, watch = false } = {},
) {
  await drawStroke(page, language, reach);
  await openSealSheet(page, language);
  if (nsfw) await nsfwSwitch(page, language).check();
  return sealOnSheet(page, language, { watch });
}
```

- [ ] **Step 3:** `coreLoop.e2e.ts` passes `{ watch: true }`: it stays the e2e that sees the ceremony end on its own.
- [ ] **Step 4:** Prove the skip happens: time Seal-click → card keys up with the timing reporter on `coreLoop.e2e.ts` (watching) and `nsfwAtSeal.e2e.ts` (skipping). Expected: the skipped seal's "Back to My board"/"Keep drawing" click takes well under the watched one's ~2.3 s.
- [ ] **Step 5:** Run every spec that seals through the helpers, both browsers, `E2E_WORKERS=2`: `coreLoop nsfwAtSeal tickets detailThoughts kyotoSeika foil markNsfw stickerLaminateFlight giving backNavigation dialogs explore gratitude stickerHandles traySizing trayCutSelection` (`.e2e.ts` each). Expected: pass.
- [ ] **Step 6:** Commit `test(e2e): the seal helpers skip the seal ceremony once the sticker is sealed`.

### Task 3: Stored stickers, sealed through the API (lane B)

**Files:**

- Create: `apps/frontend/e2e/storedStickers.ts` (the helper)
- Create: `apps/frontend/e2e/storedStickers/oneStroke/`, `apps/frontend/e2e/storedStickers/erasedMarks/` (form fields as `form.json`, each file part as its own file)
- Create: the capture, as a kept maintenance command (e.g. `apps/frontend/playwright.stored-stickers.config.ts` + `e2e/storedStickers/capture.ts`, and a `frontend` package script `e2e:stored-stickers`), documented at its top: rerun when the seal form changes

`POST /api/stickers` takes multipart (`apps/api/src/stickers/sealForm.ts`): `ticketUseId`, `timeUsed`, `width`, `height`, `drawnWidth`, `drawnHeight`, `outline`, `png`, `mask`, `flat`, optional `sharp`, `timelapse`, `nsfw`, `kyotoSeikaSubjects`. Sealing inserts the sticker's placement row; the board places an unplaced sticker when it loads. A ticket use comes from `POST /api/tickets/spend` with `{ kind, idempotencyKey }` (`apps/api/src/tickets/tickets.ts` `spendRequestSchema`). `page.request` shares the page's cookies, so it calls the API as the signed-in person.

- [x] **Step 1:** Write the capture: sign in, seal (a) one stroke as `sealFromBoard` draws it and (b) the erased-marks drawing as `timelapse.e2e.ts`'s `sealWithErasedMarks` draws it (move that drawing into a shared module both use, don't copy it), each in Chromium; take each `POST /api/stickers` request (`page.waitForRequest`), parse its body with `new Response(request.postDataBuffer(), { headers: { "content-type": … } }).formData()`, and write every field except `ticketUseId` to the sticker's folder. Report the folder sizes; if they pass ~1 MB together, drop `sharp` if the specs don't need it.
  - Done as `e2e/storedStickers.capture.ts`, with the drawing in `e2e/erasedMarks.ts`. Chromium gives Playwright no body made of files, so the capture wraps the page's `fetch` and reads the form there. Both folders keep `sharp` where the app sent it: well under 1 MB together.
- [x] **Step 2:** Write the helper:

```ts
/** A sticker the drawing screen sealed once, kept in e2e/storedStickers/<name>/ to seal again. */
export type StoredSticker = "oneStroke" | "erasedMarks";

/**
 * Seals a stored sticker for the person signed in on `page`, through the API as the drawing screen
 * does: a ticket spent, and the sticker sealed on it. Resolves with the sticker's id and number.
 */
export async function sealStoredSticker(page: Page, name: StoredSticker) {
  const spent = await page.request.post("/api/tickets/spend", {
    data: { kind: "daily", idempotencyKey: randomUUID() },
  });
  expect(spent.status(), await spent.text()).toBe(201);
  const { ticketUse } = await spent.json();
  const sealed = await page.request.post("/api/stickers", {
    multipart: { ...(await storedForm(name)), ticketUseId: String(ticketUse.id) },
  });
  expect(sealed.status(), await sealed.text()).toBe(201);
  const { sticker } = await sealed.json();
  return { id: sticker.id, no: `No.${sticker.number}` };
}
```

`storedForm` reads `form.json` and each file part (`{ name, mimeType, buffer }`). Check the real status codes and response shapes against the routes and fix the expectations to them.

- Done: 201 and 201 hold. The API refuses any change without `x-croquis-user-id` (and the person switch's `x-croquis-selection-version` when the session has one), so the helper reads both from `GET /api/me` and sends them. `no` is the board's padded form, `formatNo` (`No.0001`); the board places the sticker once it loads again, so callers reload.

- [x] **Step 3:** Prove it: a throwaway run that signs in, seals each stored sticker, reloads, and sees it on the board (`boardSticker`) with its detail's Timelapse playing. Don't commit the throwaway.
- [x] **Step 4:** Commit `test(e2e): stored stickers sealed through the API, and the command that captures them`. Tell the coordinator the commit hash: lane C starts from it.

### Task 4: Person switching builds its state through the API (lane B)

**Files:**

- Modify: `apps/frontend/e2e/personSwitching.e2e.ts`
- Possibly modify: `apps/api/package.json` (`exports`: `./testing/replays` → `./src/gratitude/testReplays.ts`, as `./testing/purchases` is)

- [x] **Step 1:** `same_tab_sticker_round_trip`: replace `sealFromBoard` with `sealStoredSticker(page, "oneStroke")`, then reload and wait for the sticker on the board.
- [x] **Step 2:** The Transfer Trail replays: once Stop is visible, press it and expect it gone, instead of waiting for the replay to end.
- [x] **Step 3:** Record the return combo (BIGWHEEL's, for Hana's gift back) through `POST /api/gratitude` with `tapReplay(GAME_CONFIG.burst)` (`apps/api/src/gratitude/testReplays.ts`) and the gift's id from `stickerSnapshot`; the outward combo stays played, as its failed send and the outbox are under test. Keep every later assertion (both gratitude rows, the Explore leaderboards). If recording it needs the Mini-game's ask dismissed in a way that changes what the test proves, keep it played and say so in the report.
- [x] **Step 4:** `selectionButton` proves the developer slip is hidden (inert, no height, unfocusable, trial click times out, Tab skips it) on each test's first switch only; later switches go straight to the revealed button.
- [x] **Step 5:** `test.describe.configure({ mode: "serial", timeout: 120_000 })`; delete `test.use({ actionTimeout: 15_000 })` (the config sets it now, once Task 1 merges; until then keep it on the branch and delete it in the merge).
- [x] **Step 6:** Run `personSwitching.e2e.ts` in both browsers with the timing reporter; report each test's duration against `/tmp/e2e-invest/run1.jsonl`.
- [x] **Step 7:** Commit `test(e2e): person switching seals, replays and thanks through the API where the UI isn't under test`.

### Task 5: Timelapse tests draw once and skip where the ending isn't under test (lane C)

**Files:**

- Modify: `apps/frontend/e2e/timelapse.e2e.ts`

- [x] **Step 1:** "a sticker with marks outside its cut flies onto the sheet it was drawn on, and back" keeps drawing through the UI and plays to its end: it's the test that drawing records the timelapse.
- [x] **Step 2:** A `detailWithStoredMarks(page, language)` that signs in, seals `erasedMarks` with `sealStoredSticker`, loads the board and opens the detail, returning `{ no, detail, spot }` as `detailWithErasedMarks` does. The Skip, reduced-motion, both iPad and Japanese tests use it.
  - Done as `detailWithStored(page, language, name)`, which "a sticker drawn within its cut…" uses with `oneStroke` too.
- [x] **Step 3:** The iPad and Japanese tests check the playing state (paper on stage, the figure flew, labels), then press Skip and check it ends back in its spot. Reduced motion still plays to its end (its own ending: nothing flies). "a sticker drawn within its cut…" seals `oneStroke` through the API and skips too.
  - A phone's sheet on the iPad on its side has its paper held by the stage's height, where a sheet drawn there is held by its width. That test plays `erasedMarksSideways`, captured on that screen, and expects its paper across the stage's room.
- [x] **Step 4:** Run `timelapse.e2e.ts` in both browsers with the timing reporter; report durations against `/tmp/e2e-invest/run1.jsonl`.
- [x] **Step 5:** Commit `test(e2e): one timelapse test draws its sticker; the rest seal it through the API and skip to the end`.

### Task 6: The stat board's cork flips the board back only on a press that's all cork (lane D)

**Files:**

- Modify: `apps/frontend/src/sticker-board/stat-board/StatCork.tsx` (`onCorkClick`, the cork's `onPointerDown`)
- Test: the stat board's component test beside it (create `StatCork.test.tsx` if none covers the cork)
- Modify: `apps/frontend/e2e/helpers.ts` (`chooseLanguage`) if the reflow is the trigger

Evidence: `/tmp/e2e-invest/traceA` and `/tmp/e2e-invest/traceB1` (unzipped WebKit traces of failing runs): the 右手 click at (281, 673) — "not stable" once, then clicked; the snapshot before the input shows `board-turn is-turned`, the one after `board-turn`. No page errors.

- [ ] **Step 1: Confirm the mechanism.** A throwaway copy of the `ja` inspect tests with an init script logging, with `performance.now()`: capture-phase `pointerdown`/`mousedown`/`pointerup`/`mouseup`/`click` targets and coordinates on `window`, the 右手 radio's box at each, `document.fonts` `loadingdone`, and every `.board-turn` class change. Run it in WebKit with `--repeat-each` until it fails (it needs load; the other lanes provide some). Expected: pointerdown on the radio, pointerup elsewhere after a reflow, click on a common ancestor outside the notes. If the evidence says otherwise, stop and report it before changing code.
- [ ] **Step 2: Write the failing component test**: a press that starts on a note's control and is released on bare cork doesn't flip the board back; a press on bare cork does; Escape still does.
- [ ] **Step 3: Fix the cork**: remember whether the press began on bare cork (`onPointerDown`, the same `ON_CORK` test) and flip back on click only if it did. A keyboard click on a control never flips. Run the component test: passes.
- [ ] **Step 4: Fix the test's timing**: whatever reflows the note after the switch (font glyphs, a status line), `chooseLanguage` waits for it to settle before the next pick, with a wait on the real signal, not a sleep.
- [ ] **Step 5:** Rerun the `ja` inspect tests in WebKit with `--repeat-each=5` under the same load; expected: no turn-back. Run `pnpm --filter frontend test` for the stat board.
- [ ] **Step 6:** Commit `fix(frontend): a press that starts on a stat board control doesn't flip the board back` and, if Step 4 changed it, `test(e2e): settings picks wait for the language switch's reflow`.

### Task 7: Merge and verify (coordinator)

- [ ] Each lane: review its diff (`git diff --stat main...<branch>`, then a code review sized to the diff), merge to main, remove its worktree.
- [ ] Full suite once on main at 4 workers with the timing reporter; compare paired per-test durations with `/tmp/e2e-invest/run1.jsonl`; report wall time, worker-minutes and failures.
- [ ] Delete this plan once merged.
