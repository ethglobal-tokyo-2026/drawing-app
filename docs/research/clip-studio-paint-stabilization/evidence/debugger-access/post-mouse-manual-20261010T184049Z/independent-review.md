# Independent review of the native post-correction capture

Reviewed 2026-10-10. This review read the saved capture, recorder implementation, static capture contract, and arithmetic reference. It did not attach a debugger, operate the application, or change application settings. Only this review document was created.

Reviewed file: `pid-21351.jsonl`.

SHA256: `c58ad8bf883500013717aa56bcbeedecf270ec9c68d5b30ed6b91db2dbd6452a`.

## Result and settings clarification

The file contains one complete, paired native post-correction invocation. Both geometry snapshots pass the independent structural checks below. The recorded summary reports one entry, one pair, no unmatched entry, no cleanup errors or warnings, successful detach, and observed detached state. This review did not independently inspect the live process after detach.

The user clarified that they selected the **fifth of five indicator bars**. The assistant's earlier instruction called this “strength 5.” Those descriptions are not interchangeable: CSP's indicator bars can have customized numeric values, and the control's right-side button reveals the numeric slider/value. See the [official Japanese Tool Property documentation](https://help.clip-studio.com/ja-jp/manual_jp/150_tools/ツールプロパティパレット.htm).

Therefore label this case **fifth indicator bar, as reported by the user; observed native strength argument `k=40`**. Do not call it a numeric-strength-5 capture, infer the other bars' values, or attribute the discrepancy to user error or a recorder failure. The raw metadata's `requestedPostStrength: 5` should remain unchanged as a record of the historical instruction; it is not a native measurement.

| Native wrapper argument                | Observed value                               |
| -------------------------------------- | -------------------------------------------- |
| Signed strength `k`                    | `40`                                         |
| Positional tolerance `T`               | `160`, bits `4064000000000000`               |
| Speed-adjustment flag `flag480`        | `0`                                          |
| Length scale `S`                       | `8.097101964970545`, bits `402031b75947da06` |
| Alternate-class selector `selector482` | `0`, ordinary spline-producing branch        |
| Closure/mode argument                  | `0`                                          |
| FPCR, at both boundaries               | `00000000`                                   |
| FPSR, at both boundaries               | `08000017`                                   |

The observed tolerance equals the recovered unscaled settings conversion, `0.1 * uint32(40 * 40) = 160`. This is consistent with tolerance scaling being off; the underlying setting `0x481` was not directly captured. The separate length-scale argument remains non-unit even when tolerance scaling is off.

Inverting the scale gives an **inferred magnification of `12.35009765625%`**. Recomputing the recovered instruction order, `1 / (12.35009765625 * 0.01)`, reproduces the observed scale bits exactly. This is a consistency check, not a direct observation of the application's magnification setting or proof that the settings reader executed in this recording.

## Independent checks performed

A separate Python inspection decoded the original JSONL and used assertions independently of the official post-replay analyzer. It checked:

- Exactly two boundary records, with matching thread, call identifier, holder pointer, and arguments; the returned path equals the final snapshot's path address.
- Each path header is exactly `0xa8` bytes and has the expected path vtable after applying the captured image slide.
- Each declared node count equals the number of captured nodes, with matching first and last pointers.
- Every node's vtable selects the expected node class and exact allocation size for its path type.
- Node addresses are unique within each path; every previous pointer, next pointer, and owner pointer agrees with the complete captured list; the first previous pointer and final next pointer are null.
- All captured node coordinates and seven common scalar fields are finite.
- Endpoint coordinate equality, exact coordinate matches between the two snapshots, node-address overlap, path flags, and retained endpoint fields were inspected directly from the raw bytes.

All these assertions passed. The capture also records a successful comparison of the full `0x11c`-byte wrapper against the pinned original instructions, followed by stops at its entry and normal epilogue on the same thread. This review inspected that recorded verification; it did not reread the running application's instructions.

The entry stack contains the established mouse-up method `0x10205cc64`, mouse-event dispatcher `0x1021ef5d0`, brush termination routine `0x10288fc64`, and finalizer `0x10289148c`, after accounting for the runtime slide. This supports the mouse-event route for this invocation. Physical input-device identity remains operator-reported because raw source events were not captured here.

## Geometry observed

| Snapshot | Path flags | Node class       | Node size    | Count |
| -------- | ---------- | ---------------- | ------------ | ----- |
| Entry    | `0x2021`   | Quadratic Bezier | `0x88` bytes | `99`  |
| Return   | `0x2081`   | Spline           | `0x78` bytes | `8`   |

The path pointer changes, and the two snapshots share no node addresses. All captured node flags are zero. The first and last coordinates are bit-identical before and after the operation.

Four output coordinates exactly equal source coordinates at zero-based indices `0`, `27`, `72`, and `98`; the other four output coordinates do not occur in the source coordinate list. These are coordinate-equality observations, **not established internal correspondence records or surviving-node identities**. Do not infer per-node displacement by matching array indices or describe the operation as merely deleting 91 points.

Both endpoint evaluator pointers and the path header's stored value at `+0x98` (`2.5`) are unchanged. The pointed-to evaluator objects were not captured recursively. That stored value is distinct from the recovered `min(k * 0.05, 1)` endpoint-processing argument and must not be compared as though they were the same field.

Quadratic-Bezier source nodes are compatible with selector `0`: the selector chooses the post-correction branch, whose captured result here uses spline nodes.

## Coverage limits

- This is evidence of native post-correction execution and before/after geometry for one observed parameter set. It does not establish equivalence of the complete reconstructed curve algorithm.
- No internal scalar-limit, removal-pass, corner, sampling, or endpoint-helper results were independently captured. Calculations from the reference are predictions, not additional native measurements.
- Speed adjustment was off. Speed-on behavior, tolerance-scaling-on behavior, the alternate Bezier branch, tablet input, and live stabilization remain outside this capture's validation.
- The requested live-stabilization settings are metadata, not directly observed settings in this post-correction capture.
- The return snapshot is taken at the normal epilogue before subsequent rendering finishes. No rendered-image comparison was performed.
- Breakpoint stops and debugger reads affect timing. The boundary-record interval is not a measurement of native processing latency or pen feel.

The earlier empty `post-mouse-manual-20261010T183756Z` attempt does not indicate a failed correction route: the user subsequently confirmed that no stroke occurred during that recording window. The successful capture gives no reason to require another mouse stroke solely to diagnose that earlier attempt.
