"""Run only the recovered pure spline instructions in a standalone ARM64 process.

Requires macOS ARM64, Xcode command-line tools, and the pinned local CSP image.
No CSP process is started or attached. No app data, signature, or security setting
is changed. The reassembled instructions are checked against the original bytes;
only address relocations may differ. Each tool invocation has a timeout.
"""

import argparse
import contextlib
import hashlib
import importlib.util
import io
import json
import math
import os
from pathlib import Path
import platform
import random
import re
import struct
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
IMAGE_SHA = "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"
FUNCTIONS = {
    0x10359F580: "csp_eval",
    0x10359F8D4: "csp_neighbor",
    0x10359FD24: "csp_measure",
    0x1035A01C0: "csp_sample",
    0x102193618: "csp_distance",
    0x10359BC34: "csp_quadratic_eval",
    0x10359D408: "csp_quadratic_split",
    0x10359C378: "csp_quadratic_length",
    0x10359C394: "csp_bezier_length",
    0x10359C490: "csp_bezier_measure",
    0x10359C60C: "csp_bezier_sampled_length",
}

DRIVER = r"""
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
typedef struct { double x,y; } Point;
#define COORDS double,double,double,double,double,double,double,double,double,double,double,double
#define VALUES p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],p[8],p[9],p[10],p[11]
extern Point csp_eval(COORDS,double);
extern double csp_measure(COORDS);
extern void csp_neighbor(const Point*,const Point*,Point*);
extern int csp_sample(Point*,COORDS,double,double,double);
#define QUADRATIC double,double,double,double,double,double
#define QVALUES p[0],p[1],p[2],p[3],p[4],p[5]
#define BVALUES p[0],p[1],p[2],p[3],0.0,0.0,p[4],p[5]
extern Point csp_quadratic_eval(QUADRATIC,double);
extern void csp_quadratic_split(Point*,Point*,Point*,QUADRATIC,double);
extern double csp_quadratic_length(int,QUADRATIC);
extern double csp_bezier_measure(int,double,double,double,double,double,double,double,double);
extern double csp_bezier_sampled_length(int,int,double,double,double,double,double,double,double,double);
static void bits(double x) { uint64_t b; memcpy(&b,&x,8); printf(" %016" PRIx64,b); }
int main(void) {
    uint64_t fpcr; __asm__ volatile("mrs %0, fpcr" : "=r"(fpcr));
    printf("FPCR %016" PRIx64 "\n", fpcr);
    char mode;
    while (scanf(" %c",&mode)==1) {
        int count=mode=='E'?13:mode=='M'?12:mode=='N'||mode=='B'?6:mode=='S'?15:
                  mode=='Q'||mode=='D'||mode=='L'||mode=='G'?7:0;
        if (!count) return 2;
        double p[15];
        for (int i=0;i<count;i++) if (scanf("%la",&p[i])!=1) return 3;
        printf("%c",mode);
        if (mode=='E') { Point q=csp_eval(VALUES,p[12]); bits(q.x);bits(q.y); }
        if (mode=='M') bits(csp_measure(VALUES));
        if (mode=='N') {
            Point a={p[0],p[1]},b={p[2],p[3]},q={p[4],p[5]};
            csp_neighbor(&a,&b,&q);bits(q.x);bits(q.y);
        }
        if (mode=='S') {
            Point out[256]; int n=csp_sample(out,VALUES,p[12],p[13],p[14]);
            if (n<5 || n>256) return 4;
            printf(" %d",n);
            for(int i=0;i<n;i++){bits(out[i].x);bits(out[i].y);}
        }
        if (mode=='Q') { Point q=csp_quadratic_eval(QVALUES,p[6]);bits(q.x);bits(q.y); }
        if (mode=='D') {
            Point a,b,c;csp_quadratic_split(&a,&b,&c,QVALUES,p[6]);
            bits(a.x);bits(a.y);bits(b.x);bits(b.y);bits(c.x);bits(c.y);
        }
        if (mode=='L') bits(csp_quadratic_length((int)p[6],QVALUES));
        if (mode=='B') bits(csp_bezier_measure(0,BVALUES));
        if (mode=='G') bits(csp_bezier_sampled_length(0,(int)p[6],BVALUES));
        puts("");
    }
    return ferror(stdin)?5:0;
}
"""


def sha(data):
    return hashlib.sha256(data).hexdigest()


def bits(value):
    return struct.pack(">d", value).hex()


def macho_offset(data, address):
    pos = 32
    for _ in range(struct.unpack_from("<I", data, 16)[0]):
        cmd, size = struct.unpack_from("<II", data, pos)
        if cmd == 0x19:
            start, _, offset, length = struct.unpack_from("<QQQQ", data, pos + 24)
            if start <= address < start + length:
                return offset + address - start
        pos += size
    raise ValueError(f"Unmapped address {address:#x}")


