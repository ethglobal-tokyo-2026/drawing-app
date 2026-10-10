"""Host-only checks inside LLDB. No target, attachment, launch, or process calls."""

import io
import json
import struct
import time
from types import SimpleNamespace

import capture_live_contract as capture


class Thread:
    def __init__(self, tid):
        self.tid = tid

    def GetThreadID(self):
        return self.tid

    def GetFrameAtIndex(self, index):
        return object()


class HostCapture(capture.Capture):
    def __init__(self):
        super().__init__(None, 1, io.StringIO(), 30, 8)
        self.registers = {f'x{i}': i for i in range(8)}
        self.registers.update(x0=0x1000, x1=0x2000, x7=0x3000, sp=0x4000, w0=0)
        self.registers.update({f'd{i}': int.from_bytes(struct.pack('<d', i + 0.5), 'little')
                               for i in range(3)})
        # Only the shared 236-byte prefix is exposed: the same ingestion routine
        # receives both 248-byte gesture and 256-byte digitizer queue objects.
        queue = bytearray(236)
        struct.pack_into('<d', queue, 0x58, 2.0)
        struct.pack_into('<i', queue, 0x88, 3)
        struct.pack_into('<dd', queue, 0x90, 8.25, -6.5)
        struct.pack_into('<d', queue, 0xb0, 0.625)
        self.memory_map = {0x1000: bytes(queue), 0x2000: struct.pack('<i', 1),
                           0x3008: struct.pack('<ddd', 4.5, 5.5, 0.75)}
        self.reads = []
        self.initial_globals = {}

    def reg(self, frame, name):
        return self.registers[name]

    def memory(self, address, size):
        self.reads.append((address, size))
        for start, raw in self.memory_map.items():
            if start <= address and address + size <= start + len(raw):
                offset = address - start
                return raw[offset:offset + size]
        raise AssertionError(f'Capture reads outside available memory: {address:#x}, {size} bytes')

    def active_globals(self):
        return {}

    def stack(self, thread):
        return [{'pc': '0x1021367c0', 'sp': '0x4000'}]


def run_checks():
    for emitted in (0, 1):
        test = HostCapture()
        thread = Thread(11)
        test.entry(thread)
        test.registers.update(x0=99, x1=99, x7=99, sp=0x4000 - 0xb0, w0=emitted)
        test.exit(thread)
        rows = [json.loads(line) for line in test.output.getvalue().splitlines()]
        result = rows[-1]
        assert result['kind'] == 'exit' and result['emitted'] == bool(emitted)
        assert ('output' in result) == bool(emitted)
        assert ((0x3008, 24) in test.reads) == bool(emitted)
        for row in (rows[1], result):
            queue = row['queue']
            assert queue['size'] == 236 and len(bytes.fromhex(queue['bytes_le'])) == 236
            assert queue['window_H']['value'] == 2.0
            assert queue['state_i32'] == 3
            assert queue['processed_x']['value'] == 8.25
            assert queue['processed_y']['value'] == -6.5
            assert queue['processed_pressure']['value'] == 0.625
        assert test.reads.count((0x2000, 4)) == 2
        assert test.pairs == 1 and not any(test.pending.values())
    test = HostCapture()
    test.entry(Thread(11))
    try:
        test.exit(Thread(12))
        raise AssertionError('Unmatched thread accepted')
    except capture.CaptureError as error:
        assert 'Unmatched exit' in str(error)
    try:
        test.exit(Thread(11))
        raise AssertionError('Wrong stack pointer accepted')
    except capture.CaptureError as error:
        assert 'Stack pairing mismatch' in str(error)
    assert len(test.pending[11]) == 1
    print('PASS: host-only suppression/emission, saved-pointer reuse, bounded common queue snapshots, thread and SP pairing guards')
    check_capture_stop_events()
    check_detach_observation()
    configured, original = capture.configured_paths('/example/research', '/example/original-arm64')
    assert str(configured) == '/example/research' and str(original) == '/example/original-arm64'
    print('PASS: explicit executable/reference path configuration without temporary files')
    print('No target behavior was tested.')


