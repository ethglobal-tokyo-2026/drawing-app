"""Run an existing focused test, then confirm a visible heart fails its landing assertion.

The Vite transform changes only the in-memory module. No app source is edited.
"""

from pathlib import Path
import os
import signal
import subprocess
import tempfile

root = Path(__file__).resolve().parents[4]
command = [
    "node", str(root / "apps/frontend/node_modules/vitest/vitest.mjs"), "run",
    "--config", str(Path(__file__).with_name("gift-test-vitest.config.mts")),
    "-t", "stretches its flight to the giver alike", "--silent",
]

for label, changed in [("Original", False), ("Heart never fully disappears", True)]:
    environment = os.environ.copy()
    environment["CROQUIS_GIFT_TEST_KEEP_HEART_VISIBLE"] = "1" if changed else "0"
    with tempfile.TemporaryFile(mode="w+") as log:
        process = subprocess.Popen(
            command, cwd=root, env=environment, stdout=log,
            stderr=subprocess.STDOUT, text=True, start_new_session=True,
        )
        timed_out = False
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            timed_out = True
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=3)
        log.seek(0)
        output = log.read().replace(str(root), "<repo>")
    print(f"{label}: " + (
        "EXTERNAL DEADLINE after 3 seconds (Vitest testTimeout is 100 ms)"
        if timed_out else f"exit {process.returncode}"
    ), flush=True)
    print(output, flush=True)
    if not changed and (timed_out or process.returncode != 0):
        raise SystemExit("Original failed; mutation comparison is inconclusive")
    if changed and (
        timed_out or process.returncode == 0 or "Heart did not land" not in output
    ):
        raise SystemExit("Mutation did not fail at the landing assertion before the deadline")
