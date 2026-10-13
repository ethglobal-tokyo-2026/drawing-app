/* Standalone new-thread stepping experiment. Never opens or calls CSP.
 * Run only with the companion's 20-second deadline and a 30-second outer limit.
 * No debug registers are written. Task debug state is sampled read-only.
 */
#include <dispatch/dispatch.h>
#include <mach/mach.h>
#include <mach/arm/thread_status.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <time.h>

volatile uint64_t samples[32];
volatile uint64_t task_step_bits[64];
volatile int task_state_results[64];
static _Atomic uint64_t entered;
static dispatch_semaphore_t release_jobs;

__attribute__((noinline)) void sample_retired(uint64_t index) {
  samples[0] = index;
}

static void save_task_state(unsigned index) {
  arm_debug_state64_t state = {0};
  mach_msg_type_number_t count = ARM_DEBUG_STATE64_COUNT;
  kern_return_t result = task_get_state(mach_task_self(), ARM_DEBUG_STATE64,
                                       (thread_state_t)&state, &count);
  task_state_results[index] = result;
  if (result == KERN_SUCCESS && count == ARM_DEBUG_STATE64_COUNT)
    task_step_bits[index] = state.__mdscr_el1;
}

static void workqueue_job(void *unused) {
  (void)unused;
  atomic_fetch_add_explicit(&entered, 1, memory_order_relaxed);
  /* The main thread releases every submitted job; the outer deadline bounds
   * the whole disposable process if debugging prevents main-thread progress. */
  dispatch_semaphore_wait(release_jobs, DISPATCH_TIME_FOREVER);
}

static void *pthread_job(void *unused) {
  (void)unused;
  atomic_fetch_add_explicit(&entered, 1, memory_order_relaxed);
  return NULL;
}

int main(int argc, char **argv) {
  if (argc != 2 || (strcmp(argv[1], "pthread") && strcmp(argv[1], "workqueue")))
    return 2;
  if (!strcmp(argv[1], "pthread")) {
    for (unsigned i = 0; i < 64; ++i) {
      save_task_state(i);
      pthread_t thread;
      int result = pthread_create(&thread, NULL, pthread_job, NULL);
      if (result) { fprintf(stderr, "pthread_create failed: %d\n", result); return 3; }
      result = pthread_join(thread, NULL);
      if (result) { fprintf(stderr, "pthread_join failed: %d\n", result); return 4; }
      samples[1] = atomic_load_explicit(&entered, memory_order_relaxed);
      sample_retired(i);
    }
    return samples[1] == 64 ? 0 : 5;
  }

  release_jobs = dispatch_semaphore_create(0);
  dispatch_group_t group = dispatch_group_create();
  dispatch_queue_t queue = dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0);
  uint64_t total = 0;
  for (unsigned wave = 0; wave < 8; ++wave) {
    unsigned count = 4 * (wave + 1);
    save_task_state(wave);
    for (unsigned i = 0; i < count; ++i)
      dispatch_group_async_f(group, queue, NULL, workqueue_job);
    /* Force a pool-expansion opportunity before releasing this wave. A bounded
     * wait avoids assuming libdispatch must supply all requested workers. */
    uint64_t wanted = total + count;
    for (unsigned turn = 0; turn < 100; ++turn) {
      if (atomic_load_explicit(&entered, memory_order_relaxed) >= wanted) break;
      struct timespec delay = {.tv_sec = 0, .tv_nsec = 1000000};
      nanosleep(&delay, NULL);
    }
    samples[2] = atomic_load_explicit(&entered, memory_order_relaxed) - total;
    for (unsigned i = 0; i < count; ++i) dispatch_semaphore_signal(release_jobs);
    if (dispatch_group_wait(group, dispatch_time(DISPATCH_TIME_NOW, 2000000000LL))) {
      fprintf(stderr, "dispatch wave %u exceeded completion deadline\n", wave);
      return 6;
    }
    total = wanted;
    samples[1] = atomic_load_explicit(&entered, memory_order_relaxed);
    sample_retired(wave);
  }
  dispatch_release(group);
  dispatch_release(release_jobs);
  return samples[1] == 144 ? 0 : 7;
}
