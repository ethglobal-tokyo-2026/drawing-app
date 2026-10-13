"""Bounded standalone execution of original quadratic source-node instructions.

Only branches and data-page addresses are relocated. The RTTI call is replaced
by a stated identity cast for the known preceding quadratic node; allocation,
path bookkeeping, and rendering are not part of this numeric oracle.
"""
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
import tempfile

HERE = Path(__file__).resolve().parent
SHA = "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"
FUNCTIONS = {
    0x10276b190: "source_import", 0x102764880: "source_midpoint",
    0x1027648e8: "source_midpoint_scalars", 0x102764984: "source_terminal",
    0x1027649d8: "source_corner", 0x102764a44: "source_after_corner",
    0x102217f00: "source_angle",
}
DRIVER = r'''
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
extern void source_import(void*,void*);
extern void source_midpoint(void*,void*,void*);
extern void source_terminal(void*,void*,void*);
extern void source_corner(void*,void*);
extern void source_after_corner(void*,void*,void*);
static void dbl(const unsigned char *p) { uint64_t b; memcpy(&b,p,8); printf(" %016" PRIx64,b); }
static void word(const unsigned char *p) { uint32_t b; memcpy(&b,p,4); printf(" %08" PRIx32,b); }
int main(void) {
  uint64_t fpcr; __asm__ volatile("mrs %0, fpcr" : "=r"(fpcr));
  printf("FPCR %016" PRIx64 "\n",fpcr);
  char mode;
  while(scanf(" %c",&mode)==1) {
    double p[22];
    for(int i=0;i<22;i++) if(scanf("%la",&p[i])!=1) return 2;
    _Alignas(16) unsigned char a[0x60]={0},b[0x60]={0},node[0x90]={0},prior[0x90]={0};
    memcpy(a,p,9*8);memcpy(b,p+9,9*8);
    uint32_t af=(uint32_t)p[20],bf=(uint32_t)p[21];
    memcpy(a+0x50,&af,4);memcpy(b+0x50,&bf,4);
    memcpy(prior+8,p+18,16);
    double old[2]={-123,456};memcpy(prior+0x78,old,16);
    void *previous=prior;memcpy(node+0x30,&previous,8);
    if(mode=='I') source_import(node,b);
    else if(mode=='M') source_midpoint(node,a,b);
    else if(mode=='T') source_terminal(node,a,b);
    else if(mode=='C') source_corner(node,a);
    else if(mode=='A') source_after_corner(node,a,b);
    else return 3;
    printf("%c",mode);dbl(node+8);dbl(node+16);
    for(int i=0;i<7;i++)word(node+0x44+4*i);
    word(node+0x40);dbl(prior+0x78);dbl(prior+0x80);puts("");
  }
  return ferror(stdin)?4:0;
}
'''

def digest(data):
    return hashlib.sha256(data).hexdigest()

def signed(value, width):
    return value - (1 << width) if value & (1 << (width-1)) else value

def branch(word, pc):
    if word & 0x7c000000 == 0x14000000:
        return pc+(signed(word & 0x3ffffff,26)<<2), 0xfc000000
    if word & 0xff000010 == 0x54000000:
        return pc+(signed((word>>5)&0x7ffff,19)<<2), 0xff00001f
    if word & 0x7e000000 == 0x34000000:
        return pc+(signed((word>>5)&0x7ffff,19)<<2), ~(0x7ffff<<5) & 0xffffffff
    raise ValueError(f"Unknown branch {word:x}")

def page(word, pc):
    immediate=((word>>29)&3)|(((word>>5)&0x7ffff)<<2)
    return (pc & ~4095)+(signed(immediate,21)<<12)

def offset(data,address):
    p=32
    for _ in range(struct.unpack_from('<I',data,16)[0]):
        cmd,size=struct.unpack_from('<II',data,p)
        if cmd==0x19:
            start,_,at,length=struct.unpack_from('<QQQQ',data,p+24)
            if start<=address<start+length:return at+address-start
        p+=size
    raise ValueError(hex(address))

