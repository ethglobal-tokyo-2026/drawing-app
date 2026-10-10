"""Independent binary64 FMA oracle using the host's libm through Python."""
import json
import math
import random
import struct


def bits(value):
    return struct.pack(">d", value).hex()


rng = random.Random(7878)
cases = [(1 + 2**-27, 1 - 2**-27, -1), (2**-1022, 2**-53, 0),
         (2**-1022, 2**-52, 0), (1e308, 2, -1e308), (-0.0, 1, -0.0)]
for _ in range(1000):
    cases.append(tuple(math.ldexp(rng.uniform(-1, 1), rng.randint(-500, 500)) for _ in range(3)))
result = []
for a, b, c in cases:
    expected = math.fma(a, b, c)
    result.append({"a": bits(a), "b": bits(b), "c": bits(c), "expected": bits(expected)})
print(json.dumps(result))
