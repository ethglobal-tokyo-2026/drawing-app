"""Static, addressed source/caller extraction; never launches or attaches CSP."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
os.environ.setdefault("CSP_ARM64", "/Users/adoll/Applications/CSP Research/original-arm64")
spec = importlib.util.spec_from_file_location(
    "joined_inspect_binary", ROOT.parents[1] / "live-contract/inspect_binary.py"
)
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)
original_hash = hashlib.sha256(native.DATA).hexdigest()
assert original_hash == "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"

functions = [
    0x1028ebd40, 0x1028ec548, 0x1028ec8d0, 0x1028ec4e0, 0x1028ed064,
    0x10288cd3c, 0x1028f2274, 0x1028f2344, 0x1028f25b0,
    0x10288d814, 0x10288fb28, 0x102c70688, 0x102c709c4, 0x102c709e4,
]
ranges = [(f"{a:x}", *native.func(a)) for a in functions]
ranges += [
    ("begin-primary-and-secondary", 0x10288ac14, 0x10288af50),
    ("begin-counter", 0x10288af9c, 0x10288afac),
    ("append-primary-generated", 0x10288db40, 0x10288ddc0),
    ("append-secondary", 0x10288de68, 0x10288df8c),
    ("append-retained-records", 0x10288e11c, 0x10288e19c),
    ("append-primary-direct", 0x10288e244, 0x10288e2dc),
    ("append-counter", 0x10288e848, 0x10288e874),
    ("finish-fresh-record-and-source", 0x10289170c, 0x102891874),
    ("finish-retained-records", 0x102891970, 0x1028919e0),
    ("post-caller-cap-and-identity", 0x102891ccc, 0x102891d70),
]
manifest = []
for name, start, end in ranges:
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        native.disasm(start, end)
    lines = []
    for line in re.sub(r" STRING .*", "", output.getvalue()).splitlines():
        match = re.match(r"([0-9a-f]+):\s+(.*)", line)
        if match:
            address = int(match[1], 16)
            raw = native.DATA[native.offset(address):native.offset(address) + 4]
            line = f"{address:x}: {raw.hex()}  {match[2]}"
        lines.append(line)
    assembly = "\n".join(lines) + "\n"
    path = ROOT / f"{name}.asm"
    path.write_text(assembly)
    raw = native.DATA[native.offset(start):native.offset(start) + end - start]
    manifest.append({
        "file": path.name, "start": hex(start), "endExclusive": hex(end),
        "instructionCount": len(raw) // 4,
        "bytesSha256": hashlib.sha256(raw).hexdigest(),
        "assemblySha256": hashlib.sha256(assembly.encode()).hexdigest(),
    })
(ROOT / "extraction.json").write_text(json.dumps({
    "originalSha256": original_hash,
    "scope": "Static extraction from pinned original image; no native execution or attachment.",
    "instructionBytes": "Four original bytes, in little-endian storage order, on every addressed line.",
    "ranges": manifest,
}, indent=2) + "\n")
print(json.dumps({"ranges": len(manifest), "originalSha256": original_hash}))
