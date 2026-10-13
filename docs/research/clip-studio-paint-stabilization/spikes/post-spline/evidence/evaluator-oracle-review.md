# Independent evaluator implementation and oracle review

Reviewed `../native_oracle.py`, the extracted assembly, and the base
`../../../post-spline.ts` reference. No actionable discrepancy was found in the
reviewed instruction translation, ABI declarations, or relocated target checks.

Review snapshot:

- Oracle script SHA-256: `184d2bd71f370e69126cceca901307c8d0fec58b5676cac18cef3dbfa79a8faf`.
- Native-vector JSON SHA-256: `9a480832d592b5b693e090cb3d983b9971d5355d936694b52b61ad0be0291f13`.
- The saved oracle result reports FPCR=0, 548 unchanged instruction checks,
  48 relocated instruction checks, and 11 extracted functions.
- Its 1,614 cases comprise E=637, M=205, N=206, S=40, Q=150, D=150,
  B=150, L=46, and G=30.

## ABI and execution methodology

For E/M, the twelve scalar coordinate arguments occupy d0..d7 followed by four
stack doubles; E's parameter is the fifth stack double. The two-double `Point`
return uses d0/d1. S adds an output pointer in x0, with density/start/end after
the stacked coordinates. Its returned integer count is in w0 and the verified
native clamp limits the C output array to 256 points. N uses x0/x1/x2 pointers
to anchor, opposite, and writable outer points.

The quadratic Q/D declarations match their d0..d6 inputs and the split routine's
x0/x1/x2 output pointers. L passes its integer mode through the wrapper to x1
while setting the general routine's selector to zero. B/G pass selector zero and
place the quadratic endpoint in d6/d7; d4/d5 are unused by the selected quadratic
result, although the original routine also computes cubic intermediates.

The script checks the pinned original image hash and saved function hashes,
requires one four-byte instruction per extracted instruction, verifies all
unchanged instruction bytes, and checks the relocated branch opcode/condition
and destination. The ADRP/LDR checks preserve opcode/register fields and verify
the actual loaded constant bytes at their relocated addresses. Calls outside
the explicitly copied helper set are rejected. Constant data comes from the
pinned image, not from the TypeScript formulas.

The C driver prints raw double bits. Its Python-generated hexadecimal inputs
preserve binary64 values and signed zero. The generated test expectations do
not call the TypeScript implementation. Each compiler, inspector, and native
execution subprocess has a timeout. The program operates on standalone stack
data and does not attach to CSP.

## Independent checks performed

The base TypeScript module was implemented after recording 13 failing tests
against zero-result function stubs in `evaluator-native-tests-before.txt`.
The hand-derived cases cover all six coefficient positions, the t=0.5 split,
endpoint multiply/divide rounding, extrapolated and reversed intervals,
neighbor-limit equality, the four-chord measure, and bounded sampling when
division produces infinity or NaN.

The completed tests compare every saved E/M/N/S output bit, including signed
zero and every sampled point. A fresh run against the extended 1,614-case file
passed all 13 tests and all 1,088 E/M/N/S cases. Q/D/B/L/G are intentionally
left to the separate quadratic tests. Strict TypeScript and scoped formatting
checks also passed.

## Confidence boundary

This is standalone execution of the recovered pure instruction bodies, with
address relocations checked. It is stronger than comparing two handwritten
formulas, but it does not exercise a CSP process, its object graph, its caller
selection, or a full post-correction pass. The tested B/G selections validate
the quadratic result branch, not the general cubic branch. The cases are broad
samples, not exhaustive binary64 input coverage. NaN payloads, floating-point
status flags, and alternate FPCR modes remain excluded. End-to-end rendering,
latency, and pen feel remain outside this result.