def check_capture_stop_events():
    real_lldb = capture.lldb

    class Event:
        pass

    class Process:
        def __init__(self, unique_id=111, valid=True):
            self.unique_id, self.valid, self.stop_id = unique_id, valid, 10

        def IsValid(self):
            return self.valid

        def GetUniqueID(self):
            return self.unique_id

        def GetBroadcaster(self):
            return 'own-process-broadcaster'

        def GetStopID(self):
            return self.stop_id

        def GetState(self):
            raise AssertionError('Capture stop detection polled potentially stale public state')

    class Listener:
        def __init__(self, process, events):
            self.process, self.events = process, list(events)

        def GetNextEventForBroadcasterWithType(self, broadcaster, mask, event):
            assert broadcaster == 'own-process-broadcaster' and mask == 1
            if not self.events:
                raise AssertionError('No qualifying stop was returned')
            pending = self.events.pop(0)
            if pending is None:
                return False
            event.process, event.state, event.restarted, self.process.stop_id = pending
            return True

    api = SimpleNamespace(
        eBroadcastBitStateChanged=1,
        EventIsProcessEvent=lambda event: hasattr(event, 'process'),
        GetProcessFromEvent=lambda event: event.process,
        GetStateFromEvent=lambda event: event.state,
        GetRestartedFromEvent=lambda event: event.restarted,
    )
    fake_lldb = SimpleNamespace(SBEvent=Event, SBProcess=api, **{
        name: getattr(real_lldb, name) for name in (
            'eStateStopped', 'eStateRunning', 'eStateStepping', 'eStateExited',
            'eStateDetached', 'eStateCrashed', 'eStateInvalid')})
    own, foreign = Process(), Process(222)

    def invoke(events, last_stop=10):
        test = HostCapture()
        test.process, test.listener = own, Listener(own, events)
        try:
            capture.lldb = fake_lldb
            return test.wait_capture_stop(last_stop), test
        finally:
            capture.lldb = real_lldb

    stop, test = invoke([
        None,
        (own, real_lldb.eStateRunning, False, 10),
        (own, real_lldb.eStateStopped, True, 11),
        (own, real_lldb.eStateRunning, False, 11),
        (own, real_lldb.eStateStopped, False, 12),
    ])
    assert stop == 12
    rows = [json.loads(line) for line in test.output.getvalue().splitlines()]
    assert sum(row['kind'] == 'capture_state_event' for row in rows) == 4
    assert sum(row['kind'] == 'capture_restarted_stop' for row in rows) == 1
    for events, expected in (
        ([(foreign, real_lldb.eStateStopped, False, 12)], 'foreign_capture_process_event'),
        ([(Process(valid=False), real_lldb.eStateStopped, False, 12)], 'invalid_capture_process_event'),
        ([(own, real_lldb.eStateStopped, False, 10)], 'non_advancing_capture_stop'),
        ([(own, real_lldb.eStateExited, False, 12)], 'capture_process_terminal_state'),
        ([(own, real_lldb.eStateCrashed, False, 12)], 'capture_process_terminal_state'),
    ):
        try:
            invoke(events)
        except capture.CaptureError as error:
            assert expected in str(error), (expected, str(error))
        else:
            raise AssertionError('Accepted invalid capture event: ' + expected)
    test = HostCapture()
    test.process, test.listener = own, Listener(own, [])
    test.expired.set()
    try:
        capture.lldb = fake_lldb
        test.wait_capture_stop(10)
    except capture.CaptureError as error:
        assert 'capture_deadline_reached' in str(error)
    else:
        raise AssertionError('Expired capture continued waiting')
    finally:
        capture.lldb = real_lldb
    print('PASS: event-driven stops ignore restarted events, reject foreign/terminal events, and respect deadlines without polling public state')


def check_detach_observation():
    real_lldb = capture.lldb

    class Event:
        pass

    class Process:
        def __init__(self, unique_id, state):
            self.unique_id, self.state = unique_id, state

        def GetUniqueID(self):
            return self.unique_id

        def GetState(self):
            return self.state

    class Listener:
        def __init__(self, events):
            self.events = list(events)

        def GetNextEventForBroadcasterWithType(self, broadcaster, mask, event):
            if not self.events:
                return False
            pending = self.events.pop(0)
            if pending is None:
                return False
            event.process, event.state = pending
            return True

    api = SimpleNamespace(
        eBroadcastBitStateChanged=1,
        EventIsProcessEvent=lambda event: hasattr(event, 'process'),
        GetProcessFromEvent=lambda event: event.process,
        GetStateFromEvent=lambda event: event.state,
    )
    fake_lldb = SimpleNamespace(SBEvent=Event, SBProcess=api,
                                eStateDetached=real_lldb.eStateDetached)
    own = Process(111, real_lldb.eStateStopped)
    foreign = Process(222, real_lldb.eStateStopped)
    for events, current, expected, source in [
        ([(own, real_lldb.eStateDetached)], own, True, 'matching_process_state_event'),
        ([None, (own, real_lldb.eStateDetached)], own, True, 'matching_process_state_event'),
        ([], Process(111, real_lldb.eStateDetached), True, 'process_get_state'),
        ([(foreign, real_lldb.eStateDetached)], own, False, None),
        ([], Process(111, real_lldb.eStateExited), False, None),
    ]:
        test = HostCapture()
        test.process, test.listener = current, Listener(events)
        test.detach_request_succeeded = True
        test.hard_deadline = time.monotonic() + (0.1 if expected else -1)
        try:
            capture.lldb = fake_lldb
            test.observe_detached(111, object())
        finally:
            capture.lldb = real_lldb
        assert test.detached_state_observed is expected
        assert test.detach_observation_source == source
        assert test.detach_request_succeeded and not test.cleanup_errors
        assert bool(test.cleanup_warnings) is not expected
    print('PASS: host-only delayed detach event, stale current state, matching process identity, and unobserved acknowledgement')


if __name__ == '__main__':
    run_checks()
