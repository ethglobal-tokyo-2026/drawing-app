"""Bounded LLDB inspection of the approved CSP research copy; never launches it.

Import inside the LLDB session controlling the approved research process and
call run(lldb.debugger, pid, output_path). This helper neither attaches nor launches.
No target expressions, application-memory writes, or software breakpoints.
The deadline is enforced between SB calls, with a watchdog interrupt. LLDB's
native read/detach calls have no per-call timeout; retain an outer guard.
"""

import datetime
import hashlib
import json
import math
import os
from pathlib import Path
import struct
import threading
import time
import traceback
import uuid

import lldb


ROOT = Path('/private/tmp/csp-debug-research-20261009')
EXECUTABLE = ROOT / 'CLIP STUDIO PAINT Research.app/Contents/MacOS/CLIP STUDIO PAINT'
ORIGINAL_ARM64 = ROOT / 'original-arm64'
ORIGINAL_SHA256 = '6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd'
ENTRY = 0x1021367C0
EXIT = 0x1021369AC
FUNCTION_SIZE = 528
QUEUE_GLOBAL = 0x104D63F80
GLOBALS = (
    ('emission_interval', 0x104B22068, '<q'),
    ('terminal_mode', 0x104B22070, '<I'),
    ('interval_option', 0x104D63FB0, '<i'),
)


