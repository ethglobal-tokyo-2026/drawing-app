"""Bounded standalone execution of recovered sampling/projection instructions.

This never launches or attaches CSP. It verifies the pinned original, extracted
assembly hashes, every unchanged instruction, and branch destinations after
relocation. Native floating-point status flags and NaN payloads are out of scope.
"""

import argparse
import hashlib
import importlib.util
import json
import math
import platform
import random
import re
import struct
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
EVIDENCE = HERE / "evidence"
IMAGE_SHA = "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"
FUNCTIONS = {
    0x10359B3B4: "sample_distance",
    0x10359B240: "sample_parameter",
    0x102193940: "segment_distance",
    0x1021944A8: "segment_projection",
    0x10359C7F0: "quadratic_samples",
    0x10359C838: "bezier_samples",
    0x10359C490: "bezier_measure",
    0x102193618: "point_distance",
}
DRIVER = r"""
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
typedef struct { double x,y; } Point;
extern double sample_distance(const Point*,int,const Point*);
extern double sample_parameter(const Point*,int,const Point*,Point*);
extern int quadratic_samples(Point*,double,double,double,double,double,double,double,double,double);
static void bits(double x) { uint64_t b; memcpy(&b,&x,8); printf(" %016" PRIx64,b); }
int main(void) {
  uint64_t fpcr; __asm__ volatile("mrs %0, fpcr" : "=r"(fpcr));
  printf("FPCR %016" PRIx64 "\n",fpcr);
  char mode; int n;
  while(scanf(" %c %d",&mode,&n)==2) {
    if(n<0 || n>514) return 2;
    double p[514]; for(int i=0;i<n;i++) if(scanf("%la",&p[i])!=1) return 3;
    printf("%c",mode);
    if(mode=='S') {
      if(n!=9) return 4;
      Point out[256]; int count=quadratic_samples(out,p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],p[8]);
      if(count<5 || count>256) return 5;
      printf(" %d",count); for(int i=0;i<count;i++){bits(out[i].x);bits(out[i].y);}
    } else if(mode=='D' || mode=='P') {
      if(n<2 || n%2) return 6;
      int count=(n-2)/2; Point query={p[n-2],p[n-1]}, projected;
      if(mode=='P' && count==0) return 7;
      bits(mode=='D' ? sample_distance((Point*)p,count,&query) : sample_parameter((Point*)p,count,&query,&projected));
    } else return 8;
    puts("");
  }
  return ferror(stdin)?9:0;
}
"""


