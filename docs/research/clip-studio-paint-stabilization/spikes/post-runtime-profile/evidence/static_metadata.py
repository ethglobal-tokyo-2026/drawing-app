"""Save bounded original-image type data and verify every addressed extract."""

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parent
os.environ.setdefault("CSP_ARM64", "/Users/adoll/Applications/CSP Research/original-arm64")
spec = importlib.util.spec_from_file_location(
    "inspect_binary", ROOT.parents[1] / "live-contract/inspect_binary.py"
)
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)
EXPECTED = "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"
assert hashlib.sha256(native.DATA).hexdigest() == EXPECTED


def read(address, size):
    assert 0 < size <= 1024
    offset = native.offset(address)
    result = native.DATA[offset:offset + size]
    assert len(result) == size
    return result


def record(address, size):
    value = read(address, size)
    return {
        "address": hex(address), "size": size, "hex": value.hex(),
        "sha256": hashlib.sha256(value).hexdigest(),
    }


types = []
for address, slot, expected in [
    (0x104A70F30, 0x10, "PWSnapOperation"),
    (0x104A71008, 0x10, "PWSnapRuler"),
    (0x104A710B8, 0x10, "PWSnapRulerConcentricCircle"),
    (0x104A71168, 0x10, "PWSnapRulerCurveEmit"),
    (0x104A71218, 0x10, "PWSnapRulerCurveParallel"),
    (0x104A712C8, 0x10, "PWSnapRulerEmit"),
    (0x104A71378, 0x10, "PWSnapRulerGuide"),
    (0x104A71428, 0x10, "PWSnapRulerParallel"),
    (0x104A714D8, 0x10, "PWSnapRulerPerspective"),
    (0x104A70DD0, 0x10, "PWSnapGrid"),
    (0x104A717F8, 0x10, "PWSnapVector"),
    (0x104A35690, 0x358, "PWView"),
    (0x104A5C418, 0x358, "PWCanvasView"),
]:
    rtti = struct.unpack("<Q", read(address - 8, 8))[0]
    name_address = struct.unpack("<Q", read(rtti + 8, 8))[0]
    name = read(name_address, 128).split(b"\0", 1)[0]
    assert expected in name.decode("ascii")
    types.append({
        "name": name.decode("ascii"),
        "vtable": hex(address), "prefix": record(address - 8, 32),
        "rtti": record(rtti, 16), "nameBytes": record(name_address, len(name) + 1),
        "slotOffset": hex(slot), "slot": record(address + slot, 8),
        "target": hex(struct.unpack("<Q", read(address + slot, 8))[0]),
    })

metadata = {
    "originalSha256": EXPECTED,
    "scope": "Static original-image bytes only; mutable runtime fields are not observed.",
    "types": types,
    "viewInfoTypeName": record(0x104555101, len(b"N12Planeswalker8ViewInfoE") + 1),
    "constants": [record(0x1042E7CC0, 16), record(0x104484450, 8), record(0x1042EE828, 8)],
}
(ROOT / "static-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")

manifest = json.loads((ROOT / "manifest.json").read_text())
assert manifest["originalSha256"] == EXPECTED
byte_count = 0
for entry in manifest["functions"]:
    start = int(entry["address"], 16)
    end = int(entry["endExclusive"], 16)
    assert native.func(start) == (start, end)
    body = native.DATA[native.offset(start):native.offset(start) + end - start]
    assert hashlib.sha256(body).hexdigest() == entry["bytesSha256"], entry["file"]
    assert hashlib.sha256((ROOT / entry["file"]).read_bytes()).hexdigest() == entry["assemblySha256"], entry["file"]
    byte_count += len(body)

verification = {
    "originalSha256": EXPECTED,
    "functionCount": len(manifest["functions"]), "functionBytesVerified": byte_count,
    "typeCount": len(types),
    "manifestSha256": hashlib.sha256((ROOT / "manifest.json").read_bytes()).hexdigest(),
    "metadataSha256": hashlib.sha256((ROOT / "static-metadata.json").read_bytes()).hexdigest(),
    "command": "python3 docs/research/clip-studio-paint-stabilization/spikes/post-runtime-profile/evidence/static_metadata.py",
    "result": "All original instruction-byte hashes, saved assembly hashes, function bounds, and listed RTTI names verified.",
}
(ROOT / "verification.json").write_text(json.dumps(verification, indent=2) + "\n")
print(json.dumps(verification))