class CaptureError(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise CaptureError(message)


def check_error(error, operation):
    require(error.Success(), f'{operation}: {error.GetCString()}')


def float_record(raw):
    value = struct.unpack('<d', raw)[0]
    return {'bytes_le': raw.hex(), 'bits': f'0x{int.from_bytes(raw, "little"):016x}',
            'value': value if math.isfinite(value) else repr(value)}


def queue_record(address, raw):
    """Decode the shared queue prefix; raw snapshots contain 236 bytes."""
    return {'address': hex(address), 'size': len(raw), 'bytes_le': raw.hex(),
            'window_H': float_record(raw[0x58:0x60]),
            'state_i32': struct.unpack_from('<i', raw, 0x88)[0],
            'processed_x': float_record(raw[0x90:0x98]),
            'processed_y': float_record(raw[0x98:0xa0]),
            'processed_pressure': float_record(raw[0xb0:0xb8])}


def configured_paths(research_executable=None, original_arm64=None):
    executable = Path(research_executable or os.environ.get('CSP_RESEARCH_EXECUTABLE', EXECUTABLE))
    original = Path(original_arm64 or os.environ.get('CSP_ORIGINAL_ARM64', ORIGINAL_ARM64))
    return executable.expanduser().resolve(), original.expanduser().resolve()


def original_instructions(original_arm64=None):
    _, original = configured_paths(original_arm64=original_arm64)
    require(original.is_file(), f'Original ARM64 reference is missing: {original}')
    data = original.read_bytes()
    require(hashlib.sha256(data).hexdigest() == ORIGINAL_SHA256,
            'Original ARM64 reference fingerprint differs')
    require(struct.unpack_from('<I', data)[0] == 0xFEEDFACF, 'Expected thin Mach-O')
    position = 32
    for _ in range(struct.unpack_from('<I', data, 16)[0]):
        command, size = struct.unpack_from('<II', data, position)
        require(size >= 8 and position + size <= len(data), 'Invalid load command')
        if command == 0x19:
            start, _, offset, length = struct.unpack_from('<QQQQ', data, position + 24)
            if start <= ENTRY and ENTRY + FUNCTION_SIZE <= start + length:
                result = data[offset + ENTRY - start:offset + ENTRY - start + FUNCTION_SIZE]
                require(len(result) == FUNCTION_SIZE, 'Incomplete original instruction bytes')
                return result
        position += size
    raise CaptureError('Entry function is not mapped in the reference executable')


class Capture:
    def __init__(self, debugger, pid, output, timeout, max_samples,
                 research_executable=None, original_arm64=None):
        self.debugger = debugger
        self.executable, self.original_arm64 = configured_paths(research_executable, original_arm64)
        self.pid = pid
        self.output = output
        self.started = time.monotonic()
        self.hard_deadline = self.started + timeout
        self.capture_deadline = self.hard_deadline - 3.0
        self.max_samples = max_samples
        self.process = None
        self.target = None
        self.module = None
        self.owned_breakpoints = []
        self.pending = {}
        self.entries = 0
        self.pairs = 0
        self.expired = threading.Event()
        self.watchdog_error = None
        self.capture_complete = False
        self.stop_reason = 'not_started'
        self.cleanup_errors = []
        self.detach_request_succeeded = False
        self.detached_state_observed = False
        self.detach_observation_source = None
        self.detach_state_events = []
        self.detach_last_debugger_state = None
        self.cleanup_warnings = []
        self.initial_globals = None
        self.listener = lldb.SBListener('csp-contract-' + uuid.uuid4().hex)
        self.timer = threading.Timer(max(0.0, self.capture_deadline - time.monotonic()),
                                     self.expire)
        self.timer.daemon = True

    def write(self, kind, **fields):
        row = {'kind': kind, 'elapsed_seconds': time.monotonic() - self.started, **fields}
        self.output.write(json.dumps(row, allow_nan=False, sort_keys=True) + '\n')
        self.output.flush()

    def expire(self):
        self.expired.set()
        try:
            if self.process is not None and self.process.IsValid():
                self.process.SendAsyncInterrupt()
        except BaseException as error:
            self.watchdog_error = repr(error)

    def budget(self):
        require(not self.expired.is_set() and time.monotonic() < self.capture_deadline,
                'capture_deadline_reached')

    def memory(self, address, size):
        self.budget()
        require(address != 0, f'Null address for {size}-byte read')
        error = lldb.SBError()
        raw = self.process.ReadMemory(address, size, error)
        check_error(error, f'ReadMemory({address:#x}, {size})')
        require(raw is not None and len(raw) == size, f'Short read at {address:#x}')
        self.budget()
        return bytes(raw)

    def reg(self, frame, name):
        self.budget()
        register = frame.FindRegister(name)
        require(register.IsValid(), f'Missing register {name}')
        error = lldb.SBError()
        if name.startswith('d'):
            value = register.GetData().GetUnsignedInt64(error, 0)
        else:
            value = register.GetValueAsUnsigned(error, 0)
        check_error(error, f'Read register {name}')
        return value

    def load_address(self, file_address):
        address = self.module.ResolveFileAddress(file_address)
        require(address.IsValid(), f'Unresolved file address {file_address:#x}')
        result = address.GetLoadAddress(self.target)
        require(result != lldb.LLDB_INVALID_ADDRESS, f'Unloaded address {file_address:#x}')
        return result

    def active_globals(self):
        values = {}
        for name, file_address, format_string in GLOBALS:
            address = self.load_address(file_address)
            raw = self.memory(address, struct.calcsize(format_string))
            values[name] = {'file_address': hex(file_address), 'load_address': hex(address),
                            'bytes_le': raw.hex(), 'value': struct.unpack(format_string, raw)[0]}
        return values

    def check_globals(self, values):
        require(values == self.initial_globals, 'Active globals changed during capture')

    def phase(self, address):
        raw = self.memory(address, 4)
        return {'address': hex(address), 'bytes_le': raw.hex(),
                'value_i32': struct.unpack('<i', raw)[0]}

    def queue(self, address):
        # Ingestion is shared by 248-byte gesture and 256-byte digitizer queues.
        # Fields through +0xe8 fit in their common 236-byte prefix.
        return queue_record(address, self.memory(address, 236))

    def wait_stopped(self):
        while True:
            self.budget()
            state = self.process.GetState()
            if state == lldb.eStateStopped:
                return
            require(state not in (lldb.eStateExited, lldb.eStateDetached,
                                  lldb.eStateCrashed, lldb.eStateInvalid),
                    f'Process did not stop: state={state}')
            event = lldb.SBEvent()
            self.listener.GetNextEvent(event)
            time.sleep(0.01)

    def wait_capture_stop(self, last_stop_id):
        """Wait for a new, non-restarted stop event from the controlled process.

        Call after Continue. Public GetState can briefly remain stopped while
        LLDB steps past a breakpoint, so it must not authorize register reads.
        The returned stop ID is the next value to pass after continuing again.
        """
        require(self.process is not None and self.process.IsValid(),
                'invalid_capture_process')
        process_unique_id = self.process.GetUniqueID()
        broadcaster = self.process.GetBroadcaster()
        while True:
            self.budget()
            require(self.process.IsValid() and self.process.GetUniqueID() == process_unique_id,
                    'capture_process_identity_changed')
            event = lldb.SBEvent()
            if not self.listener.GetNextEventForBroadcasterWithType(
                    broadcaster, lldb.SBProcess.eBroadcastBitStateChanged, event):
                time.sleep(0.005)
                continue
            require(lldb.SBProcess.EventIsProcessEvent(event), 'non_process_capture_event')
            event_process = lldb.SBProcess.GetProcessFromEvent(event)
            require(event_process.IsValid(), 'invalid_capture_process_event')
            event_process_id = event_process.GetUniqueID()
            require(event_process_id == process_unique_id, 'foreign_capture_process_event')
            state = lldb.SBProcess.GetStateFromEvent(event)
            restarted = lldb.SBProcess.GetRestartedFromEvent(event)
            self.write('capture_state_event', process_unique_id=process_unique_id,
                       state=int(state), restarted=bool(restarted))
            require(state not in (lldb.eStateExited, lldb.eStateDetached,
                                  lldb.eStateCrashed, lldb.eStateInvalid),
                    f'capture_process_terminal_state: {state}')
            if state in (lldb.eStateRunning, lldb.eStateStepping):
                continue
            require(state == lldb.eStateStopped, f'unexpected_capture_process_state: {state}')
            if restarted:
                self.write('capture_restarted_stop', process_unique_id=process_unique_id,
                           reason='LLDB marked this stop as automatically restarted; no packet read.')
                continue
            stop_id = self.process.GetStopID()
            require(stop_id > last_stop_id, f'non_advancing_capture_stop: {stop_id} <= {last_stop_id}')
            self.budget()
            return stop_id

    def select_process(self):
        # Fresh PID attachment has no per-call timeout in this installed API.
        # Require the already controlled process from the separate access check.
        for index in range(self.debugger.GetNumTargets()):
            target = self.debugger.GetTargetAtIndex(index)
            process = target.GetProcess()
            if process.IsValid() and process.GetProcessID() == self.pid:
                info = process.GetProcessInfo()
                require(info.IsValid(), 'Missing process executable identity')
                actual_path = Path(info.GetExecutableFile().fullpath).resolve()
                require(actual_path == self.executable,
                        f'Unexpected process executable: {actual_path}')
                require(info.GetTriple().startswith('arm64'),
                        f'Unexpected process architecture: {info.GetTriple()}')
                self.target, self.process = target, process
                self.write('process_selected', mode='existing_debugger_process')
                break
        require(self.process is not None,
                'PID is not already controlled by this LLDB; attach/launch must be checked separately')
        self.debugger.SetSelectedTarget(self.target)
        subscribed = self.listener.StartListeningForEvents(
            self.process.GetBroadcaster(), lldb.SBProcess.eBroadcastBitStateChanged)
        require(subscribed & lldb.SBProcess.eBroadcastBitStateChanged,
                'Could not subscribe to process state events')
        if self.process.GetState() != lldb.eStateStopped:
            self.process.SendAsyncInterrupt()
        self.wait_stopped()
        for index in range(self.target.GetNumModules()):
            module = self.target.GetModuleAtIndex(index)
            if Path(module.GetFileSpec().fullpath).resolve() == self.executable:
                self.module = module
                break
        require(self.module is not None, 'Research executable module not found')
        require(self.target.GetByteOrder() == lldb.eByteOrderLittle, 'Expected little-endian target')
        self.write('process_verified', pid=self.pid, executable=str(actual_path),
                   triple=info.GetTriple(), module_uuid=self.module.GetUUIDString())

    def hardware_breakpoint(self, address, label):
        self.budget()
        before = {self.target.GetBreakpointAtIndex(index).GetID()
                  for index in range(self.target.GetNumBreakpoints())}
        result = lldb.SBCommandReturnObject()
        # The command requires hardware at creation; never create then convert.
        command = f'breakpoint set --hardware --address {address:#x}'
        self.debugger.GetCommandInterpreter().HandleCommand(command, result, False)
        added = [self.target.GetBreakpointAtIndex(index)
                 for index in range(self.target.GetNumBreakpoints())
                 if self.target.GetBreakpointAtIndex(index).GetID() not in before]
        self.owned_breakpoints.extend(item.GetID() for item in added)
        self.write('breakpoint_install', label=label, command=command,
                   output=result.GetOutput(), error=result.GetError(),
                   ids=[item.GetID() for item in added])
        require(result.Succeeded(), f'Hardware breakpoint failed: {result.GetError()}')
        require(len(added) == 1, 'Expected exactly one new hardware breakpoint')
        breakpoint = added[0]
        require(breakpoint.IsHardware(), 'Hardware breakpoint unavailable; no fallback permitted')
        require(breakpoint.GetNumLocations() == 1, 'Expected one exact breakpoint location')
        location = breakpoint.GetLocationAtIndex(0)
        require(location.IsResolved() and location.GetAddress().GetLoadAddress(self.target) == address,
                'Hardware breakpoint was not resolved at the exact address')
        self.budget()
        return breakpoint.GetID()

    def stack(self, thread):
        count = thread.GetNumFrames()
        require(count <= 256, 'Call stack exceeds capture limit; refusing an incomplete stack')
        frames = []
        for index in range(count):
            self.budget()
            frame = thread.GetFrameAtIndex(index)
            frames.append({'index': index, 'pc': hex(frame.GetPC()), 'sp': hex(frame.GetSP()),
                           'function': frame.GetFunctionName()})
        return frames

    def entry(self, thread):
        require(self.entries < self.max_samples, 'sample_limit_reached_before_pairing')
        frame = thread.GetFrameAtIndex(0)
        registers = {f'x{index}': self.reg(frame, f'x{index}') for index in range(8)}
        doubles = {f'd{index}': float_record(struct.pack('<Q', self.reg(frame, f'd{index}')))
                   for index in range(3)}
        tid = thread.GetThreadID()
        calls = self.pending.setdefault(tid, [])
        require(len(calls) < 8, 'Per-thread nesting exceeds capture limit')
        saved = {'call_id': self.entries + 1, 'thread_id': tid, 'queue': registers['x0'],
                 'phase': registers['x1'], 'output': registers['x7'], 'sp': self.reg(frame, 'sp')}
        # Preserve pointers and pairing before reads, so read failures retain an unmatched entry.
        calls.append(saved)
        self.entries += 1
        self.write('entry_pairing', call_id=saved['call_id'], thread_id=tid, depth=len(calls),
                   queue=hex(saved['queue']), phase=hex(saved['phase']),
                   output=hex(saved['output']), entry_sp=hex(saved['sp']))
        values = self.active_globals()
        self.write('entry', call_id=saved['call_id'], thread_id=tid,
                   registers={name: {'bits': f'0x{value:016x}', 'unsigned_decimal': str(value),
                                     'signed_decimal': str(value if value < 2**63 else value - 2**64)}
                              for name, value in registers.items()},
                   floating_registers=doubles, phase=self.phase(saved['phase']),
                   queue=self.queue(saved['queue']), call_stack=self.stack(thread),
                   active_globals=values)
        self.check_globals(values)

    def exit(self, thread):
        tid = thread.GetThreadID()
        calls = self.pending.get(tid, [])
        require(bool(calls), f'Unmatched exit on thread {tid}')
        saved = calls[-1]
        frame = thread.GetFrameAtIndex(0)
        require(self.reg(frame, 'sp') == saved['sp'] - 0xb0,
                f'Stack pairing mismatch for call {saved["call_id"]}')
        emitted_u32 = self.reg(frame, 'w0') & 0xffffffff
        values = self.active_globals()
        fields = {'call_id': saved['call_id'], 'thread_id': tid,
                  'w0_bits': f'0x{emitted_u32:08x}', 'emitted': emitted_u32 != 0,
                  'phase': self.phase(saved['phase']), 'queue': self.queue(saved['queue']),
                  'active_globals': values}
        if emitted_u32 != 0:
            raw = self.memory(saved['output'] + 8, 24)
            fields['output'] = {'address': hex(saved['output']), 'bytes_at_08_le': raw.hex(),
                                'x': float_record(raw[:8]), 'y': float_record(raw[8:16]),
                                'pressure': float_record(raw[16:24])}
        self.write('exit', **fields)
        calls.pop()
        self.pairs += 1
        self.check_globals(values)

    def capture(self, expected_instructions):
        self.select_process()
        entry = self.load_address(ENTRY)
        exit_address = self.load_address(EXIT)
        actual = self.memory(entry, FUNCTION_SIZE)
        require(actual == expected_instructions, 'Loaded entry function instruction bytes differ')
        self.initial_globals = self.active_globals()
        queue_pointer_address = self.load_address(QUEUE_GLOBAL)
        queue_pointer_raw = self.memory(queue_pointer_address, 8)
        queue_pointer = struct.unpack('<Q', queue_pointer_raw)[0]
        self.write('initial_state', entry_load_address=hex(entry), exit_load_address=hex(exit_address),
                   function_sha256=hashlib.sha256(actual).hexdigest(),
                   active_globals=self.initial_globals,
                   singleton_queue_pointer={'file_address': hex(QUEUE_GLOBAL),
                                            'load_address': hex(queue_pointer_address),
                                            'bytes_le': queue_pointer_raw.hex()},
                   queue=self.queue(queue_pointer) if queue_pointer else None,
                   reset_confirmed=False, out_of_line_history_captured=False)
        entry_id = self.hardware_breakpoint(entry, 'entry')
        exit_id = self.hardware_breakpoint(exit_address, 'common_exit')
        last_stop = self.process.GetStopID()
        check_error(self.process.Continue(), 'Continue after installing hardware breakpoints')
        self.write('capture_started', entry_breakpoint=entry_id, exit_breakpoint=exit_id)
        print(f'CSP contract capture active: at most {self.max_samples} calls, deadline <=30s.', flush=True)
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
                        f'Unexpected stop reason/data on thread {thread.GetThreadID()}')
                require(data[0] in (entry_id, exit_id), f'Unowned breakpoint {data[0]} stopped capture')
                address = thread.GetFrameAtIndex(0).GetPC()
                require(address == (entry if data[0] == entry_id else exit_address),
                        'Stopped PC does not match exact breakpoint')
                hits.append((thread, data[0]))
            require(bool(hits), 'Stopped without a recognized capture breakpoint')
            for thread, breakpoint_id in hits:
                (self.entry if breakpoint_id == entry_id else self.exit)(thread)
            if self.pairs >= self.max_samples:
                require(not any(self.pending.values()), 'sample_limit_with_unmatched_entries')
                self.capture_complete = True
                self.stop_reason = 'bounded_contract_sample_limit_reached'
                return
            check_error(self.process.Continue(), 'Continue after capture stop')

    def observe_detached(self, process_unique_id, broadcaster):
        # Public state can lag a successful Detach. Drain once even if a native
        # call exhausted the budget; further polling respects that deadline.
        until = min(self.hard_deadline, time.monotonic() + 0.25)
        while True:
            for _ in range(32):
                event = lldb.SBEvent()
                if not self.listener.GetNextEventForBroadcasterWithType(
                        broadcaster, lldb.SBProcess.eBroadcastBitStateChanged, event):
                    break
                if (lldb.SBProcess.EventIsProcessEvent(event)
                        and lldb.SBProcess.GetProcessFromEvent(event).GetUniqueID() == process_unique_id):
                    state = lldb.SBProcess.GetStateFromEvent(event)
                    self.detach_state_events.append(int(state))
                    if state == lldb.eStateDetached:
                        self.detached_state_observed = True
                        self.detach_observation_source = 'matching_process_state_event'
                        return
            self.detach_last_debugger_state = int(self.process.GetState())
            if self.detach_last_debugger_state == lldb.eStateDetached:
                self.detached_state_observed = True
                self.detach_observation_source = 'process_get_state'
                return
            if time.monotonic() >= until:
                self.cleanup_warnings.append(
                    'Detach(False) succeeded; detached state was not observed within the remaining '
                    'bounded observation period. Resume requires independent verification.')
                return
            time.sleep(0.005)

    def cleanup(self):
        self.timer.cancel()
        process = self.process
        try:
            if process is not None and process.IsValid():
                state = process.GetState()
                if state not in (lldb.eStateStopped, lldb.eStateExited, lldb.eStateDetached,
                                 lldb.eStateInvalid):
                    process.SendAsyncInterrupt()
                    while time.monotonic() < self.hard_deadline:
                        event = lldb.SBEvent()
                        self.listener.GetNextEvent(event)
                        state = process.GetState()
                        if state in (lldb.eStateStopped, lldb.eStateExited, lldb.eStateDetached):
                            break
                        time.sleep(0.01)
        except BaseException as error:
            self.cleanup_errors.append(f'Interrupt before cleanup: {error!r}')
        try:
            if self.target is not None and self.target.IsValid():
                for breakpoint_id in self.owned_breakpoints:
                    try:
                        require(self.target.BreakpointDelete(breakpoint_id),
                                f'Could not delete own breakpoint {breakpoint_id}')
                    except BaseException as error:
                        self.cleanup_errors.append(repr(error))
        except BaseException as error:
            self.cleanup_errors.append(f'Breakpoint cleanup: {error!r}')
        try:
            if process is not None and process.IsValid():
                state = process.GetState()
                if state not in (lldb.eStateExited, lldb.eStateDetached, lldb.eStateInvalid):
                    process_unique_id = process.GetUniqueID()
                    broadcaster = process.GetBroadcaster()
                    check_error(process.Detach(False), 'Detach with keep_stopped=False')
                    self.detach_request_succeeded = True
                    self.observe_detached(process_unique_id, broadcaster)
                else:
                    self.cleanup_errors.append(f'No resume confirmation; final process state={state}')
        except BaseException as error:
            self.cleanup_errors.append(repr(error))