def cases():
    rng=random.Random(0x102764880)
    inputs=[]
    for i in range(100):
        a=[rng.uniform(-1000,1000) for _ in range(2)]+[rng.uniform(-2,2) for _ in range(7)]
        b=[rng.uniform(-1000,1000) for _ in range(2)]+[rng.uniform(-2,2) for _ in range(7)]
        a[5]=rng.uniform(-360,720);b[5]=rng.uniform(-360,720)
        inputs.append((f'random-{i}',a+b+[rng.uniform(-1000,1000),rng.uniform(-1000,1000),float(i%4),float((i+1)%4)]))
    for name,a,b in [
        ('angle-wrap',[350.,10.],[10.,350.]),
        ('angle-negative',[-180.,-360.],[180.,0.]),
        ('signed-zero',[-0.,0.],[0.,-0.]),
        ('angle-positive-limit',[720.,360.],[720.,360.]),
    ]:
        previous=[-0.,0.,2**-149,0.1,0.3,a[0],0.7,2**-150,1.0000000596046448]
        current=[4.,2.,0.,0.2,0.6,b[0],0.4,2**-149,1.0000000596046448]
        inputs.append((name,previous+current+[1.,-2.,3.,1.]))
    result=[]
    for name,values in inputs:
        for mode in 'IMTCA':result.append({'mode':mode,'name':name,'values':values})
    return result

