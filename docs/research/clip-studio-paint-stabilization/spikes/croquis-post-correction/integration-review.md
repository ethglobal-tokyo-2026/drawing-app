# Croquis post-correction integration review

Reviewed October 11, 2026. Independent, read-only review of the production correction core, worker service, worker, stabilizer output adapter, InkEngine, and focused regressions. No CSP attachment or new native recording was performed.

## Resolved findings

- The Pencil fallback distinguishes `touchend` from `touchcancel`. Cancellation retains original ink without starting correction; a later pointer event cannot commit it twice.
- Correction failure no longer replaces a canvas allocation failure with a claim that original ink was retained. The completed-preview failure path skips the worker, attempts the original commit synchronously, and preserves the allocation notice after callbacks.
- Queue output phase is retained through `StabilizerOutput` and the engine's packet collection. Source construction dispatches move packets to `append` and the terminal packet to `finish`; it does not infer finalization from an array index.

## Zero-pressure phase groups: resolved

The initial single-start/single-terminal validator rejected valid browser input when zero pen pressure ended a native queue stroke during contact, followed by renewed pressure. Independently reproduced with initial `(x=0, pressure=0, t=100)`, contact `(20, 0, 104)`, contact `(40, 0.5, 108)`, and release `(60, 0, 112)`, with all y coordinates zero:

| Stabilization | Actual emitted phases |
| --- | --- |
| 0 | `2, 3, 2, 3` |
| 4, 20, 100 | `2, 3, 2, 1, 1, 3` |

The final core parses complete native groups and resets movement/source construction for each group. Every group runs through the recovered correction and endpoint operations; sampled geometry remains in acquisition order. Width/time transfer runs once over the complete browser stroke. Processing time, expanded-node, source-check, and sample limits are shared across groups.

A second edge check found valid idle release output after a group had already ended: initial zero pressure, one zero-pressure contact, then release emits `2,3,3` at strength 0 or `2,3,1` at strengths 4, 20, and 100. The final core preserves these idle output positions without dispatching them into a nonexistent source path. This is explicitly documented as Croquis preservation behavior, not a newly claimed native correction operation. Phases are not rewritten.

Independent final checks through production `Stabilizer` and `correctPostStroke` accepted 24 actual queue sequences: strengths 0/4/20/100 crossed with pressure sequences `[0,0]`, `[0.5,0]`, `[0,0.5,0]`, `[0.5,0.4,0,0]`, `[0,0,0]`, and `[0,0,0.5]`, followed by zero-pressure release. All outputs were finite and preserved first/final width and elapsed time. Six malformed phase sequences remained rejected: `[1]`, `[3]`, `[2,2,3]`, `[2,1]`, `[2,3,2]`, and `[2,0,3]`. A mixed `2,3,1,3,2,1,3,1` sequence preserved the last idle point and constructed exactly five source nodes across its two groups. Separate zero-length group checks also passed.

No unresolved concrete finding remains from this bounded integration review.

## Other checks and limits

- Pending identity is cleared before abort, commit, or failure callbacks. History, layers, exports, a new stroke, suspension, and disposal settle original ink before their action. Late results cannot replace a newer stroke.
- Every worker request has an elapsed-time limit and terminates on completion, abort, failure, or service disposal. Message data is independently copied by the browser. Returned point arrays are validated before commitment.
- Fixed stroke coordinates and initial settings survive resizing and asynchronous work. Returned spline samples go directly to rendering. Width/time transfer by normalized distance is an explicit Croquis policy, separate from recovered native scalar arithmetic.
- An independent contact/release sweep at constant full pressure for all stabilization strengths 0–100 found no emitted pressure outside the correction input domain: minimum `0.9999999999999999`, maximum `1`.
- This review does not establish identical CSP acquisition, brush configuration, or pen feel. It does not replace native arithmetic comparisons or browser/device testing. No new broad test suite was run while the parent's final suite was active.
