"""Standalone instruction oracle for the two additional spline length functions."""
import importlib.util
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("spline_oracle", HERE.parent / "post-spline/native_oracle.py")
oracle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oracle)
oracle.FUNCTIONS[0x10359FC40] = "csp_spline_length"
oracle.FUNCTIONS[0x10359FE88] = "csp_spline_sampled_length"
oracle.DRIVER = oracle.DRIVER.replace(
    "extern int csp_sample(Point*,COORDS,double,double,double);",
    "extern int csp_sample(Point*,COORDS,double,double,double);\n"
    "extern double csp_spline_length(int,COORDS);\n"
    "extern double csp_spline_sampled_length(int,COORDS);",
).replace("int count=mode=='E'?13:", "int count=mode=='X'||mode=='Z'?13:mode=='E'?13:").replace(
    "if (mode=='M') bits(csp_measure(VALUES));",
    "if (mode=='M') bits(csp_measure(VALUES));\n"
    "if (mode=='X') bits(csp_spline_length((int)p[12],VALUES));\n"
    "if (mode=='Z') bits(csp_spline_sampled_length((int)p[12],VALUES));",
)


def cases():
    rng = random.Random(0x10359FC40)
    result = []
    for i in range(48):
        points = [rng.uniform(-100, 100) for _ in range(12)]
        result.append({"mode": "X", "name": f"length-{i}", "values": points + [float(i % 2)]})
        result.append({"mode": "Z", "name": f"sampled-{i}", "values": points + [float([-1, 0, 1, 3, 7, 255, 300, 512][i % 8])]})
    for scale in [0, 0.01, 1, 2.5, 10, 20, 1000]:
        points = [float(axis) for x in [-2, -1, 0, 1, 2, 3] for axis in (x * scale, 0)]
        for mode in [0.0, 1.0]:
            result.append({"mode": "X", "name": f"linear-{scale}-{mode}", "values": points + [mode]})
    return result


oracle.make_cases = cases
oracle.DEFAULT_OUTPUT = HERE / "evidence/endpoint-native.json"
if __name__ == "__main__":
    oracle.main()