def run(debugger, pid, output_path, timeout_seconds=30, max_samples=1, *,
        research_executable=None, original_arm64=None):
    """Inspect at most max_samples calls; never claim a complete replay fixture."""
    require(isinstance(pid, int) and pid > 0, 'pid must be a positive integer')
    require(isinstance(max_samples, int) and 1 <= max_samples <= 64,
            'max_samples must be an integer in [1, 64]')
    require(isinstance(timeout_seconds, (int, float)) and 5 <= timeout_seconds <= 30,
            'timeout_seconds must be in [5, 30]')
    executable, original = configured_paths(research_executable, original_arm64)
    require(executable.is_file(), f'Approved research executable is missing: {executable}')
    require(original.is_file(), f'Original ARM64 reference is missing: {original}')
    # Exclusive output creation preserves any earlier evidence.
    with Path(output_path).open('x', encoding='utf-8') as output:
        capture = Capture(debugger, pid, output, timeout_seconds, max_samples, executable, original)
        old_async = debugger.GetAsync()
        old_target = debugger.GetSelectedTarget()
        capture.write('metadata', utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      pid=pid, requested_timeout_seconds=timeout_seconds, max_samples=max_samples,
                      original_sha256=ORIGINAL_SHA256, executable=str(executable),
                      original_arm64=str(original),
                      entry_file_address=hex(ENTRY), exit_file_address=hex(EXIT),
                      fixture_complete=False, reset_confirmed=False,
                      limitations=['Capture may begin inside an existing queue or call.',
                                   'Out-of-line queue history and complete terminal coverage are absent.',
                                   'Breakpoint stops alter event cadence.',
                                   'Native SB read/detach calls have no per-call timeout; keep an outer guard.'])
        try:
            capture.timer.start()
            debugger.SetAsync(True)
            expected = original_instructions(capture.original_arm64)
            capture.budget()
            capture.capture(expected)
        except BaseException as error:
            capture.capture_complete = False
            capture.stop_reason = f'{type(error).__name__}: {error}'
            capture.write('capture_error', error=capture.stop_reason,
                          traceback=traceback.format_exc())
        finally:
            capture.cleanup()
            debugger.SetAsync(old_async)
            if old_target.IsValid():
                debugger.SetSelectedTarget(old_target)
            unmatched = [saved for calls in capture.pending.values() for saved in calls]
            deadline_exceeded = time.monotonic() > capture.hard_deadline
            if (unmatched or capture.cleanup_errors or capture.watchdog_error or deadline_exceeded
                    or not capture.detach_request_succeeded or not capture.detached_state_observed):
                capture.capture_complete = False
            capture.write('summary', contract_capture_complete=capture.capture_complete,
                          fixture_complete=False, fixture_incomplete_reasons=[
                              'Reset and complete stroke terminal coverage were not captured.',
                              'Only a bounded contract sample was requested.'],
                          stop_reason=capture.stop_reason, entries=capture.entries, paired_calls=capture.pairs,
                          unmatched_entries=unmatched, cleanup_errors=capture.cleanup_errors,
                          watchdog_error=capture.watchdog_error,
                          detach_request_succeeded=capture.detach_request_succeeded,
                          detached_state_observed=capture.detached_state_observed,
                          detach_observation_source=capture.detach_observation_source,
                          detach_state_events=capture.detach_state_events,
                          detach_last_debugger_state=capture.detach_last_debugger_state,
                          cleanup_warnings=capture.cleanup_warnings,
                          resume_independently_verified=False,
                          deadline_exceeded=deadline_exceeded,
                          owned_breakpoints=capture.owned_breakpoints)
        print(f'CSP capture saved: {output_path}; paired={capture.pairs}; '
              f'contract_complete={capture.capture_complete}; '
              f'detach_acknowledged={capture.detach_request_succeeded}; '
              f'detached_observed={capture.detached_state_observed}; fixture_complete=False', flush=True)
        return {'output_path': str(output_path), 'contract_capture_complete': capture.capture_complete,
                'paired_calls': capture.pairs,
                'detach_request_succeeded': capture.detach_request_succeeded,
                'detached_state_observed': capture.detached_state_observed,
                'resume_independently_verified': False,
                'cleanup_warnings': capture.cleanup_warnings,
                'cleanup_errors': capture.cleanup_errors, 'fixture_complete': False}
