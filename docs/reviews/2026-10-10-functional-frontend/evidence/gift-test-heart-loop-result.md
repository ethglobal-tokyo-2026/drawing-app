# Historical bounded test-loop review evidence

This is the original defect reproduction at the audit revision. The adjacent runner now verifies the repaired test: the opacity-floor mutation must fail its bounded landing assertion before the external deadline. A timeout no longer counts as a successful negative control.

At commit `0a46f059807ed33298c8d351492a565d97ca0a0f`, run from the repository root:

```sh
python3 docs/reviews/2026-10-10-functional-frontend/evidence/gift-test-heart-loop.py
```

Recorded output, 2026-10-10:

```text
Original: exit 0
RUN v5.0.1
Test Files  1 passed (1)
     Tests  1 passed | 7 skipped (8)
  Start at  15:00:57
  Duration  102ms

Heart never fully disappears: EXTERNAL DEADLINE after 3 seconds (Vitest testTimeout is 100 ms)
RUN v5.0.1
```

The existing heart-flight test has a synchronous loop that ends only when opacity is exactly zero (`apps/frontend/src/gratitude/heartMotion.test.ts:146–149`). A Vite transform applies an opacity floor of 0.001 to the in-memory production module. The checked-in source and test remain unchanged. The mutated run blocks past Vitest's 100 ms timeout; the separate Python deadline kills only the launched Node process group, with Vitest running a thread pool.

The test should bound its frame count and assert that landing occurred within that bound. This evidence characterizes test-runner resilience, not a current production opacity defect.
