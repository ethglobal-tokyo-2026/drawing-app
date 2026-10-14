"""Synthetic watchdog cleanup checks; no native app, debugger, or signals.

The real Capture cleanup and watchdog callback run against synthetic process
objects. Real timers exercise an interrupt that has already started and one
that is still waiting; timeout and join failures remain explicit.
"""

import io
from pathlib import Path
import sys
import threading
import time
from types import SimpleNamespace
import unittest


class Listener:
    def GetNextEventForBroadcasterWithType(self, broadcaster, mask, event):
        return False


sys.modules['lldb'] = SimpleNamespace(
    SBListener=lambda name: Listener(), SBEvent=SimpleNamespace,
    SBProcess=SimpleNamespace(eBroadcastBitStateChanged=1),
    eStateInvalid=0, eStateStopped=5, eStateRunning=6, eStateDetached=9,
    eStateExited=10,
)
sys.path.insert(0, str(Path(__file__).resolve().parent))
import capture_live_contract as capture


class Process:
    def __init__(self):
        self.state = 5
        self.interrupt_started = threading.Event()
        self.interrupt_release = threading.Event()
        self.interrupt_finished = threading.Event()
        self.cleanup_calls = []

    def IsValid(self):
        return True

    def SendAsyncInterrupt(self):
        self.interrupt_started.set()
        if not self.interrupt_release.wait(5):
            raise AssertionError('Synthetic interrupt was not released within five seconds')
        self.interrupt_finished.set()

    def assert_watchdog_finished(self):
        if self.interrupt_started.is_set() and not self.interrupt_finished.is_set():
            raise AssertionError('Process cleanup overlapped the active watchdog interrupt')

    def GetState(self):
        self.assert_watchdog_finished()
        self.cleanup_calls.append('state')
        return self.state

    def GetUniqueID(self):
        return 111

    def GetBroadcaster(self):
        return 'synthetic-process'

    def Detach(self, keep_stopped):
        self.assert_watchdog_finished()
        if keep_stopped is not False:
            raise AssertionError('Cleanup requested a stopped detach')
        self.cleanup_calls.append('detach')
        self.state = 9
        return SimpleNamespace(Success=lambda: True, GetCString=lambda: None)


class Target:
    def __init__(self, process):
        self.process = process
        self.deleted = []

    def IsValid(self):
        return True

    def BreakpointDelete(self, number):
        self.process.assert_watchdog_finished()
        self.deleted.append(number)
        return True


class ObservedTimer(threading.Timer):
    def __init__(self, interval, callback):
        super().__init__(interval, callback)
        self.join_started = threading.Event()

    def join(self, timeout=None):
        self.join_started.set()
        return super().join(timeout)


class HangingTimer:
    ident = 1

    def __init__(self, join_error=None):
        self.join_error = join_error
        self.timeout = None

    def cancel(self):
        pass

    def join(self, timeout=None):
        self.timeout = timeout
        if self.join_error:
            raise self.join_error

    def is_alive(self):
        return True


def observer():
    result = capture.Capture(None, 1, io.StringIO(), 30, 1)
    result.process = Process()
    result.target = Target(result.process)
    result.owned_breakpoints = [7, 9]
    return result


class WatchdogCleanupChecks(unittest.TestCase):
    def assert_detached_cleanly(self, result):
        self.assertEqual(result.cleanup_errors, [])
        self.assertIsNone(result.watchdog_error)
        self.assertTrue(result.detach_request_succeeded)
        self.assertTrue(result.detached_state_observed)
        self.assertEqual(result.target.deleted, [7, 9])
        self.assertIn('detach', result.process.cleanup_calls)

    def test_cleanup_waits_for_an_interrupt_that_already_started(self):
        result = observer()
        result.timer = ObservedTimer(0, result.expire)
        result.timer.start()
        cleanup = threading.Thread(target=result.cleanup)
        try:
            self.assertTrue(result.process.interrupt_started.wait(1))
            cleanup.start()
            self.assertTrue(result.timer.join_started.wait(1),
                            'Cleanup did not wait for the active watchdog callback')
            self.assertEqual(result.process.cleanup_calls, [])
            self.assertEqual(result.target.deleted, [])
        finally:
            result.process.interrupt_release.set()
            if cleanup.ident is not None:
                cleanup.join(1)
            result.timer.join(1)
        self.assertFalse(cleanup.is_alive())
        self.assertFalse(result.timer.is_alive())
        self.assertTrue(result.process.interrupt_finished.is_set())
        self.assert_detached_cleanly(result)

    def test_cleanup_does_not_join_an_unstarted_timer(self):
        result = observer()
        result.cleanup()
        self.assert_detached_cleanly(result)
        self.assertFalse(result.process.interrupt_started.is_set())

    def test_cleanup_cancels_a_waiting_timer_without_interrupting(self):
        result = observer()
        result.timer.start()
        result.cleanup()
        self.assertFalse(result.timer.is_alive())
        self.assertFalse(result.process.interrupt_started.is_set())
        self.assert_detached_cleanly(result)

    def test_watchdog_timeout_is_reported_and_cleanup_still_attempts_detach(self):
        result = observer()
        result.timer = HangingTimer()
        result.hard_deadline = time.monotonic() - 1
        result.cleanup()
        self.assertEqual(result.timer.timeout, 0)
        self.assertEqual(len(result.cleanup_errors), 1)
        self.assertIn('Watchdog', result.cleanup_errors[0])
        self.assertEqual(result.target.deleted, [7, 9])
        self.assertTrue(result.detach_request_succeeded)

    def test_watchdog_join_failure_is_reported_and_cleanup_still_attempts_detach(self):
        result = observer()
        result.timer = HangingTimer(RuntimeError('Synthetic join failure'))
        result.hard_deadline = time.monotonic() + 0.2
        result.cleanup()
        self.assertIsNotNone(result.timer.timeout, 'Started watchdog was not joined')
        self.assertGreaterEqual(result.timer.timeout, 0)
        self.assertLessEqual(result.timer.timeout, 0.2)
        self.assertEqual(len(result.cleanup_errors), 1)
        self.assertIn('Synthetic join failure', result.cleanup_errors[0])
        self.assertEqual(result.target.deleted, [7, 9])
        self.assertTrue(result.detach_request_succeeded)


if __name__ == '__main__':
    unittest.main(verbosity=2)
