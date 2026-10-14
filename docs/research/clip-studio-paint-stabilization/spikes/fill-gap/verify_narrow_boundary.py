"""Check every retained narrow-boundary instruction against the pinned image."""

import bisect
import hashlib
import json
import os
import re
import runpy
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "evidence/narrow-boundary/manifest.json"


def main():
    manifest = json.loads(MANIFEST.read_text())
    os.environ["CSP_ARM64"] = manifest["source"]
    native = runpy.run_path(str(ROOT.parent / "live-contract/inspect_binary.py"))
    source_hash = hashlib.sha256(native["DATA"]).hexdigest()
    if source_hash != manifest["source_sha256"]:
        raise ValueError(f"Unexpected source image SHA256: {source_hash}")
    names_offset = int(manifest["retained_names"]["file_offset"], 16)
    names = native["DATA"][names_offset:names_offset + manifest["retained_names"]["bytes"]]

    def unsigned_leb128(position):
        value = shift = 0
        for _ in range(10):
            byte = names[position]
            position += 1
            value |= (byte & 127) << shift
            if not byte & 128:
                return value, position
            shift += 7
        raise ValueError("Retained name value exceeds ten bytes")

    checked_names = []
    for symbol in manifest["retained_names"]["symbols"]:
        node = int(symbol["terminal_node"], 16)
        expected = bytes.fromhex(symbol["terminal_bytes"])
        if names[node:node + len(expected)] != expected:
            raise ValueError(f"Retained name terminal differs for {symbol['address']}")
        terminal_size, position = unsigned_leb128(node)
        flags, position = unsigned_leb128(position)
        relative, _ = unsigned_leb128(position)
        if flags != symbol["flags"] or native["BASE"] + relative != int(symbol["address"], 16):
            raise ValueError(f"Retained name terminal address differs for {symbol['address']}")
        suffixes = []
        for edge in symbol["ancestry"]:
            if int(edge["child"], 16) != node:
                raise ValueError(f"Retained name ancestry is disconnected for {symbol['address']}")
            parent = int(edge["parent"], 16)
            size, position = unsigned_leb128(parent)
            position += size
            count = names[position]
            position += 1
            matched = False
            for _ in range(count):
                edge_start = position
                end = names.index(0, position)
                suffix = names[position:end].decode("ascii")
                child, position = unsigned_leb128(end + 1)
                if (child == node and suffix == edge["suffix"]
                        and names_offset + edge_start == int(edge["edge_file_offset"], 16)):
                    matched = True
            if not matched:
                raise ValueError(f"Retained name ancestry edge differs for {symbol['address']}")
            suffixes.append(edge["suffix"])
            node = parent
        if (node != int(manifest["retained_names"]["root"], 16)
                or "".join(reversed(suffixes)) != symbol["name"]):
            raise ValueError(f"Retained name root or spelling differs for {symbol['address']}")
        checked_names.append({"address": symbol["address"], "name": symbol["name"]})
    checked = []
    for extract in manifest["extracts"]:
        path = MANIFEST.parent / extract["file"]
        assembly = path.read_bytes()
        assembly_hash = hashlib.sha256(assembly).hexdigest()
        if assembly_hash != extract["assembly_sha256"]:
            raise ValueError(f"Assembly SHA256 differs for {path}")
        start, end = int(extract["start"], 16), int(extract["end_exclusive"], 16)
        if native["func"](start) != (start, end):
            raise ValueError(f"LC_FUNCTION_STARTS differs for {start:#x}")
        index = bisect.bisect_left(native["starts"], start)
        if native["starts"][index] != start:
            raise ValueError(f"Requested address is not a function start: {start:#x}")
        instructions = []
        for line in assembly.decode().splitlines():
            match = re.match(r"([0-9a-f]+): ([0-9a-f]{8})  (.+)", line)
            if not match:
                continue
            address = int(match[1], 16)
            actual = native["DATA"][native["offset"](address):native["offset"](address) + 4]
            if bytes.fromhex(match[2]) != actual:
                raise ValueError(f"Instruction bytes differ at {address:#x}")
            instructions.append(address)
        if instructions != list(range(start, end, 4)):
            raise ValueError(f"Instruction range is incomplete for {start:#x}")
        offset = native["offset"](start)
        raw_hash = hashlib.sha256(native["DATA"][offset:offset + end - start]).hexdigest()
        if raw_hash != extract["bytes_sha256"]:
            raise ValueError(f"Range byte SHA256 differs for {start:#x}")
        checked.append({"file": extract["file"], "instructions": len(instructions),
                        "bytes_sha256": raw_hash, "assembly_sha256": assembly_hash})

    prior = json.loads((ROOT / "evidence/algorithm-extraction.json").read_text())
    prior_files = []
    for retained in prior["files"]:
        start = int(retained["start"], 16)
        if start not in {int(extract["start"], 16) for extract in manifest["extracts"]}:
            continue
        path = ROOT / "evidence" / Path(retained["path"]).name
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != retained["sha256"]:
            raise ValueError(f"Earlier extraction SHA256 differs for {path}")
        prior_files.append({"file": path.name, "assembly_sha256": actual})
    result = {"source_sha256": source_hash, "retained_names": checked_names, "new_extracts": checked,
              "earlier_assembly_hashes": prior_files,
              "scope": "Static byte and boundary verification; no native helper execution."}
    (MANIFEST.parent / "verification.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"verified_source_sha256": source_hash, "new_ranges": len(checked),
                      "new_instructions": sum(item["instructions"] for item in checked),
                      "retained_names": len(checked_names), "earlier_assembly_hashes": len(prior_files)}))


if __name__ == "__main__":
    main()
