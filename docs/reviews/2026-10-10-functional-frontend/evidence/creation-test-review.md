# Keeper, subject, and timelapse test evidence

Reviewed at `0a46f059807ed33298c8d351492a565d97ca0a0f`. Mutations affect modules loaded by the test runner only. Existing source and tests are unchanged. Captured output replaces the checkout path with `REPO_ROOT`.

## Web Locks options

`src/sticker-creation/session/keptSession.test.ts:511–515` ignores the requested options and always steals. Changing the real keeper request to `steal: false` therefore still passes its ownership assertions. Native Web Locks instead leave the first holder active and queue the second request. This could hide a regression in which the old tab continues saving.

From the repository root:

```text
node apps/frontend/node_modules/vitest/vitest.mjs run --config docs/reviews/2026-10-10-functional-frontend/evidence/creation-test-mutations.config.mts
Test Files 2 passed (2)
Tests 43 passed (43)

CREATION_TEST_MUTATION=locks node apps/frontend/node_modules/vitest/vitest.mjs run --config docs/reviews/2026-10-10-functional-frontend/evidence/creation-test-mutations.config.mts
Test Files 2 passed (2)
Tests 43 passed (43)

node --import ./apps/frontend/node_modules/tsx/dist/loader.mjs docs/reviews/2026-10-10-functional-frontend/evidence/creation-test-native-locks.mts
{"browser":"chromium","steal":true,"oldRejected":"AbortError","newGranted":true}
{"browser":"chromium","steal":false,"oldRejected":"","newGranted":false}
{"browser":"webkit","steal":true,"oldRejected":"AbortError","newGranted":true}
{"browser":"webkit","steal":false,"oldRejected":"","newGranted":false}
```

The native probe uses an intercepted blank localhost document and no app API. Assert the requested takeover option, or make the substitute model queued versus stolen locks. The current app requests takeover correctly.

## Live React roots after cleanup

`src/kyoto-seika/SubjectThought.test.tsx:11–26` and `SubjectWord.test.tsx:8–19` retain only the most recent cleanup function. Earlier roots survive repeated render calls within the same case. The probe imports the original suites and checks after their cleanup has run:

```text
node apps/frontend/node_modules/vitest/vitest.mjs run --config docs/reviews/2026-10-10-functional-frontend/evidence/creation-test-root-cleanup.config.mts
{"remainingThoughtRoots":3,"remainingJapaneseRubyElements":1,"beforeLanguageChange":["WIND","REUNION","WIND","SPORT","WIND","REUNION"],"afterLanguageChange":["風","再会","風かぜ","スポーツ","風","再会"]}
AssertionError: Every SubjectThought root should be unmounted after the suite: expected 3 to be +0
Test Files 1 failed (1)
Tests 4 passed (4)
```

The failed after-suite assertion is intentional evidence. Changing language updates the leftover roots, proving their subscriptions remain live. No existing test assertion failure caused by this leak was demonstrated. Unmount before replacement, rerender one root, or retain every cleanup callback.

## Transparent replay strokes

`src/sticker-board/timelapse/timelapsePlayer.test.ts:146–153` checks point ranges and timestamps without checking the original stroke properties. Its Canvas substitute records paths without painting pixels. A mutation replaces the color at the player's paint call with transparent ink:

```text
CREATION_TEST_MUTATION=transparent node apps/frontend/node_modules/vitest/vitest.mjs run --config docs/reviews/2026-10-10-functional-frontend/evidence/creation-test-mutations.config.mts
Applied transparent mutation to src/sticker-board/timelapse/timelapsePlayer.ts
Test Files 2 passed (2)
Tests 43 passed (43)
```

The selected files are the keeper and timelapse player suites. The native timelapse E2E file was fully inspected: its assertions check layout, CSS transforms, playback phases, Skip timing, and language; they do not inspect replay pixels or stroke colors. It was **not executed under this mutation**, so no full-E2E passing claim is made. Existing drawing tests inspect original ink, not the changed replay call.

Assert the original stroke properties at dispatch and add a focused native-Canvas replay check. The lightweight Canvas substitute remains appropriate for scheduling tests. This finding does not claim that the current app paints transparent replay strokes.

Captured logs: [baseline](creation-test-mutation-baseline.stdout.txt), [lock mutation](creation-test-mutation-locks.stdout.txt), [native locks](creation-test-native-locks.stdout.txt), [cleanup](creation-test-root-cleanup.stdout.txt), and [transparent mutation](creation-test-mutation-transparent.stdout.txt).
