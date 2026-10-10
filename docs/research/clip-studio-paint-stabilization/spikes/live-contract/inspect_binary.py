# Static Mach-O inspection helpers for the preserved live packet contract evidence.
import bisect
import os
import re
import struct
import subprocess
import sys
from pathlib import Path

PATH = Path(os.environ['CSP_ARM64'])
DATA = PATH.read_bytes()
BASE = 0x100000000
segments = []
sections = []
starts = []
pos = 32
for _ in range(struct.unpack_from('<I', DATA, 16)[0]):
    cmd, size = struct.unpack_from('<II', DATA, pos)
    if cmd == 0x19:
        name = DATA[pos+8:pos+24].rstrip(b'\0').decode()
        addr, length, off, filelen = struct.unpack_from('<QQQQ', DATA, pos+24)
        segments.append((addr, addr+filelen, off, name))
        for n in range(struct.unpack_from('<I', DATA, pos+64)[0]):
            sp = pos+72+80*n
            sn = DATA[sp:sp+16].rstrip(b'\0').decode()
            sa, sl, so = struct.unpack_from('<QQI', DATA, sp+32)
            sections.append((sa, sa+sl, so, sn))
    if cmd == 0x26:
        off, length = struct.unpack_from('<II', DATA, pos+8)
        cur = BASE
        value = shift = 0
        for v in DATA[off:off+length]:
            value |= (v & 127) << shift
            if v & 128:
                shift += 7
            else:
                if not value:
                    break
                cur += value
                starts.append(cur)
                value = shift = 0
    pos += size
start_set = set(starts)

def offset(addr):
    for a, z, o, _ in segments:
        if a <= addr < z:
            return o + addr-a
    raise ValueError(hex(addr))

def func(addr):
    i = bisect.bisect_right(starts, addr)-1
    return starts[i], starts[i+1]

def disasm(a, z=None):
    if z is None:
        a, z = func(a)
    out = subprocess.check_output(['objdump', '-d', '--no-show-raw-insn', f'--start-address={a:#x}', f'--stop-address={z:#x}', str(PATH)], text=True, timeout=30)
    regs = {}
    for line in out.splitlines():
        line = re.sub(r' <[^>]*>', '', line)
        m = re.match(r'([0-9a-f]+):\s+(\w+)\s*(.*)', line)
        if not m:
            continue
        pc = int(m[1],16)
        if pc in start_set:
            print(f'\nFUNCTION {pc:#x} size {func(pc)[1]-pc}')
        op, args = m[2], m[3]
        if op=='adrp':
            rr, aa = args.split(', ')
            regs[rr] = int(aa,16)
        if op=='add':
            m2 = re.match(r'(x\d+), (x\d+), #(0x[0-9a-f]+|\d+)$', args)
            if m2 and m2[2] in regs:
                va = regs[m2[2]]+int(m2[3],0)
                try:
                    off = offset(va)
                    s = DATA[off:DATA.find(b'\0',off)].decode('ascii')
                    if s and len(s)<180 and s.isprintable():
                        line += ' STRING '+repr(s)
                except (ValueError,UnicodeDecodeError):
                    pass
        print(line)

def refs(addr):
    for a,z,o,n in sections:
        if n!='__text':
            continue
        for k in range(o,o+z-a,4):
            v = struct.unpack_from('<I',DATA,k)[0]
            if v & 0x9f000000 != 0x90000000:
                continue
            pc = a+k-o
            imm = ((v>>29)&3) | (((v>>5)&0x7ffff)<<2)
            if imm & (1<<20):
                imm -= 1<<21
            page = (pc & ~4095)+(imm<<12)
            reg = v & 31
            if page != (addr & ~4095):
                continue
            for j in range(k+4,min(k+40,o+z-a),4):
                w = struct.unpack_from('<I',DATA,j)[0]
                if w & 0xffc00000 == 0x91000000 and ((w>>5)&31)==reg:
                    val = page + ((w>>10)&4095)
                    if val==addr:
                        print(f'{pc:#x} add@{a+j-o:#x} in {func(pc)[0]:#x}')

if __name__=='__main__':
    mode = sys.argv[1]
    values = [int(s,0) for s in sys.argv[2:]]
    if mode=='disasm':
        disasm(*values)
    elif mode=='refs':
        for value in values:
            print('REFS',hex(value))
            refs(value)
    elif mode=='functions':
        for value in starts:
            if values[0]<=value<values[1]:
                print(hex(value),func(value)[1]-value)

