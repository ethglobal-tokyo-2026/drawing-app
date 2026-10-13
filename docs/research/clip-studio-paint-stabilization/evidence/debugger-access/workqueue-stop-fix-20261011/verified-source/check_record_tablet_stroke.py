"""Host-only launcher tests; never attach, launch CSP, or play audio."""

import json
from pathlib import Path
import tempfile
import subprocess
import unittest

import record_tablet_stroke as launcher


class Process:
    def __init__(self, polls):
        self.polls = iter(polls)
        self.killed = False

    def poll(self):
        return next(self.polls)

    def kill(self):
        self.killed = True

    def wait(self, timeout):
        return -9


class LauncherTests(unittest.TestCase):
    def test_pid_requires_exact_executable_and_one_running_process(self):
        executable = '/research/My App.app/Contents/MacOS/Paint'
        rows = f'12 S {executable} Copy\n13 S {executable}\n'
        self.assertEqual(launcher.choose_pid(rows, executable), 13)
        for rows in ('', f'13 T {executable}', f'13 S {executable}\n14 S {executable}'):
            with self.assertRaises(RuntimeError):
                launcher.choose_pid(rows, executable)

    def test_cue_only_after_complete_marker_and_only_once(self):
        with tempfile.TemporaryDirectory() as directory:
            log = Path(directory) / 'debugger.log'
            log.write_text('Attaching...\n')
            cues = []
            ticks = iter(range(20))
            updates = iter((launcher.ACTIVE_MARKER[:20], launcher.ACTIVE_MARKER[20:], 'more'))
            def advance(_):
                with log.open('a') as target:
                    target.write(next(updates))
            result = launcher.monitor(Process([None, None, None, 0]), log,
                                      lambda: cues.append(True), clock=lambda: next(ticks),
                                      sleeper=advance)
            self.assertEqual(cues, [True])
            self.assertTrue(result['recording_cue_emitted'])

    def test_finished_process_never_gives_stale_recording_cue(self):
        with tempfile.TemporaryDirectory() as directory:
            log = Path(directory) / 'debugger.log'
            log.write_text(launcher.ACTIVE_MARKER)
            result = launcher.monitor(Process([0]), log, lambda: self.fail('stale cue'))
            self.assertFalse(result['recording_cue_emitted'])

    def test_large_log_read_does_not_hide_the_active_marker(self):
        with tempfile.TemporaryDirectory() as directory:
            log = Path(directory) / 'debugger.log'
            log.write_text(launcher.ACTIVE_MARKER + '\n' + 'x' * 20000)
            cues = []
            result = launcher.monitor(Process([None, 0]), log, lambda: cues.append(True),
                                      sleeper=lambda _: None)
            self.assertTrue(result['recording_cue_emitted'])
            self.assertEqual(cues, [True])

    def test_outer_guard_kills_debugger_and_reports_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            log = Path(directory) / 'debugger.log'
            log.write_text('')
            process = Process([None])
            ticks = iter((0, 46))
            result = launcher.monitor(process, log, lambda: self.fail('early cue'),
                                      clock=lambda: next(ticks))
            self.assertTrue(process.killed)
            self.assertTrue(result['outer_timeout'])
            self.assertEqual(result['debugger_exit_code'], -9)

    def test_capture_summary_is_required_and_capture_errors_are_retained(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'tablet.jsonl'
            self.assertFalse(launcher.capture_result(path)['fixture_complete'])
            path.write_text(json.dumps({'kind': 'capture_error', 'error': 'failed'}) + '\n' +
                            json.dumps({'kind': 'summary', 'fixture_complete': False,
                                        'stop_reason': 'incomplete'}) + '\n')
            result = launcher.capture_result(path)
            self.assertFalse(result['fixture_complete'])
            self.assertEqual(result['capture_errors'][0]['error'], 'failed')

    def test_resume_check_rejects_stopped_missing_or_different_process(self):
        executable = '/research/Paint'
        self.assertTrue(launcher.process_resumed(f'17 S {executable}', 17, executable))
        for rows in ('', f'17 T {executable}', f'17 Z {executable}', '17 S /installed/Paint'):
            self.assertFalse(launcher.process_resumed(rows, 17, executable))

    def test_recovery_warnings_survive_an_incomplete_recording(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'tablet.jsonl'
            warning = 'Continued past a verified background-thread instruction-step event.'
            path.write_text(json.dumps({'kind': 'capture_error', 'error': 'deadline'}) + '\n' +
                            json.dumps({'kind': 'summary', 'fixture_complete': False,
                                        'capture_warnings': [warning],
                                        'workqueue_step_recoveries': [{'thread_id': 123}]}) + '\n')
            result = launcher.capture_result(path)
            self.assertEqual(result.get('capture_warnings'), [warning])
            self.assertEqual(result.get('workqueue_step_recovery_count'), 1)
            self.assertFalse(result['fixture_complete'])

    def test_audio_failure_and_timeout_are_reported_and_reaped(self):
        class Audio:
            def __init__(self, exit_code, timeout=False):
                self.exit_code, self.timeout, self.killed = exit_code, timeout, False
            def wait(self, timeout):
                if self.timeout and not self.killed:
                    raise subprocess.TimeoutExpired('say', timeout)
                return self.exit_code
            def kill(self):
                self.killed = True
        failed, hanging = Audio(1), Audio(-9, True)
        result = launcher.finish_audio([('start', failed), ('stop', hanging)])
        self.assertEqual(result[0]['exit_code'], 1)
        self.assertTrue(result[0]['error'])
        self.assertTrue(result[1]['timed_out'])
        self.assertTrue(hanging.killed)


if __name__ == '__main__':
    unittest.main()
