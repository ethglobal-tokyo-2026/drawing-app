# Functional frontend review fixes

**Status:** proposed implementation design; planning authorized, implementation not started.

**Source:** [functional frontend review](../../reviews/2026-10-10-functional-frontend/report.html), including its retained reproductions and [coverage record](../../reviews/2026-10-10-functional-frontend/coverage.html). Finding numbers refer to that report. The inspected source revision is `0a46f059807ed33298c8d351492a565d97ca0a0f`; recheck changed files before implementing.

## Intent and acceptance

Fix the confirmed frontend behavior, persistence, asynchronous operation, performance, and test defects. The user explicitly includes tests and helpers in scope. Keep Croquis's existing flows and appearance except for controls and persistent messages needed to recover from failures. The report is the requirements baseline; this design chooses how to implement its recommendations.

Every finding needs a retained regression that fails for the original defect and passes for the fix. A test-quality finding instead needs a negative control: deliberately reintroducing the relevant fault must make the repaired test fail promptly. Passing the existing suite alone does not close a finding. Coverage of every listed file does not establish that the application has no remaining defects.

## Global constraints

- Retain the current dependency lockfile; no dependency upgrades are part of these fixes.
- Use existing Croquis vocabulary and American English in identifiers, comments, and documentation.
- Put new user-facing copy in `apps/frontend/src/i18n/strings/`, with English, Japanese, and the required interaction comment; follow the Japanese glossary. Developer-slip strings stay English as required by the repository.
- Preserve account isolation, ticket spending idempotency, Gift Claim Token secrecy, and Gratitude's separation from monetization.
- Preserve recoverable user data. Storage uncertainty must produce an explicit recovery state, never silently attach data to another session or discard it.
- Give asynchronous work bounded waits, symmetric cleanup, and persistent actionable errors. Preserve the existing request timeout policies unless a task explicitly requires a change.
- Use focused tests for each change; run the integrated checks once after all changes are combined, and repeat only for changed code or unresolved failures.
- Use temporary databases and simulated LINE/Sui services in automated regressions; no real Gift Messages or paid transactions are needed.
- Keep unrelated drawing-stabilization research and the existing layers plan untouched.
- Remove completed plans and temporary review evidence after implementation is merged; retain regression tests and any useful durable design documentation.

## Chosen boundaries

### Sticker Board and Explore

Move placement saving out of the lifetime of a mounted Sticker Board into an account-owned store above tab changes. Serialize writes for each sticker; track phone and Large layout revisions separately. Reconcile board reads against the local revision present when the read began as well as changes made afterward. A request completing during a GET must not allow that older GET to erase its placement. Keep save failures and retry state through remounts. Dispose the old account's queue without sending its unsent changes as the next account.

Keep Explore's pile data, current day, and scroll position while the phone search view is open. Reuse the current view when search closes; changing between Today and This week retains each view's intended state. Incoming-gift failures remain visible with retry, rather than appearing to be an empty inbox. Held arrangement controls stop on focus, visibility, capture, and pointer interruptions.

Repair the sticker-detail close assertion to wait for completion and the Sticker tray count assertion to derive its expectation independently.

### Giving and Gratitude

Separate resuming an existing packaged gift from deliberately choosing a recipient. Recovery must preserve the server's original recipient. Record a possible external send durably before opening LINE's friend picker; inability to establish that state prevents the picker from opening and leaves retry available. Device storage remains useful for recovery but is not the sole record that a message may have gone out. An ambiguous outcome must never be silently treated as unsent, and successful recovery must not mint another Gift Claim Token for the same pending send.

Stop scheduled Gratitude resends and ignore late completions after outbox disposal. Also bind each submitted combo to the expected receiving account, checked by the API against its authenticated cookie before processing the combo. A changed cookie produces a session recovery response and leaves the original account's combo intact. Canceling timers alone cannot close the still-mounted-tab case.

Back follows the Mini-game's existing close semantics: finish and keep the current combo before leaving play; preserve the receipt step. Bound test simulations by simulated frames/time so a broken termination condition fails instead of blocking the test process.

### Drawing sessions and sealing

Identify saved steps by both ticket use and drawing generation, committed with the IndexedDB steps. A generation is necessary because a replacement sheet can reuse the same already-spent ticket. Restoration requires matching metadata. Records whose ownership cannot be established enter recovery with their contents preserved; do not guess the owner of legacy untagged steps.

Pausing, opening a tool panel, or locking the canvas ends accepted ink at that boundary, cancels unfinished fill input, and requires a new permitted pointer-down. Preserve the ink already accepted before the interruption.

Make replay preparation consume a fixed number of full-size surfaces rather than keeping one canvas per fill. Prepare fills sequentially, preserve full playback correctness, pause the playback clock during preparation, and release work on abort, skip, and unmount. Verify allocation growth separately from a device memory measurement; no unmeasured device memory guarantee.

Build the sealed cut from conservative occupied ink coverage so minimum-width ink survives downsampling, both by itself and beside larger shapes. Keep the original ink pixels unchanged and retain intentional transparent regions.

Repair the Web Locks helper, unmount every test-created React root, and check actual replay ink through a small native Canvas test in addition to drawing-command assertions.

### Identity, tickets, and session checks

A wallet provider error boundary cannot recover by only changing status. For errors caught by that boundary, explicitly require page reload and show that action. This covers a rejected lazy import as well as a broken provider without pretending a cached failed import can retry in place. Ordinary JWT/authentication retries retain their existing behavior; automatic wallet waits must never reload the page.

Treat the local LINE auto-login marker as optional. If reading it fails, use the conservative non-auto-login path; if writing or removing it fails, log the failure and continue the actual LINE operation. SDK failures still use the existing visible error handling.

Refresh the JPYC balance when the visible checkout regains focus, becomes visible, or goes online, with an explicit refresh control too. Coalesce simultaneous requests and ignore responses for an obsolete owner/network/coin. Refreshing must not initiate a purchase. Reconcile ticket counts after an overtaken successful spend using the existing authoritative refresh pattern used for purchases.

Give ticket cards one history owner. Back invokes the same permitted close action as Escape; avoid an extra entry for checkout, which already has one.

The Safari session check must verify the original cookie and absence of another session-creation request. Its HTTPS proxy preserves `Secure`; only the HTTP test server removes it. A test that clears the cookie before reload must fail the persistence assertion even if automatic LINE sign-in restores the board.

## Verification and limits

Use the report's reproductions as starting points, convert their observed-bug assertions to desired-behavior assertions in the owning suites, and retain negative controls for the six added test findings. Use native Chromium and WebKit where browser behavior matters: Web Locks, Canvas pixels, cookies, and Back history. A simulator check establishes simulator behavior; it does not establish physical Pencil, sensor, or device-memory behavior.

The implementation handoff must list each finding as fixed with its regression evidence, or explicitly incomplete with the failed check and next requirement. Do not mark all findings fixed merely because a broad suite is green. Real LINE picker, wallet, and physical-device acceptance remain distinct from simulated checks; describe which were actually performed.

## Alternatives rejected

- Component-local queues and cleanup-only fixes leave remount races and shared-cookie account changes possible.
- Memory-only send markers cannot protect a reload after an external send.
- Lower replay resolution or dropping fills changes the replay instead of bounding its preparation.
- Additional test timeouts cannot stop a synchronous unbounded loop on the same event loop.
- Broad refactoring, styling changes, dependency upgrades, and unrelated feature work do not help close these findings.
