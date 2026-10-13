"""Bounded source-entry plus post-wrapper inspection of an already attached copy.

No launch, attachment, target expression, memory write, or software breakpoint.
Source calls are observed at entry only. The completed post wrapper supplies the
end of the joined observation; individual source returns are not claimed.
"""

import datetime
import hashlib
from pathlib import Path
import struct
import time
import traceback

from capture_live_contract import (CaptureError, ORIGINAL_SHA256, check_error,
                                   configured_paths, require)
from capture_post_correction import PostCapture, ENTRY, RETURN, MAX_NODES


BEGIN = 0x1028ebd40
APPEND = 0x1028ec548
FINISH = 0x1028ec8d0
BEGIN_CALLER = 0x10288ad38
APPEND_CALLER = 0x10288e2d8
GENERATED_CALLER = 0x10288dda0
FINISH_CALLER = 0x102891848
POST_CALLER = 0x102891d5c
MAX_RECORDS = 256
MAX_TIMESTAMPS = 256
PRIMARY_HOLDERS = 0x104d6e0f0
PRIMARY_MOVEMENTS = 0x104d6e100
MOVEMENT_VTABLE = 0x104a5a2f0

# Full source/wrapper bodies and the exact ordinary caller slices used below.
INSTRUCTION_RANGES = (
    (BEGIN, 0x2a4), (APPEND, 0x27c), (FINISH, 0xf4), (ENTRY, 0x11c),
    (0x10288cd3c, 0x1bc), (0x10288acb8, 0x240),
    (0x10288db40, 0x280), (0x10288e244, 0x98),
    (0x102891748, 0x12c), (0x102891d2c, 0x34),
    (0x102194e64, 4), (0x102072aa4, 8),
)


def original_instruction_ranges(path):
    data = Path(path).read_bytes()
    require(hashlib.sha256(data).hexdigest() == ORIGINAL_SHA256,
            'Original ARM64 reference fingerprint differs')
    require(struct.unpack_from('<I', data)[0] == 0xfeedfacf, 'Expected thin Mach-O')
    segments, position = [], 32
    for _ in range(struct.unpack_from('<I', data, 16)[0]):
        command, size = struct.unpack_from('<II', data, position)
        require(size >= 8 and position + size <= len(data), 'Invalid load command')
        if command == 0x19:
            start, _, offset, length = struct.unpack_from('<QQQQ', data, position + 24)
            segments.append((start, offset, length))
        position += size
    result = {}
    for address, size in INSTRUCTION_RANGES:
        for start, offset, length in segments:
            if start <= address and address + size <= start + length:
                result[address] = data[offset + address - start:offset + address - start + size]
                require(len(result[address]) == size, 'Incomplete original instruction range')
                break
        require(address in result, f'Unmapped original instructions {address:#x}')
    return result


