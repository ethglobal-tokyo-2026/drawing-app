"""Retain bounded static Bézier analysis evidence from the pinned CSP image."""

import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import struct
import sys

ROOT = Path(__file__).resolve().parent
EVIDENCE = ROOT / "evidence"
os.environ.setdefault("CSP_ARM64", "/Users/adoll/Applications/CSP Research/original-arm64")
spec = importlib.util.spec_from_file_location(
    "inspect_binary", ROOT.parent / "live-contract/inspect_binary.py"
)
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)
digest = hashlib.sha256(native.DATA).hexdigest()
assert digest == "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"

arguments = sys.argv[1:]
assert 0 < len(arguments) <= 64, "Supply one through 64 function addresses"
EVIDENCE.mkdir(parents=True, exist_ok=True)
manifest_path = EVIDENCE / "extraction.json"
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
    "originalSha256": digest,
    "scope": "Static original-image reads only; no app execution, attachment, or runtime observations.",
    "commands": [],
    "functions": [],
}
assert manifest["originalSha256"] == digest
manifest["commands"].append(
    "python3 docs/research/clip-studio-paint-stabilization/spikes/post-bezier/extract.py "
    + " ".join(arguments)
)
entries = {entry["address"]: entry for entry in manifest["functions"]}
for argument in arguments:
    address = int(argument, 0)
    start, end = native.func(address)
    assert start == address, f"Address belongs to function {start:#x}"
    assert end - start <= 32768, "Function exceeds the static extraction bound"
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        native.disasm(start, end)
    assembly = re.sub(r" STRING .*", "", output.getvalue())
    filename = f"{start:x}.asm"
    (EVIDENCE / filename).write_text(assembly)
    body = native.DATA[native.offset(start):native.offset(start) + end - start]
    calls = sorted(set(re.findall(r"\bbl\s+(0x[0-9a-f]+)", assembly)))
    entries[hex(start)] = {
        "address": hex(start),
        "endExclusive": hex(end),
        "byteLength": end - start,
        "file": filename,
        "bytesSha256": hashlib.sha256(body).hexdigest(),
        "assemblySha256": hashlib.sha256(assembly.encode()).hexdigest(),
        "directCalls": calls,
    }
manifest["functions"] = sorted(entries.values(), key=lambda entry: entry["address"])
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
literal_ranges = [
    (0x1042ECB78, 8),
    (0x1042E3688, 8),
    (0x1042E3690, 8),
    (0x104303CE0, 16),
    (0x104322140, 8),
    (0x104302FD8, 8),
    (0x10454DEB0, 8),
]
literals = []
for address, size in literal_ranges:
    at = native.offset(address)
    raw = native.DATA[at:at + size]
    assert len(raw) == size
    entry = {
        "address": hex(address),
        "bytesHex": raw.hex(),
        "bytesSha256": hashlib.sha256(raw).hexdigest(),
        "storageBits": [f"{struct.unpack_from('<Q', raw, i)[0]:016x}"
                        for i in range(0, size, 8)],
    }
    if address == 0x104303CE0:
        entry["signed64Values"] = [struct.unpack_from("<q", raw, i)[0]
                                   for i in range(0, size, 8)]
    else:
        entry["binary64Values"] = [struct.unpack_from("<d", raw, i)[0]
                                   for i in range(0, size, 8)]
    literals.append(entry)
immediate_bits = ["412e848000000000", "3fe0055e000063b9", "bfe0055e000063b9",
                  "3eb0c6f7a0b5ed8d"]
(EVIDENCE / "literals.json").write_text(json.dumps({
    "originalSha256": digest,
    "scope": "Literal bytes and scalar interpretations from static analysis only.",
    "memory": literals,
    "coordinateSetterImmediateBinary64": [
        {"bits": bits, "value": struct.unpack(
            ">d", bytes.fromhex(bits))[0]} for bits in immediate_bits
    ],
}, indent=2, allow_nan=False) + "\n")
node_vtable = 0x104A527B0
(EVIDENCE / "quadratic-vtable.json").write_text(json.dumps({
    "originalSha256": digest,
    "address": hex(node_vtable),
    "slots": {
        hex(slot): hex(struct.unpack_from(
            "<Q", native.DATA, native.offset(node_vtable + slot))[0])
        for slot in (0x10, 0x18, 0x20, 0x28, 0x30, 0x38, 0x40, 0x68, 0x88)
    },
}, indent=2) + "\n")
print(json.dumps({
    "functions": len(entries),
    "originalSha256": digest,
    "extracted": [{"address": hex(int(argument, 0)),
                   "bytes": entries[hex(int(argument, 0))]["byteLength"]}
                  for argument in arguments],
}))
