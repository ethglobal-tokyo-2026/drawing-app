"""Bounded, mouse-only LLDB recording of the approved CSP research process.

The helper neither attaches nor launches. It reads mouse packets before their
legacy-window callback and observes the final up callback return. It does not
record digitizer filter inputs/outputs, prove rendering completion, or measure
pen feel. Breakpoints are hardware-only; target expressions are never evaluated.
"""

import datetime
import hashlib
from pathlib import Path
import struct
import time
import traceback

import lldb

from capture_live_contract import (
    Capture, ORIGINAL_SHA256, check_error, configured_paths, float_record, require,
)


DISPATCH = {'down': 0x10205CB9C, 'drag': 0x10205C4D4, 'up': 0x10205CE3C}
UP_RETURN = 0x10205CE40
EXPECTED_KINDS = {'down': (4, 5), 'drag': (1,), 'up': (6,)}


def original_dispatch_instructions(original_arm64):
    """Read the three call sites and the up return from the verified original."""
    data = Path(original_arm64).read_bytes()
    require(hashlib.sha256(data).hexdigest() == ORIGINAL_SHA256,
            'Original ARM64 reference fingerprint differs')
    require(struct.unpack_from('<I', data)[0] == 0xFEEDFACF, 'Expected thin Mach-O')
    sites = {**DISPATCH, 'up_return': UP_RETURN}
    result = {}
    position = 32
    for _ in range(struct.unpack_from('<I', data, 16)[0]):
        command, size = struct.unpack_from('<II', data, position)
        require(size >= 8 and position + size <= len(data), 'Invalid load command')
        if command == 0x19:
            start, _, offset, length = struct.unpack_from('<QQQQ', data, position + 24)
            for label, address in sites.items():
                if start <= address and address + 4 <= start + length:
                    raw = data[offset + address - start:offset + address - start + 4]
                    require(len(raw) == 4, 'Incomplete original instruction bytes')
                    result[label] = raw
        position += size
    require(set(result) == set(sites), 'Mouse call sites missing from original image')
    return result


def packet_record(address, raw):
    require(len(raw) == 0x90, 'Mouse packet must contain all 144 known bytes')
    return {'address': hex(address), 'size': len(raw), 'bytes_le': raw.hex(),
            'event_kind_i32': struct.unpack_from('<i', raw, 0)[0],
            'x': float_record(raw[8:16]), 'y': float_record(raw[16:24]),
            'button_bits_i32': struct.unpack_from('<i', raw, 0x18)[0],
            'timestamp_ms_i64': struct.unpack_from('<q', raw, 0x50)[0],
            'pressure': float_record(raw[0x58:0x60])}


