"""Pure launcher result checks; no native app or debugger actions."""

import copy
import unittest

import record_fill


def complete_rows():
    return [
        {'kind': 'header', 'schema': 'csp-fill-capture/v1'},
        {'kind': 'instruction_verified', 'size': 2348},
        {'kind': 'capture_started', 'breakpointIds': [1, 2, 3]},
        *[{'kind': 'boundary', 'callId': '1', 'phase': phase,
           'snapshot': {'complete': True}} for phase in ('entry', 'initial', 'return')],
        {'kind': 'summary', 'captureComplete': True, 'requestedCalls': 1,
         'entries': 1, 'pairs': 1, 'unmatchedEntries': 0,
         'detachRequestSucceeded': True, 'detachedStateObserved': True,
         'cleanupErrors': [], 'watchdogError': None, 'deadlineExceeded': False,
         'captureErrors': [], 'allFillsSucceeded': True},
    ]


class LauncherResultChecks(unittest.TestCase):
    def test_actual_full_call_is_accepted(self):
        result = record_fill.classify_capture_rows(complete_rows(), preflight=False)
        self.assertTrue(result['captureComplete'])
        self.assertFalse(result['preflightVerified'])
        self.assertEqual(result['errors'], [])

    def test_missing_or_duplicate_boundaries_are_rejected(self):
        for missing in (3, 4, 5):
            rows = complete_rows()
            del rows[missing]
            self.assertFalse(record_fill.classify_capture_rows(rows, False)['captureComplete'])
        rows = complete_rows()
        rows.insert(5, copy.deepcopy(rows[4]))
        self.assertFalse(record_fill.classify_capture_rows(rows, False)['captureComplete'])

    def test_duplicate_summary_is_rejected(self):
        rows = complete_rows()
        rows.append(copy.deepcopy(rows[-1]))
        self.assertFalse(record_fill.classify_capture_rows(rows, False)['captureComplete'])

    def test_saved_capture_error_prevents_success(self):
        rows = complete_rows()
        rows.insert(-1, {'kind': 'error', 'message': 'Bitmap read failed'})
        self.assertFalse(record_fill.classify_capture_rows(rows, False)['captureComplete'])

    def test_expected_no_input_timeout_with_clean_detach_verifies_preflight(self):
        rows = complete_rows()[:3]
        summary = complete_rows()[-1]
        summary.update(captureComplete=False, entries=0, pairs=0,
                       captureErrors=['CaptureError: capture_deadline_reached'],
                       stopReason='CaptureError: capture_deadline_reached', allFillsSucceeded=False)
        rows.extend([{'kind': 'error', 'message': 'CaptureError: capture_deadline_reached'}, summary])
        result = record_fill.classify_capture_rows(rows, preflight=True)
        self.assertTrue(result['preflightVerified'])
        self.assertFalse(result['captureComplete'])
        self.assertEqual(result['errors'], [])
        rows[2]['breakpointIds'] = [1, 2]
        self.assertFalse(record_fill.classify_capture_rows(rows, True)['preflightVerified'])

    def test_preflight_cannot_accept_real_input(self):
        self.assertFalse(record_fill.classify_capture_rows(complete_rows(), True)['preflightVerified'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
