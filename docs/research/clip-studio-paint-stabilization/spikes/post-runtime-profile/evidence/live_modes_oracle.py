"""Bounded standalone live-window instruction comparison; no CSP process."""

import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import random
import re
import struct
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
os.environ.setdefault("CSP_ARM64", "/Users/adoll/Applications/CSP Research/original-arm64")
sys.path.insert(0, str(HERE.parents[1] / "live-contract"))
import inspect_binary as binary

spec = importlib.util.spec_from_file_location("input_oracle", HERE.parents[1] / "post-input/native_oracle.py")
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
helper = shared.helper
FUNCTIONS = {
    0x1021366BC: "csp_configure", 0x102136A5C: "csp_window",
    0x102193618: "csp_distance", 0x10221B72C: "csp_include",
}
EXTERNAL = {0x1000886B0: "csp_bad_index"}
DRIVER = r'''
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef struct { double x,y,pressure; int64_t timestamp; } Sample;
extern void csp_configure(void*,int,int,int,int);
extern int csp_window(void*,double*,double*,int64_t,int);
void csp_bad_index(void*p){abort();}
static void set32(void*p,int offset,int v){memcpy((char*)p+offset,&v,4);}
static void set64(void*p,int offset,uint64_t v){memcpy((char*)p+offset,&v,8);}
static void setd(void*p,int offset,double v){memcpy((char*)p+offset,&v,8);}
static void bits(void*p,int offset){uint64_t b;memcpy(&b,(char*)p+offset,8);printf(" %016" PRIx64,b);}
int main(void){
    uint64_t fpcr;__asm__ volatile("mrs %0, fpcr":"=r"(fpcr));printf("FPCR %016" PRIx64 "\n",fpcr);
    int s,t,fast,slow,state,catchup,count;double h;int64_t now;
    Sample samples[1024];Sample*blocks[8];for(int i=0;i<8;i++)blocks[i]=samples+128*i;
    while(scanf("%d%d%d%d%d%d%d%la%" SCNd64,&s,&t,&fast,&slow,&state,&catchup,&count,&h,&now)==9){
        if(count<1||count>1000)return 2;
        for(int i=0;i<count;i++)if(scanf("%la%la%la%" SCNd64,&samples[i].x,&samples[i].y,&samples[i].pressure,&samples[i].timestamp)!=4)return 3;
        unsigned char q[240]={0};csp_configure(q,s,t,fast,slow);
        set64(q,0x10,(uint64_t)blocks);set64(q,0x30,count);set32(q,0x38,count);
        set32(q,0x48,200);set32(q,0x4c,25);set32(q,0x88,state);
        setd(q,0x58,h);set64(q,0x80,(uint64_t)now);
        double xy[2]={samples[count-1].x,samples[count-1].y},pressure=samples[count-1].pressure;
        int result=csp_window(q,xy,&pressure,now,catchup);
        printf("%d",result);bits(q,0x58);bits(q,0x80);bits(xy,0);bits(xy,8);bits(&pressure,0);puts("");
    }
    return ferror(stdin)?4:0;
}
'''


