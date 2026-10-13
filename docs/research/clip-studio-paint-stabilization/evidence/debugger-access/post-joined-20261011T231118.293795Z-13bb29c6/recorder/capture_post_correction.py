"""Read-only, bounded before/after path capture in the approved CSP research copy.

Import in an LLDB session already controlling that process. No attachment,
launch, software breakpoints, target evaluation, or application-memory writes.
This observes one post-correction wrapper, not a digitizer stroke or rendering.
"""

import datetime
import hashlib
from pathlib import Path
import struct
import time
import traceback

import lldb

from capture_live_contract import (
    Capture, CaptureError, ORIGINAL_SHA256, check_error, configured_paths, require,
)
from post_evaluator_capture import snapshot_evaluator


ENTRY = 0x1028ed064
RETURN = 0x1028ed144
FUNCTION_SIZE = 0x11c
PATH_VTABLE = 0x104a53a78
NODE_TYPES = {
    0x104a52b60: (0, 0x78),
    0x104a527b0: (0x20, 0x88),
    0x104a52a00: (0x40, 0x98),
    0x104a53918: (0x80, 0x78),
}
MAX_NODES = 4096


def original_instructions(original):
    data = Path(original).read_bytes()
    require(hashlib.sha256(data).hexdigest() == ORIGINAL_SHA256,
            'Original ARM64 reference fingerprint differs')
    require(struct.unpack_from('<I', data)[0] == 0xfeedfacf, 'Expected thin Mach-O')
    position = 32
    for _ in range(struct.unpack_from('<I', data, 16)[0]):
        command, size = struct.unpack_from('<II', data, position)
        require(size >= 8 and position + size <= len(data), 'Invalid Mach-O command')
        if command == 0x19:
            start, _, offset, length = struct.unpack_from('<QQQQ', data, position + 24)
            if start <= ENTRY and ENTRY + FUNCTION_SIZE <= start + length:
                raw = data[offset + ENTRY - start:offset + ENTRY - start + FUNCTION_SIZE]
                require(len(raw) == FUNCTION_SIZE, 'Incomplete original instructions')
                return raw
        position += size
    raise CaptureError('Post wrapper missing from original image')


