# Joined CSP comparison

This folder connects three independently observed stages for the pinned CSP 5.1.4 ARM64 image: brush constructor inputs and movement state, constructed source records and quadratic geometry, and post-correction source/result paths. The authoritative arithmetic is imported from the Croquis production modules.

**Four automated native mouse captures now match all recorded stages**, at magnification fractions 1, 0.5, and 0.33333251953125, with zero compared field differences. They include post speed adjustment off and on, two brush sizes, and a short case that reaches both endpoint decisions with captured evaluator configuration. See [the native validation report](native-validation-20261011.md) for exact configurations, counts, hashes, and limits. The separate curved 99→8-node post comparison and complete S0/S20 tablet queue comparisons remain complementary evidence.

## Record

The approved research copy must already be open on a disposable canvas. Set 手ブレ補正 to 20, 後補正 to the fifth bar, はらい to zero, and turn off the three post options 速度による調整, 表示倍率による調整 and ベジェ曲線. The bar is a UI selection; the recorded integer `k` is the numeric evidence.

Run from the repository root:

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/live-capture/record_joined_post.py --device mouse --announce
```

Keep the mouse released until the spoken “Recording now” cue, then draw one short S-shaped stroke and release. The cue follows verified loaded instructions and actual probe installation. The recorder limits inspection to 30 seconds and 256 source calls. The launcher allows up to 45 seconds for attachment/setup, then a separate 45 seconds from the armed marker for capture and debugger cleanup (at most 90 seconds before termination, plus a bounded five-second termination wait). A late attachment cannot consume the recording allowance. A setup or recording timeout is identified separately in the saved outcome, and no cue is issued after the setup deadline. It writes a unique persistent folder under `evidence/debugger-access/`, including the exact recorder files, their hashes, raw observations and cleanup/resume outcomes. A failed or incomplete run remains a failure; it is not silently trimmed or reused as positive evidence.

This is a formula/configuration observation. Debugger stops change timing, so its apparent pen latency is not a performance measurement.

## Compare

```sh
node docs/research/clip-studio-paint-stabilization/spikes/post-joined/replay.ts /absolute/path/to/joined.jsonl /absolute/path/to/new-report.json
```

The combined command reports a match only if upstream construction, movement, source construction and post correction all match. It preserves downstream results when upstream observations are incomplete. Output paths must be new so earlier evidence cannot be overwritten.

The individual readers are `upstream-replay.ts` and `source-replay.ts`. Missing, unsupported or incomplete upstream inputs remain explicit. `source-replay.ts` compares every ordered source coordinate/control as binary64, seven scalar fields as binary32, flags, endpoint bytes and path flags. It validates native floating-point mode, caller/thread/holder/path identity, begin configuration and evolving source branch state before replay.

The endpoint reader uses the captured resolved evaluator configuration; historical missing snapshots remain unknown. Source begin supplies an input brush to a cache/copy resolver, so its pointer need not equal the resolved evaluator pointer. That resolution is observed, not independently replayed. See `evaluator-snapshot.md` for the bounded memory schema, `boundaries.md` for addressed native caller evidence, and `evidence/native-joined-20261011T230556-resolver-review.md` for the corrected pointer contract.

Synthetic fixtures are labeled synthetic and cannot establish native agreement. The successful native comparisons establish agreement for their recorded inputs and configurations. They do not establish evaluator cache/copy selection, OS input acquisition, every CSP brush, rendered pixels or natural pen feel. All four mouse captures have pressure one. The first three exit both endpoint passes at the travel limit; the fourth reaches both decisions and keeps the endpoints. They do not observe variable-pressure response or endpoint removal.

## October 11 recording result

- Host tests cover source and endpoint capture bounds, pairing, stale/restarted groups, floating mode, shared debugger recovery and cleanup. They do not execute a brush inside CSP.
- Early automated attempts failed with `noWindowsAvailable` and observed zero source calls. Those failed artifacts remain unchanged. Correcting window targeting allowed four later automated recordings to finish without manual input; each captured source begin through finish and the paired post return, detached cleanly, and independently verified CSP had resumed.
- The user's settings screenshot is preserved in `evidence/operator-settings-20261011.png`, with its hash and interpreted settings beside it. It does not prove the runtime numeric post strength.
- Raw native captures are local research artifacts. The repository is public; they must not be included in the release commit.
