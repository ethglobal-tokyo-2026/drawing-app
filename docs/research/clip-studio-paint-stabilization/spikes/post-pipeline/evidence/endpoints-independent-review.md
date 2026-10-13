# Independent endpoint and length review

Reviewed `post-endpoints.ts`, `post-spline-length.ts`, their tests, and
`endpoint_oracle.py` against the retained endpoint assembly on 2026-10-11.

One actionable artifact issue was reported to the author: the oracle wrapper
inherits the spline oracle's default output path. Running it without `--output`
would replace the spline fixture and accompanying assembly/C driver with
endpoint-only cases. It needs its own default `evidence/endpoint-native.json`;
the explicitly selected output used for the retained endpoint run is valid.

No numeric or graph-geometry discrepancy was found in the reviewed finite,
ordinary open-path scope:

- Native `FMSUB d0,d15,d12,d14` is `nextValue - anchorValue*(1-amount)`, fused.
  The implementation's `fma64(-anchorValue,remaining,nextValue)` has that sign.
- Caller `0x1027872fc/30c` runs direction one (head) before direction zero
  (tail). Each pass recomputes lengths from current graph links.
- The accumulated length includes every visited span, even after removal.
  The strict travel, threshold, and cumulative 0.5 comparisons are preserved.
  The kept-span flag remains set, and the corner test uses the following node
  in traversal order.
- Spline deletion callback `0x10276e704` is a return. The unlink body at
  `0x102781838` repairs previous/next and path head/tail, releases the node,
  and decrements the count; it does not change retained neighbor geometry.
- Unknown evaluator configuration is admitted only after both first segment
  lengths strictly exceed the travel bound. The first pass therefore cannot
  mutate geometry before the second proof applies. The report and comments
  expressly exclude evaluator side effects and floating-point status flags.
- Validating the entire input array against resolved linear links makes the
  generic node casts valid for subsequent traversal and retention.
- Length sampling starts at direct C and advances time cumulatively; it does
  not force the final time to one. High precision alone omits the native 255
  interval cap. The separate 100,000 research work bound is disclosed.
- The endpoint oracle's scalar integer argument plus twelve coordinate doubles
  matches the recovered integer/FP-register/stack ABI. The existing byte and
  branch/constant relocation checks cover the added length functions.

Independent verification: the two focused test files passed all 10 test groups,
including all 110 exact native length cases. This review does not establish
arbitrary configured evaluator behavior or whole CSP post-correction identity.

Author resolution: the endpoint wrapper now selects `evidence/endpoint-native.json`
through the base oracle's explicit `DEFAULT_OUTPUT`. A fresh invocation without
`--output` generated 110 endpoint cases at that path; the original 1,614-case
spline fixture's SHA-256 stayed
`9a480832d592b5b693e090cb3d983b9971d5355d936694b52b61ad0be0291f13`.
