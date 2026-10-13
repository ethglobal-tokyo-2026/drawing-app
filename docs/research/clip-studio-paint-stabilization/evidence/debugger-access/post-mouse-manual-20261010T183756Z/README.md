# Manual mouse post-correction attempt, 2026-10-10

Result: **incomplete capture**. Both verified research processes installed the two hardware probes and ran until the capture deadline with zero entries and zero pairs. No post-correction operation was observed. This is not evidence of formula agreement or disagreement.

The user indicated readiness before arming. Both active markers were observed before the recording cue. The user subsequently confirmed that no stroke was drawn within this recording window. This explains the empty capture and does not justify further routing diagnostics. The brush settings were requested and user-confirmed, not independently observed through the inaccessible UI.

Requested settings: Post correction 5; speed adjustment off; display-scale adjustment off; Bezier curve off; live stabilization 0; speed-dependent live stabilization off. These values are recorded as metadata and are not measured wrapper arguments: neither wrapper was entered.

| Process | Header UTC                       | Completion elapsed   | Entries / pairs | Detach observed |
| ------- | -------------------------------- | -------------------- | --------------- | --------------- |
| 21351   | 2026-10-10T18:38:02.184422+00:00 | 27.114367375 seconds | 0 / 0           | Yes             |
| 21626   | 2026-10-10T18:38:02.307524+00:00 | 27.1245135 seconds   | 0 / 0           | Yes             |

Each recorder used a 30-second total budget with three seconds reserved for cleanup. Both verified all 284 bytes of the wrapper against the pinned original image and used hardware entry/normal-epilogue probes. Both reported `CaptureError: capture_deadline_reached`, no cleanup errors or warnings, and observed detach. The outer runner exited normally; both debugger processes exited 0. Debugger exit 0 does not mean capture completion.

An independent OS process check after both debugger children exited found both research processes in state `S` at the approved research executable path; see [process-resume.txt](process-resume.txt). The raw recorder summaries retain `resumeIndependentlyVerified: false` because that later check is external to the recorder.

The offline analyzer returned 2 for both files, as expected for incomplete captures:

```text
Capture integrity: invalid; valid pairs: 0; arithmetic matches/mismatches: 0/0; whole-curve equivalence: not evaluated.
```

- [PID 21351 recording](pid-21351.jsonl), [debugger output](pid-21351-lldb.txt), [analysis report](pid-21351-report.json).
- [PID 21626 recording](pid-21626.jsonl), [debugger output](pid-21626-lldb.txt), [analysis report](pid-21626-report.json).

A [subsequent user-requested repeat](../post-mouse-manual-20261010T184049Z/README.md) captured a valid native post-correction operation. This empty attempt remains preserved. Neither attempt validates native tablet input or the complete post-correction curve engine.
