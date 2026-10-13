
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
typedef struct { double x,y; } Point;
extern double sample_distance(const Point*,int,const Point*);
extern double sample_parameter(const Point*,int,const Point*,Point*);
extern int quadratic_samples(Point*,double,double,double,double,double,double,double,double,double);
static void bits(double x) { uint64_t b; memcpy(&b,&x,8); printf(" %016" PRIx64,b); }
int main(void) {
  uint64_t fpcr; __asm__ volatile("mrs %0, fpcr" : "=r"(fpcr));
  printf("FPCR %016" PRIx64 "\n",fpcr);
  char mode; int n;
  while(scanf(" %c %d",&mode,&n)==2) {
    if(n<0 || n>514) return 2;
    double p[514]; for(int i=0;i<n;i++) if(scanf("%la",&p[i])!=1) return 3;
    printf("%c",mode);
    if(mode=='S') {
      if(n!=9) return 4;
      Point out[256]; int count=quadratic_samples(out,p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],p[8]);
      if(count<5 || count>256) return 5;
      printf(" %d",count); for(int i=0;i<count;i++){bits(out[i].x);bits(out[i].y);}
    } else if(mode=='D' || mode=='P') {
      if(n<2 || n%2) return 6;
      int count=(n-2)/2; Point query={p[n-2],p[n-1]}, projected;
      if(mode=='P' && count==0) return 7;
      bits(mode=='D' ? sample_distance((Point*)p,count,&query) : sample_parameter((Point*)p,count,&query,&projected));
    } else return 8;
    puts("");
  }
  return ferror(stdin)?9:0;
}
