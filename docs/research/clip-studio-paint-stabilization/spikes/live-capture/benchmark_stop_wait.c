/* Standalone debugger-overhead probe; never opens or calls CSP. */
#include <pthread.h>
#include <dispatch/dispatch.h>
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

static void workqueue_job(void *unused) {
  (void)unused;
  usleep(20000);
}

int main(int argc, char **argv) {
  int workers = argc > 1 ? atoi(argv[1]) : 0;
  if (workers < -1 || workers > 32) return 2;
  dispatch_group_t jobs = workers == -1 ? dispatch_group_create() : NULL;
  for (int i = 0; i < workers; i++) {
    pthread_t thread;
    if (pthread_create(&thread, NULL, idle_worker, NULL) != 0) return 3;
    if (pthread_detach(thread) != 0) return 4;
  }
  for (uint64_t i = 0; i < 64; i++) {
    if (jobs != NULL) {
      for (int j = 0; j < 4; j++)
        dispatch_group_async_f(jobs, dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0),
                               NULL, workqueue_job);
    }
    sample_source(i);
    sample_entry(i);
    sample_exit(i);
  }
  if (jobs != NULL) {
    if (dispatch_group_wait(jobs, dispatch_time(DISPATCH_TIME_NOW, 3000000000LL)) != 0)
      return 5;
    dispatch_release(jobs);
  }
  return 0;
}
