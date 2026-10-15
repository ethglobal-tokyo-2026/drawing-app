# Kyoto Seika Subjects marked for deletion: implementation plan

> For agentic workers: one lane per part, each on its own branch in its own worktree. Steps use
> checkboxes; tick them as they merge.

**Goal:** BIGWHEEL holds a deal's cloud for 3 seconds to mark its word for deletion; marked words wear a
「トル」 tag wherever they're dealt to BIGWHEEL; nobody else sees or sends anything.

**Spec:** `docs/superpowers/specs/2026-10-15-kyoto-seika-subjects-marked-for-deletion-design.md`

**Order:** API and UI run at once; integration and e2e start once both merge.

## Contract every lane builds to

- Table `kyoto_seika_subjects_marked_for_deletion`: `word` text primary key (a subject's `ja`, 1–64
  characters), `marked_by_user_id` text not null references `users`, `created_at`, `updated_at`
  (`timestamps()`), with its `updated_at` trigger.
- `SessionEnvelope.marksKyotoSeikaSubjects: boolean`: true only when `deps.personSwitch.operatorUserId`
  is set and equals both `session.authenticatedUserId` and `session.selectedUserId`.
- Routes, mounted `.route("/kyoto-seika", kyotoSeikaRoutes(deps))`:
  - `GET /api/kyoto-seika/subjects-marked-for-deletion` → 200 `{ words: string[] }`, oldest mark first
  - `PUT /api/kyoto-seika/subjects-marked-for-deletion/:word` → 204; again → 204, one row
  - `DELETE /api/kyoto-seika/subjects-marked-for-deletion/:word` → 204; again → 204
  - not the operator acting as themself → 403 `operator_only`; a `:word` outside 1–64 characters → 400
  - each change logs `kyotoSeika.subject.marked` or `kyotoSeika.subject.unmarked` with `{ word }`
- `ApiClient`: `subjectsMarkedForDeletion(): Promise<string[]>`, `markSubjectForDeletion(word): Promise<void>`,
  `unmarkSubjectForDeletion(word): Promise<void>`.
- `SubjectBalloons` props: `marked?: ReadonlySet<string>`, `onHold?: (subject: KyotoSeikaSubject) => void`.
  Without `onHold`, every press picks, as today.
- Hold: `HOLD_MS = 3000`, cancelled by release, pointer cancel, leaving the cloud, or a move past
  `HOLD_SLOP_PX = 10`. A hold that fired swallows the click that follows.
