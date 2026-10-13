"""Bounded standalone original-instruction checks for source input arithmetic.

No CSP process. Container allocation and external state getters use documented
harness callbacks; every extracted arithmetic instruction is byte-checked.
"""
import contextlib
import hashlib
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
sys.path.insert(0, str(HERE.parent / "live-contract"))
import inspect_binary as binary

spec = importlib.util.spec_from_file_location("spline_oracle", HERE.parent / "post-spline/native_oracle.py")
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
FUNCTIONS = {
    0x1028F2344: "csp_init", 0x1028F25B0: "csp_update",
    0x102193618: "csp_distance", 0x10288CD3C: "csp_record", 0x102217E30: "csp_lookup",
}
EXTERNAL = {
    0x102194E64: "csp_platform", 0x1028F252C: "csp_append",
    0x102786D30: "csp_container_maintenance", 0x103BDD34C: "csp_unexpected_free",
    0x102992EB8: "csp_reflect360", 0x102992F64: "csp_reflect180",
    0x10001022C: "csp_release", 0x103BDA970: "csp_unexpected_throw",
}

DRIVER = r'''
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef struct {double x,y;} Point;
extern void csp_init(void*,int,int,int,int64_t,double,double,double,double,double);
extern double csp_update(void*,int64_t,double,double);
extern void csp_record(void*,Point*,int,int,int,int,void*,void*,double,double);
static int platform_code, reflection360, reflection180;
int csp_platform(void){return platform_code;}
int csp_reflect360(void*p){return reflection360;}
int csp_reflect180(void*p){return reflection180;}
void csp_release(void*p){}
void csp_unexpected_free(void*p){abort();}
void csp_unexpected_throw(void*p){abort();}
void csp_container_maintenance(void*p,int n){}
static int64_t storage[8192];
static int64_t *blocks[16];
void csp_append(void*p,int64_t*v){
    // Native deque header at object+0x18: blocks+8, start+0x20, count+0x28.
    unsigned char*d=p;uint64_t start,count;memcpy(&start,d+0x20,8);memcpy(&count,d+0x28,8);
    if(start+count>=8192)abort();
    storage[start+count]=*v;count++;memcpy(d+0x28,&count,8);
}
static void set32(void*p,int offset,int v){memcpy((char*)p+offset,&v,4);}
static void set64(void*p,int offset,uint64_t v){memcpy((char*)p+offset,&v,8);}
static void setd(void*p,int offset,double v){memcpy((char*)p+offset,&v,8);}
static void bits(void*p,int offset){uint64_t b;memcpy(&b,(char*)p+offset,8);printf(" %016" PRIx64,b);}
static void number(void*p,int offset){int n;memcpy(&n,(char*)p+offset,4);printf(" %d",n);}
static void snapshot(void*p){
    number(p,8);bits(p,0x10);number(p,0x48);number(p,0x4c);bits(p,0x50);
    number(p,0x58);number(p,0x5c);
    for(int o=0x68;o<=0x88;o+=8)bits(p,o);
    uint64_t start,count;memcpy(&start,(char*)p+0x38,8);memcpy(&count,(char*)p+0x40,8);
    printf(" %" PRIu64,count);
    for(uint64_t n=0;n<count;n++)printf(" %016" PRIx64,(uint64_t)storage[start+n]);
}
int main(void){
    uint64_t fpcr;__asm__ volatile("mrs %0, fpcr":"=r"(fpcr));printf("FPCR %016" PRIx64 "\n",fpcr);
    unsigned char state[0x90]={0};char mode;
    for(int i=0;i<16;i++)blocks[i]=storage+512*i;
    while(scanf(" %c",&mode)==1){
        printf("%c",mode);
        if(mode=='I'){
            int enabled,type,window;int64_t timestamp;double d0,d1,d2,x,y;
            if(scanf("%d%d%d%d%" SCNd64 "%la%la%la%la%la",&enabled,&type,&window,&platform_code,&timestamp,&d0,&d1,&d2,&x,&y)!=10)return 2;
            memset(state,0,sizeof state);memset(storage,0,sizeof storage);
            setd(state,0x10,1);set64(state,0x20,(uint64_t)blocks);set64(state,0x28,(uint64_t)(blocks+1));
            csp_init(state,enabled,type,window,timestamp,d0,d1,d2,x,y);snapshot(state);
        }else if(mode=='U'){
            int reuse;int64_t timestamp;double x,y;
            if(scanf("%d%" SCNd64 "%la%la",&reuse,&timestamp,&x,&y)!=4)return 3;
            set32(state,0x60,reuse);csp_update(state,timestamp,x,y);snapshot(state);
        }else if(mode=='R'){
            unsigned char brush[0x200]={0},out[0x58]={0};void*external[2]={0};Point p;
            double pressure,position;int tilt,bearing,rotation,offsetx,offsety,startup,angle;
            if(scanf("%la%la%la%d%d%d%la%d%d%d%d%d%d",&p.x,&p.y,&pressure,&tilt,&bearing,&rotation,&position,&startup,&offsetx,&offsety,&angle,&reflection360,&reflection180)!=13)return 4;
            set32(brush,0x128,offsetx);set32(brush,0x12c,offsety);set32(brush,0x190,startup);
            set32(brush,0x148,angle==1);set32(brush,0x14c,angle==2);
            csp_record(brush,&p,tilt,bearing,rotation,123,external,out,pressure,position);
            for(int o=0;o<=0x50;o+=8)bits(out,o);
        }else return 5;
        puts("");
    }
    return 0;
}
'''