class JoinedPostCapture(PostCapture):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.probes = {}
        self.source_sequence = 0
        self.source_stage = 'awaiting_begin'
        self.source_holder = None
        self.source_thread = None
        self.source_path = None
        self.source_configuration = None
        self.upstream_complete = True
        self.source_brush = None
        self.source_movement = None
        self.previous_startup_counter = None
        self.verified_platform = None

    def arm(self, name, address, callback):
        require(name not in self.probes and len(self.probes) < 4,
                'Joined capture hardware breakpoint limit or duplicate name')
        loaded = self.load_address(address)
        identifier = self.hardware_breakpoint(loaded, name)
        self.probes[name] = (identifier, loaded, callback)

    def delete_breakpoint(self, identifier):
        require(self.target.BreakpointDelete(identifier),
                f'Could not delete own joined breakpoint {identifier}')

    def remove_probe(self, name):
        if name not in self.probes:
            return
        identifier, address, _ = self.probes[name]
        self.delete_breakpoint(identifier)
        self.owned_breakpoints.remove(identifier)
        del self.probes[name]
        self.write('breakpoint_remove', label=name, id=identifier, address=hex(address))

    def install_initial_probes(self):
        for operation, address in (('begin', BEGIN), ('append', APPEND), ('finish', FINISH)):
            self.arm('source_' + operation, address,
                     lambda thread, operation=operation: self.source_entry(operation, thread))
        self.arm('post_entry', ENTRY, self.entry)

    def pointer(self, address):
        return struct.unpack('<Q', self.memory(address, 8))[0]

    def first_vector_object(self, global_address):
        descriptor = self.pointer(self.load_address(global_address))
        raw = self.memory(descriptor, 24)
        begin, end, capacity = struct.unpack('<QQQ', raw)
        require(begin != 0 and begin <= end <= capacity
                and (end - begin) % 16 == 0 and end - begin == 16,
                'Joined profile requires exactly one primary vector object')
        return self.pointer(begin)

    def first_primary_holder(self):
        return self.first_vector_object(PRIMARY_HOLDERS)

    def holder_snapshot(self, holder):
        result = {'stateHex': '', 'complete': False, 'errors': []}
        try:
            result['pathAddress'] = hex(self.pointer(holder + 0x18))
            # Last established field is uint32 +0x158, ending at +0x15c.
            result['stateHex'] = self.memory(holder + 0x118, 0x44).hex()
            result['complete'] = True
        except Exception as error:
            result['errors'].append(f'{type(error).__name__}: {error}')
        return result

    def movement_snapshot(self, address):
        result = {'address': hex(address), 'bytesHex': '', 'timestamps': [],
                  'complete': False, 'errors': []}
        try:
            prefix = self.memory(address, 8)
            result['bytesHex'] = prefix.hex()
            require(struct.unpack('<Q', prefix)[0] == self.load_address(MOVEMENT_VTABLE),
                    'Unexpected movement vtable')
            raw = self.memory(address, 0x90)
            result['bytesHex'] = raw.hex()
            require(struct.unpack_from('<Q', raw)[0] == self.load_address(MOVEMENT_VTABLE),
                    'Unexpected movement vtable')
            begin, end = struct.unpack_from('<QQ', raw, 0x20)
            first, count = struct.unpack_from('<QQ', raw, 0x38)
            require(count <= MAX_TIMESTAMPS, 'Movement timestamp count exceeds capture limit')
            require(begin <= end and (end - begin) % 8 == 0,
                    'Invalid movement timestamp map')
            require(first + count < 2**64, 'Movement timestamp index overflow')
            for index in range(count):
                logical = first + index
                slot = begin + 8 * (logical >> 9)
                require(begin != 0 and begin <= slot and slot + 8 <= end,
                        'Movement timestamp block outside active map')
                block = self.pointer(slot)
                require(block != 0 and block + 8 * (logical & 511) + 8 < 2**64,
                        'Invalid movement timestamp block')
                result['timestamps'].append(self.memory(block + 8 * (logical & 511), 8).hex())
            result['complete'] = True
        except Exception as error:
            result['errors'].append(f'{type(error).__name__}: {error}')
        return result

    def upstream_snapshot(self, operation, caller, frame, sp):
        result = {'complete': False, 'errors': [], 'kind': 'brush_event_constructor_inputs'}
        try:
            if operation == 'finish':
                brush, event = self.reg(frame, 'x20'), self.reg(frame, 'x25')
                point_offset, movement_offset = 0x2d0, 0x110
                fresh = struct.unpack('<I', self.memory(sp + 0x3c, 4))[0]
                result['freshRecord'] = fresh
                if fresh == 0:
                    result['errors'].append('Finish reused a supplied record; its earlier constructor inputs are not inferred.')
            else:
                brush, event = self.reg(frame, 'x19'), self.reg(frame, 'x20')
                point_offset, movement_offset = (0x190, None) if operation == 'begin' else (0x1e0, 0x278)
            result.update(brush=hex(brush), event=hex(event))
            require(self.source_brush in (None, brush), 'Source brush identity changed')
            self.source_brush = brush
            result['brushFields'] = {}
            for offset, size in ((0x128, 8), (0x148, 8), (0x190, 8), (0x1a0, 4)):
                result['brushFields'][hex(offset)] = self.memory(brush + offset, size).hex()
            result['eventFields'] = {}
            for offset, size in ((0x10, 16), (0x80, 16), (0xa0, 8),
                                 (0xa8, 12), (0xb8, 4), (0xc0, 8), (0xd0, 8)):
                result['eventFields'][hex(offset)] = self.memory(event + offset, size).hex()
            flags = bytes.fromhex(result['brushFields']['0x148'])
            if flags != bytes(8):
                result['errors'].append('Angle-source flags require resolved reflection getters not captured here.')
            result['reflectionGettersCalled'] = flags != bytes(8)
            counter = struct.unpack_from('<i', bytes.fromhex(result['brushFields']['0x190']), 4)[0]
            require(self.previous_startup_counter is None or counter >= self.previous_startup_counter,
                    'Brush startup counter decreased; possible unobserved restart')
            self.previous_startup_counter = counter
            if caller == GENERATED_CALLER:
                result['generatedRecordHex'] = self.memory(sp + 0x200, 0x30).hex()
                result['generatedMode'] = self.reg(frame, 'w23')
                result['generatedCount'] = self.reg(frame, 'w24')
                result['generatedIndex'] = self.reg(frame, 'w25')
                result['generatedDivisorBits'] = f'{self.reg(frame, "d9"):016x}'
                # Its position and movement may come from an interpolated sequence.
                result['errors'].append('Generated append constructor/movement sequence is not captured completely.')
                return result
            result['startupPositionBits'] = struct.pack('>d', float(counter)).hex()
            result['constructorPointHex'] = self.memory(sp + point_offset, 16).hex()
            if operation == 'begin':
                movement = self.first_vector_object(PRIMARY_MOVEMENTS)
                result['movementAddress'] = hex(movement)
                self.source_movement = movement
                result['movementStage'] = 'before_initialization'
                prior = {'address': hex(movement), 'vtableHex': '', 'scaleHex': '',
                         'complete': False, 'errors': []}
                result['movementBeforeInitialization'] = prior
                try:
                    prior['vtableHex'] = self.memory(movement, 8).hex()
                    require(int.from_bytes(bytes.fromhex(prior['vtableHex']), 'little')
                            == self.load_address(MOVEMENT_VTABLE), 'Unexpected pre-initialization movement vtable')
                    prior['scaleHex'] = self.memory(movement + 0x10, 8).hex()
                    prior['complete'] = True
                except Exception as error:
                    prior['errors'].append(f'{type(error).__name__}: {error}')
                    result['errors'].extend(prior['errors'])
                result['movementInitializer'] = {
                    'enabledHex': self.memory(sp + 0x4ec, 4).hex(),
                    'windowHex': self.memory(sp + 0x4e8, 4).hex(),
                    'mBits': f'{self.reg(frame, "d8"):016x}',
                    'cBits': f'{self.reg(frame, "d9"):016x}',
                    'dBits': f'{self.reg(frame, "d10"):016x}',
                }
                device = struct.unpack('<i', bytes.fromhex(result['eventFields']['0xb8']))[0]
                if self.verified_platform == 2:
                    result['movementInitializer'].update(
                        platformValue=2, platformGetter='0x102194e64',
                        platformConstantFunction='0x102072aa4',
                        platformProvenance='Pinned and loaded instructions verified; getter returns constant 2.')
                elif device == 4:
                    result['errors'].append('Device 4 initializer mode getter instructions were not verified.')
            else:
                movement = self.pointer(sp + movement_offset)
                require(self.source_movement == movement, 'Primary movement identity changed')
                result['movementStage'] = 'after_update' if result.get('freshRecord', 1) else 'reused'
                result['movement'] = self.movement_snapshot(movement)
                if not result['movement']['complete']:
                    result['errors'].extend(result['movement']['errors'])
            result['complete'] = not result['errors']
        except Exception as error:
            result['errors'].append(f'{type(error).__name__}: {error}')
        return result

    def source_entry(self, operation, thread):
        require(operation in ('begin', 'append', 'finish'), 'Unknown source operation')
        require(self.source_sequence < MAX_RECORDS, 'Joined source record limit reached')
        self.source_sequence += 1
        row = {'sourceSequence': self.source_sequence, 'threadId': str(thread.GetThreadID()),
               'boundary': hex({'begin': BEGIN, 'append': APPEND, 'finish': FINISH}[operation]),
               'recordHex': '', 'complete': False, 'errors': []}
        try:
            frame = thread.GetFrameAtIndex(0)
            holder, address, sp = (self.reg(frame, name) for name in ('x0', 'x1', 'sp'))
            caller_loaded = self.reg(frame, 'x30')
            slide = self.load_address(0x100000000) - 0x100000000
            caller = caller_loaded - slide
            row.update(holder=hex(holder), recordAddress=hex(address), entrySp=hex(sp),
                       callerReturn=hex(caller), callerReturnLoad=hex(caller_loaded),
                       fpcr=f'{self.reg(frame, "fpcr"):08x}', fpsr=f'{self.reg(frame, "fpsr"):08x}')
            require(row['fpcr'] == '00000000', 'Source arithmetic requires FPCR zero')
            allowed = {'begin': (BEGIN_CALLER,), 'append': (APPEND_CALLER, GENERATED_CALLER),
                       'finish': (FINISH_CALLER,)}[operation]
            require(caller in allowed, f'Unverified primary source caller {caller:#x}')
            require(holder == self.first_primary_holder(), 'Source is not the sole first primary holder')
            if operation == 'begin':
                require(self.source_stage == 'awaiting_begin', 'Repeated source begin')
                require(self.reg(frame, 'x24') == holder and self.reg(frame, 'x25') == 0,
                        'Primary begin caller identity mismatch')
                raw = self.memory(address, 0x108)
                row['beginHex'] = raw.hex()
                row['recordAddress'] = hex(address + 0x50)
                row['recordHex'] = raw[0x50:0xa8].hex()
            else:
                require(self.source_stage == 'collecting', 'Source call outside an active begin/finish group')
                require(holder == self.source_holder and thread.GetThreadID() == self.source_thread,
                        'Source holder or thread changed')
                require(self.reg(frame, 'x22') == holder,
                        'Primary source caller holder mismatch')
                require(self.reg(frame, 'x28' if operation == 'finish' else 'x21') == 0,
                        'Primary source caller index is not zero')
                row['recordHex'] = self.memory(address, 0x58).hex()
                state = self.holder_snapshot(holder)
                row['holderBefore'] = state
                require(state['complete'], f'Incomplete holder state: {state["errors"]}')
                path = int(state['pathAddress'], 16)
                require(path != 0 and self.source_path in (None, path), 'Source path replaced before post entry')
                state_raw = bytes.fromhex(state['stateHex'])
                configuration = state_raw[:16] + state_raw[24:36] + state_raw[40:48]
                require(self.source_configuration in (None, configuration), 'Source configuration changed')
                self.source_path, self.source_configuration = path, configuration
                if operation == 'append':
                    row['scaleBits'] = f'{self.reg(frame, "d0"):016x}'
                else:
                    row['renderFlag'] = self.reg(frame, 'w3')
            row['upstream'] = self.upstream_snapshot(operation, caller, frame, sp)
            self.upstream_complete &= row['upstream']['complete']
            row['complete'] = True
        except Exception as error:
            row['errors'].append(f'{type(error).__name__}: {error}')
            raise
        finally:
            self.write('source_' + operation, **row)
        if operation == 'begin':
            self.source_holder, self.source_thread = holder, thread.GetThreadID()
            self.source_stage = 'collecting'
        elif operation == 'finish':
            self.source_stage = 'finished'

    def entry(self, thread):
        frame = thread.GetFrameAtIndex(0)
        require(self.source_stage == 'finished', 'Post entry lacks complete source begin/finish entries')
        require(thread.GetThreadID() == self.source_thread and self.reg(frame, 'x0') == self.source_holder,
                'Post entry does not belong to observed source holder/thread')
        require(self.reg(frame, 'x30') == self.load_address(POST_CALLER), 'Unverified post caller')
        require(self.pointer(self.source_holder + 0x18) == self.source_path,
                'Source path changed between finish and post entry')
        for name in list(self.probes):
            self.remove_probe(name)
        super().entry(thread)
        self.source_stage = 'post_entered'
        self.arm('post_return', RETURN, self.returned)

    def returned(self, thread):
        require(self.source_stage == 'post_entered', 'Unexpected joined post return')
        super().returned(thread)
        self.source_stage = 'complete'
        self.stop_reason = 'source_entries_and_post_wrapper_return_observed'

    def handle_stop(self, stop_id):
        callbacks = {identifier: (address, callback)
                     for identifier, address, callback in self.probes.values()}
        source_threads = () if self.source_thread is None else (self.source_thread,)
        # The shared guard accepts only the already audited, bounded secondary
        # start_wqthread notification. Every recovery is retained and announced.
        thread, callback = self.collect_breakpoint_hit(callbacks, stop_id, source_threads)
        callback(thread)

    def capture(self, expected):
        self.select_process()
        self.write('header', schema='csp-post-capture/v1', imageSha256=ORIGINAL_SHA256,
                   imageBase=hex(self.load_address(0x100000000)), architecture='arm64',
                   provenance='runtime', device=self.device, metadata=self.metadata)
        for address, raw in expected.items():
            actual = self.memory(self.load_address(address), len(raw))
            require(actual == raw, f'Loaded joined instructions differ at {address:#x}')
            self.write('instruction_verified', file_address=hex(address), size=len(raw),
                       sha256=hashlib.sha256(actual).hexdigest())
        require(set(expected) == {address for address, _ in INSTRUCTION_RANGES},
                'Joined instruction verification is missing a required range')
        self.verified_platform = 2
        self.install_initial_probes()
        last_stop = self.process.GetStopID()
        check_error(self.process.Continue(), 'Continue after joined breakpoint installation')
        self.write('capture_started', hardwareProbeCount=len(self.probes), maxRecords=MAX_RECORDS)
        print('CSP joined post-correction capture active; one source group and correction requested.', flush=True)
        while not self.capture_complete:
            last_stop = self.wait_capture_stop(last_stop)
            self.handle_stop(last_stop)
            if not self.capture_complete:
                check_error(self.process.Continue(), 'Continue after joined capture stop')


