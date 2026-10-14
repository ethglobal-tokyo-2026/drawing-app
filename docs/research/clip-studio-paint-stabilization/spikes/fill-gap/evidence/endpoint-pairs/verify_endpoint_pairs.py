"""Verify native endpoint-choice instructions and hand-computable state cases."""

import hashlib
import json
import re
import runpy
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = Path(__file__).resolve().parent
START = 0x102541C94
END = 0x102542720
SOURCE_SHA256 = "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"


def signed(value, bits):
    value &= (1 << bits) - 1
    return value - (1 << bits) if value >> (bits - 1) else value


class ChoiceInstructions:
    """Interpret only the retained scalar choice block; never execute CSP."""

    def __init__(self, registers):
        self.registers = registers.copy()
        self.flags = 0

    def read(self, operand):
        if operand.startswith("#"):
            return int(operand[1:], 0)
        return self.registers.get("x" + operand[1:], 0) & ((1 << (32 if operand[0] == "w" else 64)) - 1)

    def write(self, operand, value):
        self.registers["x" + operand[1:]] = value & ((1 << (32 if operand[0] == "w" else 64)) - 1)

    def compare(self, first, second):
        bits = 32 if first[0] == "w" else 64
        a, b = self.read(first), self.read(second)
        result = (a - b) & ((1 << bits) - 1)
        n = result >> (bits - 1)
        z = int(result == 0)
        c = int(a >= b)
        v = int(bool(((a ^ b) & (a ^ result)) >> (bits - 1)))
        self.flags = (n << 3) | (z << 2) | (c << 1) | v

    def condition(self, name):
        n, z, _, v = ((self.flags >> shift) & 1 for shift in (3, 2, 1, 0))
        return {"ne": not z, "gt": not z and n == v, "lt": n != v}[name]

    def step(self, text):
        operation, operands = text.split(None, 1)
        fields = [field.strip() for field in operands.split(",")]
        if operation == "cmp":
            self.compare(*fields)
        elif operation == "ccmp":
            if self.condition(fields[3]):
                self.compare(*fields[:2])
            else:
                self.flags = self.read(fields[2])
        elif operation == "cset":
            self.write(fields[0], int(self.condition(fields[1])))
        elif operation == "csel":
            self.write(fields[0], self.read(fields[1] if self.condition(fields[3]) else fields[2]))
        elif operation == "sub":
            self.write(fields[0], self.read(fields[1]) - self.read(fields[2]))
        else:
            raise ValueError(f"Unsupported choice instruction: {text}")


def translated_choice(first_flag, second_flag, first_distance, second_distance, remembered_distance,
                      nearest_first, nearest_second, remembered_first, remembered_second,
                      first_count, second_count):
    if second_flag == 0 or first_distance > remembered_distance:
        first_index, second_index, distance = remembered_first, remembered_second, remembered_distance
    else:
        first_index, second_index, distance = nearest_first, second_count - 1, first_distance
    if first_flag != 0 and second_distance <= distance:
        first_index, second_index, distance = first_count - 1, nearest_second, second_distance
    return first_index, second_index, distance


