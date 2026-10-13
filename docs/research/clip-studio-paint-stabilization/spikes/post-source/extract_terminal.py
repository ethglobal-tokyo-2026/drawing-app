"""Retain the ordinary terminal caller's fresh-record argument, without CSP execution."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.environ.setdefault("CSP_ARM64", "/Users/adoll/Applications/CSP Research/original-arm64")
spec = importlib.util.spec_from_file_location(
    "inspect_binary", ROOT.parent / "live-contract/inspect_binary.py"
)
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)
digest = hashlib.sha256(native.DATA).hexdigest()
assert digest == "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"
start, end = 0x102890810, 0x1028908D4
output = io.StringIO()
with contextlib.redirect_stdout(output):
    native.disasm(start, end)
assembly = output.getvalue()
evidence = ROOT / "evidence"
filename = "terminal-caller-102890810.asm"
(evidence / filename).write_text(assembly)
body = native.DATA[native.offset(start):native.offset(start) + end - start]
(evidence / "terminal-caller-extraction.json").write_text(json.dumps({
    "scope": "Static excerpt of ordinary finalizer caller; no CSP execution.",
    "originalSha256": digest,
    "start": hex(start), "endExclusive": hex(end),
    "file": filename,
    "bytesSha256": hashlib.sha256(body).hexdigest(),
    "assemblySha256": hashlib.sha256(assembly.encode()).hexdigest(),
}, indent=2) + "\n")
print("Saved ordinary terminal caller argument evidence")
