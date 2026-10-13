"""Bounded static extraction of the ordinary quadratic source construction."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import struct

ROOT = Path(__file__).resolve().parent
os.environ.setdefault("CSP_ARM64", "/Users/adoll/Applications/CSP Research/original-arm64")
spec = importlib.util.spec_from_file_location("inspect_binary", ROOT.parent / "live-contract/inspect_binary.py")
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)
digest = hashlib.sha256(native.DATA).hexdigest()
assert digest == "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"
addresses = [
    0x1028ebd40, 0x1028ec4e0, 0x1028ec548, 0x1028ec8d0,
    0x102781770, 0x1027819bc, 0x1027647c0, 0x10276ae48,
    0x102764880, 0x1027648e8, 0x102764984, 0x1027649d8,
    0x102764a44, 0x102764ac8, 0x10276b190, 0x102217f00,
    0x1027878ec, 0x10276b2c4, 0x102779bc8,
]
evidence = ROOT / "evidence"
evidence.mkdir(exist_ok=True)
functions = []
for address in addresses:
    start, end = native.func(address)
    assert start == address
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        native.disasm(start, end)
    assembly = re.sub(r" STRING .*", "", output.getvalue())
    filename = f"{start:x}.asm"
    (evidence / filename).write_text(assembly)
    body = native.DATA[native.offset(start):native.offset(start)+(end-start)]
    functions.append({"address":hex(start), "endExclusive":hex(end),
        "bytesSha256":hashlib.sha256(body).hexdigest(), "file":filename,
        "assemblySha256":hashlib.sha256(assembly.encode()).hexdigest()})
vtable = {}
for offset in [0x28,0x30,0x38,0x40,0x48]:
    value = struct.unpack_from("<Q", native.DATA, native.offset(0x104a527b0+offset))[0]
    vtable[hex(offset)] = hex(value)
(evidence / "extraction.json").write_text(json.dumps({"originalSha256":digest,
    "scope":"Static original instructions only; no CSP execution or debugger attachment.",
    "quadraticVtable":"0x104a527b0", "virtualTargets":vtable,
    "functions":functions}, indent=2)+"\n")
print(json.dumps({"functions":len(functions),"originalSha256":digest}))