def main():
    manifest_path = ROOT / "evidence/narrow-boundary/manifest.json"
    manifest = json.loads(manifest_path.read_text())
    extract = next(item for item in manifest["extracts"] if int(item["start"], 16) == START)
    assembly_path = manifest_path.parent / extract["file"]
    assembly = assembly_path.read_bytes()
    if hashlib.sha256(assembly).hexdigest() != extract["assembly_sha256"]:
        raise ValueError("The addressed analyzer assembly has changed")
    os.environ["CSP_ARM64"] = manifest["source"]
    native = runpy.run_path(str(ROOT.parent / "live-contract/inspect_binary.py"))
    source_hash = hashlib.sha256(native["DATA"]).hexdigest()
    if source_hash != SOURCE_SHA256 or native["func"](START) != (START, END):
        raise ValueError("Pinned source hash or exact analyzer function boundaries differ")
    instructions = {}
    for line in assembly.decode().splitlines():
        match = re.match(r"([0-9a-f]+): ([0-9a-f]{8})  (.+)", line)
        if not match:
            continue
        address = int(match[1], 16)
        offset = native["offset"](address)
        if native["DATA"][offset:offset + 4] != bytes.fromhex(match[2]):
            raise ValueError(f"Original instruction differs at {address:#x}")
        instructions[address] = match[3].split(";")[0].strip()
    if list(instructions) != list(range(START, END, 4)):
        raise ValueError("Analyzer instruction coverage is incomplete")
    offset = native["offset"](START)
    bytes_hash = hashlib.sha256(native["DATA"][offset:offset + END - START]).hexdigest()
    if bytes_hash != extract["bytes_sha256"]:
        raise ValueError("Complete analyzer byte hash differs")

    # Expected indices use deliberately distinct old, nearest, and last values.
    cases = [
        ("neither current point flagged", 0, 0, 20, 10, 30, (1, 2, 30)),
        ("only first flagged, closer", 1, 0, 20, 10, 30, (4, 3, 10)),
        ("only first flagged, tie", 1, 0, 20, 30, 30, (4, 3, 30)),
        ("only first flagged, farther", 1, 0, 20, 40, 30, (1, 2, 30)),
        ("only second flagged, closer", 0, 1, 20, 10, 30, (0, 5, 20)),
        ("only second flagged, tie", 0, 1, 30, 10, 30, (0, 5, 30)),
        ("only second flagged, farther", 0, 1, 40, 10, 30, (1, 2, 30)),
        ("both flagged, first trial closer", 1, 1, 20, 25, 30, (0, 5, 20)),
        ("both flagged, second trial closer", 1, 1, 20, 15, 30, (4, 3, 15)),
        ("both flagged, both new trials tie", 1, 1, 20, 20, 30, (4, 3, 20)),
        ("both flagged, first trial ties remembered", 1, 1, 30, 40, 30, (0, 5, 30)),
        ("both flagged, second trial ties remembered", 1, 1, 40, 30, 30, (4, 3, 30)),
        ("both flagged, both farther", 1, 1, 40, 50, 30, (1, 2, 30)),
    ]
    results = []
    for label, flag1, flag2, distance1, distance2, old_distance, expected in cases:
        machine = ChoiceInstructions({
            "x21": flag2, "x25": flag1, "x10": distance1, "x12": distance2,
            "x28": old_distance, "x23": 1, "x20": 2, "x26": 5, "x27": 6,
            "x8": 4, "x9": 0, "x11": 3,
        })
        for address in range(0x1025424AC, 0x1025424E8, 4):
            machine.step(instructions[address])
        observed = (machine.read("w23"), machine.read("w20"), signed(machine.read("x28"), 64))
        translated = translated_choice(flag1, flag2, distance1, distance2, old_distance, 0, 3, 1, 2, 5, 6)
        if observed != expected or translated != expected:
            raise AssertionError(f"{label}: instructions={observed}, translation={translated}, expected={expected}")
        results.append({"case": label, "first_flag": flag1, "second_flag": flag2,
                        "trial_distances": [distance1, distance2], "remembered_distance": old_distance,
                        "expected_and_observed": list(expected)})

    # Literal retained comparisons establish a strict limit and later-index ties.
    expected_text = {
        0x102542424: "csel\tx10, x16, x10, lt",
        0x102542428: "csel\tw9, w9, w11, gt",
        0x102542484: "csel\tx12, x17, x12, lt",
        0x102542488: "csel\tw11, w11, w13, gt",
        0x1025424A0: "b.ge\t0x102542584",
        0x1025424A8: "b.ge\t0x102542584",
    }
    for address, expected in expected_text.items():
        if instructions[address] != expected:
            raise ValueError(f"Retained tie or strict-bound instruction differs at {address:#x}")
    nearest_results = []
    for distances, limit, expected in [([9, 4, 4], 18, (2, 4)), ([18, 18], 18, (1, 18)),
                                       ([20, 19], 18, (0, 18)), ([17, 18, 17], 18, (2, 17))]:
        machine = ChoiceInstructions({"x10": limit, "x9": 0})
        for index, distance in enumerate(distances):
            machine.write("x16", distance)
            machine.write("x11", index)
            for address in (0x102542420, 0x102542424, 0x102542428):
                machine.step(instructions[address])
        observed = (machine.read("w9"), machine.read("x10"))
        if observed != expected:
            raise AssertionError(f"Nearest-point distances {distances}: {observed} != {expected}")
        nearest_results.append({"distances": distances, "limit": limit,
                                "expected_and_observed": list(expected), "passes_strict_limit": observed[1] < limit})

    result = {"source": manifest["source"], "source_sha256": source_hash,
              "start": hex(START), "end_exclusive": hex(END), "verified_instructions": len(instructions),
              "bytes_sha256": bytes_hash, "assembly_sha256": extract["assembly_sha256"],
              "function_start_entry": extract["function_start_entry"],
              "next_function_start_entry": extract["next_function_start_entry"],
              "retained_assembly": str(assembly_path.relative_to(ROOT)),
              "choice_instruction_range": ["0x1025424ac", "0x1025424e8"],
              "choice_cases": results, "nearest_cases": nearest_results,
              "scope": "Pinned byte and boundary verification plus a limited scalar instruction interpreter. No native execution, bitmap equivalence, or complete analyzer translation."}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "verification.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"verified_instructions": len(instructions), "choice_cases": len(results),
                      "nearest_cases": len(nearest_results), "source_sha256": source_hash}))


if __name__ == "__main__":
    main()
