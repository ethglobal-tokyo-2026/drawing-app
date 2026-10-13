# Manual capture timing and partial arithmetic diagnosis

Both recordings continued processing distinct pen positions until their 27-second capture deadlines. Neither reached native pen release. The saved evidence supports substantial slowdown caused by recording, rather than a deadlock. It does not prove that a release was already queued.

This analysis reads saved files only. The original JSONL files and their incomplete summaries are unchanged. No application access or new capture was used.

## Exact inputs

Paths below are relative to `evidence/debugger-access/`:

| Capture | Raw file SHA-256 |
| --- | --- |
| `tablet-manual-20261011T171306.937948Z-8cdfbb39/tablet.jsonl` | `457dc2855e5e8a3eb667abd6233d8df2b67b74c522312a9377f236781533bc5f` |
| `tablet-manual-20261011T171422.944399Z-33211c35/tablet.jsonl` | `944b7d16933eaef5d787493de2ed7f61ed6c95faa2236761440ca755a6723947` |

Both use native queue S=20, T=0, fast=0, slow=0, I=2, D=0. This establishes the queue configuration, not every brush UI setting. Their initial histories contain 16 and 42 records, respectively.

## Timing evidence

| Measurement | 17:13:06 capture | 17:14:22 capture |
| --- | ---: | ---: |
| Recorder-confirmed pairs, including excluded events | 422 | 371 |
| Excluded calls before the captured begin | 24 | 45 |
| Host time at begin | 2.417 s | 4.074 s |
| Included entries | 398 | 327 |
| Recorder-confirmed included pairs | 398 | 326 |
| Host time from first to last included entry | 24.558 s | 22.677 s |
| Native timestamp advancement during that span | 2,130 ticks | 1,944 ticks |
| Host/input duration ratio, using milliseconds | 11.53 | 11.67 |
| Median entry spacing | 60.792 ms | 65.537 ms |
| Median debugger stop spacing | 20.176 ms | 20.672 ms |
| Last included input pressure | 0.505882 | 0.450980 |
| Native release observed | No | No |
| Clean detach recorded | Yes | Yes |

All included `(x,y,pressure)` tuples are distinct. Native timestamps never regress; repeated integer timestamps therefore do not show that the same event was processed repeatedly. Samples advance through the deadlines with no long stationary interval that would establish a hang.

Each ordinary input uses three debugger stops: dispatcher, ingestion entry, and ingestion exit. The accumulated logged running-to-stopped intervals are 23.431 s and 22.067 s, with medians around 18 ms. Logged stopped-to-running intervals total 3.444 s and 4.585 s, with medians around 2.1–2.2 ms. This points to the resume/stop round trip or event waiting as the main recorded cost. These intervals cannot separate debugger polling from target resume/trap overhead; they are not exact measurements of CPU execution or pause duration.

Native timestamps are interpreted as milliseconds using the normal macOS event producer recovered in [the packet contract](../../../spikes/live-contract/README.md), which computes `truncate(NSEvent.timestamp * 1000)`. These saved captures do not independently calibrate alternate or fallback clocks. Host time comes from the recorder's `elapsed_seconds`. The slowdown ratios are conditional on that recovered timestamp interpretation.

The latest capture saved raw entry and exit records for call 372, but its deadline interrupted the following singleton validation before the recorder confirmed the pair. That call remains unconfirmed.

## Partial arithmetic comparison

The existing [partial comparator](../tablet-live-s20-20261011T165317Z/compare-recorded-ingestions.mjs) was run directly on each unchanged raw file. It retains predicted state across calls, compares raw numeric fields exactly, and does not invoke or weaken the complete-capture reader. Reports are saved beside their inputs as `diagnostic-ingestions.json`.

| Result | 17:13:06 capture | 17:14:22 capture |
| --- | ---: | ---: |
| Raw entry/exit records compared | 398 | 327 |
| Numeric field comparisons | 10,746 | 8,829 |
| Numeric discrepancy records | 8 | 14 |
| Maximum binary64 ULP distance | 1 | 2 |
| Maximum absolute numeric difference | 2.2737367544323206e-13 | 5.684341886080802e-14 |
| Compared control-field differences | 0 | 0 |

The prior capture's discrepancies originate in pressure output at call 48 and x output at call 83. The latest capture's originate in pressure at calls 68, 77, and 79, and y at call 95. Remaining discrepancy records repeat those values in later stored state. Exact bit patterns are preserved in each report. The latest diagnostic includes the raw snapshots for unconfirmed call 372; it does not promote that pair to confirmed status.

These recordings provide useful positive-stabilization examples and expose small failures of exact arithmetic agreement that can be investigated offline without repeating those inputs. Their numerical cause is unresolved. They do not establish complete release behavior, rendered strokes, post correction, other settings, or matching pen feel.

## Artifacts and reproduction

- `timing-measurements.json`: preserved detailed timing measurements, including progress samples and the original error text.
- `analysis.json`: compact provenance, assumptions, configuration, comparison results, and limitations.
- `manifest.json`: SHA-256 hashes of inputs, generated reports, analysis artifacts, and comparator dependencies.

Run the existing comparator from the repository root, replacing `CAPTURE` with either capture directory above and choosing a new output name. The comparator refuses to overwrite an existing report:

```sh
node docs/research/clip-studio-paint-stabilization/evidence/debugger-access/tablet-live-s20-20261011T165317Z/compare-recorded-ingestions.mjs docs/research/clip-studio-paint-stabilization/evidence/debugger-access/CAPTURE/tablet.jsonl docs/research/clip-studio-paint-stabilization/evidence/debugger-access/CAPTURE/diagnostic-ingestions-repeat.json
```

Timing spans subtract the first selected entry's timestamp from the last; spacing statistics use adjacent records in file order. Source kinds, input phases, pressure ranges, and unique input tuples are counted directly from JSONL. The diagnostic reports intentionally retain `originalFixtureComplete: false` and status `diagnostic_ingestion_comparison_only` even when few differences exist.
