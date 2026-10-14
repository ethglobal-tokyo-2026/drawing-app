# Research app cleanup and remaining settings

The October 13, 2026 research used the explicitly authorized research CSP app,
PID 57266. Four initial gap-5 calls and thirteen additional larger-gap and
soft-source calls succeeded. Each successful run retained complete boundaries,
native success, clean observed detach, and an independent launcher resume
check. The last actual call was the successful diagonal gap-10 capture. No
debugger was left attached. The [final exact-process check](evidence/larger-gap-final-process.json)
at 16:46:55 UTC found the same research executable in state S, flags 4004.

Failed runs remain failures. The earlier zero-call preset sweep resumed cleanly.
The first later pocket-pair attempt reached its deadline with zero fill entries
and acknowledged/observed detach, but the launcher found PID 57266 stopped.
After verifying the exact PID and research executable, the root agent explicitly
sent SIGCONT and confirmed resumed execution; the unchanged raw result and
[explicit recovery record](evidence/captures/narrow-pocket-large-pair-20261013T160531.815206Z-1e0f0899/explicit-resume-recovery.json)
remain retained. The zero-call retry detached and resumed cleanly. Neither failed
attempt supplies algorithm or natural-latency evidence.

The shared research helper contained a demonstrated timer race: cancellation
did not wait for an already-started watchdog interrupt before detach. Cleanup
now boundedly joins the started timer before process cleanup. Five synthetic
regressions reproduced the race and pass with the safeguard. The cause of the
native stopped process remains unproven; no automatic process recovery or
target-memory changes were added.

All documents created or opened for this investigation were closed without
saving over their source: the manual `CSP fill gap research 20261013` scratch
document and `axis-gap-5.png`, `narrow-pocket.png`, `diagonal-opening.png`,
`recolor-bridge-4.png`, `edge-gap-2.png`, `axis-gap-10.png`, `axis-gap-20.png`,
`axis-gap-21.png`, and all five `soft-axis-gap10-*.png` sources. The final
diagonal control was separately reopened and closed without saving. Source
fixtures remain in this research directory, with original hashes verified.
The original unsaved `CSP joined capture` and `イラスト 20261011` documents
remain open. No source-pixel operation was intentionally performed in them.

The palette view was restored, and the temporary Tool Detail panel was closed.
G-pen size was restored to its original **12 px** using the size shortcuts and
verified in [ui-research-cleanup.png](evidence/ui-research-cleanup.png) and the
[later cleanup screenshot](evidence/ui-larger-gap-cleanup-20261013.png).
The selected tool was returned to G-pen with the verified keyboard shortcut;
its size remains 12 px. The original two unsaved documents remain open.

Arbitrary coordinate clicks subsequently returned `noWindowsAvailable` for
the main window and Tool Detail panel. Accessibility-index window clicks,
menus, and ordinary save-prompt coordinate clicks worked. Those accessible
controls enabled the final three native captures and closing scratch inputs,
but did not provide precise access to the following original settings:

| Setting                                | Before research                                        | Remaining research state |
| -------------------------------------- | ------------------------------------------------------ | ------------------------ |
| Refer only to editing layer: Close gap | 2                                                      | 10, fourth preset        |
| Drawing color                          | Black                                                  | Red `#ff0000`            |
| Selected tool/subtool                  | Original custom pen; Fill initially Refer other layers | G-pen, restored to 12 px |
| Material category                      | Poses                                                  | Hands                    |

Refer other layers retains its original gap 20. Refer only to editing layer
retains color margin 10, area scaling off, anti-aliasing on, and narrow areas
on; Multiple reference was explicitly returned to off before native captures.
The custom pen's size 29.5 was not edited. Restoring its selection and the
remaining items requires working point input in the research app. Do not
reset whole tools or overwrite the operator's preference files to accomplish
that restoration.

The outstanding native pocket gap-20 and near-line gap-10/20 cases need precise
point input. Five native soft-source gap-10 controls are complete; gap-20 soft
controls, narrow off, native final RGBA, and natural timing remain unmeasured.
Do not relabel a canvas-center click as an actual near-line seed.

Automatic approval review once rejected the next native attachment after
reading the observer's nested `resumeIndependentlyVerified=false`. That field
cannot establish OS execution by design; the launcher's top-level field was
true and its saved process check showed S. A fresh exact-PID check independently
confirmed S and the research executable; the subsequent attachment was approved.
The rejection was resolved through evidence, with no indirect attachment or
bypass.

The observer, fixture, and comparison helper checks are host-only checks; they
do not launch or attach to CSP. No Croquis product code or dependencies were
changed by this research. Remaining settings above were not silently reset;
precise restoration is still blocked by unavailable point input.
