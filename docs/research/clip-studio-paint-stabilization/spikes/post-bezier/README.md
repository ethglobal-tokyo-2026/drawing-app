# Bézier post-correction analysis and future implementation

October 11, 2026. Static analysis of the separate CSP 5.1.4 ARM64 `PWVectorSampleBezier` branch. The original three missing helpers and their dependencies are now retained in 31 bounded function extracts with exact instruction/assembly hashes, literal bytes, and quadratic vtable targets. No CSP app, debugger attachment, native instruction execution, Bézier-on stroke capture, product change, or deployment was performed for this work.

The user requested a concrete specification for later work while they close CSP for video recording. Start with the [specification and ordered implementation plan](../../../../superpowers/specs/2026-10-11-csp-bezier-post-correction.md).

The handoff assumes the preserved local research workspace. Earlier linked evaluator, quadratic, sampling, and capture-contract notes and the original image are dependencies outside this scoped commit; a fresh clone alone is insufficient to reproduce all research checks. The verification tool checks their presence locally. The disassembly remains in the local commit; publishing it is outside this commit request.

- [Orchestration and coordinate quantization](analysis/orchestration.md).
- [Candidate acceptance and output construction](analysis/candidate-acceptance.md).
- [Span advancement, scalar preservation, and projection](analysis/advance-cleanup.md).
- [Production integration, tests, and recorder changes](analysis/integration.md).
- [Function extraction manifest](evidence/extraction.json).
- [Literal bytes and exact numeric constants](evidence/literals.json).
- [Quadratic node vtable targets](evidence/quadratic-vtable.json).

The findings specify exact finite-domain control flow and arithmetic, but cached projection bounds, selected source/configuration provenance, sampling gates, and native Bézier comparisons remain requirements before an equality claim. The ordinary spline endpoint-removal algorithm must not be assumed to apply to this separate branch.

`extract.py` reads `/Users/adoll/Applications/CSP Research/original-arm64` by default and verifies SHA-256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. It records function boundaries from Mach-O function starts and uses a bounded disassembler. Saved commands in the manifest regenerate every retained extract. Files remain local research evidence.