def run(debugger, pid, output_path, timeout_seconds=30, *, device='unknown', metadata=None,
        research_executable=None, original_arm64=None):
    require(type(pid) is int and pid > 0, 'pid must be a positive integer')
    require(type(timeout_seconds) in (int, float) and 5 <= timeout_seconds <= 30,
            'timeout_seconds must be in [5, 30]')
    require(device in ('mouse', 'tablet', 'unknown'), 'Invalid device declaration')
    require(metadata is None or isinstance(metadata, dict), 'metadata must be an object')
    executable, original = configured_paths(research_executable, original_arm64)
    require(executable.is_file() and original.is_file(), 'Research executable or original is missing')
    with Path(output_path).open('x', encoding='utf-8') as output:
        capture = JoinedPostCapture(debugger, pid, output, timeout_seconds, 1, executable, original)
        capture.device = device
        capture.metadata = dict(metadata or {}, utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                                pid=pid, requestedTimeoutSeconds=timeout_seconds,
                                deviceDeclaration='operator supplied; not independently identified',
                                joinedSourceSchema='csp-joined-source/v1',
                                limits={'maxRecords': MAX_RECORDS, 'maxNodes': MAX_NODES,
                                        'maxHardwareBreakpoints': 4, 'maxMovementTimestamps': MAX_TIMESTAMPS},
                                limitations=[
                                    'Source calls observed at entry; individual successful returns are not captured.',
                                    'One primary holder and one source group; repeated begin is rejected.',
                                    'Constructed records are not raw OS or digitizer packets.',
                                    'Upstream completeness is separate from source-entry and post-boundary completeness.',
                                    'Normal post epilogue precedes final rendering.',
                                    'Breakpoint stops change timing; no pen-feel or natural latency claim.',
                                    'Native debugger calls require a separate outer deadline guard.'])
        old_async, old_target = debugger.GetAsync(), debugger.GetSelectedTarget()
        try:
            capture.timer.start()
            debugger.SetAsync(True)
            capture.capture(original_instruction_ranges(original))
        except BaseException as error:
            capture.capture_complete = False
            capture.stop_reason = f'{type(error).__name__}: {error}'
            capture.write('error', sequence=3, message=capture.stop_reason, traceback=traceback.format_exc())
        finally:
            capture.cleanup()
            debugger.SetAsync(old_async)
            if old_target.IsValid():
                debugger.SetSelectedTarget(old_target)
            deadline_exceeded = time.monotonic() > capture.hard_deadline
            operation_observed = capture.capture_complete
            unmatched = sum(map(len, capture.pending.values()))
            if (unmatched or capture.cleanup_errors or capture.watchdog_error or deadline_exceeded
                    or not capture.detach_request_succeeded or not capture.detached_state_observed):
                capture.capture_complete = False
            capture.write('summary', captureComplete=capture.capture_complete,
                          operationObserved=operation_observed, stopReason=capture.stop_reason,
                          entries=capture.entries, pairs=capture.pairs, unmatchedEntries=unmatched,
                          sourceEntries=capture.source_sequence, sourceStage=capture.source_stage,
                          sourceEntryComplete=capture.source_stage == 'complete',
                          upstreamComplete=capture.upstream_complete and capture.source_stage == 'complete',
                          workqueue_step_recoveries=capture.workqueue_step_recoveries,
                          capture_warnings=capture.capture_warnings,
                          cleanupErrors=capture.cleanup_errors, cleanupWarnings=capture.cleanup_warnings,
                          watchdogError=capture.watchdog_error, deadlineExceeded=deadline_exceeded,
                          detachRequestSucceeded=capture.detach_request_succeeded,
                          detachedStateObserved=capture.detached_state_observed,
                          detachStateEvents=capture.detach_state_events,
                          resumeIndependentlyVerified=False, wholeCurveEquivalence='not_evaluated')
        print(f'CSP joined post capture saved: {output_path}; complete={capture.capture_complete}; '
              f'source_entries={capture.source_sequence}; upstream_complete={capture.upstream_complete}; '
              'wholeCurveEquivalence=not_evaluated', flush=True)
        return {'output_path': str(output_path), 'capture_complete': capture.capture_complete,
                'source_entries': capture.source_sequence, 'upstream_complete': capture.upstream_complete,
                'workqueue_step_recoveries': capture.workqueue_step_recoveries,
                'capture_warnings': capture.capture_warnings,
                'cleanup_errors': capture.cleanup_errors}
