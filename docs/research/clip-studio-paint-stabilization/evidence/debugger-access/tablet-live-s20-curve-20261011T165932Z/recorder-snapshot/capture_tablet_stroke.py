"""Read-only, bounded digitizer stroke inspection; live behavior is unvalidated.

Import inside LLDB already controlling the approved research copy, then call
run(lldb.debugger, pid, output_path). Never attaches, launches, calls target
functions, or writes application memory. Uses four required hardware breakpoints.
Completion describes an instrumented queue arithmetic fixture, not natural
event timing, rendered output, post-correction behavior, or matching pen feel.
"""

import datetime
import hashlib
import math
from pathlib import Path
import struct
import time
import traceback

import capture_live_contract as shared


DISPATCH = 0x1020BDB6C
TERMINAL = 0x1020BDF38
GESTURE_GLOBAL = 0x104D64608
CALLERS = {0x1020BE034: 'digitizer_normal', 0x1020BDEF0: 'digitizer_flush',
           0x1020D9780: 'gesture_normal', 0x1020D960C: 'gesture_flush'}
ADDITIONAL_RANGES = {'digitizer_dispatch': (DISPATCH, 608),
                     'digitizer_terminal': (0x1020BDE40, 320)}


def state(raw):
    shared.require(len(raw) == 236, 'Expected complete 236-byte common queue state')
    return struct.unpack_from('<i', raw, 0x88)[0]


def history_count(raw):
    available = struct.unpack_from('<Q', raw, 0x30)[0]
    collected = struct.unpack_from('<i', raw, 0x38)[0]
    shared.require(0 <= available <= 1000 and available == collected,
                   'Queue history counts disagree or exceed the inspected domain')
    return available


CONFIGURATION_FIELDS = (
    ('stabilization', 0x3c, '<i'), ('fast_motion', 0x40, '<i'),
    ('slow_motion', 0x44, '<i'), ('slow_numerator', 0x48, '<i'),
    ('slow_threshold', 0x4c, '<i'), ('initial_window', 0x50, '<i'),
    ('distance_scale', 0x60, '<d'), ('taper', 0x68, '<i'),
    ('maximum_pressure_decline', 0x70, '<d'), ('retain_at_zero', 0xdc, '<i'),
)


def configuration(raw):
    return {name: {'offset': hex(offset),
                   'bytes_le': raw[offset:offset + struct.calcsize(fmt)].hex(),
                   'value': struct.unpack_from(fmt, raw, offset)[0]}
            for name, offset, fmt in CONFIGURATION_FIELDS}


def unchanged_configuration(before, after):
    for name, offset, fmt in CONFIGURATION_FIELDS:
        length = struct.calcsize(fmt)
        shared.require(before[offset:offset + length] == after[offset:offset + length],
                       f'Queue configuration changed: {name}')


def between_calls(before, after, caller):
    """Allow only wrapper writes established in the inspected digitizer path."""
    unchanged_configuration(before, after)
    expected = bytearray(before)
    changes = []
    # Dispatcher can set decline by packet tool type and clear timestamp gating.
    # Terminal wrapper additionally sets queue state to 2 before its first call.
    allowed = [(0xd8, (0, 1), 'digitizer dispatcher decline flag'),
               (0xe0, (0,), 'digitizer dispatcher or terminal wrapper clears gating')]
    if caller == 'digitizer_flush':
        allowed.append((0x88, (2,), 'digitizer terminal wrapper sets ending state'))
    for offset, values, explanation in allowed:
        if before[offset:offset + 4] != after[offset:offset + 4]:
            value = struct.unpack_from('<i', after, offset)[0]
            shared.require(value in values, f'Unexpected wrapper value at {offset:#x}')
            changes.append({'offset': hex(offset),
                            'before_bytes_le': before[offset:offset + 4].hex(),
                            'after_bytes_le': after[offset:offset + 4].hex(),
                            'static_explanation': explanation,
                            'individual_write_instruction_observed': False})
            expected[offset:offset + 4] = after[offset:offset + 4]
    shared.require(bytes(expected) == after, 'Unexplained queue mutation between ingestion calls')
    return changes


