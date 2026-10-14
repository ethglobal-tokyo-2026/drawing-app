"""Retain pinned ARM64 narrow-boundary instructions without running CSP."""

import argparse
import bisect
import hashlib
import json
import re
import struct
import subprocess
import time
from pathlib import Path


PINNED_SHA256 = "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"
RETAINED_NAME_ROOT = 0x894593
FUNCTIONS = (
    0x102543078,
    0x102090F80,
    0x102541B0C,
    0x102541C94,
    0x102542720,
    0x10254343C,
)


def unsigned_leb128(data, position, limit):
    value = shift = 0
    for _ in range(10):
        if position >= limit:
            raise ValueError("Unsigned LEB128 exceeds its retained data")
        byte = data[position]
        position += 1
        value |= (byte & 127) << shift
        if not byte & 128:
            return value, position
        shift += 7
    raise ValueError("Unsigned LEB128 exceeds ten bytes")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binary", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    data = args.binary.read_bytes()
    source_hash = hashlib.sha256(data).hexdigest()
    if source_hash != PINNED_SHA256:
        raise ValueError(f"Unexpected image SHA256: {source_hash}")
    if struct.unpack_from("<I", data)[0] != 0xFEEDFACF:
        raise ValueError("The pinned image is not a little-endian Mach-O 64 image")

    segments = []
    position = 32
    starts_offset = starts_size = names_offset = names_size = None
    base = None
    for _ in range(struct.unpack_from("<I", data, 16)[0]):
        command, size = struct.unpack_from("<II", data, position)
        if command == 0x19:
            name = data[position + 8:position + 24].rstrip(b"\0").decode("ascii")
            address, _, offset, file_size = struct.unpack_from("<4Q", data, position + 24)
            segments.append((address, address + file_size, offset))
            if name == "__TEXT":
                base = address
        elif command == 0x26:
            starts_offset, starts_size = struct.unpack_from("<2I", data, position + 8)
        elif command == 0x80000022:
            names_offset, names_size = struct.unpack_from("<10I", data, position + 8)[8:]
        position += size
    if None in (base, starts_offset, starts_size, names_offset, names_size):
        raise ValueError("Required Mach-O address or function-name data is absent")

    def offset_of(address):
        for start, end, offset in segments:
            if start <= address < end:
                return offset + address - start
        raise ValueError(f"Address outside file-backed segments: {address:#x}")

    starts = []
    starts_provenance = []
    position = starts_offset
    address = base
    while position < starts_offset + starts_size:
        entry = position
        delta, position = unsigned_leb128(data, position, starts_offset + starts_size)
        if not delta:
            break
        address += delta
        starts.append(address)
        starts_provenance.append({"address": hex(address), "file_offset": hex(entry),
                                  "delta": delta, "encoded_bytes": data[entry:position].hex()})

    names = data[names_offset:names_offset + names_size]
    def encode_unsigned_leb128(value):
        result = bytearray()
        while True:
            byte = value & 127
            value >>= 7
            result.append(byte | 128 if value else byte)
            if not value:
                return bytes(result)

    def children(node):
        terminal_size, position = unsigned_leb128(names, node, len(names))
        if terminal_size > 30:
            raise ValueError("Candidate retained name terminal is too large")
        position += terminal_size
        count = names[position]
        position += 1
        if count > 100:
            raise ValueError("Candidate retained name has too many children")
        result = []
        for _ in range(count):
            end = names.index(0, position)
            suffix = names[position:end].decode("ascii")
            child, after = unsigned_leb128(names, end + 1, len(names))
            if not suffix or len(suffix) > 800 or not suffix.isprintable() or child >= len(names):
                raise ValueError("Candidate retained name child is invalid")
            result.append((suffix, child, end + 1, position))
            position = after
        return result

    deadline = time.monotonic() + 55
    parent_cache = {}
    rejected_candidates = 0

    def parent_of(child):
        nonlocal rejected_candidates
        if child in parent_cache:
            return parent_cache[child]
        encoded = encode_unsigned_leb128(child)
        position = -1
        matches = []
        while True:
            if time.monotonic() > deadline:
                raise TimeoutError("Retained function-name recovery exceeded 55 seconds")
            position = names.find(encoded, position + 1)
            if position < 0:
                break
            if position == 0 or names[position - 1] != 0:
                continue
            for node in range(max(0, position - 15000), position):
                if names[node] != 0:
                    continue
                try:
                    edges = [(suffix, edge) for suffix, target, pointer, edge in children(node)
                             if target == child and pointer == position]
                except (ValueError, UnicodeDecodeError, IndexError):
                    # The byte search proposes arbitrary data; retain the rejected-candidate count.
                    rejected_candidates += 1
                    continue
                if edges:
                    matches.append((node, edges[0][0], edges[0][1]))
        if not matches:
            raise ValueError(f"No validated retained function-name parent for node {child:#x}")
        result = matches[-1]
        parent_cache[child] = result
        return result

    symbols = []
    for address in FUNCTIONS:
        address_bytes = encode_unsigned_leb128(address - base)
        terminal_bytes = bytes([len(address_bytes) + 1, 0]) + address_bytes + b"\0"
        terminal = names.index(terminal_bytes)
        position = terminal
        ancestry = []
        suffixes = []
        for _ in range(64):
            if position == RETAINED_NAME_ROOT:
                break
            parent, suffix, edge = parent_of(position)
            ancestry.append({"parent": hex(parent), "child": hex(position), "suffix": suffix,
                             "edge_file_offset": hex(names_offset + edge)})
            suffixes.append(suffix)
            position = parent
        else:
            raise ValueError("Retained function-name ancestry exceeds 64 edges")
        symbols.append({"address": hex(address), "name": "".join(reversed(suffixes)), "flags": 0,
                        "terminal_node": hex(terminal), "terminal_file_offset": hex(names_offset + terminal),
                        "terminal_bytes": terminal_bytes.hex(), "ancestry": ancestry})
    if symbols:
        descriptions = subprocess.check_output(
            ["c++filt", *[symbol["name"] for symbol in symbols]], text=True, timeout=30
        ).splitlines()
        for symbol, description in zip(symbols, descriptions, strict=True):
            symbol["demangled"] = description

    args.output.mkdir(parents=True, exist_ok=True)
    extracts = []
    for start in FUNCTIONS:
        index = bisect.bisect_left(starts, start)
        if starts[index] != start:
            raise ValueError(f"Requested address is not an LC_FUNCTION_STARTS entry: {start:#x}")
        end = starts[index + 1]
        command = ["objdump", "-d", "--no-show-raw-insn", f"--start-address={start:#x}",
                   f"--stop-address={end:#x}", str(args.binary)]
        decoded = subprocess.check_output(command, text=True, timeout=30)
        lines = [f"; CSP 5.1.4 ARM64, unslid range {start:#x}:{end:#x}",
                 f"; source sha256 {source_hash}",
                 "; Instruction bytes are in little-endian storage order."]
        addresses = []
        for line in decoded.splitlines():
            match = re.match(r"([0-9a-f]+):\s+(.*)", re.sub(r" <[^>]*>", "", line))
            if not match:
                continue
            address = int(match[1], 16)
            if not start <= address < end:
                raise ValueError(f"Decoded instruction outside requested bounds: {address:#x}")
            raw = data[offset_of(address):offset_of(address) + 4]
            lines.append(f"{address:x}: {raw.hex()}  {match[2]}")
            addresses.append(address)
        if addresses != list(range(start, end, 4)):
            raise ValueError(f"Instruction addresses do not cover the requested bounds: {start:#x}")
        assembly = "\n".join(lines) + "\n"
        destination = args.output / f"{start:x}.asm"
        destination.write_text(assembly)
        raw = data[offset_of(start):offset_of(start) + end - start]
        extracts.append({"file": destination.name, "start": hex(start), "end_exclusive": hex(end),
                         "bytes": len(raw), "instruction_count": len(addresses),
                         "file_offset": hex(offset_of(start)),
                         "bytes_sha256": hashlib.sha256(raw).hexdigest(),
                         "assembly_sha256": hashlib.sha256(assembly.encode()).hexdigest(),
                         "function_start_entry": starts_provenance[index],
                         "next_function_start_entry": starts_provenance[index + 1],
                         "command": command})
    manifest = {
        "source": str(args.binary), "source_sha256": source_hash,
        "scope": "Static extraction only; no CSP execution, UI changes, or debugger attachment.",
        "address_kind": "Unslid ARM64 virtual address",
        "text_base": hex(base),
        "function_starts": {"command": "LC_FUNCTION_STARTS", "file_offset": hex(starts_offset),
                            "bytes": starts_size, "entry_count": len(starts),
                            "sha256": hashlib.sha256(data[starts_offset:starts_offset + starts_size]).hexdigest()},
        "retained_names": {"command": "LC_DYLD_INFO_ONLY", "file_offset": hex(names_offset),
                           "bytes": names_size, "root": hex(RETAINED_NAME_ROOT),
                           "root_provenance": "Existing evidence/indicator-presets/manifest.json retained subtree root",
                           "method": "Recover addressed terminals and validate their parent edges to the retained root",
                           "rejected_byte_search_candidates": rejected_candidates,
                           "symbols": sorted(symbols, key=lambda x: x["address"])},
        "extracts": extracts,
    }
    (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"verified_source_sha256": source_hash, "functions": len(extracts),
                      "recovered_names": len(symbols), "rejected_byte_search_candidates": rejected_candidates}))


if __name__ == "__main__":
    main()
