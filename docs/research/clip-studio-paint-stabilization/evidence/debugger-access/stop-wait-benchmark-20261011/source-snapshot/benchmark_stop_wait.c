/* Standalone debugger-overhead probe; never opens or calls CSP. */
#include <pthread.h>
#include <stdint.h>
#include <stdlib.h>
#include <unistd.h>

volatile uint64_t samples[32];

__attribute__((noinline)) void sample_source(uint64_t i) { samples[0] = i; }
__attribute__((noinline)) void sample_entry(uint64_t i) { samples[1] = i; }
__attribute__((noinline)) void sample_exit(uint64_t i) { samples[2] = i; }

static void *idle_worker(void *unused) {
  (void)unused;
  for (;;) usleep(10000);
  return NULL;
}

int main(int argc, char **argv) {
  int workers = argc > 1 ? atoi(argv[1]) : 0;
  if (workers < 0 || workers > 32) return 2;
  for (int i = 0; i < workers; i++) {
    pthread_t thread;
    if (pthread_create(&thread, NULL, idle_worker, NULL) != 0) return 3;
    if (pthread_detach(thread) != 0) return 4;
  }
  for (uint64_t i = 0; i < 64; i++) {
    sample_source(i);
    sample_entry(i);
    sample_exit(i);
  }
  return 0;
}
