# Delayed Gratitude resend and a shared session cookie

Reviewed commit: `0a46f059807ed33298c8d351492a565d97ca0a0f`.

Run from the repository root:

```sh
pnpm --filter frontend exec vitest run --config ../../docs/reviews/2026-10-10-functional-frontend/evidence/vitest.config.mts ../../docs/reviews/2026-10-10-functional-frontend/evidence/session-cookie-outbox.test.ts --silent
```

Recorded output on 2026-10-10:

```text
RUN v5.0.1
Test Files  1 passed (1)
     Tests  2 passed (2)
  Start at  14:45:21
  Duration  1.68s (import 60%, transform 29%, tests 11%)
```

The tests characterize current defective behavior; passing does not mean the issue is fixed.

The test uses the actual API session routes, signed cookies, gift receiving route, Gratitude route, frontend HTTP clients, session-loss notification, and Gratitude outbox. The repository's fake LINE verifier is the external identity boundary. An in-process request adapter models two same-origin tabs sharing one cookie; this is not an end-to-end LINE/browser test. The test invokes the outbox cleanup in response to the real `401 signed_out` notification, matching App's cleanup when SessionGate unmounts its children. It does not render SessionGate.

Both cases first receive a real gift as Alice, keep a valid Gratitude body in play, and start its delayed resend. Another tab signs out through the real session endpoint. Alice's next `/me` call receives `401 signed_out`, and cleanup runs. Alice signs back in. The 16-second timer remains active after that cleanup.

- Same-account control: the delayed request receives HTTP 201 and the outbox clears without a refusal.
- Shared-cookie account change: another tab signs in as Bob through the real session endpoint before the timer fires. Bob's `/me` succeeds. Alice's old resend now receives HTTP 403 with `error: not_receiver`. The outbox removes Alice's pending body and stores a refusal. After signing Alice back in, submitting the exact original body, including its original idempotency key, succeeds. The rejected body was valid for Alice.

This is a supported cross-tab account-change sequence. Ordinary same-tab explicit logout reloads the page and destroys its JavaScript timers; that flow alone does not demonstrate this loss. Same-account automatic session recovery also does not demonstrate loss. A stale mounted tab with another tab's valid cookie can expose the same account mismatch even without the cleanup defect; cancellation and account binding are complementary protections.

Relevant locations: `apps/frontend/src/gratitude/gratitudeOutbox.ts:249-259` retains the delayed task, `:276-278` only removes event listeners, and `:177-180` permanently removes a refused body. `apps/frontend/src/app/App.tsx:160` installs the resend effect. Only the session `/me` request carries the expected LINE account identity; Gratitude requests authenticate using the current shared cookie.

Recommended regression expectations after correction: cleanup prevents pending delayed work from submitting; an account mismatch retains Alice's body; the same body records after Alice returns; normal same-account retry still records exactly once.
