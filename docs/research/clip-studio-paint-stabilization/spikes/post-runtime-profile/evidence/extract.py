"""Bounded, reproducible static extraction from the pinned original ARM64 image."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
os.environ.setdefault("CSP_ARM64", "/Users/adoll/Applications/CSP Research/original-arm64")
spec = importlib.util.spec_from_file_location(
    "inspect_binary", ROOT.parents[1] / "live-contract/inspect_binary.py"
)
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)
digest = hashlib.sha256(native.DATA).hexdigest()
assert digest == "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"
manifest_path = ROOT / "manifest.json"
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
    "originalSha256": digest,
    "scope": "Static reads only. No launch, attachment, native call, or runtime-value observation.",
    "commands": [], "functions": [],
}
assert manifest["originalSha256"] == digest
manifest["commands"].append("python3 " + str(Path(__file__).relative_to(Path.cwd())) + " " + " ".join(sys.argv[1:]))
entries = {entry["address"]: entry for entry in manifest["functions"]}
for argument in sys.argv[1:]:
    address = int(argument, 0)
    start, end = native.func(address)
    assert start == address, hex(start)
    assert end - start <= 32768, "Function exceeds bounded extraction size"
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        native.disasm(start, end)
    assembly = re.sub(r" STRING .*", "", output.getvalue())
    filename = f"{start:x}.asm"
    (ROOT / filename).write_text(assembly)
    body = native.DATA[native.offset(start):native.offset(start) + end - start]
    entries[hex(start)] = {
        "address": hex(start), "endExclusive": hex(end), "file": filename,
        "bytesSha256": hashlib.sha256(body).hexdigest(),
        "assemblySha256": hashlib.sha256(assembly.encode()).hexdigest(),
    }
manifest["functions"] = sorted(entries.values(), key=lambda entry: entry["address"])
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({"functions": len(entries), "originalSha256": digest}))
