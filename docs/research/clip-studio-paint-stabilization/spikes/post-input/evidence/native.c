
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
