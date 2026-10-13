
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