def signed(value, width):
    return value - (1 << width) if value & (1 << (width - 1)) else value


def branch_target(word, pc):
    if word & 0x7C000000 == 0x14000000:
        return pc + (signed(word & 0x3FFFFFF, 26) << 2), 0xFC000000
    if word & 0xFF000010 == 0x54000000:
        return pc + (signed((word >> 5) & 0x7FFFF, 19) << 2), 0xFF00001F
    raise ValueError(f"Unsupported relocated branch encoding {word:#x}")


def page_target(word, pc):
    immediate = ((word >> 29) & 3) | (((word >> 5) & 0x7FFFF) << 2)
    return (pc & ~4095) + (signed(immediate, 21) << 12)


def make_cases():
    rng = random.Random(0x10359F580)
    cases = []

    def add(mode, name, values):
        cases.append({"mode": mode, "name": name, "values": list(map(float, values))})

    standard = [1.125, -4.5, -20.25, 13.5, 368.6172768546371, 0.1,
                19.125, -28.75, 100.125, 7.3, -14.25, 24.125]
    times = [-1, -0.0, 0, math.nextafter(0, 1), 0.25,
             math.nextafter(0.5, 0), 0.5, math.nextafter(0.5, 1),
             0.75, math.nextafter(1, 0), 1, 2]
    for t in times:
        add("E", f"branch-and-endpoint-{t.hex() if isinstance(t,float) else t}", standard + [t])
    for i in range(600):
        scale = 10 ** rng.uniform(-100, 100)
        points = [rng.uniform(-1000, 1000) * scale for _ in range(12)]
        add("E", f"random-evaluate-{i}", points + [rng.uniform(-0.5, 1.5)])
        if i < 200:
            add("M", f"random-measure-{i}", points)
    for name, points in [
        ("degenerate-span-with-outer-curvature", [99, 0] + [0] * 10),
        ("constant", [0.1, -0.3] * 6),
        ("zero", [0] * 12),
        ("signed-zero", [-0.0, 0.0] * 6),
        ("subnormal", [math.ldexp(i - 6, -1070) for i in range(12)]),
    ]:
        add("M", name, points)
        for t in [0, 0.25, 0.5, 0.75, 1]:
            add("E", name + f"-{t}", points + [t])
    for name, values in [
        ("under-10", [0, 0, 0, 0, math.nextafter(10, 0), 0]),
        ("exactly-10", [0, 0, 0, 0, 10, 0]),
        ("over-10", [0, 0, 0, 0, math.nextafter(10, math.inf), 0]),
        ("exactly-ratio", [0, 0, 4, 0, 10, 0]),
        ("within-relative-limit", [0, 0, 100, 0, 200, 0]),
        ("signed-zero", [-0.0, -0.0, 0, 0, -0.0, -0.0]),
    ]:
        add("N", name, values)
    for i in range(200):
        add("N", f"random-neighbor-{i}", [rng.uniform(-1000, 1000) for _ in range(6)])
    for i, (density, start, end) in enumerate([
        (1e6, 0, 1), (1e-9, 0, 1), (5, 0, 1), (5, 1, 0),
        (5, 0.5, 0.5), (7, 0.13, 0.87), (7, -0.25, 1.25),
        (0, 0, 1), (-1, 0, 1), (0, 0, 0),
    ]):
        add("S", f"sampling-boundaries-{i}", standard + [density, start, end])
    for i in range(30):
        points = [rng.uniform(-100, 100) for _ in range(12)]
        add("S", f"random-sample-{i}", points + [rng.uniform(0.1, 25), rng.random(), rng.random()])
    for i in range(150):
        points = [rng.uniform(-100, 100) for _ in range(6)]
        t = [0, 0.5, 1, rng.random()][i % 4]
        add("Q", f"quadratic-evaluate-{i}", points + [t])
        add("D", f"quadratic-split-{i}", points + [t])
        add("B", f"quadratic-measure-{i}", points)
        if i < 30:
            add("L", f"quadratic-length-{i}", points + [i % 2])
            add("G", f"quadratic-sampled-length-{i}", points + [[0, 1, 3, 7, 255, 300][i % 6]])
    for scale in [0, 1.249999, 1.25, 1.250001, 9.99999, 10, 10.00001, 1000]:
        points = [0, 0, scale, 0, scale * 2, 0]
        for mode in [0, 1]:
            add("L", f"quadratic-length-boundary-{scale}-{mode}", points + [mode])
    return cases


