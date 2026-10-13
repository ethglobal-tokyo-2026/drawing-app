"""Offline diagnosis of the two partial tablet recordings; no target attachment.

Requires Python with math.fma. Reconstructs fixed-window history averaging from
the initial captured history and incoming registers. Does not certify the full
capture contract, source completion, pen lift, or pen feel.
"""

import hashlib
import json
import math
from pathlib import Path
import struct
import sys


BASE = Path(__file__).resolve().parent.parent
CAPTURES = (
    "tablet-manual-20261011T171306.937948Z-8cdfbb39",
    "tablet-manual-20261011T171422.944399Z-33211c35",
)


def double(raw, offset=0):
    return struct.unpack_from("<d", raw, offset)[0]


def integer(raw, offset):
    return struct.unpack_from("<i", raw, offset)[0]


def bits(value):
    return "0x" + struct.pack(">d", value).hex()


def diagnose(name):
    source = (BASE / name / "tablet.jsonl").read_bytes()
    rows = [json.loads(line) for line in source.splitlines()]
    summary = rows[-1]
    assert summary["kind"] == "summary"
    ids = summary["fixture_call_ids"]
    entries = {r["call_id"]: r for r in rows if r["kind"] == "entry"}
    exits = {r["call_id"]: r for r in rows if r["kind"] == "exit"}
    first = entries[ids[0]]
    raw = bytes.fromhex(first["queue"]["bytes_le"])
    history = [
        struct.unpack("<dddq", bytes.fromhex(record["bytes_le"]))
        for record in first["initial_history_oldest_first"]
    ]
    window = double(raw, 0x58)
    stabilization = integer(raw, 0x3C)
    initial_window = integer(raw, 0x50)
    assert stabilization == 20
    assert integer(raw, 0x40) == 0 and integer(raw, 0x44) == 0
    report = {
        "capture": name,
        "source_sha256": hashlib.sha256(source).hexdigest(),
        "original_fixture_complete": summary["fixture_complete"],
        "original_stop_reason": summary["stop_reason"],
        "recorded_ingestion_pair_count": len(ids),
        "nonfused_differences": [],
        "fused_differences": [],
    }
    for index, call_id in enumerate(ids):
        entry, exit_record = entries[call_id], exits[call_id]
        before = bytes.fromhex(entry["queue"]["bytes_le"])
        after = bytes.fromhex(exit_record["queue"]["bytes_le"])
        incoming = [
            double(bytes.fromhex(entry["floating_registers"][f"d{k}"]["bytes_le"]))
            for k in range(3)
        ]
        timestamp = int(entry["registers"]["x2"]["signed_decimal"])
        # These fixtures never reach release. Positive pressure makes the
        # extrapolation and zero-pressure/ending geometry branches inactive.
        assert incoming[2] > 0
        assert entry["fpcr_bits"] == exit_record["fpcr_bits"] == "0x00000000"
        assert entry["phase"]["value_i32"] == (2 if index == 0 else 1)
        assert integer(before, 0x88) == (0 if index == 0 else 1)
        assert integer(after, 0x88) == 1
        assert int(entry["registers"]["x6"]["signed_decimal"]) == 0
        assert integer(before, 0x40) == integer(before, 0x44) == 0
        assert integer(before, 0x3C) == stabilization
        if index == 0:
            window = initial_window
        elif window < stabilization:
            window = min(
                stabilization,
                window + min(0.5, (stabilization - window + 1) / stabilization),
            )
        # Window evolves from the initial state; native exits never seed it.
        assert bits(window) == bits(double(after, 0x58))
        history.append((*incoming, timestamp))
        history = history[-1000:]
        recent = history[::-1]
        whole = int(window)
        fraction = window - whole
        sums = [0.0, 0.0, 0.0]
        last = None
        repeated = False
        for i in range(whole):
            candidate = recent[i] if i < len(recent) else None
            if not repeated and candidate and timestamp - candidate[3] <= 1000:
                last = candidate
            else:
                repeated = True
            assert last is not None
            sums = [a + b for a, b in zip(sums, last)]
        if fraction:
            candidate = recent[whole] if whole < len(recent) else None
            if not repeated and candidate and timestamp - candidate[3] <= 1000:
                last = candidate
        assert last is not None
        for mode in ("nonfused", "fused"):
            if fraction:
                totals = [
                    a + b * fraction if mode == "nonfused" else math.fma(b, fraction, a)
                    for a, b in zip(sums, last)
                ]
            else:
                totals = sums
            values = [total * (1 / window) for total in totals]
            for field, value, offset in zip(
                ("x", "y", "pressure"), values, (0x90, 0x98, 0xB0)
            ):
                actual = double(after, offset)
                assert exit_record["emitted"]
                assert bits(actual) == exit_record["output"][field]["bits"]
                if bits(value) != bits(actual):
                    report[mode + "_differences"].append(
                        {
                            "call_id": call_id,
                            "field": field,
                            "window": window,
                            "fraction": fraction,
                            "sum_before_fraction": sums[("x", "y", "pressure").index(field)],
                            "older_sample_value": last[("x", "y", "pressure").index(field)],
                            "predicted_bits": bits(value),
                            "actual_bits": bits(actual),
                        }
                    )
    return report


result = {
    "scope": "fixed-window fractional-history arithmetic diagnosis only",
    "python": sys.version,
    "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    "captures": [diagnose(name) for name in CAPTURES],
    "limitations": [
        "Both original captures remain incomplete and fail the complete-capture contract.",
        "The latest final raw exit exists, but the recorder deadline interrupts its subsequent bookkeeping.",
        "No target attachment, target replay, curve correction, pen-lift validation, or pen-feel test is performed.",
        "No shared replay/reference implementation or raw evidence is modified.",
    ],
}
print(json.dumps(result, indent=2))
