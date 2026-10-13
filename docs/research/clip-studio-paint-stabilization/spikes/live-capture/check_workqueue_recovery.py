"""Host-only recorder recovery checks; no native process is created or attached."""

import io
import json
import struct
import unittest
from types import SimpleNamespace as NS

import capture_live_contract as shared
import capture_tablet_stroke as tablet


def module(path='/usr/lib/system/libsystem_pthread.dylib', uuid='SYSTEM-UUID'):
    directory, name = path.rsplit('/', 1)
    return NS(IsValid=lambda: True, GetUUIDString=lambda: uuid,
              GetFileSpec=lambda: NS(GetDirectory=lambda: directory, GetFilename=lambda: name))


def address(pc, library, name, start):
    return NS(IsValid=lambda: True, GetLoadAddress=lambda target: pc,
              GetModule=lambda: library,
              GetSymbol=lambda: NS(IsValid=lambda: True, GetName=lambda: name,
                                   GetStartAddress=lambda: NS(GetLoadAddress=lambda target: start)))


def thread(tid, reason, data, pc, library=None, name='start_wqthread', start=0x1000):
    library = library or module()
    frame = NS(GetPC=lambda: pc, GetPCAddress=lambda: address(pc, library, name, start))
    return NS(GetThreadID=lambda: tid, GetStopReason=lambda: reason,
              GetStopReasonDataCount=lambda: len(data), GetStopReasonDataAtIndex=lambda i: data[i],
              GetFrameAtIndex=lambda i: frame)


def owned(tid=1, breakpoint_id=1, pc=shared.ENTRY):
    return thread(tid, shared.lldb.eStopReasonBreakpoint, [breakpoint_id, 1], pc)


def secondary(tid=2, **kwargs):
    return thread(tid, kwargs.pop('reason', shared.lldb.eStopReasonException),
                  kwargs.pop('data', [6, 1, 0]), kwargs.pop('pc', 0x1004), **kwargs)


class HostTabletLoop(tablet.TabletCapture):
    def __init__(self, stops):
        super().__init__(None, 1, io.StringIO(), 30, 512)
        self.stops, self.stop_id, self.current = list(stops), 10, []
        self.delivered, self.continues = [], 0
        self.library = module()
        # BL at 0x1004 reaches 0x2000; the next instruction is BRK #1.
        self.code = struct.pack('<II', 0x940003ff, 0xd4200020)
        self.target = NS(ResolveLoadAddress=lambda pc: address(
            pc, self.library, '_pthread_wqthread', 0x2000),
            FindBreakpointByID=lambda bid: NS(IsValid=lambda: True, IsHardware=lambda: True,
                FindLocationByID=lambda lid: NS(IsValid=lambda: lid == 1,
                    GetAddress=lambda: NS(GetLoadAddress=lambda target: shared.ENTRY))))
        self.process = NS(GetStopID=lambda: self.stop_id,
                          GetNumThreads=lambda: len(self.current),
                          GetThreadAtIndex=lambda i: self.current[i], Continue=self.continue_process)
        self.stroke = NS(complete=False)

    def continue_process(self):
        self.continues += 1
        return NS(Success=lambda: True, GetCString=lambda: '')

    def select_process(self):
        pass

    def verify_instructions(self, expected):
        pass

    def active_globals(self):
        return {}

    def singleton(self, file_address):
        return 0x8000

    def queue(self, address):
        return {}

    def load_address(self, address):
        return address

    def hardware_breakpoint(self, address, label):
        bid = len(self.owned_breakpoints) + 1
        self.owned_breakpoints.append(bid)
        return bid

    def wait_capture_stop(self, previous):
        self.stop_id += 1
        self.current = self.stops.pop(0)
        return self.stop_id

    def memory(self, address, size):
        assert (address, size) == (0x1004, 8), (address, size)
        return self.code

    def entry(self, thread):
        self.delivered.append(thread.GetThreadID())
        self.write('test_owned_callback', thread_id=thread.GetThreadID())
        self.stroke.complete = not self.stops