def cases():
    result = []
    rng = random.Random(0x10359B240)

    def add(mode, name, values):
        result.append(dict(mode=mode, name=name, values=list(map(float, values))))

    special = [
        ("single", [7, -3], [2, 1]),
        ("degenerate", [2, 3, 2, 3], [5, 7]),
        ("strict-vertex-tie", [0, 1, 1, 1, 0, -1, 0, 10], [0, 0]),
        ("strict-projection-tie", [-2, 2, 0, 0, 2, 2], [0, 1]),
        ("local-not-global", [0, 2, 0, 3, -100, 0, 100, 0], [0, 0]),
        ("start", [2, 1, 5, 5], [0, 0]),
        ("end", [2, 1, 5, 5], [8, 9]),
        ("interior", [2, 1, 5, 5], [2, 6]),
        ("negative-cross", [2, 1, 5, 5], [6, 2]),
        ("signed-zero", [-0.0, 0, 0, -0.0], [-0.0, -0.0]),
        ("subnormal", [0, 0, math.ldexp(1,-1070), 0], [0, math.ldexp(1,-1071)]),
    ]
    add("D", "empty", [3, 4])
    for name, points, query in special:
        for mode in ["D", "P"]:
            add(mode, name, points + query)
    for i in range(300):
        scale = 10 ** rng.uniform(-100, 100)
        points = [rng.uniform(-100, 100)*scale for _ in range(2*rng.randint(2, 12))]
        query = [rng.uniform(-100, 100)*scale for _ in range(2)]
        for mode in ["D", "P"]:
            add(mode, f"random-{i}", points+query)
    standard = [0.1, -0.3, 80.2, -40.1, 93.7, 12.3]
    for i, (density, start, end) in enumerate([
        (1e6,0,1), (1e-9,0,1), (4,0,1), (4,1,0), (4,.5,.5),
        (7,.13,.87), (7,-.25,1.25), (0,0,1), (-1,0,1), (0,0,0),
    ]):
        add("S", f"boundary-{i}", standard+[density,start,end])
    for i, points in enumerate([[0]*6, [-0.0,0]*3, [0.1,-0.3]*3, [math.ldexp(j-3,-1070) for j in range(6)]]):
        add("S", f"degenerate-{i}", points+[4,0,1])
    for i in range(80):
        points = [rng.uniform(-100,100) for _ in range(6)]
        add("S", f"random-{i}", points+[rng.uniform(.1,25),rng.random(),rng.random()])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, required=True)
    args = parser.parse_args()
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        raise ValueError("macOS ARM64 is required")
    # Reuse only byte-reading/decoding utilities; do not change the spline oracle.
    utility_path = HERE.parent / "post-spline/native_oracle.py"
    spec = importlib.util.spec_from_file_location("spline_oracle_utilities", utility_path)
    util = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(util)
    image = args.image.read_bytes()
    if util.sha(image) != IMAGE_SHA:
        raise ValueError("Pinned image hash mismatch")
    extraction = json.loads((EVIDENCE / "sampling-extraction.json").read_text())
    known = {int(f["address"],16):f for f in extraction["functions"]}
    assembly = [".section __TEXT,__text,regular,pure_instructions", ".p2align 2"]
    records = []
    for start, name in FUNCTIONS.items():
        record = known[start]
        original = (EVIDENCE / record["assemblyFile"]).read_bytes()
        if util.sha(original) != record["assemblySha256"]:
            raise ValueError("Assembly hash mismatch")
        at = util.macho_offset(image,start)
        if util.sha(image[at:at+record["bytes"]]) != record["codeSha256"]:
            raise ValueError("Function hash mismatch")
        assembly += [f".globl _{name}", f"_{name}:"]
        relocated = []
        instructions = []
        for line in original.decode().splitlines():
            match = re.match(r"([0-9a-f]+):\s+(.+)",line)
            if match: instructions.append((int(match[1],16),match[2].split(";")[0].strip()))
        if len(instructions)*4 != record["bytes"]: raise ValueError("Incomplete assembly")
        for pc, instruction in instructions:
            assembly.append(f"L{pc:x}:")
            branch = re.fullmatch(r"((?:b(?:l|\.[a-z]+)?\s+)|(?:cbn?z\s+[wx]\d+,\s*))(0x[0-9a-f]+)",instruction)
            if branch:
                target = int(branch[2],16)
                if target not in FUNCTIONS and not start <= target < start+record["bytes"]:
                    raise ValueError(f"Unexpected external branch {instruction}")
                label = "_"+FUNCTIONS[target] if target in FUNCTIONS else f"L{target:x}"
                instruction = branch[1]+label
                relocated.append(pc)
            elif instruction.startswith(("adr", "tb")):
                raise ValueError(f"Unsupported relocation {instruction}")
            assembly.append("    "+instruction)
        records.append(dict(record,name=name,relocations=[hex(pc) for pc in relocated]))
    assembly_text = "\n".join(assembly)+"\n"
    test_cases = cases()
    checked = relocated_checked = 0
    with tempfile.TemporaryDirectory(prefix="csp-sampling-oracle-") as temporary:
        build = Path(temporary)
        (build/"oracle.S").write_text(assembly_text)
        (build/"driver.c").write_text(DRIVER)
        subprocess.run(["clang","-arch","arm64","-O0","-ffp-contract=off",str(build/"oracle.S"),str(build/"driver.c"),"-o",str(build/"oracle")],check=True,capture_output=True,timeout=60)
        executable = (build/"oracle").read_bytes()
        nm = subprocess.check_output(["nm","-n",str(build/"oracle")],text=True,timeout=15)
        symbols = {m[2]:int(m[1],16) for m in re.finditer(r"^([0-9a-f]+) \S (_\w+)$",nm,re.M)}

        def branch_target(word,pc):
            if word & 0x7E000000 == 0x34000000:
                return pc+(util.signed((word>>5)&0x7ffff,19)<<2),0xFF00001F
            return util.branch_target(word,pc)

        for record in records:
            start = int(record["address"],16)
            emitted_start = symbols["_"+record["name"]]
            for offset in range(0,record["bytes"],4):
                pc = start+offset
                source_at = util.macho_offset(image,pc)
                emitted_at = util.macho_offset(executable,emitted_start+offset)
                if hex(pc) in record["relocations"]:
                    source_word = struct.unpack_from("<I",image,source_at)[0]
                    emitted_word = struct.unpack_from("<I",executable,emitted_at)[0]
                    target,mask = branch_target(source_word,pc)
                    emitted_target,emitted_mask = branch_target(emitted_word,emitted_start+offset)
                    expected = symbols["_"+FUNCTIONS[target]] if target in FUNCTIONS else emitted_start+target-start
                    if mask!=emitted_mask or source_word&mask!=emitted_word&mask or emitted_target!=expected:
                        raise ValueError(f"Branch relocation mismatch at {pc:#x}")
                    relocated_checked += 1
                else:
                    if image[source_at:source_at+4] != executable[emitted_at:emitted_at+4]:
                        raise ValueError(f"Instruction changed at {pc:#x}")
                    checked += 1
        inputs = "".join(c["mode"]+" "+str(len(c["values"]))+" "+" ".join(v.hex() for v in c["values"])+"\n" for c in test_cases)
        run = subprocess.run([str(build/"oracle")],input=inputs,text=True,capture_output=True,check=True,timeout=30)
    lines = run.stdout.splitlines()
    if lines.pop(0) != "FPCR 0000000000000000": raise ValueError("Unexpected FPCR")
    if len(lines) != len(test_cases): raise ValueError("Native case count mismatch")
    for case,line in zip(test_cases,lines):
        tokens = line.split()
        if tokens.pop(0) != case["mode"]: raise ValueError("Native case order mismatch")
        if case["mode"] == "S":
            case["count"] = int(tokens.pop(0))
            if len(tokens) != 2*case["count"]: raise ValueError("Native sample count mismatch")
        elif len(tokens) != 1: raise ValueError("Native scalar count mismatch")
        case["inputBits"] = [util.bits(v) for v in case.pop("values")]
        case["outputBits"] = tokens
    result = dict(schema="csp-post-sampling-native/v1",imageSha256=IMAGE_SHA,fpcr="0x0",
                  method="Standalone original arithmetic instructions, relocated branches; no CSP process or whole correction replay",
                  unchangedInstructionsChecked=checked,relocatedInstructionsChecked=relocated_checked,
                  assemblySha256=util.sha(assembly_text.encode()),driverSha256=util.sha(DRIVER.encode()),
                  utilitySourceSha256=util.sha(utility_path.read_bytes()),functions=records,cases=test_cases)
    (EVIDENCE/"sampling-native-vectors.json").write_text(json.dumps(result,indent=2)+"\n")
    (EVIDENCE/"sampling-native-vectors.S").write_text(assembly_text)
    (EVIDENCE/"sampling-native-vectors.c").write_text(DRIVER)
    print(json.dumps(dict(cases=len(test_cases),unchangedInstructionsChecked=checked,relocatedInstructionsChecked=relocated_checked)))


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(error.stdout or "")
        print(error.stderr or "")
        raise
