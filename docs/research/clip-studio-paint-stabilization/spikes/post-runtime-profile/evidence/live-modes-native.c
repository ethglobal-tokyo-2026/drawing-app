
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