def main():
    if platform.system()!='Darwin' or platform.machine()!='arm64':
        raise SystemExit('Requires macOS ARM64')
    os.environ.setdefault('CSP_ARM64','/Users/adoll/Applications/CSP Research/original-arm64')
    spec=importlib.util.spec_from_file_location('inspect_binary',HERE.parent/'live-contract/inspect_binary.py')
    native=importlib.util.module_from_spec(spec);spec.loader.exec_module(native)
    assert digest(native.DATA)==SHA
    asm=['.section __TEXT,__text,regular,pure_instructions','.p2align 2']
    pages={};records=[]
    for start,name in FUNCTIONS.items():
        _,end=native.func(start)
        output=io.StringIO()
        with contextlib.redirect_stdout(output):native.disasm(start,end)
        instructions=[]
        for line in output.getvalue().splitlines():
            match=re.match(r'([0-9a-f]+):\s+(.+)',line)
            if match:instructions.append((int(match[1],16),match[2].split(';')[0].strip()))
        assert len(instructions)*4==end-start
        asm.extend([f'.globl _{name}',f'_{name}:'])
        relocations={}
        for pc,instruction in instructions:
            asm.append(f'L{pc:x}:')
            original=instruction
            if instruction.startswith('adrp'):
                match=re.fullmatch(r'adrp\s+(x\d+), (0x[0-9a-f]+)',instruction)
                address=int(match[2],16)
                pages[address]=native.DATA[native.offset(address):native.offset(address)+4096]
                instruction=f'adrp {match[1]}, Lpage{address:x}@PAGE'
                relocations[pc]={'kind':'page','target':address}
            elif re.match(r'(?:b(?:l|\.[a-z]+)?|cbnz|cbz)\s',instruction):
                match=re.search(r'0x[0-9a-f]+$',instruction)
                address=int(match[0],16)
                if address==0x103bdd454:target='_source_quadratic_identity_cast'
                elif address in FUNCTIONS:target='_'+FUNCTIONS[address]
                elif start<=address<end:target=f'L{address:x}'
                else:raise ValueError(f'Unsupported external call {original}')
                instruction=instruction[:match.start()]+target
                relocations[pc]={'kind':'branch','target':address}
            asm.append('    '+instruction)
        body=native.DATA[native.offset(start):native.offset(start)+(end-start)]
        records.append({'address':start,'name':name,'length':end-start,'bytesSha256':digest(body),'relocations':relocations})
    asm.extend(['.globl _source_quadratic_identity_cast','_source_quadratic_identity_cast:','ret','.section __TEXT,__const'])
    for address,data in sorted(pages.items()):
        asm.extend(['.p2align 12',f'Lpage{address:x}:','.byte '+','.join(map(str,data))])
    assembly='\n'.join(asm)+'\n'
    vectors=cases();checked=relocated=0
    with tempfile.TemporaryDirectory(prefix='csp-source-geometry-') as temporary:
        build=Path(temporary);(build/'oracle.S').write_text(assembly);(build/'driver.c').write_text(DRIVER)
        subprocess.run(['clang','-arch','arm64','-O0','-ffp-contract=off',str(build/'oracle.S'),str(build/'driver.c'),'-o',str(build/'oracle')],capture_output=True,text=True,check=True,timeout=60)
        executable=(build/'oracle').read_bytes()
        nm=subprocess.check_output(['nm','-n',str(build/'oracle')],text=True,timeout=15)
        symbols={m[2]:int(m[1],16) for m in re.finditer(r'^([0-9a-f]+) \S (_source_\w+)$',nm,re.M)}
        for record in records:
            start=record['address'];emitted=symbols['_'+record['name']]
            for delta in range(0,record['length'],4):
                pc=start+delta
                original_word=struct.unpack_from('<I',native.DATA,native.offset(pc))[0]
                emitted_word=struct.unpack_from('<I',executable,offset(executable,emitted+delta))[0]
                relocation=record['relocations'].get(pc)
                if not relocation:
                    assert original_word==emitted_word,hex(pc);checked+=1;continue
                if relocation['kind']=='page':
                    assert (original_word & 0x9f00001f)==(emitted_word & 0x9f00001f)
                    address=page(emitted_word,emitted+delta)
                    at=offset(executable,address)
                    assert executable[at:at+4096]==pages[relocation['target']]
                else:
                    old_target,mask=branch(original_word,pc);target,new_mask=branch(emitted_word,emitted+delta)
                    assert mask==new_mask and original_word&mask==emitted_word&mask
                    if old_target==0x103bdd454:expected=symbols['_source_quadratic_identity_cast']
                    elif old_target in FUNCTIONS:expected=symbols['_'+FUNCTIONS[old_target]]
                    else:expected=emitted+old_target-start
                    assert target==expected,hex(pc)
                relocated+=1
        data=''.join(c['mode']+' '+' '.join(float(v).hex() for v in c['values'])+'\n' for c in vectors)
        run=subprocess.run([str(build/'oracle')],input=data,capture_output=True,text=True,check=True,timeout=30)
    lines=run.stdout.splitlines();assert lines.pop(0)=='FPCR 0000000000000000';assert len(lines)==len(vectors)
    for case,line in zip(vectors,lines):
        mode,*outputs=line.split();assert mode==case['mode'];assert len(outputs)==12
        case['inputBits']=[struct.pack('>d',v).hex() for v in case.pop('values')];case['outputBits']=outputs
    result={'originalSha256':SHA,'method':'Original source-node instructions with relocated branches/data pages; RTTI replaced by identity cast for known quadratic predecessor; no native orchestration or CSP execution.',
        'fpcr':'0x0','unchangedInstructions':checked,'relocatedInstructions':relocated,
        'assemblySha256':digest(assembly.encode()),'driverSha256':digest(DRIVER.encode()),
        'pages':{hex(a):digest(b) for a,b in pages.items()},'functions':records,'cases':vectors}
    evidence=HERE/'evidence'
    (evidence/'native-geometry.json').write_text(json.dumps(result,indent=2)+'\n')
    (evidence/'native-geometry.S').write_text(assembly)
    (evidence/'native-geometry.c').write_text(DRIVER)
    print(json.dumps({'cases':len(vectors),'unchangedInstructions':checked,'relocatedInstructions':relocated}))

if __name__=='__main__':
    try:main()
    except subprocess.CalledProcessError as error:
        print(error.stdout or '');print(error.stderr or '');raise
