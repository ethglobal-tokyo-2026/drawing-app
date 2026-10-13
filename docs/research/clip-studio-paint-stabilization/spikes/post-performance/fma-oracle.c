#include <stdint.h>
#include <stdio.h>
#include <inttypes.h>

/* Standalone arithmetic only: no application attachment or process inspection. */
int main(void) {
  union { uint64_t u; double d; } a, b, c, result;
  while (scanf("%" SCNx64 " %" SCNx64 " %" SCNx64, &a.u, &b.u, &c.u) == 3) {
    __asm__("fmadd %d0, %d1, %d2, %d3" : "=w"(result.d) : "w"(a.d), "w"(b.d), "w"(c.d));
    printf("%016" PRIx64 "\n", result.u);
  }
  return ferror(stdin) || ferror(stdout);
}
