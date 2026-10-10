# Functional Frontend Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all confirmed findings in the functional frontend review, including test correctness and helper defects.

**Architecture:** Four subsystem plans share one design and dependency order. Account identity, persistence and external-send correctness come first; targeted interaction and test repairs follow independently. There are no production changes in this planning deliverable.

**Tech Stack:** Existing TypeScript/React frontend, Hono API, SQLite/Drizzle, Vitest, Playwright and Safari simulator tooling.

**Spec:** [Proposed design](../specs/2026-10-10-functional-frontend-fixes-design.md). Requirements and reproductions: [review report](../../reviews/2026-10-10-functional-frontend/report.html).

## Global Constraints

- Retain the current dependency lockfile; no dependency upgrades are part of these fixes.
- Use existing Croquis vocabulary and American English in identifiers, comments, and documentation.
- Put new user-facing copy in `apps/frontend/src/i18n/strings/`, with English, Japanese, and the required interaction comment; follow the Japanese glossary. Developer-slip strings stay English as required by the repository.
- Preserve account isolation, ticket spending idempotency, Gift Claim Token secrecy, and Gratitude's separation from monetization.
- Preserve recoverable user data. Storage uncertainty must produce an explicit recovery state, never silently attach data to another session or discard it.
- Keep unrelated drawing-stabilization research and the existing layers plan untouched.
- All remaining global constraints in the spec apply to the linked tasks.

## Review Focus

- Old async work after a shared-cookie account change: G1 plus B1 account teardown.
- Interrupted storage updates between ticket generations: creation task 2, including preserved legacy data.
- Lost acknowledgements across LINE sending and reload: G4, including two-tab and storage-failure tests.
- Browser-only behavior hidden by test doubles: creation tasks 1/4/5, I5/I6, G3.
- False confidence from a passing suite: B5/B6, G5, creation tasks 1/5/7, I6 require their negative controls.

---

## Fix ownership

| Report finding | Owning plan/task                                                                                       | Outcome                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| 1              | [Board B1](2026-10-10-board-explore-fixes.md#b1-preserve-board-save-ordering-across-mounts--finding-1) | Save ordering and pending changes survive tab changes                |
| 2              | [Creation task 2](2026-10-10-creation-replay-fixes.md)                                                 | Saved steps match their ticket and drawing generation                |
| 3              | [Giving G2](2026-10-10-giving-gratitude-fixes.md)                                                      | Recovery preserves the original recipient                            |
| 4              | Giving G4                                                                                              | Possible external sends have a durable server record                 |
| 5              | [Identity I1](2026-10-10-identity-tickets-fixes.md)                                                    | Wallet boundary failure offers real recovery                         |
| 6              | Creation task 3                                                                                        | Pause/tool panels stop captured input                                |
| 7              | Creation task 6                                                                                        | Fill replay uses bounded retained bitmap storage                     |
| 8              | Identity I3                                                                                            | Open checkout refreshes after wallet funding                         |
| 9              | Identity I4                                                                                            | Successful spends reconcile overtaken ticket reads                   |
| 10             | Giving G3 and Identity I5                                                                              | Mini-game and ticket cards own their Back entries                    |
| 11             | Board B2                                                                                               | Explore pages and position survive search                            |
| 12             | Board B5                                                                                               | Escape test awaits real close completion                             |
| 13             | Giving G1                                                                                              | Old-account Gratitude cannot delete a valid combo                    |
| 14             | Board B3                                                                                               | Incoming-gift failure stays visible with Retry                       |
| 15             | Board B4                                                                                               | Interrupted held controls stop repeating                             |
| 16             | Identity I2                                                                                            | Optional storage cannot block LINE Login                             |
| 17             | Creation task 4                                                                                        | Sealed cut retains minimum-width ink                                 |
| 18             | Identity I6                                                                                            | Session check detects reauthentication and preserves Secure on HTTPS |
| 19             | Creation task 1                                                                                        | Lock helper rejects incorrect takeover requests                      |
| 20             | Giving G5                                                                                              | Broken motion terminates as a failed test                            |
| 21             | Board B6                                                                                               | Sheet count expectation is independent                               |
| 22             | Creation task 7                                                                                        | Subject tests clean up every root                                    |
| 23             | Creation task 5                                                                                        | Replay tests verify actual visible ink                               |

The source report currently contains 23 articles. Verify the mapping against the report at execution time, rather than treating this number as a permanent coverage claim.

## Execution order and integration

1. **Data loss:** G1 → B1. In parallel, creation task 1 → task 2. G2 → G4 is a separate gift recovery sequence, with G4 integrating after G1.
2. **Drawing correctness and performance:** creation task 3; task 4 → task 5 → task 6. Task 7 is independent. Pixel assertions precede the replay preparation change.
3. **Other functional recovery:** I1–I4, B2–B4. B3 follows B1 because both edit StickerBoard. Run G1 before I1 when working in one checkout because both touch StatBoard.
4. **Back and test reliability:** I5 → G3 owns the shared `backNavigation.e2e.ts` in that order. I6, B5/B6 and G5 can run independently of app fixes; integrate their test-server/helper changes before final checks.

Use isolated worktrees for implementation lanes, created with Superpowers' worktree workflow. Keep one owner for shared API construction (G1), board save state (B1), Gift Message protocol (G4), and replay provider/player contract (creation task 6). Do not implement competing helpers. Subagents may run focused tests; the integrating agent runs the full checks below. Each owning task specifies files, interfaces, red/green tests and a representative commit; preserve those boundaries for review and squash into a few representative commits before merge.

The recommended execution method is subagent-driven, with independent task review and a final whole-branch review, because several fixes protect saved user work across asynchronous boundaries. This document is a plan, not a claim that its fixes have been implemented or verified.

## Integration and completion tasks

- [ ] Recheck HEAD and the working tree; compare touched files with the review revision, incorporate intervening changes, and preserve unrelated work. Confirm every finding still reproduces before editing its implementation; test findings use the named negative control.
- [ ] Implement the linked tasks in the dependency order, recording completion only when their focused checks pass. Reuse fixture setup where tests share more than three instances of the same setup; avoid large speculative test matrices and assertions that merely restate constants.
- [ ] After integration, run `pnpm check:full` and `pnpm test:e2e`. These are the repository's required full checks and browser suite; they are planned commands, not passing results from this planning turn. Resolve failures and run affected checks again. Preserve command output for any unresolved environment or test failure.
- [ ] Run `pnpm --filter frontend test:ipad-safari` for the final integrated input, overlay and cookie changes. Reuse its result across the owning tasks rather than repeatedly launching the simulator. Distinguish simulator Safari from physical Pencil/Android/LINE acceptance; record any unavailable platform check explicitly.
- [ ] Review the combined branch for account-change races, storage preservation, idempotent gift recovery, and release of replay resources. Check English/Japanese recovery copy in context. Verify no real external send or payment was needed by the tests.
- [ ] Update the report with a per-finding result and regression reference. No “all fixed” claim while a required regression is missing or failing. A failed platform check remains visible in the handoff.
- [ ] Before merge, squash representative commits and follow repository merge checks. After merge, remove completed plans/specs and temporary evidence, retaining the regression tests and only useful durable documentation.

## Planning verification

Self-review checks: every report finding has an owner; finding 10 has two explicit owners; shared files have a sequence; all five review-focus classes have concrete tests in their owning plan; new interfaces have callers and verification; no production code has been modified for planning. Validate links and paths before committing these documents.

The review's previous passing suites establish the starting point, not the correctness of these proposed fixes. No new application test run is necessary to verify a documentation-only planning change.
