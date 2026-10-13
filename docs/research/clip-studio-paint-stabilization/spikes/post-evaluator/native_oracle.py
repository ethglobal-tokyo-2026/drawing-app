"""Bounded standalone ARM64 evaluator oracle; never launches or attaches CSP."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import platform
import random
import re
import struct
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
IMAGE = Path(os.environ.get('CSP_ARM64', '/Users/adoll/Applications/CSP Research/original-arm64'))
IMAGE_SHA = '6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd'
FUNCTIONS = {
    0x1024c497c: 'endpoint', 0x1024aff24: 'response', 0x1024af6f0: 'minimum',
    0x1024a9bb4: 'curve_object', 0x10359de0c: 'curve', 0x10359cf18: 'inverse',
    0x10359b494: 'roots', 0x10219455c: 'line',
}
DRIVER = r'''
#include <stdint.h>
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
uint64_t oracle_guard_value = UINT64_C(0x6576616c7561746f);
void oracle_stack_fail(void) { abort(); }
extern double csp_endpoint(void*,void*,double);
extern double csp_curve(int,void*,double);
static void put64(unsigned char *p, size_t o, double x) { memcpy(p+o,&x,8); }
static void put32(unsigned char *p, size_t o, uint32_t x) { memcpy(p+o,&x,4); }
static double number(void) { double x; if(scanf("%la",&x)!=1) exit(2); return x; }
static void response(unsigned char *p, unsigned char curves[3][0x178]) {
  put32(p,8,(uint32_t)number());
  for(int i=0;i<6;i++) { float v=(float)number(); memcpy(p+12+4*i,&v,4); }
  for(int i=0;i<3;i++) {
    int n=(int)number(); if(n < -1 || n > 16) exit(3);
    if(n<0) continue;
    void *q=curves[i]; memcpy(p+0x28+i*16,&q,8);put32(q,0x168,n);
    for(int j=0;j<n*2;j++) put64(q,0x68+j*8,number());
  }
}
int main(void) {
  uint64_t fpcr; __asm__ volatile("mrs %0, fpcr" : "=r"(fpcr));
  printf("FPCR %016" PRIx64 "\n",fpcr);
  char mode;
  while(scanf(" %c",&mode)==1) {
    double result=0,parameter=number();
    if(mode=='C') {
      int n=(int)number();double points[32]; if(n<0||n>16)return 4;
      for(int i=0;i<n*2;i++)points[i]=number();
      result=csp_curve(n,points,parameter);
    } else if(mode=='E') {
      unsigned char cfg[0x740]={0},node[0x58]={0},curves[2][3][0x178]={0};
      uint32_t flags=(uint32_t)number();put32(node,0x50,((flags>>12)&1)|((flags>>12)&2));
      put32(cfg,0x80,number()?16:0);put32(cfg,0x198,(uint32_t)number());
      put32(cfg,0x624,number()?1:0);put64(cfg,0x628,number());
      for(int i=0;i<7;i++) put64(node,0x10+i*8,number());
      response(cfg+0x88,curves[0]);response(cfg+0x630,curves[1]);
      result=csp_endpoint(cfg,node,parameter);
    } else return 5;
    uint64_t bits;memcpy(&bits,&result,8);printf("%c %016" PRIx64 "\n",mode,bits);
  }
  return ferror(stdin)?6:0;
}
'''


def cases():
    rng=random.Random(0x1024c497c)
    result=[]
    def response():
        return dict(flags=0,minimum=0,input1Minimum=0,input1Maximum=1,input2Minimum=0,randomMinimum=0,input4Minimum=0,curves=[None,None,None])
    curves=[[],[dict(x=0,y=99)], [dict(x=0,y=0),dict(x=1,y=1)],
            [dict(x=0,y=0),dict(x=.5,y=1),dict(x=1,y=0)],
            [dict(x=0,y=0),dict(x=.75,y=1),dict(x=1,y=1)],
            [dict(x=0,y=0),dict(x=0,y=1)],
            [dict(x=0,y=0),dict(x=0,y=.5),dict(x=1,y=1)]]
    for n in range(4,17):
        curves.append([dict(x=i/(n-1),y=rng.uniform(-.3,1.5)) for i in range(n)])
    for i,curve in enumerate(curves):
        for j,parameter in enumerate([-.5,0,1e-9,.1,.25,.5,.75,.9,1,1.5]):
            result.append(dict(mode='C',name=f'curve-{i}-{j}',curve=curve,parameter=parameter))
    f32=lambda v:struct.unpack('<f',struct.pack('<f',v))[0]
    for i in range(480):
        cfg=dict(main=response(),secondary=response(),secondaryEnabled=bool(i%2),secondaryBase=rng.uniform(0,5),brushFlag4=bool(i%3),adjustmentMode=[0,1,2,3,4,0xffffffff][i%6])
        for key in ['main','secondary']:
            r=cfg[key];r['flags']=[0,1,16,32,64,128,256,16|32|64|128|256][(i+(key=='secondary'))%8]
            for field in ['minimum','input1Minimum','input1Maximum','input2Minimum','randomMinimum','input4Minimum']:
                r[field]=f32(rng.uniform(-.25,1.25))
            r['curves']=[curves[(i+j*3)%len(curves)] if (i+j)%7 else None for j in range(3)]
        scalars=[f32(rng.uniform(0,1.2)) for _ in range(7)]
        result.append(dict(mode='E',name=f'evaluator-{i}',parameter=[0,.1,1,2.5,10,100][i%6],node=dict(flags=0x1000 if i%11==0 else 0,scalars=scalars),config=cfg))
    return result


def main():
    if platform.system()!='Darwin' or platform.machine()!='arm64':raise RuntimeError('Requires macOS ARM64')
    data=IMAGE.read_bytes()
    if hashlib.sha256(data).hexdigest()!=IMAGE_SHA:raise RuntimeError('Wrong pinned binary')
    os.environ['CSP_ARM64']=str(IMAGE)
    spec=importlib.util.spec_from_file_location('inspect_binary',HERE.parent/'live-contract/inspect_binary.py')
    b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
    asm=['.section __TEXT,__text,regular,pure_instructions','.p2align 2'];records=[];pages={}
    for start,name in FUNCTIONS.items():
        _,end=b.func(start);capture=io.StringIO()
        with contextlib.redirect_stdout(capture):b.disasm(start,end)
        original=capture.getvalue();(HERE/'evidence'/f'{start:x}.asm').write_text(original)
        instructions=[]
        for line in original.splitlines():
            m=re.match(r'([0-9a-f]+):\s+(.+)',line)
            if m:instructions.append((int(m[1],16),m[2].split(';')[0].strip()))
        assert len(instructions)*4==end-start
        relocations={};asm += [f'.globl _csp_{name}',f'_csp_{name}:']
        for pc,ins in instructions:
            asm.append(f'L{pc:x}:')
            m=re.fullmatch(r'adrp\s+(x\d+), (0x[0-9a-f]+)',ins)
            branch=re.fullmatch(r'(b(?:l|\.[a-z]+)?)\s+(0x[0-9a-f]+)',ins)
            conditional=re.fullmatch(r'((?:cbn?z|tbn?z)\s+.+), (0x[0-9a-f]+)',ins)
            if m:
                page=int(m[2],16);pages[page]=None;ins=f'adrp {m[1]}, Lpage{page:x}@PAGE';relocations[pc]=['page',page]
            elif branch or conditional:
                match=branch or conditional;target=int(match[2],16)
                if target==0x103bdd4d8:label='_oracle_stack_fail'
                elif target in FUNCTIONS:label=f'_csp_{FUNCTIONS[target]}'
                elif start<=target<end:label=f'L{target:x}'
                else:raise RuntimeError(f'Unknown target {target:x}')
                ins=match[1]+(' ' if branch else ', ')+label;relocations[pc]=['branch',target]
            asm.append('    '+ins)
        records.append(dict(start=start,end=end,name=name,relocations=relocations,sha256=hashlib.sha256(data[b.offset(start):b.offset(end)]).hexdigest()))
    # Keep constant-page offsets, including indexed adjustment table, unchanged.
    asm.append('.section __DATA,__const')
    for page in sorted(pages):
        asm += ['.p2align 12',f'Lpage{page:x}:']
        if page==0x1048c8000:
            asm += ['.space 0x4d0','.quad _oracle_guard_value','.space 0xb28']
        else:
            raw=data[b.offset(page):b.offset(page)+4096]
            asm += ['.byte '+','.join(map(str,raw[i:i+128])) for i in range(0,len(raw),128)]
    assembly='\n'.join(asm)+'\n'
    allcases=cases();lines=[]
    for c in allcases:
        values=[c['parameter']]
        if c['mode']=='C':values += [len(c['curve'])]+[v for p in c['curve'] for v in [p['x'],p['y']]]
        else:
            cfg=c['config'];values += [c['node']['flags'],cfg['brushFlag4'],cfg['adjustmentMode'],cfg['secondaryEnabled'],cfg['secondaryBase']]+c['node']['scalars']
            for key in ['main','secondary']:
                r=cfg[key];values += [r[f] for f in ['flags','minimum','input1Minimum','input1Maximum','input2Minimum','randomMinimum','input4Minimum']]
                for curve in r['curves']:
                    values.append(-1 if curve is None else len(curve))
                    if curve is not None:values += [v for p in curve for v in [p['x'],p['y']]]
        lines.append(c['mode']+' '+' '.join(float(v).hex() for v in values))
    with tempfile.TemporaryDirectory(prefix='csp-endpoint-arithmetic-') as directory:
        root=Path(directory);(root/'oracle.S').write_text(assembly);(root/'driver.c').write_text(DRIVER)
        subprocess.run(['clang','-arch','arm64','-O0','-ffp-contract=off','-Wl,-no_fixup_chains',str(root/'oracle.S'),str(root/'driver.c'),'-o',str(root/'oracle')],check=True,capture_output=True,text=True,timeout=60)
        exe=(root/'oracle').read_bytes()
        nm=subprocess.check_output(['nm','-an',str(root/'oracle')],text=True,timeout=15)
        symbols={m[2]:int(m[1],16) for m in re.finditer(r'^([0-9a-f]+) \S (\S+)$',nm,re.M)}
        spec=importlib.util.spec_from_file_location('spline_oracle',HERE.parent/'post-spline/native_oracle.py')
        helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
        checked=0;relocated=0
        def branch(word,pc):
            if word&0x7c000000==0x14000000:return pc+(helper.signed(word&0x3ffffff,26)<<2),0xfc000000
            if word&0x7e000000==0x34000000 or word&0xff000010==0x54000000:return pc+(helper.signed((word>>5)&0x7ffff,19)<<2),~(0x7ffff<<5)&0xffffffff
            if word&0x7e000000==0x36000000:return pc+(helper.signed((word>>5)&0x3fff,14)<<2),~(0x3fff<<5)&0xffffffff
            raise RuntimeError(f'Unrecognized branch {word:x}')
        for record in records:
            start=record['start'];out=symbols['_csp_'+record['name']]
            for pc in range(start,record['end'],4):
                word=struct.unpack_from('<I',data,b.offset(pc))[0];outpc=out+pc-start
                emitted=struct.unpack_from('<I',exe,helper.macho_offset(exe,outpc))[0]
                rel=record['relocations'].get(pc)
                if rel is None:assert word==emitted,(hex(pc),hex(word),hex(emitted));checked+=1;continue
                if rel[0]=='page':
                    assert word&0x9f00001f==emitted&0x9f00001f
                    target=helper.page_target(emitted,outpc);page=rel[1]
                    pagebytes=exe[helper.macho_offset(exe,target):helper.macho_offset(exe,target)+4096]
                    if page!=0x1048c8000:assert pagebytes==data[b.offset(page):b.offset(page)+4096]
                    else:assert struct.unpack_from('<Q',pagebytes,0x4d0)[0]==symbols['_oracle_guard_value']
                else:
                    target,mask=branch(word,pc);actual,othermask=branch(emitted,outpc)
                    expected=symbols['_oracle_stack_fail'] if target==0x103bdd4d8 else symbols['_csp_'+FUNCTIONS[target]] if target in FUNCTIONS else out+target-start
                    assert mask==othermask and word&mask==emitted&mask and actual==expected,hex(pc)
                relocated+=1
        run=subprocess.run([str(root/'oracle')],input='\n'.join(lines)+'\n',text=True,capture_output=True,check=True,timeout=30)
    outputs=run.stdout.splitlines();assert outputs.pop(0)=='FPCR 0000000000000000';assert len(outputs)==len(allcases)
    for c,line in zip(allcases,outputs):
        mode,bits=line.split();assert mode==c['mode'];c['outputBits']=bits
    result=dict(schema='csp-post-evaluator-native/v1',binarySha256=IMAGE_SHA,fpcr='0x0',method='Reassembled extracted functions; synthetic explicit brush configuration and retained node fields; no CSP process.',unchangedInstructionsChecked=checked,relocatedInstructionsChecked=relocated,functions=records,cases=allcases)
    (HERE/'evidence/native-vectors.json').write_text(json.dumps(result,indent=2)+'\n')
    (HERE/'evidence/native.S').write_text(assembly);(HERE/'evidence/native.c').write_text(DRIVER)
    print(json.dumps(dict(cases=len(allcases),unchanged=checked,relocated=relocated)))

if __name__=='__main__':
    try:main()
    except subprocess.CalledProcessError as error:
        print(error.stdout or '');print(error.stderr or '');raise