DEFAULT_OUTPUT = HERE / "evidence/native-vectors.json"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        raise SystemExit("The standalone oracle requires macOS ARM64")
    image = args.image.read_bytes()
    if sha(image) != IMAGE_SHA:
        raise SystemExit("Original image SHA-256 does not match the pinned CSP build")
    os.environ["CSP_ARM64"] = str(args.image)
    spec = importlib.util.spec_from_file_location("inspect_binary", HERE.parent / "live-contract/inspect_binary.py")
    inspector = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(inspector)
    extraction = json.loads((HERE / "evidence/extraction.json").read_text())
    known = {int(f["start"], 16): f for f in extraction["functions"]}
    quadratic = json.loads((HERE / "evidence/quadratic-extraction.json").read_text())
    for f in quadratic["functions"]:
        known[int(f["address"], 16)] = {"code_sha256": f["bytesSha256"], "assembly_sha256": f["assemblySha256"]}
    asm = [".section __TEXT,__text,regular,pure_instructions", ".p2align 2"]
    records = []
    constants = {}
    for start, name in FUNCTIONS.items():
        _, end = inspector.func(start)
        body = image[inspector.offset(start):inspector.offset(end)]
        if start in known and sha(body) != known[start]["code_sha256"]:
            raise ValueError(f"Function hash mismatch: {start:#x}")
        capture = io.StringIO()
        with contextlib.redirect_stdout(capture):
            inspector.disasm(start, end)
        original = re.sub(r" STRING .*", "", capture.getvalue())
        if start in known and sha(original.encode()) != known[start]["assembly_sha256"]:
            raise ValueError(f"Assembly extraction changed: {start:#x}")
        instructions = []
        for line in original.splitlines():
            match = re.match(r"([0-9a-f]+):\s+(.+)", line)
            if match:
                instructions.append((int(match[1], 16), match[2].split(";")[0].strip()))
        if len(instructions) * 4 != len(body):
            raise ValueError("Incomplete instruction extraction")
        asm += [f".globl _{name}", f"_{name}:"]
        relocated = {}
        for i, (pc, instruction) in enumerate(instructions):
            asm.append(f"L{pc:x}:")
            if instruction.startswith("adrp"):
                load_pc, load = instructions[i + 1]
                match = re.fullmatch(r"adrp\s+(x\d+), (0x[0-9a-f]+)", instruction)
                target = re.fullmatch(r"ldr\s+([qd]\d+), \[" + match[1] + r", #(0x[0-9a-f]+)\]", load)
                if not target:
                    raise ValueError("Unrecognized constant-load pair")
                address = int(match[2], 16) + int(target[2], 16)
                size = 16 if target[1].startswith("q") else 8
                constants[address] = image[inspector.offset(address):inspector.offset(address) + size]
                instruction = f"adrp {match[1]}, Lconstant{address:x}@PAGE"
                relocated[pc] = "constant-page"
                relocated[load_pc] = (f"ldr {target[1]}, [{match[1]}, Lconstant{address:x}@PAGEOFF]")
            elif pc in relocated:
                instruction = relocated[pc]
                relocated[pc] = "constant-offset"
            elif re.match(r"b(?:l|\.[a-z]+)?\s", instruction):
                match = re.fullmatch(r"(b(?:l|\.[a-z]+)?)\s+(0x[0-9a-f]+)", instruction)
                if not match:
                    raise ValueError(f"Unrecognized branch: {instruction}")
                address = int(match[2], 16)
                target = f"_{FUNCTIONS[address]}" if address in FUNCTIONS else f"L{address:x}"
                if address not in FUNCTIONS and not start <= address < end:
                    raise ValueError(f"Unexpected external branch: {instruction}")
                instruction = f"{match[1]} {target}"
                relocated[pc] = "branch"
            asm.append("    " + instruction)
        records.append({"start": hex(start), "name": name, "bytes": len(body),
                        "code_sha256": sha(body), "relocations": {hex(k): v for k, v in relocated.items()}})
    asm.append(".section __TEXT,__const")
    for address, data in sorted(constants.items()):
        asm += [".p2align 4", f"Lconstant{address:x}:", ".byte " + ",".join(map(str, data))]
    assembly = "\n".join(asm) + "\n"
    cases = make_cases()
    with tempfile.TemporaryDirectory(prefix="csp-pure-spline-") as temporary:
        build = Path(temporary)
        (build / "oracle.S").write_text(assembly)
        (build / "driver.c").write_text(DRIVER)
        subprocess.run(["clang", "-arch", "arm64", "-O0", "-ffp-contract=off", str(build / "oracle.S"), str(build / "driver.c"), "-o", str(build / "oracle")], check=True, capture_output=True, timeout=60)
        executable = (build / "oracle").read_bytes()
        nm = subprocess.check_output(["nm", "-n", str(build / "oracle")], text=True, timeout=15)
        symbols = {m[2]: int(m[1], 16) for m in re.finditer(r"^([0-9a-f]+) \S (_csp_\w+)$", nm, re.M)}
        checked = 0
        relocations_checked = 0
        for record in records:
            start = int(record["start"], 16)
            out_start = symbols["_" + record["name"]]
            for offset in range(0, record["bytes"], 4):
                pc = start + offset
                original_at = inspector.offset(pc)
                emitted_at = macho_offset(executable, out_start + offset)
                relocation = record["relocations"].get(hex(pc))
                if relocation:
                    original_word = struct.unpack_from("<I", image, original_at)[0]
                    emitted_word = struct.unpack_from("<I", executable, emitted_at)[0]
                    if relocation == "branch":
                        original_target, mask = branch_target(original_word, pc)
                        emitted_target, emitted_mask = branch_target(emitted_word, out_start + offset)
                        expected_target = symbols["_" + FUNCTIONS[original_target]] if original_target in FUNCTIONS else out_start + original_target - start
                        if mask != emitted_mask or (original_word & mask) != (emitted_word & mask) or emitted_target != expected_target:
                            raise ValueError(f"Branch relocation mismatch at {pc:#x}")
                    elif relocation == "constant-page":
                        if (original_word & 0x9F00001F) != (emitted_word & 0x9F00001F):
                            raise ValueError(f"ADRP opcode/register changed at {pc:#x}")
                        original_load = struct.unpack_from("<I", image, original_at + 4)[0]
                        emitted_load = struct.unpack_from("<I", executable, emitted_at + 4)[0]
                        # These extracted pairs are exclusively unsigned-offset LDR Q/D.
                        size = 16 if original_load & 0xFFC00000 == 0x3DC00000 else 8
                        original_target = page_target(original_word, pc) + ((original_load >> 10) & 4095) * size
                        emitted_target = page_target(emitted_word, out_start + offset) + ((emitted_load >> 10) & 4095) * size
                        target_at = macho_offset(executable, emitted_target)
                        if executable[target_at:target_at + size] != constants[original_target]:
                            raise ValueError(f"Relocated constant bytes differ at {pc:#x}")
                    elif relocation == "constant-offset":
                        if (original_word & ~(4095 << 10)) != (emitted_word & ~(4095 << 10)):
                            raise ValueError(f"LDR opcode/register changed at {pc:#x}")
                    else:
                        raise ValueError(f"Unknown relocation {relocation}")
                    relocations_checked += 1
                    continue
                if image[original_at:original_at + 4] != executable[emitted_at:emitted_at + 4]:
                    raise ValueError(f"Reassembly changed instruction at {pc:#x}")
                checked += 1
        inputs = "".join(c["mode"] + " " + " ".join(v.hex() for v in c["values"]) + "\n" for c in cases)
        run = subprocess.run([str(build / "oracle")], input=inputs, text=True, check=True, capture_output=True, timeout=30)
    lines = run.stdout.splitlines()
    if lines.pop(0) != "FPCR 0000000000000000":
        raise ValueError("Unexpected floating-point control register")
    if len(lines) != len(cases):
        raise ValueError("Oracle omitted or added test cases")
    for case, line in zip(cases, lines):
        tokens = line.split()
        if tokens.pop(0) != case["mode"]:
            raise ValueError("Oracle case order changed")
        if case["mode"] == "S":
            case["count"] = int(tokens.pop(0))
            if len(tokens) != case["count"] * 2:
                raise ValueError("Oracle point count mismatch")
        case["inputBits"] = [bits(v) for v in case.pop("values")]
        case["outputBits"] = tokens
    result = {"schema": "csp-post-spline-native/v1", "image_sha256": IMAGE_SHA,
              "fpcr": "0x0", "method": "Standalone reassembly of extracted pure ARM64 functions; no CSP process or full pipeline replay",
              "unchanged_instructions_checked": checked, "functions": records,
              "relocated_instructions_checked": relocations_checked,
              "assembly_sha256": sha(assembly.encode()), "driver_sha256": sha(DRIVER.encode()),
              "cases": cases}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    args.output.with_suffix(".S").write_text(assembly)
    args.output.with_suffix(".c").write_text(DRIVER)
    print(json.dumps({"output": str(args.output), "cases": len(cases), "unchanged_instructions_checked": checked, "relocated_instructions_checked": relocations_checked}))


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        # Keep compiler/runtime diagnostics visible when a bounded subprocess fails.
        print(error.stdout or "", file=sys.stderr)
        print(error.stderr or "", file=sys.stderr)
        raise