class StrokeContract:
    def __init__(self):
        self.started = False
        self.complete = False
        self.end_seen = False
        self.fixture_calls = []
        self.pending = None
        self.previous_exit = None
        self.final_pair = None
        self.final_from_flush = False
        self.terminal_observed = False
        self.input_end_seen = False
        self.native_release_seen = False
        self.native_release_returned = False
        self.pending_source_kind = None
        self.final_source_returned = False
        self.initial_history = None

    def begin_call(self, call_id, raw, phase, caller, bypass, inputs, initial_history=None):
        shared.require(self.pending is None, 'Nested or unpaired digitizer ingestion')
        shared.require(not self.complete, 'Digitizer ingestion after completed fixture')
        shared.require(self.final_pair is None or not self.final_from_flush or self.terminal_observed,
                       'Digitizer ingestion after final flush before terminal completion')
        shared.require(caller in ('digitizer_normal', 'digitizer_flush'), 'Unexpected digitizer caller')
        shared.require(phase in (1, 2, 3), 'Unexpected input phase')
        shared.require(all(math.isfinite(value) for value in inputs), 'Nonfinite digitizer input')
        shared.require(state(raw) in (0, 1, 2), 'Unexpected queue state')
        count = history_count(raw)
        candidate = not self.started and phase == 2
        if candidate:
            shared.require(caller == 'digitizer_normal' and state(raw) == 0,
                           'Begin requires normal caller and idle state')
            shared.require(bypass == 0, 'Bypassed begin cannot establish stabilized sequence')
            history = [] if initial_history is None else initial_history
            shared.require(len(history) == count and all(len(record) == 32 for record in history),
                           'Begin requires complete initial out-of-line history or empty history')
            shared.require(all(all(math.isfinite(value) for value in struct.unpack('<dddq', record)[:3])
                               for record in history), 'Nonfinite initial queue history')
            self.initial_history = list(history)
        if self.started:
            shared.require(phase != 2, 'Second begin before completed stroke')
            if self.final_pair is not None:
                shared.require(state(raw) == 0, 'New active segment after provisional final phase')
            changes = between_calls(self.previous_exit, raw, caller)
        else:
            changes = []
        included = self.started or candidate
        self.pending = {'call_id': call_id, 'raw': raw, 'candidate': candidate,
                        'included': included, 'phase': phase, 'caller': caller, 'bypass': bypass}
        if included:
            self.fixture_calls.append(call_id)
            self.end_seen = self.end_seen or phase == 3
            self.input_end_seen = self.input_end_seen or phase == 3
        return {'included': included, 'begin_candidate': candidate,
                'exclusion_reason': None if included else 'waiting_for_idle_phase_2_begin',
                'between_call_changes': changes}

    def source_event(self, kind):
        # Dispatcher event 2 invokes reset; 6/9 enter native release handling.
        if kind == 2:
            shared.require(not self.started and self.pending is None,
                           'Native proximity reset interrupted captured digitizer stroke')
        if self.started and (kind in (6, 9) or self.native_release_returned):
            shared.require(self.pending_source_kind is None, 'Nested observed native source')
            self.pending_source_kind = kind
        if self.started and kind in (6, 9):
            self.native_release_seen = True
            self.end_seen = True

    def source_return(self, raw):
        shared.require(self.started and self.pending_source_kind is not None and self.pending is None,
                       'Unmatched native source return')
        shared.require(raw == self.previous_exit, 'Queue changed before native source returned')
        shared.require(state(raw) in (0, 2), 'Ending source returned outside idle or pending-end state')
        if state(raw) == 0:
            shared.require(self.final_pair is not None, 'Ending source returned idle without final emitted phase')
            self.final_source_returned = True
        if self.pending_source_kind in (6, 9):
            self.native_release_returned = True
        self.pending_source_kind = None
        self.update_completion()

    def update_completion(self):
        self.complete = (self.final_pair is not None and self.native_release_returned
                         and self.final_source_returned and self.pending_source_kind is None
                         and (not self.final_from_flush or self.terminal_observed))

    def finish_call(self, call_id, raw, phase, emitted):
        saved = self.pending
        shared.require(saved is not None and saved['call_id'] == call_id, 'Unmatched digitizer exit')
        shared.require(state(raw) in (0, 1, 2) and phase in (1, 2, 3), 'Unexpected exit state or phase')
        count = history_count(raw)
        if saved['included']:
            unchanged_configuration(saved['raw'], raw)
            expected = history_count(saved['raw']) + (saved['bypass'] == 0)
            shared.require(count == min(1000, expected), 'History count does not account for every ingestion')
            if saved['candidate']:
                shared.require(emitted and phase == 2 and state(raw) == 1,
                               'Begin did not emit phase 2 and enter active state')
                self.started = True
            if self.final_pair is not None:
                shared.require(state(raw) == 0 and phase != 2,
                               'New active segment after provisional final phase')
            if emitted and phase == 3:
                shared.require(state(raw) == 0, 'Final emitted phase has non-idle queue state')
                if self.final_pair is None:
                    self.final_pair = call_id
                    self.final_from_flush = saved['caller'] == 'digitizer_flush'
                self.update_completion()
            self.previous_exit = raw
        self.pending = None

    def terminal(self, raw, phase):
        shared.require(self.pending is None, 'Terminal completion with an unmatched ingestion')
        if not self.started:
            return False
        shared.require(self.final_pair is not None and self.final_from_flush,
                       'Terminal wrapper finished without captured final emitted phase')
        shared.require(phase == 3 and state(raw) == 0, 'Terminal wrapper did not finish idle at phase 3')
        shared.require(raw == self.previous_exit, 'Queue changed between final ingestion and terminal completion')
        self.terminal_observed = True
        self.update_completion()
        return True

    def incomplete_reasons(self):
        if self.complete:
            return []
        reasons = []
        if not self.started:
            reasons.append('No confirmed phase-2/state-0 begin with complete initial history and phase-2/state-1 output.')
        if not self.end_seen and not self.terminal_observed:
            reasons.append('Neither an end input nor terminal-wrapper completion was observed.')
        if self.final_pair is None:
            reasons.append('No final emitted phase-3/state-0 pair was captured.')
        if self.final_from_flush and not self.terminal_observed:
            reasons.append('Final flush arithmetic was captured but terminal-wrapper completion was not.')
        if not self.native_release_returned:
            reasons.append('Native release source has not been observed returning to its caller.')
        if not self.final_source_returned or self.pending_source_kind is not None:
            reasons.append('The native source handler producing the final phase has not returned.')
        if self.pending is not None:
            reasons.append('An ingestion entry has no matching exit.')
        return reasons


