"""Verify the review inventory still matches the implementation and test files on disk."""
from pathlib import Path
import collections
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parents[4]
record = json.loads((Path(__file__).resolve().parent.parent / 'coverage.json').read_text())
actual = set(subprocess.check_output([
    'rg', '--files', 'apps/frontend/src', 'apps/frontend/e2e',
    'apps/frontend/playwright.config.ts', 'apps/frontend/scripts/ipadSafari.ts',
    '-g', '*.ts', '-g', '*.tsx', '-g', '!*.d.ts',
], cwd=root, text=True).splitlines())
rows = {row['path']: row for row in record['files']}
missing = sorted(actual - rows.keys())
removed = sorted(rows.keys() - actual)
changed = [path for path in sorted(actual & rows.keys())
           if hashlib.sha256((root / path).read_bytes()).hexdigest() != rows[path]['sha256']]
counts = collections.Counter(row['status'] for row in rows.values())
print(f'{len(actual)} files: {counts["reviewed"]} reviewed, {counts["excluded"]} excluded, '
      f'{len(missing)} missing, {len(changed)} changed')
for label, paths in [('Missing', missing), ('Removed', removed), ('Changed', changed)]:
    for path in paths:
        print(f'{label}: {path}')
raise SystemExit(bool(missing or removed or changed))
