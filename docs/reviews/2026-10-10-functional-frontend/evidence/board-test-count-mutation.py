#!/usr/bin/env python3
"""Show whether the tray announcement test rejects an incorrect sheet count.

Uses the current production test fixture in temporary copies. A Vite transform
changes only the count presented in the announcement; source files stay intact.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile

evidence = Path(__file__).resolve().parent
repo = evidence.parents[3]
frontend = repo / "apps/frontend"
fixture = frontend / "src/sticker-board/tray/StickerTray.test.tsx"
source = frontend / "src/sticker-board/tray/traySheets.ts"
original = fixture.read_text()
print(f"Fixture SHA256: {hashlib.sha256(fixture.read_bytes()).hexdigest()}", flush=True)
print(f"Production SHA256: {hashlib.sha256(source.read_bytes()).hexdigest()}", flush=True)

def absolute(match):
    quote, relative = match.groups()
    return quote + str((fixture.parent / relative).resolve()) + quote

copied = re.sub(r"([\"'])(\.{1,2}/[^\"']+)\1", absolute, original)
before = "count: Array.from({ length: ui.model.count }, (_, f) => f).filter(sheetMatches).length"
after = "count: 999"
assert source.read_text().count(before) == 1
assert 'count: 3,' in copied

results = []
with tempfile.TemporaryDirectory(prefix="croquis-board-test-count-") as temporary:
    scratch = Path(temporary).resolve()
    (scratch / "node_modules").symlink_to(frontend / "node_modules", target_is_directory=True)
    for label, mutate in [
        ("baseline-repaired-test", False),
        ("wrong-count-repaired-test", True),
    ]:
        test = scratch / "StickerTray.test.tsx"
        test.write_text(copied)
        plugin = ""
        if mutate:
            plugin = ", { name: 'review-wrong-count', enforce: 'pre', transform(code, id) { if (id.split('?')[0] === " + json.dumps(str(source)) + ") return code.replace(" + json.dumps(before) + ", " + json.dumps(after) + "); } }"
        config = scratch / "vitest.config.mts"
        config.write_text(
            "import base from " + json.dumps(str(evidence / "vitest.config.mts")) + ";\n"
            "export default { ...base, plugins: [...base.plugins" + plugin + "], "
            "server: { fs: { allow: " + json.dumps([str(repo), str(scratch)]) + " } }, "
            "test: { ...base.test, include: [" + json.dumps(str(test)) + "] } };\n"
        )
        command = ["pnpm", "--filter", "frontend", "exec", "vitest", "run", "--config", str(config), "-t", "how many sheets a folder tab shows"]
        print(f"\nCASE {label}\nCOMMAND {' '.join(command)}", flush=True)
        result = subprocess.run(command, cwd=repo, timeout=120, capture_output=True, text=True)
        output = result.stdout + result.stderr
        print(output, flush=True)
        results.append(result.returncode)
        print(f"CASE EXIT {result.returncode}", flush=True)
        if mutate and not ("Gifts: 999 sheets" in output and "Gifts: 3 sheets" in output):
            raise SystemExit("The mutation did not fail with the expected 999 versus 3 count")
print(f"Observed exits: {results}; expected [0, 1]", flush=True)
raise SystemExit(0 if results == [0, 1] else 1)