class TabletCapture(shared.Capture):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.stroke = StrokeContract()
        self.digitizer_queue = None
        self.initial_fpcr = None
        self.source_events = 0
        self.latest_source_by_thread = {}
        self.source_boundary = None
        self.callbacks = {}
        self.source_breakpoint = None

    def singleton(self, file_address):
        return struct.unpack('<Q', self.memory(self.load_address(file_address), 8))[0]

    def check_singleton(self):
        shared.require(self.singleton(shared.QUEUE_GLOBAL) == self.digitizer_queue,
                       'Digitizer singleton changed during capture')

    def initial_history(self, raw):
        count = history_count(raw)
        if count == 0:
            return []
        map_begin, map_end = struct.unpack_from('<QQ', raw, 0x10)
        front = struct.unpack_from('<Q', raw, 0x28)[0]
        shared.require(map_begin != 0 and map_end >= map_begin and (map_end - map_begin) % 8 == 0,
                       'Invalid deque map range')
        shared.require(front + count < 2**64, 'Deque logical index overflow')
        first_slot, last_slot = front >> 7, (front + count - 1) >> 7
        shared.require(last_slot < (map_end - map_begin) // 8 and last_slot - first_slot < 9,
                       'Deque block slots exceed available map or bounded capture domain')
        slots = self.memory(map_begin + 8 * first_slot, 8 * (last_slot - first_slot + 1))
        records = []
        for slot in range(first_slot, last_slot + 1):
            block = struct.unpack_from('<Q', slots, 8 * (slot - first_slot))[0]
            first = max(front, slot * 128)
            end = min(front + count, (slot + 1) * 128)
            address = block + 32 * (first & 127)
            shared.require(block != 0 and address + 32 * (end - first) < 2**64,
                           'Invalid deque record block address')
            chunk = self.memory(address, 32 * (end - first))
            records.extend(chunk[offset:offset + 32] for offset in range(0, len(chunk), 32))
        shared.require(len(records) == count, 'Incomplete initial deque extraction')
        return records

    def entry(self, thread):
        shared.require(self.entries < self.max_samples, 'call_limit_reached_before_stroke_completion')
        frame = thread.GetFrameAtIndex(0)
        registers = {f'x{index}': self.reg(frame, f'x{index}') for index in range(8)}
        return_address = self.reg(frame, 'x30')
        caller = next((label for address, label in CALLERS.items()
                       if self.load_address(address) == return_address), None)
        tid = thread.GetThreadID()
        calls = self.pending.setdefault(tid, [])
        shared.require(len(calls) < 8, 'Per-thread nesting exceeds capture limit')
        saved = {'call_id': self.entries + 1, 'thread_id': tid, 'queue': registers['x0'],
                 'phase': registers['x1'], 'output': registers['x7'], 'sp': self.reg(frame, 'sp'),
                 'caller_family': caller, 'x30': return_address}
        calls.append(saved)
        self.entries += 1
        self.write('entry_pairing', **{**saved, 'queue': hex(saved['queue']),
                                     'phase': hex(saved['phase']), 'output': hex(saved['output']),
                                     'sp': hex(saved['sp']), 'x30': hex(return_address)}, depth=len(calls))
        shared.require(caller is not None, 'Unknown shared-ingestion return address')
        self.check_singleton()
        ignored = caller.startswith('gesture_')
        expected_queue = self.singleton(GESTURE_GLOBAL) if ignored else self.digitizer_queue
        shared.require(saved['queue'] == expected_queue and expected_queue != 0,
                       'Caller family does not match its queue singleton')
        saved['ignored_queue'] = ignored
        raw = self.memory(saved['queue'], 236)
        phase = self.phase(saved['phase'])
        fpcr, fpsr = self.reg(frame, 'fpcr') & 0xffffffff, self.reg(frame, 'fpsr') & 0xffffffff
        saved['fpcr'] = fpcr
        doubles = {f'd{index}': shared.float_record(struct.pack('<Q', self.reg(frame, f'd{index}')))
                   for index in range(3)}
        values = self.active_globals()
        history = None
        if not ignored and not self.stroke.started and phase['value_i32'] == 2 and state(raw) == 0:
            history = self.initial_history(raw)
        self.write('entry', call_id=saved['call_id'], thread_id=tid,
                   caller_family=caller, return_load_address=hex(return_address), ignored_queue=ignored,
                   registers={name: {'bits': f'0x{value:016x}', 'unsigned_decimal': str(value),
                                     'signed_decimal': str(value if value < 2**63 else value - 2**64)}
                              for name, value in registers.items()},
                   floating_registers=doubles, fpcr_bits=f'0x{fpcr:08x}', fpsr_bits=f'0x{fpsr:08x}',
                   phase=phase, queue=shared.queue_record(saved['queue'], raw),
                   configuration=configuration(raw), active_globals=values, call_stack=self.stack(thread),
                   latest_observed_source_event_id=self.latest_source_by_thread.get(tid),
                   initial_history_oldest_first=None if history is None else [
                       {'bytes_le': record.hex(), 'x': shared.float_record(record[:8]),
                        'y': shared.float_record(record[8:16]),
                        'pressure': shared.float_record(record[16:24]),
                        'timestamp_signed_decimal': str(struct.unpack_from('<q', record, 24)[0])}
                       for record in history])
        self.check_globals(values)
        if not ignored:
            if self.initial_fpcr is not None:
                shared.require(fpcr == self.initial_fpcr, 'FPCR changed during numerical fixture')
            classification = self.stroke.begin_call(
                saved['call_id'], raw, phase['value_i32'], caller, registers['x6'] & 0xffffffff,
                [struct.unpack('<d', bytes.fromhex(doubles[f'd{index}']['bytes_le']))[0]
                 for index in range(3)], history)
            if classification['begin_candidate']:
                self.initial_fpcr = fpcr
            self.write('entry_contract', call_id=saved['call_id'], **classification)
        else:
            self.write('entry_contract', call_id=saved['call_id'], included=False,
                       exclusion_reason='gesture_queue_is_outside_digitizer_fixture')

    def exit(self, thread):
        tid = thread.GetThreadID()
        calls = self.pending.get(tid, [])
        shared.require(bool(calls), f'Unmatched exit on thread {tid}')
        saved = calls[-1]
        frame = thread.GetFrameAtIndex(0)
        shared.require(self.reg(frame, 'sp') == saved['sp'] - 0xb0,
                       f'Stack pairing mismatch for call {saved["call_id"]}')
        emitted = self.reg(frame, 'w0') & 0xffffffff
        fpcr, fpsr = self.reg(frame, 'fpcr') & 0xffffffff, self.reg(frame, 'fpsr') & 0xffffffff
        values = self.active_globals()
        raw = self.memory(saved['queue'], 236)
        phase = self.phase(saved['phase'])
        fields = {'call_id': saved['call_id'], 'thread_id': tid,
                  'caller_family': saved['caller_family'], 'ignored_queue': saved['ignored_queue'],
                  'w0_bits': f'0x{emitted:08x}', 'emitted': emitted != 0, 'phase': phase,
                  'queue': shared.queue_record(saved['queue'], raw), 'active_globals': values,
                  'fpcr_bits': f'0x{fpcr:08x}', 'fpsr_bits': f'0x{fpsr:08x}'}
        if emitted:
            output = self.memory(saved['output'] + 8, 24)
            fields['output'] = {'address': hex(saved['output']), 'bytes_at_08_le': output.hex(),
                                'x': shared.float_record(output[:8]), 'y': shared.float_record(output[8:16]),
                                'pressure': shared.float_record(output[16:24])}
        self.write('exit', **fields)
        self.check_singleton()
        self.check_globals(values)
        shared.require(fpcr == saved['fpcr'], 'FPCR changed within ingestion')
        if not saved['ignored_queue']:
            if emitted:
                shared.require(all(math.isfinite(value) for value in struct.unpack('<ddd', output)),
                               'Nonfinite emitted digitizer output')
            self.stroke.finish_call(saved['call_id'], raw, phase['value_i32'], emitted != 0)
        calls.pop()
        self.pairs += 1

    def dispatch(self, thread):
        shared.require(self.source_events < 2048, 'source_event_limit_reached_before_stroke_completion')
        frame = thread.GetFrameAtIndex(0)
        queue_address = self.reg(frame, 'x0')
        kind = self.reg(frame, 'x1') & 0xffffffff
        packet_address = self.reg(frame, 'x2')
        self.check_singleton()
        shared.require(queue_address == self.digitizer_queue, 'Unexpected digitizer dispatcher queue')
        raw = self.memory(queue_address, 236)
        packet = self.memory(packet_address, 96)
        values = self.active_globals()
        self.source_events += 1
        tid = thread.GetThreadID()
        self.latest_source_by_thread[tid] = self.source_events
        self.write('native_dispatch', source_event_id=self.source_events, thread_id=tid,
                   event_kind_u32=kind, native_release=kind in (6, 9),
                   queue=shared.queue_record(queue_address, raw),
                   packet={'address': hex(packet_address), 'size': 96, 'bytes_le': packet.hex()},
                   callback_pointer=hex(self.reg(frame, 'x3')),
                   return_load_address=hex(self.reg(frame, 'x30')), active_globals=values)
        self.check_globals(values)
        self.stroke.source_event(kind)
        if self.stroke.pending_source_kind is not None:
            self.arm_source_return(thread, kind)

    def replace_source_observation(self, address, label, callback):
        previous = self.source_breakpoint
        shared.require(previous is not None and previous in self.callbacks,
                       'Missing owned source observation for breakpoint rotation')
        shared.require(self.target.BreakpointDelete(previous), 'Could not remove own source breakpoint')
        self.owned_breakpoints.remove(previous)
        del self.callbacks[previous]
        self.source_breakpoint = self.hardware_breakpoint(address, label)
        self.callbacks[self.source_breakpoint] = (address, callback)
        self.write('source_breakpoint_rotated', previous_id=previous,
                   current_id=self.source_breakpoint, label=label,
                   load_address=hex(address), active_owned_breakpoints=len(self.owned_breakpoints))
        shared.require(len(self.owned_breakpoints) == 4, 'Expected exactly four owned hardware observations')

    def verify_source_return_address(self, address):
        # The executable has one slide; resolving the resulting file address
        # proves this return lies inside the approved module before reading it.
        file_address = address - self.load_address(DISPATCH) + DISPATCH
        shared.require(file_address > 0 and file_address % 4 == 0
                       and self.load_address(file_address) == address,
                       'Native source return is outside approved executable')
        expected = read_reference_ranges(self.original_arm64, {'native_source_return': (file_address, 4)})
        self.verify_instructions(expected)
        return file_address

    def arm_source_return(self, thread, kind):
        shared.require(self.source_boundary is None, 'Source return observation is already active')
        frame = thread.GetFrameAtIndex(0)
        address = self.reg(frame, 'x30')
        file_address = self.verify_source_return_address(address)
        self.source_boundary = {'thread_id': thread.GetThreadID(), 'sp': self.reg(frame, 'sp'),
                                 'return_load_address': address, 'return_file_address': file_address,
                                 'source_event_id': self.source_events, 'event_kind': kind}
        self.write('native_source_pairing', **self.source_boundary)
        self.replace_source_observation(address, 'native_source_return', self.source_return)

    def source_return(self, thread):
        saved = self.source_boundary
        shared.require(saved is not None, 'Unpaired native source return breakpoint')
        frame = thread.GetFrameAtIndex(0)
        shared.require(thread.GetThreadID() == saved['thread_id'] and self.reg(frame, 'sp') == saved['sp'],
                       'Native source return thread or stack pairing mismatch')
        shared.require(not any(self.pending.values()), 'Native source returned with unmatched ingestion calls')
        self.check_singleton()
        raw = self.memory(self.digitizer_queue, 236)
        values = self.active_globals()
        self.write('native_source_return', **saved, queue=shared.queue_record(self.digitizer_queue, raw),
                   active_globals=values)
        self.check_globals(values)
        self.stroke.source_return(raw)
        self.source_boundary = None
        self.replace_source_observation(self.load_address(DISPATCH), 'digitizer_native_dispatch', self.dispatch)

    def terminal(self, thread):
        frame = thread.GetFrameAtIndex(0)
        queue_address, packet_address = self.reg(frame, 'x21'), self.reg(frame, 'x20')
        sp = self.reg(frame, 'sp')
        self.check_singleton()
        shared.require(queue_address == self.digitizer_queue, 'Unexpected terminal-wrapper queue')
        raw = self.memory(queue_address, 236)
        phase = self.phase(sp + 4)
        values = self.active_globals()
        self.write('terminal_wrapper_complete', thread_id=thread.GetThreadID(),
                   queue=shared.queue_record(queue_address, raw), phase=phase,
                   input_packet={'address': hex(packet_address), 'size': 96,
                                 'bytes_le': self.memory(packet_address, 96).hex()},
                   output_packet={'address': hex(sp + 8), 'size': 32,
                                  'bytes_le': self.memory(sp + 8, 32).hex()},
                   callback_pointer=hex(self.reg(frame, 'x19')), active_globals=values,
                   included=self.stroke.started)
        self.check_globals(values)
        self.stroke.terminal(raw, phase['value_i32'])

    def verify_instructions(self, expected):
        for label, (address, reference) in expected.items():
            actual = self.memory(self.load_address(address), len(reference))
            self.write('instruction_verification', label=label, file_address=hex(address),
                       size=len(reference), actual_sha256=hashlib.sha256(actual).hexdigest(),
                       expected_sha256=hashlib.sha256(reference).hexdigest(), matches=actual == reference)
            shared.require(actual == reference, f'Loaded {label} instructions differ from original')

    def capture(self, expected):
        self.select_process()
        self.verify_instructions(expected)
        self.initial_globals = self.active_globals()
        self.digitizer_queue = self.singleton(shared.QUEUE_GLOBAL)
        shared.require(self.digitizer_queue != 0, 'Digitizer singleton is not initialized')
        self.write('initial_state', active_globals=self.initial_globals,
                   singleton_file_address=hex(shared.QUEUE_GLOBAL),
                   queue=self.queue(self.digitizer_queue), out_of_line_history_captured=False,
                   initial_history_strategy='capture at candidate begin; otherwise require empty history')
        observations = [(shared.ENTRY, 'shared_ingestion_entry', self.entry),
                        (shared.EXIT, 'shared_ingestion_exit', self.exit),
                        (TERMINAL, 'digitizer_terminal_complete', self.terminal),
                        (DISPATCH, 'digitizer_native_dispatch', self.dispatch)]
        for file_address, label, callback in observations:
            address = self.load_address(file_address)
            breakpoint_id = self.hardware_breakpoint(address, label)
            self.callbacks[breakpoint_id] = (address, callback)
            if file_address == DISPATCH:
                self.source_breakpoint = breakpoint_id
        last_stop = self.process.GetStopID()
        shared.check_error(self.process.Continue(), 'Continue after installing tablet capture breakpoints')
        self.write('capture_started', breakpoint_ids=list(self.callbacks), max_calls=self.max_samples)
        print('CSP tablet capture active; waiting for one new pen stroke. Instrumented capture <=30s.', flush=True)
        while True:
            last_stop = self.wait_capture_stop(last_stop)
            hits = []
            for index in range(self.process.GetNumThreads()):
                thread = self.process.GetThreadAtIndex(index)
                reason = thread.GetStopReason()
                if reason == shared.lldb.eStopReasonNone:
                    continue
                data = [thread.GetStopReasonDataAtIndex(i) for i in range(thread.GetStopReasonDataCount())]
                self.write('thread_stop', thread_id=thread.GetThreadID(), reason=int(reason), data=data)
                shared.require(reason == shared.lldb.eStopReasonBreakpoint and len(data) == 2,
                               f'Unexpected stop reason/data on thread {thread.GetThreadID()}')
                shared.require(data[0] in self.callbacks, f'Unowned breakpoint {data[0]} stopped capture')
                address, callback = self.callbacks[data[0]]
                shared.require(thread.GetFrameAtIndex(0).GetPC() == address, 'Stopped PC differs from breakpoint')
                hits.append((thread, callback))
            shared.require(len(hits) == 1, 'Capture requires one unambiguous ordered breakpoint stop')
            thread, callback = hits[0]
            callback(thread)
            if self.stroke.complete:
                shared.require(not any(self.pending.values()), 'Completed stroke retains unmatched calls')
                self.capture_complete = True
                self.stop_reason = 'digitizer_queue_fixture_complete'
                return
            shared.check_error(self.process.Continue(), 'Continue after tablet capture stop')