class MouseCapture(Capture):
    def __init__(self, debugger, pid, output, timeout, max_events,
                 research_executable=None, original_arm64=None):
        super().__init__(debugger, pid, output, timeout, max_events,
                         research_executable, original_arm64)
        self.event_count = 0
        self.drag_count = 0
        self.window = None
        self.thread_id = None
        self.last_timestamp = None
        self.awaiting_up_return = False
        self.up_sp = None
        self.up_return_observed = False
        self.up_breakpoint_id = None
        self.return_breakpoint_id = None

    def callback_address(self, address):
        resolved = self.target.ResolveLoadAddress(address)
        file_address, module_path = None, None
        if resolved.IsValid():
            raw_file_address = resolved.GetFileAddress()
            if raw_file_address != lldb.LLDB_INVALID_ADDRESS:
                file_address = hex(raw_file_address)
            module = resolved.GetModule()
            if module.IsValid():
                module_path = module.GetFileSpec().fullpath
        return {'load_address': hex(address), 'file_address': file_address,
                'module_path': module_path}

    def arm_return(self):
        # Free the up dispatch hardware slot before adding the return address.
        breakpoint = self.target.FindBreakpointByID(self.up_breakpoint_id)
        require(breakpoint.IsValid() and breakpoint.IsHardware(),
                'Missing owned mouse-up hardware breakpoint')
        breakpoint.SetEnabled(False)
        require(not breakpoint.IsEnabled(), 'Could not disable mouse-up breakpoint')
        self.return_breakpoint_id = self.hardware_breakpoint(
            self.load_address(UP_RETURN), 'mouse_up_return')

    def dispatch(self, thread, label):
        require(self.event_count < self.max_samples, 'mouse_event_limit_reached')
        require(label in DISPATCH, 'unknown_mouse_dispatch')
        frame = thread.GetFrameAtIndex(0)
        registers = {name: self.reg(frame, name) for name in ('x0', 'x1', 'x8', 'sp')}
        packet = packet_record(registers['x1'], self.memory(registers['x1'], 0x90))
        tid = thread.GetThreadID()
        self.event_count += 1
        self.write('mouse_dispatch', event_index=self.event_count, label=label,
                   thread_id=tid, registers={name: hex(value) for name, value in registers.items()},
                   packet=packet, callback=self.callback_address(registers['x8']))
        require(packet['event_kind_i32'] in EXPECTED_KINDS[label], 'mouse_packet_kind_mismatch')
        require(not self.awaiting_up_return, 'mouse_event_before_up_callback_return')
        if self.window is None:
            require(label == 'down', 'expected_mouse_down')
            self.window, self.thread_id = registers['x0'], tid
        else:
            require(label != 'down', 'unexpected_mouse_down')
            require(registers['x0'] == self.window, 'mouse_window_changed')
            require(tid == self.thread_id, 'mouse_thread_changed')
        timestamp = packet['timestamp_ms_i64']
        require(self.last_timestamp is None or timestamp >= self.last_timestamp,
                'mouse_timestamp_regressed')
        self.last_timestamp = timestamp
        if label == 'drag':
            self.drag_count += 1
        elif label == 'up':
            self.awaiting_up_return = True
            self.up_sp = registers['sp']
            self.arm_return()

    def returned(self, thread):
        require(self.awaiting_up_return, 'unexpected_mouse_up_return')
        require(thread.GetThreadID() == self.thread_id, 'mouse_up_return_thread_mismatch')
        sp = self.reg(thread.GetFrameAtIndex(0), 'sp')
        require(sp == self.up_sp, 'mouse_up_return_stack_mismatch')
        self.up_return_observed = True
        self.awaiting_up_return = False
        self.write('mouse_up_return', thread_id=self.thread_id, sp=hex(sp),
                   event_count=self.event_count, drag_count=self.drag_count,
                   mouse_only=True, digitizer_fixture_complete=False)
        require(self.drag_count > 0, 'click_without_drag')
        self.capture_complete = True
        self.stop_reason = 'mouse_down_drag_up_callback_return_observed'

    def capture(self, expected_instructions):
        self.select_process()
        sites = {**DISPATCH, 'up_return': UP_RETURN}
        addresses = {label: self.load_address(address) for label, address in sites.items()}
        for label, address in addresses.items():
            actual = self.memory(address, 4)
            require(actual == expected_instructions[label], f'Loaded {label} instruction differs')
            self.write('instruction_verified', label=label, file_address=hex(sites[label]),
                       load_address=hex(address), bytes_le=actual.hex())
        dispatch_ids = {self.hardware_breakpoint(addresses[label], 'mouse_' + label): label
                        for label in DISPATCH}
        self.up_breakpoint_id = next(key for key, label in dispatch_ids.items() if label == 'up')
        last_stop = self.process.GetStopID()
        check_error(self.process.Continue(), 'Continue after mouse breakpoint installation')
        self.write('capture_started', mouse_only=True, max_events=self.max_samples,
                   dispatch_breakpoints=dispatch_ids)
        print('CSP mouse route recording active; draw one short mouse drag and release.', flush=True)
        while True:
            last_stop = self.wait_capture_stop(last_stop)
            hits = []
            for index in range(self.process.GetNumThreads()):
                thread = self.process.GetThreadAtIndex(index)
                reason = thread.GetStopReason()
                if reason == lldb.eStopReasonNone:
                    continue
                data = [thread.GetStopReasonDataAtIndex(i)
                        for i in range(thread.GetStopReasonDataCount())]
                self.write('thread_stop', thread_id=thread.GetThreadID(), reason=int(reason), data=data)
                require(reason == lldb.eStopReasonBreakpoint and len(data) == 2,
                        f'Unexpected mouse capture stop on thread {thread.GetThreadID()}')
                if data[0] == self.return_breakpoint_id:
                    label = 'up_return'
                else:
                    require(data[0] in dispatch_ids, f'Unowned breakpoint {data[0]} stopped capture')
                    label = dispatch_ids[data[0]]
                require(thread.GetFrameAtIndex(0).GetPC() == addresses[label],
                        'Stopped PC does not match mouse breakpoint')
                hits.append((thread, label))
            require(len(hits) == 1, 'Expected exactly one mouse capture breakpoint stop')
            thread, label = hits[0]
            if label == 'up_return':
                self.returned(thread)
            else:
                self.dispatch(thread, label)
            if self.capture_complete:
                return
            check_error(self.process.Continue(), 'Continue after mouse capture stop')


