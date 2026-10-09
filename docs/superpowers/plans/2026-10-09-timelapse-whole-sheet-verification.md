# Timelapse on the whole sheet: finishing plan

The whole-sheet timelapse is on main (`05fc4e9f`, `5d57e9eb`): the player frames every mark on the sheet, the sticker flies onto its sheet and peels back to its spot. This plan finishes it: the end-to-end test, the checks that were skipped, a review, and timing.

## Lanes (parallel, each in its own worktree from origin/main)

1. [ ] **E2E** (branch `feat/timelapse-e2e`): `apps/frontend/e2e/timelapse.e2e.ts`, Chromium and WebKit:
   - Drawn within its cut: while it plays, the paper's box matches the figure's and the figure has no transform; at the end Timelapse is back and the live line said Done.
   - A brush mark outside the cut, erased: while it plays, the paper reaches past the figure's box and the figure flies; at the end it's in its spot with no inline transform or opacity.
   - Skip mid-play reaches the end; closing the detail mid-flight leaves the figure in its spot.
   - Reduced motion: the figure is never transformed. Japanese: the same flow under `ja`.
   - Run: `E2E_WORKERS=2 E2E_APP_PORT=5197 E2E_API_PORT=8797 pnpm --filter frontend test:e2e timelapse`.
2. [ ] **On-screen matrix** (no code changes; servers 5193/8793; output `data/scratch/timelapse-matrix/`): stickers drawn within the cut, with erased marks outside it, with a fill that floods the sheet, in Kyoto Seika Practice Mode, and one received from someone (foil band). Phone 390×844, iPad 820×1094 upright and 1180×820 on its side; Chromium and WebKit; English and Japanese; reduced motion on and off. Screenshots at fixed moments and an mp4 of each sequence. Every defect reported with its screenshot.
3. [ ] **Review**: one bug-focused pass over the timelapse files changed in `4fe08295..5d57e9eb`.

## Coordinator

4. [ ] Fix what the lanes report; rerun the affected unit tests; merge the E2E branch.
5. [ ] Timing: watch the recordings; report `FLIGHT_MS`, `LAND_MS`, `PEEL_MS`, `HOLD_MS`, `FADE_MS`, `FRAME_MARGIN` and `STAGE_INSET` as tunable values, with the videos.
6. [ ] `pnpm check` and the timelapse e2e in both engines, merge, push; delete this plan, the lanes' worktrees and branches.