- Catalog, `kyotoSeika.marks`: `tag` (en "Cut", ja "トル"), `spoken` (en "{{subject}}, marked for
  deletion", ja "{{subject}}、削除候補"), `markFailed`, `unmarkFailed`, `loadFailed`.

## Lane API: `kyoto-seika-marks-api`

- [ ] `packages/db/src/schema/kyotoSeikaSubjectsMarkedForDeletion.ts`: the table; export it from
      `schema/index.ts` and add it to `allTables`.
- [ ] `pnpm --filter @drawing-app/db db:generate`; rename the migration `0020_kyoto_seika_subject_marks`
      (file and `meta/_journal.json` tag) and append its `updated_at` trigger in
      `updatedAtTriggerStatements`' form, as `0018_person_switch_sessions.sql` ends.
- [ ] `apps/api/src/session/sessionShapes.ts` and `sessionEnvelope()` in `session/personSwitch.ts`: the flag,
      from one exported predicate `marksKyotoSeikaSubjects(config, session)`.
- [ ] `apps/api/src/routes/kyotoSeika.ts` with the three routes; mount it in `app.ts`.
- [ ] `apps/api/src/routes/kyotoSeika.test.ts` (`createTestApp` with the person pair, as
      `personSwitch.test.ts` sets it up):
  - the operator marks one word twice (204, 204), lists it, unmarks twice (204, 204), lists none
  - another person gets 403 `operator_only` from all three and `marksKyotoSeikaSubjects: false`
  - the operator acting as Hana gets 403 and `false`; acting as themself, `true`
  - a 65-character word gets 400
- [ ] Update the frontend's `sessionTestFixtures.ts` envelope with `marksKyotoSeikaSubjects: false`.
- [ ] Checks: api and db lint, typecheck and tests; frontend typecheck; `pnpm format:check`.

## Lane UI: `kyoto-seika-marks-ui`

- [ ] `apps/frontend/src/kyoto-seika/useHold.ts`: pointer handlers for one element per the contract,
      plus `onContextMenu` preventDefault while held; clears its timer on unmount and when `key`
      changes (the cloud's word after a roll).
- [ ] `useHold.test.ts` (fake timers): fires at `HOLD_MS`, not before; release, cancel, leave and a
      move past `HOLD_SLOP_PX` each cancel; the click after a fired hold is swallowed and a short
      press's isn't.
- [ ] `SubjectBalloons.tsx`: the two props; a marked cloud wears the tag and its button's name is
      `spoken`; the pick button takes `useHold` only when `onHold` is given.
- [ ] The tag: run impeccable (`impeccable context` from `apps/frontend`, then its shape step) for a
      red proofreader's 「トル」 on the cloud's edge, clear of the word, legible on a picked (inked)
      cloud too. Check it in a scratch page over the running app at 390 wide, both languages, in
      Chromium and WebKit, screenshots in `data/scratch/kyoto-seika-marks/ui/`. Then build it.
- [ ] `SubjectBalloons.test.tsx`: the tag and the spoken name only on marked words; without `onHold`
      a 3-second press still picks; with it, a short press picks and a held one calls `onHold` and
      doesn't pick.
- [ ] Catalog strings per the contract, each with its `/** … */` comment.
- [ ] Checks: frontend lint, typecheck, `src/kyoto-seika` tests, `pnpm format:check`.

## Lane integration: `kyoto-seika-marks-integration` (after both merge)

- [ ] `ApiClient` and `httpApi.ts`: the three methods; `emptyApi` in `src/api/testing.tsx` gets them.
- [ ] `kyoto-seika/useSubjectsMarkedForDeletion.ts`: loads the words once a deal opens, only when
      `useSessionEnvelope().marksKyotoSeikaSubjects`; `toggle(word)` marks or unmarks at once on
      screen and puts it back if the server refuses; keeps the failure for `ErrorLine`.
- [ ] `KyotoSeikaDeal.tsx`: passes `marked` and `onHold` only for the operator; an `ErrorLine` under the
      deal for a failed load, mark or unmark, with the server's words as detail and Try again.
- [ ] Hook test with a fake `ApiClient`: nothing loads for others; a refused mark puts the word back
      and reports.
- [ ] e2e `apps/frontend/e2e/kyotoSeikaMarks.e2e.ts`, Chromium and WebKit: move the person pair's lock
      from `personSwitching.e2e.ts` into `e2e/personPair.ts` and take it. As BIGWHEEL (`/?as=bigwheel`):
      switch Kyoto Seika Practice Mode on, open a sheet, press a cloud 3 seconds, see the tag and no
      pick; reload, see it still; hold again, see it gone. As a new person, a 3-second press shows no
      tag. In `finally`, unmark what was marked and switch the mode back off for BIGWHEEL.
- [ ] `apps/frontend/src/kyoto-seika/subjects/README.md`: where marks live, and the read-only query
      `sqlite3 -readonly /srv/drawing-api/data/drawing-app.db "select word from
  kyoto_seika_subjects_marked_for_deletion order by created_at"`.
- [ ] Checks: frontend lint, typecheck, `src/kyoto-seika` and `src/api` tests, the new e2e spec and
      `kyotoSeika.e2e.ts` and `personSwitching.e2e.ts` in both engines.

## Before merge to main

- [ ] Code review at low effort, an impeccable critique of the tag, and a read for costs on a phone.
- [ ] Merge, push; deploy on ad0ll's word.