class PostCapture(Capture):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.header_written = False
        self.diagnostics = []

    def write(self, kind, **fields):
        if kind == 'header':
            super().write(kind, **fields)
            self.header_written = True
            for event, details in self.diagnostics:
                super().write('diagnostic', event=event, details=details)
            self.diagnostics.clear()
        elif kind in ('boundary', 'error', 'summary'):
            super().write(kind, **fields)
        elif self.header_written:
            super().write('diagnostic', event=kind, details=fields)
        else:
            self.diagnostics.append((kind, fields))

    def path_snapshot(self, address):
        """Preserve partial data with errors; callers reject incomplete snapshots."""
        result = dict(address=hex(address), headerHex='', nodes=[], complete=False, errors=[])
        try:
            prefix = self.memory(address, 8)
            result['headerHex'] = prefix.hex()
            require(struct.unpack('<Q', prefix)[0] == self.load_address(PATH_VTABLE),
                    'Unsupported path vtable; allocation size unknown')
            header = self.memory(address, 0xa8)
            result['headerHex'] = header.hex()
            path_flags = struct.unpack_from('<I', header, 0x20)[0]
            path_type = next((bit for bit in (0x20, 0x40, 0x80) if path_flags & bit), 0)
            first, last, count = struct.unpack_from('<QQI', header, 0x30)
            require(count <= MAX_NODES, f'Path node limit exceeded: {count}>{MAX_NODES}')
            require(bool(first) == bool(count) and bool(last) == bool(count),
                    'Path count and end pointers disagree')
            seen, previous, current = set(), 0, first
            types = {self.load_address(vtable): fields for vtable, fields in NODE_TYPES.items()}
            for _ in range(count):
                self.budget()
                require(current != 0 and current not in seen, 'Short or cyclic raw node chain')
                seen.add(current)
                prefix = self.memory(current, 8)
                node = dict(address=hex(current), bytesHex=prefix.hex())
                result['nodes'].append(node)
                vtable = struct.unpack('<Q', prefix)[0]
                require(vtable in types, 'Unsupported node vtable; allocation size unknown')
                kind, size = types[vtable]
                require(kind == path_type, 'Node vtable disagrees with path type')
                raw = self.memory(current, size)
                node['bytesHex'] = raw.hex()
                following, prior, owner = struct.unpack_from('<QQQ', raw, 0x28)
                require(prior == previous and owner == address, 'Node previous/owner mismatch')
                previous, current = current, following
            require(current == 0 and previous == last, 'Path count/last/termination mismatch')
            evaluator = struct.unpack_from('<Q', header, 0x88)[0]
            result['endpointEvaluator'] = snapshot_evaluator(
                evaluator, self.memory, self.load_address, self.budget)
            require(result['endpointEvaluator']['complete'],
                    f'Incomplete endpoint evaluator snapshot: {result["endpointEvaluator"]["errors"]}')
            result['complete'] = True
        except Exception as error:
            result['errors'].append(f'{type(error).__name__}: {error}')
        return result

    def entry(self, thread):
        require(self.entries == 0 and not any(self.pending.values()),
                'Unexpected second or nested post wrapper')
        frame = thread.GetFrameAtIndex(0)
        holder, sp = self.reg(frame, 'x0'), self.reg(frame, 'sp')
        values = {name: self.reg(frame, name) & 0xffffffff for name in ('w1', 'w2', 'w3', 'w4')}
        require(values['w2'] in (0, 1) and values['w4'] in (0, 1), 'Unsupported boolean argument')
        k = values['w1'] if values['w1'] < 2**31 else values['w1'] - 2**32
        args = dict(k=k, flag480=values['w2'], closedMode=values['w3'], selector482=values['w4'],
                    toleranceBits=f'{self.reg(frame, "d0"):016x}',
                    lengthScaleBits=f'{self.reg(frame, "d1"):016x}')
        saved = dict(holder=holder, sp=sp, arguments=args, call_id='1')
        self.pending[thread.GetThreadID()] = [saved]
        self.entries = 1
        self.write('entry_pairing', holder=hex(holder), entry_sp=hex(sp),
                   thread_id=thread.GetThreadID(), call_id='1')
        path_address = struct.unpack('<Q', self.memory(holder + 0x18, 8))[0]
        snapshot = self.path_snapshot(path_address)
        self.write('boundary', sequence=1, callId='1', phase='entry',
                   threadId=str(thread.GetThreadID()), holder=hex(holder), boundary=hex(ENTRY),
                   arguments=args, path=snapshot, stack=self.stack(thread),
                   fpcr=f'{self.reg(frame, "fpcr"):08x}', fpsr=f'{self.reg(frame, "fpsr"):08x}')
        require(snapshot['complete'], f'Incomplete source snapshot: {snapshot["errors"]}')

    def returned(self, thread):
        calls = self.pending.get(thread.GetThreadID(), [])
        require(len(calls) == 1, 'Unmatched post return')
        saved = calls[0]
        frame = thread.GetFrameAtIndex(0)
        require(self.reg(frame, 'sp') == saved['sp'] - 0xc0, 'Post return stack mismatch')
        require(self.reg(frame, 'x19') == saved['holder'], 'Post return holder mismatch')
        address = struct.unpack('<Q', self.memory(saved['holder'] + 0x18, 8))[0]
        returned = self.reg(frame, 'x0')
        require(returned == address, 'Returned path and holder path disagree')
        snapshot = self.path_snapshot(address)
        self.write('boundary', sequence=2, callId=saved['call_id'], phase='return',
                   threadId=str(thread.GetThreadID()), holder=hex(saved['holder']),
                   boundary=hex(RETURN), arguments=saved['arguments'], path=snapshot,
                   returnedPath=hex(returned), fpcr=f'{self.reg(frame, "fpcr"):08x}',
                   fpsr=f'{self.reg(frame, "fpsr"):08x}')
        require(snapshot['complete'], f'Incomplete result snapshot: {snapshot["errors"]}')
        calls.pop()
        self.pairs = 1
        self.capture_complete = True
        self.stop_reason = 'post_wrapper_entry_and_normal_epilogue_observed'

    def capture(self, expected):
        self.select_process()
        self.write('header', schema='csp-post-capture/v1', imageSha256=ORIGINAL_SHA256,
                   imageBase=hex(self.load_address(0x100000000)), architecture='arm64',
                   provenance='runtime', device=self.device, metadata=self.metadata)
        entry, returned = self.load_address(ENTRY), self.load_address(RETURN)
        actual = self.memory(entry, FUNCTION_SIZE)
        require(actual == expected, 'Loaded post wrapper instructions differ')
        self.write('instruction_verified', file_address=hex(ENTRY), size=FUNCTION_SIZE,
                   sha256=hashlib.sha256(actual).hexdigest())
        entry_id = self.hardware_breakpoint(entry, 'post_entry')
        return_id = self.hardware_breakpoint(returned, 'post_normal_epilogue')
        last_stop = self.process.GetStopID()
        check_error(self.process.Continue(), 'Continue after post breakpoint installation')
        self.write('capture_started', entry_breakpoint=entry_id, return_breakpoint=return_id)
        print('CSP post-correction capture active; one correction operation requested.', flush=True)
        while not self.capture_complete:
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
                        'Unexpected post capture stop')
                require(data[0] in (entry_id, return_id), 'Unowned post capture breakpoint')
                require(thread.GetFrameAtIndex(0).GetPC() == (entry if data[0] == entry_id else returned),
                        'Post breakpoint PC mismatch')
                hits.append((thread, data[0]))
            require(len(hits) == 1, 'Expected exactly one post capture stop')
            thread, breakpoint_id = hits[0]
            (self.entry if breakpoint_id == entry_id else self.returned)(thread)
            if not self.capture_complete:
                check_error(self.process.Continue(), 'Continue after post capture stop')


