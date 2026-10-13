
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
typedef struct { double x,y; } Point;
#define COORDS double,double,double,double,double,double,double,double,double,double,double,double
#define VALUES p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],p[8],p[9],p[10],p[11]
extern Point csp_eval(COORDS,double);
extern double csp_measure(COORDS);
extern void csp_neighbor(const Point*,const Point*,Point*);
extern int csp_sample(Point*,COORDS,double,double,double);
#define QUADRATIC double,double,double,double,double,double
#define QVALUES p[0],p[1],p[2],p[3],p[4],p[5]
#define BVALUES p[0],p[1],p[2],p[3],0.0,0.0,p[4],p[5]
extern Point csp_quadratic_eval(QUADRATIC,double);
extern void csp_quadratic_split(Point*,Point*,Point*,QUADRATIC,double);
extern double csp_quadratic_length(int,QUADRATIC);
extern double csp_bezier_measure(int,double,double,double,double,double,double,double,double);
extern double csp_bezier_sampled_length(int,int,double,double,double,double,double,double,double,double);
static void bits(double x) { uint64_t b; memcpy(&b,&x,8); printf(" %016" PRIx64,b); }
int main(void) {
    uint64_t fpcr; __asm__ volatile("mrs %0, fpcr" : "=r"(fpcr));
    printf("FPCR %016" PRIx64 "\n", fpcr);
    char mode;
    while (scanf(" %c",&mode)==1) {
        int count=mode=='E'?13:mode=='M'?12:mode=='N'||mode=='B'?6:mode=='S'?15:
                  mode=='Q'||mode=='D'||mode=='L'||mode=='G'?7:0;
        if (!count) return 2;
        double p[15];
        for (int i=0;i<count;i++) if (scanf("%la",&p[i])!=1) return 3;
        printf("%c",mode);
        if (mode=='E') { Point q=csp_eval(VALUES,p[12]); bits(q.x);bits(q.y); }
        if (mode=='M') bits(csp_measure(VALUES));
        if (mode=='N') {
            Point a={p[0],p[1]},b={p[2],p[3]},q={p[4],p[5]};
            csp_neighbor(&a,&b,&q);bits(q.x);bits(q.y);
        }
        if (mode=='S') {
            Point out[256]; int n=csp_sample(out,VALUES,p[12],p[13],p[14]);
            if (n<5 || n>256) return 4;
            printf(" %d",n);
            for(int i=0;i<n;i++){bits(out[i].x);bits(out[i].y);}
        }
        if (mode=='Q') { Point q=csp_quadratic_eval(QVALUES,p[6]);bits(q.x);bits(q.y); }
        if (mode=='D') {
            Point a,b,c;csp_quadratic_split(&a,&b,&c,QVALUES,p[6]);
            bits(a.x);bits(a.y);bits(b.x);bits(b.y);bits(c.x);bits(c.y);
        }
        if (mode=='L') bits(csp_quadratic_length((int)p[6],QVALUES));
        if (mode=='B') bits(csp_bezier_measure(0,BVALUES));
        if (mode=='G') bits(csp_bezier_sampled_length(0,(int)p[6],BVALUES));
        puts("");
    }
    return ferror(stdin)?5:0;
}
