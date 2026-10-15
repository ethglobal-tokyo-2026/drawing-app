# Kyoto Seika Subjects marked for deletion

Proposal for review. Nothing is built.

## What it does

- On a Kyoto Seika sheet's deal, before Begin, BIGWHEEL presses a subject's cloud for 3 seconds: that
  word is marked for deletion from the subject list. Holding a marked word again unmarks it.
- A marked word's cloud wears a small tag wherever it's dealt to BIGWHEEL again, on any device.
- Nobody else gets any of it: no hold, no tag, no request to the server.
- Marked words keep being dealt, tag and all, until an agent takes them out of `subjects.json` on
  ad0ll's word.

## Decided

1. **Who:** the operator the person switch already configures, `PERSON_SWITCH_OPERATOR_USER_ID`
   (BIGWHEEL), set on the box and in the e2e config. Only while acting as BIGWHEEL: acting as Hana,
   none of it shows, so a recording as Hana never shows a tag.
2. **Where marks live:** the server's database, so a mark made on the phone shows on the iPad, and an
   agent can read them all in one query. Marks kept on the device would stay on the device that made
   them.
3. **A press of any length under 3 seconds picks the word as a tap does today.** A completed hold
   never picks.

## Your call

4. **Unmarking:** hold a marked word again for 3 seconds (recommended), or marks only go when the
   word leaves the list.
5. **The tag:** 「トル」, the proofreader's mark for "delete" that a manga editor writes in red
   (recommended; "Cut" in English), or 「削除」. Its look goes through impeccable, mocked in both
   languages and in WebKit, before it's built.
6. **During the hold:** nothing shows until the tag appears at 3 seconds, which tells you to let go
   (recommended), or the cloud fills to show the hold's progress.
7. **Taking words out:** when you ask, an agent reads the marks, removes those words from
   `subjects.json`, and deploys (recommended). Marks of words no longer on the list stay as a record
   and do nothing. The other way is a scheduled job, which isn't worth building for a hand-edited list.

## Design

### Server

- Table `kyoto_seika_subjects_marked_for_deletion`: `word` (the subject's `ja`, primary key),
  `marked_by_user_id` (references `users`), `created_at`, `updated_at` with its trigger. One migration.
- The session envelope gains `marksKyotoSeikaSubjects`: true only when the authenticated and the
  selected user are both the operator.
- `apps/api/src/routes/kyotoSeika.ts`, mounted at `/kyoto-seika`:
  - `GET /subjects-marked-for-deletion` → `{ words: string[] }`
  - `PUT /subjects-marked-for-deletion/:word` → 204, and again is a no-op
  - `DELETE /subjects-marked-for-deletion/:word` → 204, and again is a no-op
  - anyone else, the operator acting as Hana included: 403 with a new `operator_only` code
- Each mark and unmark writes a `kyotoSeika.subject.marked` or `.unmarked` log line, so
  `/api/logs` shows them without SSH.

### App

- `useHold(ms, onHold)`: pointer handlers for one element. Starts on pointerdown; cancels on
  pointerup, pointercancel, pointerleave or a move past a few px; fires at `ms`; swallows the click
  that follows a fired hold. Pen, finger and mouse alike.
- `SubjectBalloons` takes `marked` (a set of words) and `onHold`, passed only when the envelope's flag
  is on. A cloud's pick button gets the hold's handlers; a roll that deals that cloud a new word during
  the hold cancels it. Without `onHold`, the button is as today.
- `useSubjectsMarkedForDeletion` in `kyoto-seika/`: loads the marked words when a deal opens, only for
  the operator; a hold marks or unmarks at once on screen and puts it back if the server refuses.
- The tag sits on the cloud's edge, clear of its word. The cloud's screen-reader name adds "marked for
  deletion".
- Failures show the app's `ErrorLine` under the deal, with the server's words as detail and Try again:
  a mark or unmark that failed (the cloud goes back as it was), and marks that didn't load (the deal
  works without them).
- Catalog, under `kyotoSeika`: the tag, the spoken suffix, and the three failure lines, in English and
  Japanese.
- The subject list's README says where the marks are and how to read them: one read-only `sqlite3`
  query on the box.

## Limits

- The hold is a long press inside LINE's browser. The app already turns off text selection and iOS's
  press-and-hold menu everywhere (`base.css`), and the e2e test holds in WebKit, the engine LINE uses
  on iOS. Using it in LINE on your phone is the last check.

## Tests

- API: the operator marks, lists and unmarks, each twice; another person, and the operator acting as
  Hana, gets 403 and no flag.
- App: `useHold` fires at 3 seconds, cancels on release, move and cancel, and swallows the click after
  firing; the tag shows only on marked words; without `onHold`, a press of any length picks.
- e2e, Chromium and WebKit, as BIGWHEEL under the person pair's lock that `personSwitching.e2e.ts`
  takes: a 3-second hold tags the word and doesn't pick it; a reload keeps the tag; holding again
  removes it. A new person's 3-second hold shows no tag.

## Build order

1. Table, migration, routes, envelope flag, API tests.
2. `useHold`, the `SubjectBalloons` props, the marks hook, the catalog, unit tests.
3. The tag through impeccable, then built.
4. e2e; then a code review, an impeccable critique and a performance read, each sized to the diff.
5. Merge; deploy when you say.

## Not in this

- Marking anywhere but the deal before Begin (the pair after Begin, a sealed sticker's detail).
- Anyone but the operator marking words.
- Removing marked words automatically.
