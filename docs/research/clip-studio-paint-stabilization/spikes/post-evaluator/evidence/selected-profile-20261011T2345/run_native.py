"""Run the unchanged existing oracle with new inputs and an isolated output path."""
import hashlib
import importlib.util
import json
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent
ORACLE = OUTPUT.parents[1] / 'native_oracle.py'
inputs = json.loads((OUTPUT / 'inputs.json').read_text())
expected = inputs['sources']['docs/research/clip-studio-paint-stabilization/spikes/post-evaluator/native_oracle.py']
assert hashlib.sha256(ORACLE.read_bytes()).hexdigest() == expected
spec = importlib.util.spec_from_file_location('selected_profile_native_oracle', ORACLE)
oracle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oracle)


class IsolatedOutput:
    """Keep helper imports at their original paths; redirect only evidence writes."""
    parent = ORACLE.parent.parent

    def __truediv__(self, part):
        part = str(part)
        if part == 'evidence':
            return OUTPUT
        if part.startswith('evidence/'):
            return OUTPUT / part[len('evidence/'):]
        raise RuntimeError(f'Unexpected oracle path {part!r}')


for name in ['native-vectors.json', 'native.S', 'native.c']:
    assert not (OUTPUT / name).exists(), f'Refusing to overwrite {name}'
oracle.HERE = IsolatedOutput()
oracle.cases = lambda: inputs['cases']
oracle.main()