def branch_target(word, pc):
    if word & 0x7E000000 == 0x34000000:
        return pc+(helper.signed((word >> 5)&0x7FFFF,19)<<2), 0xFF00001F
    if word & 0x7E000000 == 0x36000000:
        return pc+(helper.signed((word >> 5)&0x3FFF,14)<<2), 0xFFF8001F
    return helper.branch_target(word,pc)

def main():
    if helper.sha(binary.DATA)!=helper.IMAGE_SHA:raise ValueError("Pinned source image differs")
    assembly=[".text"];records=[];constants={};targets={**FUNCTIONS,**EXTERNAL}
    for start,name in FUNCTIONS.items():
        _,end=binary.func(start);out=io.StringIO()
        with contextlib.redirect_stdout(out):binary.disasm(start,end)
        rows=[]
        for line in out.getvalue().splitlines():
            m=re.match(r"([0-9a-f]+):\s+(.*)",line)
            if m:rows.append((int(m[1],16),m[2].split(';')[0].split(' STRING ')[0].strip()))
        relocations={};replacements={};assembly += [".p2align 2",f".globl _{name}",f"_{name}:"]
        for index,(pc,instruction) in enumerate(rows):
            assembly.append(f"L{pc:x}:")
            if instruction.startswith('adrp'):
                m=re.fullmatch(r"adrp\s+(x\d+), (0x[0-9a-f]+)",instruction)
                nextpc,nextinstruction=rows[index+1]
                load=re.fullmatch(r"ldr\s+([qd]\d+), \["+m[1]+r", #(0x[0-9a-f]+)\]",nextinstruction)
                add=re.fullmatch(r"add\s+(x\d+), "+m[1]+r", #(0x[0-9a-f]+)",nextinstruction)
                if load:size=16 if load[1][0]=='q' else 8;address=int(m[2],16)+int(load[2],16)
                elif add:size=91*8;address=int(m[2],16)+int(add[2],16)
                else:raise ValueError(nextinstruction)
                constants[address]=binary.DATA[binary.offset(address):binary.offset(address)+size]
                instruction=f"adrp {m[1]}, Lconstant{address:x}@PAGE"
                replacements[nextpc]=(f"ldr {load[1]}, [{m[1]}, Lconstant{address:x}@PAGEOFF]" if load else f"add {add[1]}, {m[1]}, Lconstant{address:x}@PAGEOFF")
                relocations[pc]={'kind':'page','address':address,'size':size,'pair':'load' if load else 'add'}
                relocations[nextpc]={'kind':'offset'}
            elif pc in replacements:instruction=replacements[pc]
            elif re.match(r"(?:b(?:l|\.[a-z]+)?|cbnz|cbz|tbnz|tbz)\s",instruction):
                match=re.search(r"0x[0-9a-f]+$",instruction);address=int(match[0],16)
                if address not in targets and not start<=address<end:raise ValueError(instruction)
                target=f"_{targets[address]}" if address in targets else f"L{address:x}"
                instruction=instruction[:match.start()]+target
                relocations[pc]={'kind':'branch','target':address}
            assembly.append('    '+instruction)
        records.append({'start':start,'end':end,'name':name,'relocations':relocations,
                        'sha256':helper.sha(binary.DATA[binary.offset(start):binary.offset(start)+end-start])})
    assembly.append('.section __TEXT,__const')
    for address,data in constants.items():assembly += ['.p2align 4',f'Lconstant{address:x}:','.byte '+','.join(map(str,data))]
    assembly='\n'.join(assembly)+'\n'
    rng=random.Random(0x1028f25b0);cases=[];inputs=[]
    for case_index in range(180):
        enabled=case_index%3!=0;device=[1,2,4][case_index%3];window=[0,1,3,4,5,20,100][case_index%7]
        platform=[1,2,3,4,7][case_index%5];timestamp=0 if case_index%11==0 else 100
        d0=[0,1e-8,0.125,1,2.25][case_index%5];d1=[0,0.5,1,1.234][case_index%4];d2=[1,0.01,2][case_index%3]
        config=dict(enabled=enabled,deviceType=device,window=window,platform=platform,magnificationFraction=d0,coordinateFactor=d1,documentRatio=d2)
        x=rng.random()*20;y=rng.random()*20
        cases.append({'mode':'I','config':config,'point':{'x':x,'y':y},'timestamp':str(timestamp)})
        inputs.append(f'I {int(enabled)} {device} {window} {platform} {timestamp} '+ ' '.join(float(v).hex() for v in [d0,d1,d2,x,y]))
        for j in range(32):
            timestamp += [0,1,2,-1,8,20][j%6];x+=rng.uniform(-5,5);y+=rng.uniform(-5,5);reuse=j%13==12
            cases.append({'mode':'U','point':{'x':x,'y':y},'timestamp':str(timestamp),'reuse':reuse})
            inputs.append(f'U {int(reuse)} {timestamp} {x.hex()} {y.hex()}')
    for j in range(300):
        packet=dict(point={'x':rng.uniform(-100,100),'y':rng.uniform(-100,100)},pressure=[0,0.5,1,1.1][j%4],tiltDegrees=j%91,bearingDegrees=j%361,rotationDegrees=j%181,movement=0,sourceIndex=j,startupPosition=(j%13)/3,startupLength=[0,1,5][j%3],offset={'x':-j,'y':j},angleSource=['none','bearing','rotation'][j%3],reflect360=j%2==0,reflect180=j%5==0)
        cases.append({'mode':'R','packet':packet})
        p=packet;inputs.append('R '+' '.join([p['point']['x'].hex(),p['point']['y'].hex(),float(p['pressure']).hex(),str(p['tiltDegrees']),str(p['bearingDegrees']),str(p['rotationDegrees']),float(p['startupPosition']).hex(),str(p['startupLength']),str(p['offset']['x']),str(p['offset']['y']),str(j%3),str(int(p['reflect360'])),str(int(p['reflect180']))]))
    unchanged=relocated=0
    with tempfile.TemporaryDirectory(prefix='csp-post-input-') as temporary:
        build=Path(temporary);(build/'oracle.S').write_text(assembly);(build/'driver.c').write_text(DRIVER)
        subprocess.run(['clang','-arch','arm64','-O0','-ffp-contract=off',str(build/'oracle.S'),str(build/'driver.c'),'-o',str(build/'oracle')],check=True,capture_output=True,timeout=60)
        executable=(build/'oracle').read_bytes();nm=subprocess.check_output(['nm','-n',str(build/'oracle')],text=True,timeout=15)
        symbols={m[2]:int(m[1],16) for m in re.finditer(r'^([0-9a-f]+) \S (_csp_\w+)$',nm,re.M)}
        for record in records:
            start=record['start'];output=symbols['_'+record['name']]
            for delta in range(0,record['end']-start,4):
                pc=start+delta;original=struct.unpack_from('<I',binary.DATA,binary.offset(pc))[0];emitted=struct.unpack_from('<I',executable,helper.macho_offset(executable,output+delta))[0]
                relocation=record['relocations'].get(pc)
                if not relocation:
                    if original!=emitted:raise ValueError(f'Instruction changed at {pc:x}')
                    unchanged+=1;continue
                kind=relocation['kind']
                if kind=='branch':
                    destination,mask=branch_target(original,pc);actual,actualmask=branch_target(emitted,output+delta)
                    expected=symbols['_'+targets[destination]] if destination in targets else output+destination-start
                    if mask!=actualmask or original&mask!=emitted&mask or actual!=expected:raise ValueError(f'Branch differs at {pc:x}')
                elif kind=='offset':
                    if original&~(4095<<10)!=emitted&~(4095<<10):raise ValueError(f'Offset opcode differs at {pc:x}')
                elif kind=='page':
                    if original&0x9F00001F!=emitted&0x9F00001F:raise ValueError(f'Page opcode differs at {pc:x}')
                    pair=struct.unpack_from('<I',executable,helper.macho_offset(executable,output+delta+4))[0]
                    scale=relocation['size'] if relocation['pair']=='load' else 1
                    actual=helper.page_target(emitted,output+delta)+((pair>>10)&4095)*scale
                    off=helper.macho_offset(executable,actual);data=constants[relocation['address']]
                    if executable[off:off+len(data)]!=data:raise ValueError(f'Constant bytes differ at {pc:x}')
                relocated+=1
        run=subprocess.run([str(build/'oracle')],input='\n'.join(inputs)+'\n',text=True,capture_output=True,check=True,timeout=30)
    lines=run.stdout.splitlines()
    if lines.pop(0)!='FPCR 0000000000000000' or len(lines)!=len(cases):raise ValueError('FPCR/case count differs')
    for case,line in zip(cases,lines):
        tokens=line.split()
        if tokens.pop(0)!=case['mode']:raise ValueError('Case order differs')
        case['native']=tokens
    result={'schema':'csp-post-input-native/v1','image_sha256':helper.IMAGE_SHA,'fpcr':'0x0','unchangedInstructions':unchanged,'relocatedInstructions':relocated,'functions':records,'externalHarnessFunctions':{hex(k):v for k,v in EXTERNAL.items()},'assembly_sha256':helper.sha(assembly.encode()),'driver_sha256':helper.sha(DRIVER.encode()),'cases':cases}
    out=HERE/'evidence';out.mkdir(exist_ok=True)
    (out/'native.json').write_text(json.dumps(result,indent=2)+'\n');(out/'native.S').write_text(assembly);(out/'native.c').write_text(DRIVER)
    print(json.dumps({'cases':len(cases),'unchangedInstructions':unchanged,'relocatedInstructions':relocated}))

if __name__=='__main__':
    try:main()
    except subprocess.CalledProcessError as error:
        print(error.stdout or '',file=sys.stderr);print(error.stderr or '',file=sys.stderr);raise
