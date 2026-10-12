"""Check retained static evidence and local specification links without CSP."""

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import struct
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent
EVIDENCE = ROOT / "evidence"
os.environ.setdefault("CSP_ARM64", "/Users/adoll/Applications/CSP Research/original-arm64")
module_spec = importlib.util.spec_from_file_location(
    "inspect_binary", ROOT.parent / "live-contract/inspect_binary.py"
)
native = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(native)

def reject_nonfinite(value):
    raise ValueError(f"Nonstandard JSON scalar {value}")

def read_json(path):
    return json.loads(path.read_text(), parse_constant=reject_nonfinite)

digest = hashlib.sha256(native.DATA).hexdigest()
manifest = read_json(EVIDENCE / "extraction.json")
assert digest == manifest["originalSha256"]
assert digest == "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"
function_bytes = 0
for function in manifest["functions"]:
    start = int(function["address"], 0)
    end = int(function["endExclusive"], 0)
    assert native.func(start) == (start, end)
    assert end - start == function["byteLength"]
    assert 0 < end - start <= 32768
    at = native.offset(start)
    raw = native.DATA[at:at + end - start]
    assert hashlib.sha256(raw).hexdigest() == function["bytesSha256"]
    assembly = (EVIDENCE / function["file"]).read_bytes()
    assert hashlib.sha256(assembly).hexdigest() == function["assemblySha256"]
    calls = sorted(set(re.findall(r"\bbl\s+(0x[0-9a-f]+)", assembly.decode())))
    assert calls == function["directCalls"]
    function_bytes += len(raw)

literals = read_json(EVIDENCE / "literals.json")
assert literals["originalSha256"] == digest
for literal in literals["memory"]:
    raw = bytes.fromhex(literal["bytesHex"])
    at = native.offset(int(literal["address"], 0))
    assert native.DATA[at:at + len(raw)] == raw
    assert hashlib.sha256(raw).hexdigest() == literal["bytesSha256"]
    bits = [f"{struct.unpack_from('<Q', raw, i)[0]:016x}"
            for i in range(0, len(raw), 8)]
    assert bits == literal["storageBits"]
    if "signed64Values" in literal:
        assert literal["signed64Values"] == [struct.unpack_from("<q", raw, i)[0]
                                            for i in range(0, len(raw), 8)]
    else:
        assert literal["binary64Values"] == [struct.unpack_from("<d", raw, i)[0]
                                            for i in range(0, len(raw), 8)]

vtable = read_json(EVIDENCE / "quadratic-vtable.json")
assert vtable["originalSha256"] == digest
for slot, expected in vtable["slots"].items():
    at = native.offset(int(vtable["address"], 0) + int(slot, 0))
    assert struct.unpack_from("<Q", native.DATA, at)[0] == int(expected, 0)

project_root = ROOT.parents[4]
spec_path = project_root / "docs/superpowers/specs/2026-10-11-csp-bezier-post-correction.md"
documents = [ROOT / "README.md", spec_path, *sorted((ROOT / "analysis").glob("*.md"))]
link_count = 0
for document in documents:
    contents = document.read_text()
    assert len(re.findall(r"^```", contents, re.MULTILINE)) % 2 == 0, document
    for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", contents):
        if re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", target) or target.startswith("#"):
            continue
        path = unquote(target.split("#", 1)[0]).strip("<>")
        resolved = Path(path) if Path(path).is_absolute() else document.parent / path
        assert resolved.exists(), f"Missing local link in {document}: {target}"
        link_count += 1

report = {
    "scope": "Static evidence and document verification only; no CSP execution or attachment.",
    "originalSha256": digest,
    "functionCount": len(manifest["functions"]),
    "originalFunctionBytesChecked": function_bytes,
    "literalRangesChecked": len(literals["memory"]),
    "vtableSlotsChecked": len(vtable["slots"]),
    "documentsChecked": [str(document.relative_to(project_root)) for document in documents],
    "localLinksChecked": link_count,
    "specificationSha256": hashlib.sha256(spec_path.read_bytes()).hexdigest(),
    "status": "pass",
}
(EVIDENCE / "spec-verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report))
