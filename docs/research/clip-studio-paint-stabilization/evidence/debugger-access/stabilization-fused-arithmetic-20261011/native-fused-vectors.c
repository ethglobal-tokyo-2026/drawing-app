/* Standalone instruction checks; never opens or attaches to CSP. */
#include <inttypes.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

static double multiply(double a, double b) {
  double out;
  __asm__("fmul %d0, %d1, %d2" : "=w"(out) : "w"(a), "w"(b));
  return out;
}
static double fused(double a, double b, double c) {
  double out;
  __asm__("fmadd %d0, %d1, %d2, %d3" : "=w"(out) : "w"(a), "w"(b), "w"(c));
  return out;
}
static double subtract_product(double a, double b, double c) {
  double out;
  __asm__("fmsub %d0, %d1, %d2, %d3" : "=w"(out) : "w"(a), "w"(b), "w"(c));
  return out;
}
static uint64_t bits(double value) {
  uint64_t out;
  memcpy(&out, &value, sizeof(out));
  return out;
}
int main(void) {
  double square = fused(0.35103995166245305, 0.35103995166245305,
                        multiply(0.1360045479411855, 0.1360045479411855));
  double distance;
  __asm__("fsqrt %d0, %d1" : "=w"(distance) : "w"(square));
  double threshold = subtract_product(18.01346802553044, .04,
                                     subtract_product(1, .04, 2));
  double dot = fused(1 + 0x1p-27, 1 - 0x1p-27, multiply(1, -1));
  double a = 0.8870876118464046, b = 0.8272999826832926;
  double current = fused(a, a, multiply(b, b));
  double previous = fused(b, b, multiply(a, a));
  double x = 0.755862390026055, y = 0.7991696233758715;
  double length = sqrt(fused(x, x, multiply(y, y)));
  double dx = x + 1e-8, dy = y + 1e-8;
  double diagonal = sqrt(fused(dx, dx, multiply(dy, dy)));
  double candidate = multiply(multiply(20, 2.5 - length), diagonal / length);
  int32_t integer_candidate, integer_zero;
  double negative_fraction = -.5;
  __asm__("fcvtzs %w0, %d1" : "=r"(integer_candidate) : "w"(candidate));
  __asm__("fcvtzs %w0, %d1" : "=r"(integer_zero) : "w"(negative_fraction));
  double overflow_distance = fused(0, 0, multiply(1e200, 1e200));
  double negative_infinite_addend = fused(1e308, 2, -INFINITY);
  double positive_infinite_addend = fused(-1e308, 2, INFINITY);
  double invalid_product = fused(INFINITY, 0, 1);
  printf("{\"distance\":\"%016" PRIx64 "\",\"threshold\":\"%016" PRIx64
         "\",\"dot\":\"%016" PRIx64 "\",\"currentSquared\":\"%016" PRIx64
         "\",\"previousSquared\":\"%016" PRIx64
         "\",\"slowCandidate\":%d,\"integerZero\":%d,\"overflowDistance\":\"%016" PRIx64
         "\",\"negativeInfiniteAddend\":\"%016" PRIx64
         "\",\"positiveInfiniteAddend\":\"%016" PRIx64 "\",\"invalidProductIsNaN\":%s}\n",
         bits(distance), bits(threshold), bits(dot), bits(current), bits(previous),
         integer_candidate, integer_zero, bits(overflow_distance),
         bits(negative_infinite_addend), bits(positive_infinite_addend),
         isnan(invalid_product) ? "true" : "false");
  return !(bits(distance) == UINT64_C(0x3fd81802d1cdd2e1) &&
           bits(threshold) == UINT64_C(0x3ff3d4d5599df48b) && dot < 0 && current < previous &&
           integer_candidate == 28 && integer_zero == 0 && overflow_distance == INFINITY &&
           negative_infinite_addend == -INFINITY && positive_infinite_addend == INFINITY &&
           isnan(invalid_product));
}