def run(debugger, pid, output_path, timeout_seconds=30, *, device='unknown', metadata=None,
        research_executable=None, original_arm64=None):
    require(isinstance(pid, int) and pid > 0, 'pid must be a positive integer')
    require(isinstance(timeout_seconds, (int, float)) and 5 <= timeout_seconds <= 30,
            'timeout_seconds must be in [5, 30]')
    require(device in ('mouse', 'tablet', 'unknown'), 'Invalid device declaration')
    require(metadata is None or isinstance(metadata, dict), 'metadata must be an object')
    executable, original = configured_paths(research_executable, original_arm64)
    require(executable.is_file() and original.is_file(), 'Research executable or original is missing')
    with Path(output_path).open('x', encoding='utf-8') as output:
        capture = PostCapture(debugger, pid, output, timeout_seconds, 1, executable, original)
        capture.device = device
        capture.metadata = dict(metadata or {}, utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                                pid=pid, requestedTimeoutSeconds=timeout_seconds,
                                deviceDeclaration='operator supplied; not independently identified',
                                limits={'maxNodes': MAX_NODES, 'maxEvaluatorCurves': 6,
                                        'maxEvaluatorCurveControls': 16, 'maxEvaluatorReadBytes': 3912},
                                limitations=['Normal epilogue precedes final rendering.',
                                             'Endpoint evaluator snapshots support verified object layouts and at most 16 controls per curve.',
                                             'This wrapper capture does not include upstream source-call inputs.',
                                             'Breakpoint stops alter timing; no pen-feel claim.'])
        old_async, old_target = debugger.GetAsync(), debugger.GetSelectedTarget()
        try:
            capture.timer.start()
            debugger.SetAsync(True)
            capture.capture(original_instructions(original))
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
            if (capture.cleanup_errors or capture.watchdog_error or deadline_exceeded
                    or not capture.detach_request_succeeded or not capture.detached_state_observed):
                capture.capture_complete = False
            capture.write('summary', captureComplete=capture.capture_complete,
                          operationObserved=operation_observed, stopReason=capture.stop_reason,
                          entries=capture.entries, pairs=capture.pairs,
                          unmatchedEntries=sum(map(len, capture.pending.values())),
                          cleanupErrors=capture.cleanup_errors, cleanupWarnings=capture.cleanup_warnings,
                          watchdogError=capture.watchdog_error, deadlineExceeded=deadline_exceeded,
                          detachRequestSucceeded=capture.detach_request_succeeded,
                          detachedStateObserved=capture.detached_state_observed,
                          detachStateEvents=capture.detach_state_events,
                          resumeIndependentlyVerified=False, wholeCurveEquivalence='not_evaluated')
        print(f'CSP post capture saved: {output_path}; complete={capture.capture_complete}; '
              f'pairs={capture.pairs}; wholeCurveEquivalence=not_evaluated', flush=True)
        return {'output_path': str(output_path), 'capture_complete': capture.capture_complete,
                'cleanup_errors': capture.cleanup_errors}