def run(debugger, pid, output_path, timeout_seconds=30, max_events=128, *,
        research_executable=None, original_arm64=None):
    """Record a bounded mouse sequence, never a digitizer replay fixture."""
    require(isinstance(pid, int) and pid > 0, 'pid must be a positive integer')
    require(isinstance(max_events, int) and 1 <= max_events <= 128,
            'max_events must be an integer in [1, 128]')
    require(isinstance(timeout_seconds, (int, float)) and 5 <= timeout_seconds <= 30,
            'timeout_seconds must be in [5, 30]')
    executable, original = configured_paths(research_executable, original_arm64)
    require(executable.is_file(), f'Approved research executable is missing: {executable}')
    require(original.is_file(), f'Original ARM64 reference is missing: {original}')
    with Path(output_path).open('x', encoding='utf-8') as output:
        capture = MouseCapture(debugger, pid, output, timeout_seconds, max_events, executable, original)
        old_async, old_target = debugger.GetAsync(), debugger.GetSelectedTarget()
        capture.write('metadata', utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      pid=pid, requested_timeout_seconds=timeout_seconds, max_events=max_events,
                      original_sha256=ORIGINAL_SHA256, executable=str(executable),
                      original_arm64=str(original), mouse_only=True,
                      digitizer_fixture_complete=False, pen_feel_validated=False,
                      dispatch_file_addresses={label: hex(address) for label, address in DISPATCH.items()},
                      up_return_file_address=hex(UP_RETURN), limitations=[
                          'Mouse content-view coordinates are not native tablet input.',
                          'Digitizer stabilization input/output arithmetic is not captured.',
                          'Up callback return does not prove final rendering completion.',
                          'Breakpoint stops alter cadence; no natural latency or pen-feel claim.',
                          'Native SB read/detach calls have no per-call timeout; keep an outer guard.'])
        try:
            capture.timer.start()
            debugger.SetAsync(True)
            expected = original_dispatch_instructions(original)
            capture.budget()
            capture.capture(expected)
        except BaseException as error:
            capture.capture_complete = False
            capture.stop_reason = f'{type(error).__name__}: {error}'
            capture.write('capture_error', error=capture.stop_reason, traceback=traceback.format_exc())
        finally:
            capture.cleanup()
            debugger.SetAsync(old_async)
            if old_target.IsValid():
                debugger.SetSelectedTarget(old_target)
            sequence_observed = capture.capture_complete
            deadline_exceeded = time.monotonic() > capture.hard_deadline
            if (capture.cleanup_errors or capture.watchdog_error or deadline_exceeded
                    or not capture.detach_request_succeeded or not capture.detached_state_observed):
                capture.capture_complete = False
            capture.write('summary', mouse_only=True, mouse_route_complete=capture.capture_complete,
                          mouse_sequence_observed=sequence_observed, event_count=capture.event_count,
                          drag_count=capture.drag_count, up_return_observed=capture.up_return_observed,
                          awaiting_up_return=capture.awaiting_up_return,
                          digitizer_fixture_complete=False, pen_feel_validated=False,
                          stop_reason=capture.stop_reason, cleanup_errors=capture.cleanup_errors,
                          cleanup_warnings=capture.cleanup_warnings, watchdog_error=capture.watchdog_error,
                          deadline_exceeded=deadline_exceeded,
                          detach_request_succeeded=capture.detach_request_succeeded,
                          detached_state_observed=capture.detached_state_observed,
                          detach_observation_source=capture.detach_observation_source,
                          detach_state_events=capture.detach_state_events,
                          detach_last_debugger_state=capture.detach_last_debugger_state,
                          resume_independently_verified=False,
                          owned_breakpoints=capture.owned_breakpoints)
        print(f'CSP mouse capture saved: {output_path}; events={capture.event_count}; '
              f'drags={capture.drag_count}; up_return={capture.up_return_observed}; '
              f'mouse_route_complete={capture.capture_complete}; digitizer_fixture_complete=False', flush=True)
        return {'output_path': str(output_path), 'mouse_route_complete': capture.capture_complete,
                'event_count': capture.event_count, 'drag_count': capture.drag_count,
                'up_return_observed': capture.up_return_observed,
                'digitizer_fixture_complete': False, 'pen_feel_validated': False,
                'detach_request_succeeded': capture.detach_request_succeeded,
                'detached_state_observed': capture.detached_state_observed,
                'resume_independently_verified': False,
                'cleanup_errors': capture.cleanup_errors, 'cleanup_warnings': capture.cleanup_warnings}