class WorkqueueRecoveryTests(unittest.TestCase):
    def test_simultaneous_step_preserves_owned_snapshot_and_callback_once(self):
        recorder = HostTabletLoop([[owned(), secondary()]])
        recorder.capture({})
        self.assertEqual(recorder.delivered, [1])
        self.assertTrue(recorder.capture_complete)
        rows = [json.loads(line) for line in recorder.output.getvalue().splitlines()]
        recovery = next(row for row in rows if row['kind'] == 'workqueue_step_recovery')
        self.assertEqual(recovery['data'], [6, 1, 0])
        self.assertEqual(recovery['pc'], '0x1004')
        self.assertEqual(recovery['instruction_bytes_le'], 'ff030094200020d4')
        self.assertEqual(recovery['module_uuid'], 'SYSTEM-UUID')
        self.assertLess(rows.index(recovery), next(i for i, row in enumerate(rows)
                                                  if row['kind'] == 'test_owned_callback'))
        self.assertEqual(len(recorder.workqueue_step_recoveries), 1)
        self.assertTrue(recorder.capture_warnings)

    def test_nonmatching_stops_never_deliver_owned_callback(self):
        cases = [secondary(data=[6, 1, 0x1008]), secondary(data=[6, 1, 0, 0]),
                 secondary(reason=shared.lldb.eStopReasonSignal), secondary(pc=0x1008),
                 secondary(library=module('/other/libsystem_pthread.dylib')),
                 secondary(library=module(uuid='')), secondary(name='thread_start'),
                 secondary(start=0xffc), secondary(tid=1)]
        for bad in cases:
            with self.subTest(bad=bad):
                recorder = HostTabletLoop([[owned(), bad]])
                with self.assertRaises(shared.CaptureError):
                    recorder.capture({})
                self.assertEqual(recorder.delivered, [])
        for stops in ([secondary()], [owned(), owned(3), secondary()],
                      [owned(breakpoint_id=99), secondary()], [owned(pc=123), secondary()]):
            recorder = HostTabletLoop([stops])
            with self.assertRaises(shared.CaptureError):
                recorder.capture({})
            self.assertEqual(recorder.delivered, [])

    def test_pending_source_or_ingestion_thread_cannot_be_recovered(self):
        for role in ('ingestion', 'source', 'previous_source'):
            recorder = HostTabletLoop([[owned(), secondary()]])
            if role == 'ingestion':
                recorder.pending[2] = [{'call_id': 9}]
            elif role == 'source':
                recorder.source_boundary = {'thread_id': 2}
            else:
                recorder.latest_source_by_thread[2] = 7
            with self.subTest(role=role), self.assertRaises(shared.CaptureError):
                recorder.capture({})
            self.assertEqual(recorder.delivered, [])

    def test_wrong_instruction_or_branch_target_cannot_be_recovered(self):
        for code in (struct.pack('<II', 0xd503201f, 0xd4200020),
                     struct.pack('<II', 0x940003ff, 0xd4200040)):
            recorder = HostTabletLoop([[owned(), secondary()]])
            recorder.code = code
            with self.assertRaises(shared.CaptureError):
                recorder.capture({})
        recorder = HostTabletLoop([[owned(), secondary()]])
        recorder.target.ResolveLoadAddress = lambda pc: address(pc, module(), '_other', 0x2000)
        with self.assertRaises(shared.CaptureError):
            recorder.capture({})

    def test_repeated_thread_and_total_cap_abort_before_next_callback(self):
        for ids, accepted in (([2, 2], 1), ([2, 3, 4, 5, 6], 4)):
            recorder = HostTabletLoop([[owned(), secondary(tid)] for tid in ids])
            with self.subTest(ids=ids), self.assertRaises(shared.CaptureError):
                recorder.capture({})
            self.assertEqual(len(recorder.delivered), accepted)

    def test_changed_stop_id_rejects_snapshot(self):
        recorder = HostTabletLoop([[owned(), secondary()]])
        original = recorder.wait_capture_stop
        def stale(previous):
            result = original(previous)
            recorder.stop_id += 1
            return result
        recorder.wait_capture_stop = stale
        with self.assertRaises(shared.CaptureError):
            recorder.capture({})
        self.assertEqual(recorder.delivered, [])

    def test_recovery_requires_real_owned_hardware_location(self):
        for hardware, location in ((False, 1), (True, 99)):
            recorder = HostTabletLoop([[thread(1, shared.lldb.eStopReasonBreakpoint,
                                               [1, location], shared.ENTRY), secondary()]])
            original = recorder.target.FindBreakpointByID
            def breakpoint(bid):
                result = original(bid)
                result.IsHardware = lambda: hardware
                return result
            recorder.target.FindBreakpointByID = breakpoint
            with self.subTest(hardware=hardware, location=location), self.assertRaises(shared.CaptureError):
                recorder.capture({})
            self.assertEqual(recorder.delivered, [])


def run_checks():
    stream = io.StringIO()
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(WorkqueueRecoveryTests))
    print(stream.getvalue())
    assert result.wasSuccessful(), 'Workqueue recovery host checks failed'


if __name__ == '__main__':
    run_checks()
