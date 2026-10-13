# Independent context and quadratic review

Reviewed the reconstructed node contexts and quadratic helpers against the retained addressed assembly, derivations, tests, and native instruction cases on 2026-10-11.

The review confirmed modes 0, 1, 2 and 3: which links are followed, which node's corner flag is checked, mode 2's duplicated endpoint position, dependence on already adjusted neighboring positions, mode 1's direct-copy fallback, and the forced versus caller-supplied parameter intervals.

For the quadratic helpers, the review confirmed fused Bernstein evaluation, separately rounded split controls, cumulative parameter sampling without forcing the final endpoint, the 255 cap only in the lower-precision length mode, and the explicit 100,000-interval research resource guard. That guard throws rather than silently changing the result and is not represented as CSP behavior.

One finding was fixed: the context copy test attempted to assign to a readonly Point.x and failed strict TypeScript with `TS2540: Cannot assign to 'x' because it is a read-only property.` The test now checks distinct object identity while retaining source-value assertions. The reviewer independently reran strict TypeScript successfully and all 23 context/quadratic tests passed. The combined final research suite also passed after the fix; see final-tests.txt and final-types.txt.

No remaining actionable findings were reported. Numeric oracle coverage applies to the pure helpers. The modeled graph context is supported by static reconstruction and explicit-link tests; it has not been compared against a native whole-graph execution. Source-node insertion, complete correspondence/removal orchestration, and the full post-correction result remain outside this review's completion claim.
