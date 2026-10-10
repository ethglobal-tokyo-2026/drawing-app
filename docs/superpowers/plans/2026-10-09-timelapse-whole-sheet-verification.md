# Timelapse on the whole sheet: finishing plan

The whole-sheet timelapse is on main (`05fc4e9f`, `5d57e9eb`, and `4e8590a9`, which hides a sticker that doesn't fly while its sheet plays and crossfades it back under reduced motion). This plan finishes it: an end-to-end spec, a code and performance review, an impeccable critique, timing, then the purge.

**Status (2026-10-09 20:50 EDT):** the first round of lanes stopped at the usage limit with nothing kept, and was relaunched from `7001b568`.

## Lanes (parallel)

1. [ ] **E2E** (branch `feat/timelapse-e2e`, committed after each case): `apps/frontend/e2e/timelapse.e2e.ts`, pass or fail in Chromium and WebKit: within its cut, marks outside it, Skip, reduced motion, iPad upright and on its side, Japanese.
2. [ ] **Code and performance review**: one read-only pass; report only.
3. [ ] **Impeccable critique**, with contact sheets and a video in `data/scratch/timelapse-critique/`; report only, timing values proposed.

## Coordinator

4. [ ] Fix what the lanes report, with unit tests; merge the e2e branch.
5. [ ] Timing from the critique's evidence: `FLIGHT_MS`, `LAND_MS`, `PEEL_MS`, `HOLD_MS`, `FADE_MS`, `REDUCED_FADE_MS`, `FRAME_MARGIN`, `STAGE_INSET`, reported as tunable values.
6. [ ] `pnpm check` and the timelapse e2e in both engines; merge, push; delete this plan, `.claude/worktrees/timelapse-fix`, the lanes' worktrees and branches, and `data/scratch/timelapse-*`.
