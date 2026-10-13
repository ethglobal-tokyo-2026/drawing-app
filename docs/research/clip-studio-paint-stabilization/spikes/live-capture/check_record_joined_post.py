"""Host-only checks: no debugger, CSP launch, process inspection or attachment."""
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest

import record_joined_post as launcher


class FakeProcess:
    def __init__(self, exits):
        self.exits = iter(exits)
        self.killed = False

    def poll(self):
        return next(self.exits)

    def kill(self):
        self.killed = True

    def wait(self, timeout):
        return -9


class LauncherTests(unittest.TestCase):
    def write_capture(self, folder, rows):
        path = Path(folder) / 'joined.jsonl'
        path.write_text(''.join(json.dumps(row) + '\n' for row in rows))
        return path

    def test_complete_requires_source_pair_and_clean_detach(self):
        fields = dict(kind='summary', captureComplete=True, sourceEntryComplete=True,
                      detachedStateObserved=True, detachRequestSucceeded=True,
                      cleanupErrors=[], deadlineExceeded=False)
        with tempfile.TemporaryDirectory() as folder:
            self.assertTrue(launcher.result_from_capture(self.write_capture(folder, [fields]))['captureComplete'])
            for key in ('sourceEntryComplete', 'detachedStateObserved', 'detachRequestSucceeded'):
                altered = dict(fields, **{key: False})
                self.assertFalse(launcher.result_from_capture(self.write_capture(folder, [altered]))['captureComplete'])
            for key, value in (('cleanupErrors', ['detach failed']), ('deadlineExceeded', True)):
                altered = dict(fields, **{key: value})
                self.assertFalse(launcher.result_from_capture(self.write_capture(folder, [altered]))['captureComplete'])

    def test_errors_missing_and_duplicate_summaries_cannot_succeed(self):
        with tempfile.TemporaryDirectory() as folder:
            missing = launcher.result_from_capture(Path(folder) / 'missing.jsonl')
            self.assertFalse(missing['captureComplete'])
            for rows in ([], [{'kind': 'error', 'message': 'bad record'}],
                         [{'kind': 'summary'}, {'kind': 'summary'}]):
                result = launcher.result_from_capture(self.write_capture(folder, rows))
                self.assertFalse(result['captureComplete'])
                self.assertTrue(result['errors'])

    def test_no_early_cue_before_armed_marker(self):
        with tempfile.TemporaryDirectory() as folder, contextlib.redirect_stdout(io.StringIO()) as output:
            log = Path(folder) / 'debugger.log'
            log.write_text('process attached\n')
            process = FakeProcess([None, 0])
            cues = []
            result = launcher.wait_for_capture(process, log, clock=lambda: 0, sleeper=lambda _: None,
                                              on_armed=lambda: cues.append('armed'))
            self.assertFalse(result['armedCue'])
            self.assertEqual(output.getvalue(), '')
            self.assertFalse(process.killed)
            self.assertEqual(cues, [])

    def test_armed_cue_emits_once_after_marker(self):
        with tempfile.TemporaryDirectory() as folder, contextlib.redirect_stdout(io.StringIO()) as output:
            log = Path(folder) / 'debugger.log'
            log.write_text(launcher.ACTIVE_MARKER + '\n')
            process = FakeProcess([None, None, 0])
            cues = []
            result = launcher.wait_for_capture(process, log, clock=lambda: 0, sleeper=lambda _: None,
                                              on_armed=lambda: cues.append('armed'))
            self.assertTrue(result['armedCue'])
            self.assertEqual(output.getvalue().count('RECORDING NOW'), 1)
            self.assertEqual(cues, ['armed'])

    def test_setup_timeout_is_bounded_without_a_cue(self):
        with tempfile.TemporaryDirectory() as folder:
            log = Path(folder) / 'debugger.log'
            log.write_text('')
            clock = iter([0, 45]).__next__
            process = FakeProcess([None, None])
            result = launcher.wait_for_capture(process, log, clock=clock, sleeper=lambda _: None)
            self.assertTrue(process.killed)
            self.assertTrue(result['outerTimeout'])
            self.assertEqual(result['debuggerExitCode'], -9)
            self.assertEqual(result['timeoutPhase'], 'setup')
            self.assertFalse(result['armedCue'])

    def test_late_arming_gets_a_separate_capture_and_cleanup_window(self):
        with tempfile.TemporaryDirectory() as folder, contextlib.redirect_stdout(io.StringIO()):
            log = Path(folder) / 'debugger.log'
            log.write_text('attaching\n')
            now, sleeps, cues = [0], [0], []
            def advance(_):
                sleeps[0] += 1
                if sleeps[0] == 1:
                    now[0] = 44
                    with log.open('a') as output:
                        output.write(launcher.ACTIVE_MARKER + '\n')
                else:
                    now[0] = 74
            process = FakeProcess([None, None, None, 0])
            result = launcher.wait_for_capture(process, log, clock=lambda: now[0], sleeper=advance,
                                              on_armed=lambda: cues.append(now[0]))
            self.assertFalse(process.killed)
            self.assertFalse(result['outerTimeout'])
            self.assertIsNone(result['timeoutPhase'])
            self.assertEqual(cues, [44])

    def test_post_arm_timeout_has_its_own_finite_limit(self):
        with tempfile.TemporaryDirectory() as folder, contextlib.redirect_stdout(io.StringIO()):
            log = Path(folder) / 'debugger.log'
            log.write_text(launcher.ACTIVE_MARKER + '\n')
            now = [0]
            def advance(_):
                now[0] = 45
            process = FakeProcess([None, None, None])
            result = launcher.wait_for_capture(process, log, clock=lambda: now[0], sleeper=advance)
            self.assertTrue(process.killed)
            self.assertTrue(result['outerTimeout'])
            self.assertEqual(result['timeoutPhase'], 'recording')
            self.assertTrue(result['armedCue'])

    def test_marker_arriving_after_setup_deadline_does_not_extend_it_or_speak(self):
        with tempfile.TemporaryDirectory() as folder, contextlib.redirect_stdout(io.StringIO()) as output:
            log = Path(folder) / 'debugger.log'
            log.write_text(launcher.ACTIVE_MARKER + '\n')
            process = FakeProcess([None, None])
            clock = iter([0, 45]).__next__
            cues = []
            result = launcher.wait_for_capture(process, log, clock=clock, sleeper=lambda _: None,
                                              on_armed=lambda: cues.append('armed'))
            self.assertEqual(result['timeoutPhase'], 'setup')
            self.assertEqual(cues, [])
            self.assertEqual(output.getvalue(), '')

    def test_exit_between_poll_and_timeout_check_does_not_report_a_kill(self):
        with tempfile.TemporaryDirectory() as folder:
            log = Path(folder) / 'debugger.log'
            log.write_text('')
            process = FakeProcess([None, 0])
            clock = iter([0, 45]).__next__
            result = launcher.wait_for_capture(process, log, clock=clock, sleeper=lambda _: None)
            self.assertFalse(process.killed)
            self.assertFalse(result['outerTimeout'])
            self.assertEqual(result['debuggerExitCode'], 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
