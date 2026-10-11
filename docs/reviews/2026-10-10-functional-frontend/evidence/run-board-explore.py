#!/usr/bin/env python3
"""Run the four preserved review regressions without changing source test files."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile


evidence = Path(__file__).resolve().parent
repo = evidence.parents[3]
frontend = repo / "apps/frontend"
fixtures = {
    "StickerBoard": frontend / "src/sticker-board/StickerBoard.test.tsx",
    "ExploreScreen": frontend / "src/explore/ExploreScreen.test.tsx",
}

with tempfile.TemporaryDirectory(prefix="croquis-board-evidence-") as temporary:
    scratch = Path(temporary).resolve()
    (scratch / "node_modules").symlink_to(frontend / "node_modules", target_is_directory=True)
    for name, fixture in fixtures.items():
        original = fixture.read_text()
        print(f"Fixture: {fixture.relative_to(repo)}", flush=True)
        print(f"SHA256: {hashlib.sha256(fixture.read_bytes()).hexdigest()}", flush=True)
        # Keep the source test's established setup/mocks/helpers. Resolve its relative imports
        # against its original directory before adding the separate review assertions.
        def absolute(match):
            quote, relative = match.groups()
            return quote + str((fixture.parent / relative).resolve()) + quote
        copied = re.sub(r"([\"'])(\.{1,2}/[^\"']+)\1", absolute, original)
        additions = (evidence / f"{name}-regressions.test.tsx.txt").read_text()
        (scratch / f"{name}.test.tsx").write_text(copied + "\n" + additions)

    config = scratch / "vitest.config.mts"
    config.write_text(
        "import base from " + json.dumps(str(evidence / "vitest.config.mts")) + ";\n"
        "export default { ...base, server: { fs: { allow: "
        + json.dumps([str(repo), str(scratch)])
        + " } }, test: { ...base.test, include: ["
        + json.dumps(str(scratch / "*.test.tsx")) + "] } };\n"
    )
    command = [
        "pnpm", "--filter", "frontend", "exec", "vitest", "run", "--config", str(config),
        "-t", "REVIEW pending save survives|REVIEW old board queue|REVIEW phone keeps older|REVIEW failed gift inbox",
    ]
    print("Running four review assertions; failures reproduce the findings.", flush=True)
    result = subprocess.run(command, cwd=repo, timeout=120)
    raise SystemExit(result.returncode)
