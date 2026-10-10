import sys,re,struct
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import inspect_binary as b
def u32(addr):return struct.unpack_from('<I',b.DATA,b.offset(addr))[0]
def u64(addr):return struct.unpack_from('<Q',b.DATA,b.offset(addr))[0]
def selector(stub):
    v=u32(stub)
    if v & 0x9f00001f != 0x90000001:return None
    imm=((v>>29)&3)|(((v>>5)&0x7ffff)<<2)
    if imm&(1<<20):imm-=1<<21
    page=(stub&~4095)+(imm<<12)
    w=u32(stub+4)
    if w&0xffc003ff!=0xf9400021:return None
    ptr=u64(page+(((w>>10)&4095)<<3))
    off=b.offset(ptr)
    return b.DATA[off:b.DATA.index(b'\0',off)].decode()
for name in sys.argv[1:]:
    for line in open(name):
        m=re.search(r'bl\s+(0x[0-9a-f]+)',line)
        if m:
            try:
                sel=selector(int(m[1],16))
                if sel:line=line.rstrip()+'  SELECTOR '+sel+'\n'
            except (ValueError,UnicodeDecodeError):pass
        print(line,end='')

