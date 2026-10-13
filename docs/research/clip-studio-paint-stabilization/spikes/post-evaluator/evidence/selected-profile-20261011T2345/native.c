
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
