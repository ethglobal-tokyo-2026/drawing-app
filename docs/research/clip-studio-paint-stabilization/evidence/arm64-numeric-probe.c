#include <math.h>
#include <stdint.h>
#include <stdio.h>

int main(void) {
  double a = 10.0, b = 0.04, c = 2.0, result;
  __asm__("fmsub %d0, %d1, %d2, %d3" : "=w"(result) : "w"(a), "w"(b), "w"(c));
  printf("FMSUB(10, 0.04, 2) = %.17g\n", result);
  double cases[] = { INFINITY, -INFINITY, NAN, 1.9, -1.9 };
  for (int i = 0; i < 5; ++i) {
    int32_t integer;
    __asm__("fcvtzs %w0, %d1" : "=r"(integer) : "w"(cases[i]));
    printf("FCVTZS(%.17g) = %d\n", cases[i], integer);
  }
  return 0;
}