def main():
    assert helper.sha(binary.DATA) == helper.IMAGE_SHA
    assembly = [".text"]
    records, constants, targets = [], {}, {**FUNCTIONS, **EXTERNAL}
    for start, name in FUNCTIONS.items():
        _, end = binary.func(start)
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            binary.disasm(start, end)
        rows = []
        for line in output.getvalue().splitlines():
            match = re.match(r"([0-9a-f]+):\s+(.*)", line)
            if match:
                rows.append((int(match[1], 16), match[2].split(';')[0].split(' STRING ')[0].strip()))
        relocations, replacements = {}, {}
        assembly += [".p2align 2", f".globl _{name}", f"_{name}:"]
        for index, (pc, instruction) in enumerate(rows):
            assembly.append(f"L{pc:x}:")
            if instruction.startswith("adrp"):
                match = re.fullmatch(r"adrp\s+(x\d+), (0x[0-9a-f]+)", instruction)
                nextpc, nextinstruction = rows[index + 1]
                load = re.fullmatch(r"ldr\s+([qd]\d+), \[" + match[1] + r", #(0x[0-9a-f]+)\]", nextinstruction)
                add = re.fullmatch(r"add\s+(x\d+), " + match[1] + r", #(0x[0-9a-f]+)", nextinstruction)
                if load:
                    size = 16 if load[1][0] == "q" else 8
                    address = int(match[2], 16) + int(load[2], 16)
                elif add:
                    size = 64
                    address = int(match[2], 16) + int(add[2], 16)
                else:
                    raise ValueError(nextinstruction)
                constants[address] = binary.DATA[binary.offset(address):binary.offset(address) + size]
                instruction = f"adrp {match[1]}, Lconstant{address:x}@PAGE"
                replacements[nextpc] = (f"ldr {load[1]}, [{match[1]}, Lconstant{address:x}@PAGEOFF]" if load else f"add {add[1]}, {match[1]}, Lconstant{address:x}@PAGEOFF")
                relocations[pc] = dict(kind="page", address=address, size=size, pair="load" if load else "add")
                relocations[nextpc] = dict(kind="offset")
            elif pc in replacements:
                instruction = replacements[pc]
            elif re.match(r"(?:b(?:l|\.[a-z]+)?|cbnz|cbz|tbnz|tbz)\s", instruction):
                match = re.search(r"0x[0-9a-f]+$", instruction)
                address = int(match[0], 16)
                assert address in targets or start <= address < end
                target = f"_{targets[address]}" if address in targets else f"L{address:x}"
                instruction = instruction[:match.start()] + target
                relocations[pc] = dict(kind="branch", target=address)
            assembly.append("    " + instruction)
        records.append(dict(start=start, end=end, name=name, relocations=relocations,
                            sha256=helper.sha(binary.DATA[binary.offset(start):binary.offset(start) + end - start])))
    assembly.append(".section __TEXT,__const")
    for address, data in constants.items():
        assembly += [".p2align 4", f"Lconstant{address:x}:", ".byte " + ",".join(map(str, data))]
    assembly = "\n".join(assembly) + "\n"
    rng = random.Random(0x102136a5c)
    cases, inputs = [], []
    for mode in ["fixed", "fast", "slow"]:
        for s in [0, 1, 2, 3, 4, 20, 30, 31, 100]:
            if s == 0 and mode != "slow":
                continue
            for pattern in range(18):
                t = [0, 5, 50][pattern % 3]
                count = [1, 2, 3, 17, 30, 31, 128, 129, 200][pattern % 9]
                state = pattern % 3
                initial = s if s < 3 else max(2, min(15, min(s, t) >> 1))
                h = float(initial if pattern < 9 else max(initial, s - 0.25))
                now = 2000
                samples = []
                x, y = 0., 0.
                for i in range(count):
                    if pattern % 6:
                        scale = [0., 0.1, 2.5, 10., 100., 1000.][pattern % 6]
                        x += rng.uniform(-scale, scale)
                        y += rng.uniform(-scale, scale)
                    pressure = 0. if pattern % 4 == 0 and i % 3 == 0 else 0.5
                    timestamp = now - (count - 1 - i) * [0, 1, 8, 1000, 1001, -1][pattern % 6]
                    samples.append(dict(x=x, y=y, pressure=pressure, timestamp=str(timestamp)))
                case = dict(mode=mode, stabilization=s, taper=t, state=state,
                            catchUp=pattern % 5 == 4, currentWindow=h, timestamp=str(now), history=samples)
                cases.append(case)
                fields = [str(s), str(t), str(int(mode == "fast")), str(int(mode == "slow")), str(state), str(int(case["catchUp"])), str(count), h.hex(), str(now)]
                for sample in samples:
                    fields += [sample[field].hex() for field in ["x", "y", "pressure"]] + [sample["timestamp"]]
                inputs.append(" ".join(fields))
    unchanged = relocated = 0
    with tempfile.TemporaryDirectory(prefix="csp-live-modes-") as temporary:
        build = Path(temporary)
        (build / "oracle.S").write_text(assembly)
        (build / "driver.c").write_text(DRIVER)
        subprocess.run(["clang", "-arch", "arm64", "-O0", "-ffp-contract=off", str(build / "oracle.S"), str(build / "driver.c"), "-o", str(build / "oracle")], check=True, capture_output=True, timeout=60)
        executable = (build / "oracle").read_bytes()
        nm = subprocess.check_output(["nm", "-n", str(build / "oracle")], text=True, timeout=15)
        symbols = {m[2]: int(m[1], 16) for m in re.finditer(r"^([0-9a-f]+) \S (_csp_\w+)$", nm, re.M)}
        for record in records:
            start, output = record["start"], symbols["_" + record["name"]]
            for delta in range(0, record["end"] - start, 4):
                pc = start + delta
                original = struct.unpack_from("<I", binary.DATA, binary.offset(pc))[0]
                emitted = struct.unpack_from("<I", executable, helper.macho_offset(executable, output + delta))[0]
                relocation = record["relocations"].get(pc)
                if not relocation:
                    assert original == emitted, hex(pc)
                    unchanged += 1
                    continue
                kind = relocation["kind"]
                if kind == "branch":
                    destination, mask = shared.branch_target(original, pc)
                    actual, actualmask = shared.branch_target(emitted, output + delta)
                    expected = symbols["_" + targets[destination]] if destination in targets else output + destination - start
                    assert mask == actualmask and original & mask == emitted & mask and actual == expected, hex(pc)
                elif kind == "offset":
                    assert original & ~(4095 << 10) == emitted & ~(4095 << 10), hex(pc)
                elif kind == "page":
                    assert original & 0x9F00001F == emitted & 0x9F00001F, hex(pc)
                    pair = struct.unpack_from("<I", executable, helper.macho_offset(executable, output + delta + 4))[0]
                    scale = relocation["size"] if relocation["pair"] == "load" else 1
                    actual = helper.page_target(emitted, output + delta) + ((pair >> 10) & 4095) * scale
                    off, data = helper.macho_offset(executable, actual), constants[relocation["address"]]
                    assert executable[off:off + len(data)] == data, hex(pc)
                relocated += 1
        run = subprocess.run([str(build / "oracle")], input="\n".join(inputs) + "\n", text=True, capture_output=True, check=True, timeout=30)
    lines = run.stdout.splitlines()
    assert lines.pop(0) == "FPCR 0000000000000000" and len(lines) == len(cases)
    for case, line in zip(cases, lines):
        case["native"] = line.split()
    result = dict(schema="csp-live-window-native/v1", imageSha256=helper.IMAGE_SHA,
                  fpcr="0x0", unchangedInstructions=unchanged, relocatedInstructions=relocated,
                  functions=records, externalHarnessFunctions={hex(k): v for k, v in EXTERNAL.items()},
                  assemblySha256=helper.sha(assembly.encode()), driverSha256=helper.sha(DRIVER.encode()), cases=cases)
    (HERE / "live-modes-native.json").write_text(json.dumps(result, indent=2) + "\n")
    (HERE / "live-modes-native.S").write_text(assembly)
    (HERE / "live-modes-native.c").write_text(DRIVER)
    print(json.dumps(dict(cases=len(cases), unchangedInstructions=unchanged, relocatedInstructions=relocated)))


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(error.stdout or "", file=sys.stderr)
        print(error.stderr or "", file=sys.stderr)
        raise