def read_reference_ranges(original, requested):
    expected = {}
    data = Path(original).read_bytes()
    shared.require(hashlib.sha256(data).hexdigest() == shared.ORIGINAL_SHA256, 'Original fingerprint differs')
    position = 32
    segments = []
    for _ in range(struct.unpack_from('<I', data, 16)[0]):
        command, size = struct.unpack_from('<II', data, position)
        shared.require(size >= 8 and position + size <= len(data), 'Invalid original load command')
        if command == 0x19:
            segments.append(struct.unpack_from('<QQQQ', data, position + 24))
        position += size
    for label, (address, size) in requested.items():
        for start, _, offset, length in segments:
            if start <= address and address + size <= start + length:
                raw = data[offset + address - start:offset + address - start + size]
                shared.require(len(raw) == size, f'Incomplete original {label} bytes')
                expected[label] = (address, raw)
                break
        shared.require(label in expected, f'Original {label} range is not mapped')
    return expected


def reference_instructions(original):
    expected = {'shared_ingestion': (shared.ENTRY, shared.original_instructions(original))}
    expected.update(read_reference_ranges(original, ADDITIONAL_RANGES))
    return expected


def run(debugger, pid, output_path, timeout_seconds=30, max_calls=512, *,
        research_executable=None, original_arm64=None):
    """Record a single digitizer arithmetic fixture, with explicit incomplete outcomes."""
    shared.require(isinstance(pid, int) and pid > 0, 'pid must be a positive integer')
    shared.require(isinstance(max_calls, int) and 1 <= max_calls <= 512, 'max_calls must be in [1, 512]')
    shared.require(isinstance(timeout_seconds, (int, float)) and 5 <= timeout_seconds <= 30,
                   'timeout_seconds must be in [5, 30]')
    executable, original = shared.configured_paths(research_executable, original_arm64)
    shared.require(executable.is_file(), f'Approved research executable is missing: {executable}')
    shared.require(original.is_file(), f'Original ARM64 reference is missing: {original}')
    with Path(output_path).open('x', encoding='utf-8') as output:
        recorder = TabletCapture(debugger, pid, output, timeout_seconds, max_calls, executable, original)
        old_async, old_target = debugger.GetAsync(), debugger.GetSelectedTarget()
        recorder.write('metadata', utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                       pid=pid, requested_timeout_seconds=timeout_seconds, max_calls=max_calls,
                       original_sha256=shared.ORIGINAL_SHA256, executable=str(executable),
                       original_arm64=str(original), fixture_scope='instrumented_digitizer_queue_arithmetic',
                       tablet_capture_implementation_live_validated=False,
                       breakpoint_file_addresses=[hex(address) for address in
                                                  (shared.ENTRY, shared.EXIT, TERMINAL, DISPATCH)],
                       limitations=['Breakpoint stops alter native event cadence and may affect event delivery.',
                                    'Natural latency, rendered output, and pen feel are not certified.',
                                    'Post-correction and downstream brush operations are not captured.',
                                    'Terminal mode 1 may need later input; timeout remains incomplete.',
                                    'Native SB calls have no per-call timeout; keep an outer guard.'])
        try:
            recorder.timer.start()
            debugger.SetAsync(True)
            expected = reference_instructions(original)
            recorder.budget()
            recorder.capture(expected)
        except BaseException as error:
            recorder.capture_complete = False
            recorder.stop_reason = f'{type(error).__name__}: {error}'
            recorder.write('capture_error', error=recorder.stop_reason, traceback=traceback.format_exc())
        finally:
            recorder.cleanup()
            debugger.SetAsync(old_async)
            if old_target.IsValid():
                debugger.SetSelectedTarget(old_target)
            unmatched = [saved for calls in recorder.pending.values() for saved in calls]
            overrun = time.monotonic() > recorder.hard_deadline
            if (unmatched or recorder.cleanup_errors or recorder.watchdog_error or overrun
                    or not recorder.detach_request_succeeded or not recorder.detached_state_observed):
                recorder.capture_complete = False
            reasons = recorder.stroke.incomplete_reasons()
            if not recorder.capture_complete:
                reasons.append(recorder.stop_reason)
                if unmatched:
                    reasons.append('Unmatched debugger entry records remain.')
                if recorder.cleanup_errors or not recorder.detached_state_observed:
                    reasons.append('Debugger cleanup or detached-state verification is incomplete.')
                if overrun or recorder.watchdog_error:
                    reasons.append('Deadline or watchdog guarantee was not satisfied.')
            recorder.write('summary', fixture_complete=recorder.capture_complete,
                           fixture_scope='instrumented_digitizer_queue_arithmetic',
                           fixture_incomplete_reasons=reasons, stop_reason=recorder.stop_reason,
                           entries=recorder.entries, paired_calls=recorder.pairs,
                           fixture_call_ids=recorder.stroke.fixture_calls, source_events=recorder.source_events,
                           confirmed_begin=recorder.stroke.started, input_end_seen=recorder.stroke.input_end_seen,
                           native_release_seen=recorder.stroke.native_release_seen,
                           native_release_returned=recorder.stroke.native_release_returned,
                           final_source_returned=recorder.stroke.final_source_returned,
                           unmatched_source_boundary=recorder.source_boundary,
                           terminal_wrapper_observed=recorder.stroke.terminal_observed,
                           final_pair_id=recorder.stroke.final_pair,
                           initial_history_count=None if recorder.stroke.initial_history is None
                           else len(recorder.stroke.initial_history), unmatched_entries=unmatched,
                           cleanup_errors=recorder.cleanup_errors, cleanup_warnings=recorder.cleanup_warnings,
                           watchdog_error=recorder.watchdog_error, deadline_exceeded=overrun,
                           detach_request_succeeded=recorder.detach_request_succeeded,
                           detached_state_observed=recorder.detached_state_observed,
                           detach_observation_source=recorder.detach_observation_source,
                           detach_state_events=recorder.detach_state_events,
                           resume_independently_verified=False, owned_breakpoints=recorder.owned_breakpoints)
        print(f'CSP tablet capture saved: {output_path}; pairs={recorder.pairs}; '
              f'fixture_complete={recorder.capture_complete}; '
              f'detached_observed={recorder.detached_state_observed}', flush=True)
        return {'output_path': str(output_path), 'fixture_complete': recorder.capture_complete,
                'paired_calls': recorder.pairs, 'stop_reason': recorder.stop_reason,
                'detached_state_observed': recorder.detached_state_observed,
                'cleanup_errors': recorder.cleanup_errors, 'resume_independently_verified': False}
