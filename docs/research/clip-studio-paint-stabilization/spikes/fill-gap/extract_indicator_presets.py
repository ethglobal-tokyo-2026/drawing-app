"""Read the pinned ARM64 image and retain bounded Close gap indicator evidence."""

import argparse
import hashlib
import json
import os
import runpy
import struct
import subprocess
from pathlib import Path


PINNED_SHA256 = "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"
RETAINED_NAME_ROOT = 0x894593
FUNCTIONS = {
    0x102A9D450: "fill-factory-indicators",
    0x100B2B518: "indicator-map-insertion",
    0x100F28A78: "indicator-block-values",
    0x1032CC1AC: "indicator-index-value",
    0x1032CCBB4: "indicator-block-rectangle",
    0x1032CBEA8: "set-indicator-values",
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binary", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    data = args.binary.read_bytes()
    actual_hash = hashlib.sha256(data).hexdigest()
    if actual_hash != PINNED_SHA256:
        raise ValueError(f"Unexpected image SHA256: {actual_hash}")

    os.environ["CSP_ARM64"] = str(args.binary)
    helper = Path(__file__).resolve().parents[1] / "live-contract/inspect_binary.py"
    native = runpy.run_path(str(helper))
    position = 32
    export_offset = export_size = None
    for _ in range(struct.unpack_from("<I", data, 16)[0]):
        command, size = struct.unpack_from("<II", data, position)
        if command == 0x80000022:
            *_, export_offset, export_size = struct.unpack_from("<10I", data, position + 8)
        position += size
    if export_offset is None:
        raise ValueError("LC_DYLD_INFO_ONLY export-name data is absent")
    names = data[export_offset:export_offset + export_size]

    def unsigned_leb128(position):
        value = shift = 0
        for _ in range(10):
            byte = names[position]
            position += 1
            value |= (byte & 127) << shift
            if not byte & 128:
                return value, position
            shift += 7
        raise ValueError("Invalid unsigned LEB128 value")

    def encode_unsigned_leb128(value):
        encoded = bytearray()
        while True:
            byte = value & 127
            value >>= 7
            encoded.append(byte | 128 if value else byte)
            if not value:
                return bytes(encoded)

    def children(start):
        terminal_size, position = unsigned_leb128(start)
        if terminal_size > 30:
            raise ValueError("Candidate terminal exceeds the native terminal size")
        position += terminal_size
        count = names[position]
        position += 1
        if count > 100:
            raise ValueError("Candidate has too many children")
        result = []
        for _ in range(count):
            end = names.index(0, position)
            suffix = names[position:end].decode("ascii")
            if not suffix or len(suffix) > 800 or not suffix.isprintable():
                raise ValueError("Candidate suffix is not a symbol-name edge")
            child, next_position = unsigned_leb128(end + 1)
            if child >= len(names):
                raise ValueError("Candidate child is outside the name data")
            result.append((suffix, child, end + 1))
            position = next_position
        return result

    parent_cache = {}

    def parent_of(child):
        if child in parent_cache:
            return parent_cache[child]
        encoded = encode_unsigned_leb128(child)
        position = -1
        matches = []
        while True:
            position = names.find(encoded, position + 1)
            if position < 0:
                break
            if names[position - 1] != 0:
                continue
            for start in range(max(0, position - 15000), position):
                if names[start] != 0:
                    continue
                try:
                    selected = [(suffix, target) for suffix, target, offset in children(start)
                                if target == child and offset == position]
                except (ValueError, UnicodeDecodeError, IndexError):
                    # A byte search also proposes non-node locations; reject those candidates.
                    continue
                if selected:
                    matches.append((start, selected[0][0]))
        result = matches[-1] if matches else None
        parent_cache[child] = result
        return result

    # Recover only the requested names from retained nodes disconnected from the public root.
    symbols = []
    relevant_addresses = (set(FUNCTIONS) - {0x100B2B518}) | {0x102A9A7D4, 0x100F26DBC}
    for address in sorted(relevant_addresses):
        address_bytes = encode_unsigned_leb128(address - 0x100000000)
        terminal_bytes = bytes([len(address_bytes) + 1, 0]) + address_bytes + b"\0"
        terminal = names.index(terminal_bytes)
        position = terminal
        path = []
        chain = []
        for _ in range(64):
            parent = parent_of(position)
            if parent is None:
                break
            start, suffix = parent
            path.append(suffix)
            chain.append({"child": hex(position), "parent": hex(start), "suffix": suffix})
            position = start
        else:
            raise ValueError("Retained symbol ancestry did not terminate")
        if position != RETAINED_NAME_ROOT:
            raise ValueError(f"Unexpected retained symbol root: {position:#x}")
        symbols.append({"address": hex(address), "flags": 0,
                        "name": "".join(reversed(path)), "ancestry": chain})

    demangled = subprocess.check_output(
        ["c++filt", *[symbol["name"] for symbol in symbols]], text=True, timeout=30
    ).splitlines()
    for symbol, description in zip(symbols, demangled, strict=True):
        symbol["demangled"] = description

    table_sources = []
    values = []
    for address in (0x104314720, 0x104314630):
        offset = native["offset"](address)
        pair = struct.unpack_from("<2d", data, offset)
        values.extend(pair)
        table_sources.append({"address": hex(address), "file_offset": hex(offset),
                              "bytes": data[offset:offset + 16].hex(), "values": pair})
    values.append(struct.unpack("<d", struct.pack("<Q", 0x4034000000000000))[0])
    assert values == [1, 3, 5, 10, 20]

    label_path = args.binary.parent.parent / "research-files/csp-resource-analysis/english-labels.json"
    labels = [label for label in json.loads(label_path.read_text())
              if label["group"] == 46 and label["subgroup"] == 1 and label["label"] in (25, 26)]
    assert {label["label"]: label["text"] for label in labels} == {
        25: "Close gap", 26: "Set the width of gaps to treat as closed"
    }
    control_constants = []
    for address, count in ((0x1042ECB78, 1), (0x1045528E0, 2), (0x104559A50, 2)):
        offset = native["offset"](address)
        control_constants.append({"address": hex(address), "file_offset": hex(offset),
                                  "bytes": data[offset:offset + count * 8].hex(),
                                  "values": struct.unpack_from(f"<{count}d", data, offset)})

    args.output.mkdir(parents=True, exist_ok=True)
    extractions = []
    ranges = [(address, native["func"](address)[1], title)
              for address, title in FUNCTIONS.items()]
    ranges.extend([
        (0x102A9AC9C, 0x102A9ACCC, "close-gap-parameter-branch"),
        (0x102A9C014, 0x102A9C0E0, "close-gap-control-attribute"),
        (0x100F2708C, 0x100F270D0, "apply-custom-indicator-values"),
    ])
    for start, end, title in ranges:
        command = ["objdump", "-d", "--no-show-raw-insn", f"--start-address={start:#x}",
                   f"--stop-address={end:#x}", str(args.binary)]
        assembly = subprocess.check_output(command, text=True, timeout=30)
        destination = args.output / f"{title}.asm"
        destination.write_text(assembly)
        function_start, function_end = native["func"](start)
        extractions.append({"file": destination.name, "command": command,
                            "start": hex(start), "end": hex(end),
                            "function_start": hex(function_start),
                            "function_end": hex(function_end),
                            "sha256": hashlib.sha256(assembly.encode()).hexdigest()})

    manifest = {
        "binary": str(args.binary), "sha256": actual_hash,
        "export_name_data": {"file_offset": hex(export_offset), "size": hex(export_size),
                             "retained_subtree_root": hex(RETAINED_NAME_ROOT),
                             "recovered_symbols": len(symbols)},
        "symbols": sorted(symbols, key=lambda symbol: symbol["address"]),
        "close_gap_parameter_id": 5101,
        "factory_indicator_values": values,
        "map_node_value_offsets": ["0x28", "0x30", "0x38", "0x40", "0x48"],
        "table_sources": table_sources,
        "final_value_immediate": "0x4034000000000000",
        "indicator_setting_flag": {"map_node_offset": "0x50", "value": 1},
        "close_gap_label_id": "0x002e0019",
        "label_resource": {"file": str(label_path), "entries": labels},
        "control_constants": control_constants,
        "extractions": extractions,
    }
    (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"factory_indicator_values": values, "evidence": str(args.output),
                      "symbols": len(symbols), "verified_sha256": actual_hash}))


if __name__ == "__main__":
    main()
