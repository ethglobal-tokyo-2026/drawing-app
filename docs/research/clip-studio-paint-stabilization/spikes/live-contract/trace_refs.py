import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import inspect_binary as b
import struct

targets = [int(x, 0) for x in sys.argv[1:]]
for target in targets:
    print(f'TARGET {target:#x}')
    try:
        offset = b.offset(target)
        data = b.DATA[offset:offset+16]
        print('file bytes', data.hex(), 'signed64', struct.unpack_from('<q', data)[0], 'double', struct.unpack_from('<d', data)[0])
    except ValueError:
        print('not file-backed')
    for a,z,o,n in b.sections:
        if n != '__text':
            continue
        for k in range(o,o+z-a,4):
            v = struct.unpack_from('<I', b.DATA, k)[0]
            pc = a+k-o
            if v & 0x7c000000 == 0x14000000:
                imm = v & 0x3ffffff
                if imm & (1<<25): imm -= 1<<26
                if pc+(imm<<2) == target:
                    print(f'branch@{pc:#x} in {b.func(pc)[0]:#x}')
            if v & 0x9f000000 != 0x90000000:
                continue
            imm = ((v>>29)&3) | (((v>>5)&0x7ffff)<<2)
            if imm & (1<<20): imm -= 1<<21
            page = (pc & ~4095)+(imm<<12)
            reg = v & 31
            if page != target & ~4095:
                continue
            for j in range(k+4,min(k+64,o+z-a),4):
                w = struct.unpack_from('<I', b.DATA, j)[0]
                if ((w>>5)&31) != reg:
                    continue
                if w & 0xffc00000 == 0x91000000:
                    value = page+((w>>10)&4095)
                elif w & 0x3b000000 == 0x39000000:
                    value = page+(((w>>10)&4095)<<((w>>30)&3))
                else:
                    continue
                if value == target:
                    print(f'page@{pc:#x} use@{a+j-o:#x} in {b.func(pc)[0]:#x}')

