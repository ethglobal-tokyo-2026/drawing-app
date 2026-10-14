"""Bounded read-only observation of native gap fill in the approved research app.

Import in LLDB after the root agent attaches to the verified research process.
The shared Capture implementation owns process selection, stop classification,
hardware probes, deadlines, and cleanup. This module never attaches or launches.
"""

import datetime
import hashlib
from pathlib import Path
import struct
import sys
import time
import traceback

import lldb

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'live-capture'))
from capture_live_contract import (
    Capture, CaptureError, ORIGINAL_SHA256, check_error, configured_paths, require,
)

ENTRY = 0x10253F5E4
INITIAL = 0x10253F704
RETURN = 0x10253FB34
FUNCTION_SIZE = 2348
OBJECT_SIZE = 0x210
STACK_SIZE = 0x210
MAX_BITMAP_BYTES = 8 * 1024 * 1024
MAX_TOTAL_BITMAP_BYTES = 64 * 1024 * 1024
READY_MARKER = 'CSP fill capture active'


def decode_seed(packed):
    require(type(packed) is int and 0 <= packed < 2**64, 'Invalid packed seed')
    x, y = struct.unpack('<ii', struct.pack('<Q', packed))
    return {'x': x, 'y': y}


def decode_fill_header(raw):
    require(len(raw) == OBJECT_SIZE, 'Fill object header must contain all 528 bytes')
    pairs = {}
    for label, offset in (('A', 0x190), ('C', 0x1a0), ('T', 0x1b0)):
        address, control = struct.unpack_from('<QQ', raw, offset)
        pairs[label] = {'objectPointer': hex(address), 'controlPointer': hex(control)}
    return {
        'bytesHex': raw.hex(), 'gapWidth': struct.unpack_from('<i', raw, 0x16c)[0],
        'domain': list(struct.unpack_from('<iiii', raw, 0x140)), 'bitmapPairs': pairs,
        'documentOffset': list(struct.unpack_from('<ii', raw, 0x1d0)),
        'sourceTileOffset': list(struct.unpack_from('<ii', raw, 0x1d8)),
    }


def decode_bitmap_header(raw, max_bytes=MAX_BITMAP_BYTES):
    require(len(raw) == 48, 'Bitmap header must contain all 48 bytes')
    require(type(max_bytes) is int and max_bytes > 0, 'Invalid bitmap byte limit')
    width, height, stride = struct.unpack_from('<iii', raw, 8)
    address = struct.unpack_from('<Q', raw, 40)[0]
    require(width > 0 and height > 0, f'Invalid bitmap dimensions: {width}x{height}')
    require(stride >= (width + 7) // 8, f'Bitmap stride {stride} is smaller than its width')
    size = stride * height
    require(size <= max_bytes, f'Bitmap byte limit exceeded: {size}>{max_bytes}')
    require(address != 0, 'Bitmap data pointer is null')
    return {'width': width, 'height': height, 'strideBytes': stride,
            'dataPointer': hex(address), 'dataBytes': size, 'bytesHex': raw.hex()}


def bitmap_rows(header, data):
    """Decode visible pixels for offline inspection; input bytes remain intact."""
    require(len(data) == header['dataBytes'], 'Bitmap data length differs from its header')
    width, height, stride = header['width'], header['height'], header['strideBytes']
    return [''.join('1' if data[y * stride + (x >> 3)] & (0x80 >> (x & 7)) else '0'
                    for x in range(width)) for y in range(height)]


def summary_complete(summary):
    fields = ('requestedCalls', 'entries', 'pairs', 'unmatchedEntries', 'operationObserved',
              'cleanupErrors', 'captureErrors', 'watchdogError', 'deadlineExceeded',
              'detachRequestSucceeded', 'detachedStateObserved')
    if not isinstance(summary, dict) or any(key not in summary for key in fields):
        return False
    counts = ('requestedCalls', 'entries', 'pairs', 'unmatchedEntries')
    return bool(all(type(summary[key]) is int for key in counts)
                and 1 <= summary['requestedCalls'] <= 64
                and summary['entries'] == summary['pairs'] == summary['requestedCalls']
                and summary['unmatchedEntries'] == 0
                and summary['operationObserved'] is True
                and type(summary['cleanupErrors']) is list and not summary['cleanupErrors']
                and type(summary['captureErrors']) is list and not summary['captureErrors']
                and summary['watchdogError'] is None
                and summary['deadlineExceeded'] is False
                and summary['detachRequestSucceeded'] is True
                and summary['detachedStateObserved'] is True)


def original_instructions(original):
    data = Path(original).read_bytes()
    require(hashlib.sha256(data).hexdigest() == ORIGINAL_SHA256,
            'Original ARM64 reference fingerprint differs')
    require(len(data) >= 32 and struct.unpack_from('<I', data)[0] == 0xfeedfacf,
            'Expected thin Mach-O reference')
    position = 32
    for _ in range(struct.unpack_from('<I', data, 16)[0]):
        require(position + 8 <= len(data), 'Short Mach-O load command')
        command, size = struct.unpack_from('<II', data, position)
        require(size >= 8 and position + size <= len(data), 'Invalid Mach-O load command')
        if command == 0x19:
            require(size >= 72, 'Short Mach-O segment command')
            start, _, offset, length = struct.unpack_from('<QQQQ', data, position + 24)
            if start <= ENTRY and ENTRY + FUNCTION_SIZE <= start + length:
                first = offset + ENTRY - start
                raw = data[first:first + FUNCTION_SIZE]
                require(len(raw) == FUNCTION_SIZE, 'Incomplete original fill instructions')
                return raw
        position += size
    raise CaptureError('Gap fill function is not mapped in the original image')


class FillCapture(Capture):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bitmap_bytes_read = 0
        self.successful_fills = 0
        self.capture_errors = []

    def bitmap_snapshot(self, address, role):
        result = {'address': hex(address), 'state': 'null' if not address else 'present',
                  'complete': False, 'errors': []}
        if not address:
            result['complete'] = True
            return result
        try:
            raw = self.memory(address, 48)
            result['headerBytesHex'] = raw.hex()
            width, height, stride = struct.unpack_from('<iii', raw, 8)
            data_address = struct.unpack_from('<Q', raw, 40)[0]
            # Lazy candidate storage may exist before its bitmap is allocated.
            # Preserve that state explicitly rather than presenting an empty image.
            if role != 'A' and (width, height, stride, data_address) == (0, 0, 0, 0):
                result.update(state='unallocated', complete=True)
                return result
            header = decode_bitmap_header(raw)
            result['header'] = header
            size = header['dataBytes']
            require(self.bitmap_bytes_read + size <= MAX_TOTAL_BITMAP_BYTES,
                    'Total bitmap byte limit exceeded; refusing a partial bitmap')
            data = self.memory(data_address, size)
            self.bitmap_bytes_read += size
            result.update(dataHex=data.hex(), complete=True)
        except Exception as error:
            result['errors'].append(f'{type(error).__name__}: {error}')
        return result

    def object_snapshot(self, address, phase):
        result = {'address': hex(address), 'header': None, 'bitmaps': {},
                  'complete': False, 'errors': []}
        try:
            header = decode_fill_header(self.memory(address, OBJECT_SIZE))
            result['header'] = header
            require(header['gapWidth'] >= 1, 'Gap fill received a nonpositive gap width')
            for role, pair in header['bitmapPairs'].items():
                bitmap = self.bitmap_snapshot(int(pair['objectPointer'], 16), role)
                result['bitmaps'][role] = bitmap
                require(bitmap['complete'], f'Incomplete {role} bitmap: {bitmap["errors"]}')
            require(result['bitmaps']['A']['state'] == 'present', 'Selected bitmap A is absent')
            if phase == 'initial':
                require(result['bitmaps']['T']['state'] == 'present', 'Initial barrier bitmap T is absent')
            if phase == 'return':
                require(result['bitmaps']['T']['state'] == 'null', 'Temporary bitmap T was not cleared')
            shape = result['bitmaps']['A']['header']
            for role in ('C', 'T'):
                bitmap = result['bitmaps'][role]
                if bitmap['state'] == 'present':
                    require(all(bitmap['header'][key] == shape[key] for key in ('width', 'height')),
                            f'{role} bitmap dimensions differ from A')
            result['complete'] = True
        except Exception as error:
            result['errors'].append(f'{type(error).__name__}: {error}')
        return result

    def rectangle(self, address):
        raw = self.memory(address, 16)
        return {'address': hex(address), 'bytesHex': raw.hex(),
                'values': list(struct.unpack('<iiii', raw))}

    def entry(self, thread):
        require(self.entries < self.max_samples, 'Fill call limit reached')
        require(not any(self.pending.values()), 'Nested or concurrent fill calls are unsupported')
        frame, tid = thread.GetFrameAtIndex(0), thread.GetThreadID()
        holder, packed, output = (self.reg(frame, name) for name in ('x0', 'x1', 'x3'))
        narrow = self.reg(frame, 'w2') & 0xffffffff
        require(holder and output, 'Fill object or output rectangle pointer is null')
        require(narrow in (0, 0x400), f'Unsupported narrow-area argument: {narrow:#x}')
        arguments = {'seed': decode_seed(packed), 'seedPackedHex': f'{packed:016x}',
                     'narrowFlag': narrow, 'outputRectPointer': hex(output)}
        self.entries += 1
        saved = {'threadId': tid, 'selfPointer': holder, 'entrySp': self.reg(frame, 'sp'),
                 'outputRectPointer': output, 'arguments': arguments, 'callId': str(self.entries),
                 'midpointObserved': False}
        self.pending[tid] = [saved]
        snapshot = self.object_snapshot(holder, 'entry')
        saved['header'] = snapshot['header']
        self.boundary(thread, saved, 'entry', ENTRY, snapshot, stack=self.stack(thread))
        require(snapshot['complete'], f'Incomplete fill entry: {snapshot["errors"]}')

    def paired_call(self, thread):
        calls = self.pending.get(thread.GetThreadID(), [])
        require(len(calls) == 1, 'Unmatched fill boundary')
        saved, frame = calls[0], thread.GetFrameAtIndex(0)
        require(self.reg(frame, 'sp') == saved['entrySp'] - STACK_SIZE, 'Fill stack mismatch')
        require(self.reg(frame, 'x29') == saved['entrySp'] - 0x10, 'Fill frame pointer mismatch')
        return saved, frame

    def boundary(self, thread, saved, phase, location, snapshot, **fields):
        header, seed = snapshot['header'], saved['arguments']['seed']
        document_seed = None if header is None else {
            'x': seed['x'] + header['documentOffset'][0],
            'y': seed['y'] + header['documentOffset'][1],
        }
        self.write('boundary', schema='csp-fill-capture/v1', callId=saved['callId'], phase=phase,
                   boundary=hex(location), threadId=str(thread.GetThreadID()),
                   selfPointer=hex(saved['selfPointer']), arguments=saved['arguments'],
                   seedDocument=document_seed, snapshot=snapshot,
                   outputRect=self.rectangle(saved['outputRectPointer']), **fields)

    def initial(self, thread):
        saved, frame = self.paired_call(thread)
        require(not saved['midpointObserved'], 'Duplicate initial fill boundary')
        require(self.reg(frame, 'x19') == saved['selfPointer'], 'Initial fill object mismatch')
        require(self.reg(frame, 'x20') == saved['outputRectPointer'], 'Initial output rectangle mismatch')
        require(self.reg(frame, 'x21') == int(saved['arguments']['seedPackedHex'], 16),
                'Initial seed mismatch')
        status = self.reg(frame, 'w0') & 0xffffffff
        require(status in (0, 1), f'Unexpected initial fill Boolean: {status}')
        snapshot = self.object_snapshot(saved['selfPointer'], 'initial')
        self.boundary(thread, saved, 'initial', INITIAL, snapshot, initialFloodSucceeded=bool(status))
        require(snapshot['complete'], f'Incomplete initial fill snapshot: {snapshot["errors"]}')
        saved['midpointObserved'] = True

    def returned(self, thread):
        saved, frame = self.paired_call(thread)
        require(saved['midpointObserved'], 'Fill return did not include the initial boundary')
        status = self.reg(frame, 'x19')
        require(status in (0, 1), f'Unexpected final fill Boolean: {status}')
        snapshot = self.object_snapshot(saved['selfPointer'], 'return')
        self.boundary(thread, saved, 'return', RETURN, snapshot, success=bool(status),
                      selectedPixelsAreCompletedFill=bool(status))
        require(snapshot['complete'], f'Incomplete final fill snapshot: {snapshot["errors"]}')
        for key in ('gapWidth', 'domain', 'documentOffset', 'sourceTileOffset'):
            require(snapshot['header'][key] == saved['header'][key], f'Fill {key} changed within a call')
        self.pending[thread.GetThreadID()].pop()
        self.pairs += 1
        self.successful_fills += int(bool(status))
        self.capture_complete = self.pairs == self.max_samples
        if self.capture_complete:
            self.stop_reason = 'requested_fill_entries_initial_boundaries_and_returns_observed'

    def capture(self, original):
        self.select_process()
        expected = original_instructions(original)
        self.budget()
        actual = self.memory(self.load_address(ENTRY), FUNCTION_SIZE)
        require(actual == expected, 'Loaded gap fill instructions differ from the pinned original')
        self.write('instruction_verified', fileAddress=hex(ENTRY), size=FUNCTION_SIZE,
                   sha256=hashlib.sha256(actual).hexdigest())
        callbacks = {}
        for label, location, callback in (('fill_entry', ENTRY, self.entry),
                                          ('fill_initial', INITIAL, self.initial),
                                          ('fill_return', RETURN, self.returned)):
            address = self.load_address(location)
            breakpoint_id = self.hardware_breakpoint(address, label)
            callbacks[breakpoint_id] = (address, callback)
        last_stop = self.process.GetStopID()
        check_error(self.process.Continue(), 'Continue after fill probe installation')
        self.write('capture_started', requestedCalls=self.max_samples,
                   breakpointIds=list(callbacks), candidateEntryLimit='C may be lazy or unallocated')
        print(f'{READY_MARKER}; requested calls={self.max_samples}.', flush=True)
        while not self.capture_complete:
            last_stop = self.wait_capture_stop(last_stop)
            thread, callback = self.collect_breakpoint_hit(callbacks, last_stop)
            callback(thread)
            if not self.capture_complete:
                check_error(self.process.Continue(), 'Continue after fill boundary')


def run(debugger, pid, output_path, timeout_seconds=30, max_calls=1, *, metadata=None,
        research_executable=None, original_arm64=None):
    require(type(pid) is int and pid > 0, 'pid must be a positive integer')
    require(type(max_calls) is int and 1 <= max_calls <= 64, 'max_calls must be in [1,64]')
    require(type(timeout_seconds) in (int, float) and 5 <= timeout_seconds <= 30,
            'timeout_seconds must be in [5,30]')
    require(metadata is None or isinstance(metadata, dict), 'metadata must be an object')
    executable, original = configured_paths(research_executable, original_arm64)
    require(executable.is_file() and original.is_file(), 'Research executable or original is missing')
    with Path(output_path).open('x', encoding='utf-8') as output:
        capture = FillCapture(debugger, pid, output, timeout_seconds, max_calls, executable, original)
        old_async, old_target = debugger.GetAsync(), debugger.GetSelectedTarget()
        capture.write('header', schema='csp-fill-capture/v1', imageSha256=ORIGINAL_SHA256,
                      utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), pid=pid,
                      requestedCalls=max_calls, requestedTimeoutSeconds=timeout_seconds,
                      executable=str(executable), original=str(original), metadata=dict(metadata or {}),
                      limits={'bitmapBytes': MAX_BITMAP_BYTES, 'totalBitmapBytes': MAX_TOTAL_BITMAP_BYTES},
                      limitations=['C is lazy at entry; it may not contain the complete reference image.',
                                   'A bits are the algorithm selection; rendered RGBA is separate.',
                                   'False native returns retain partial masks and do not identify a completed fill.',
                                   'Breakpoint stops alter timing; native calls lack individual timeouts.'])
        try:
            capture.timer.start()
            debugger.SetAsync(True)
            capture.capture(original)
        except BaseException as error:
            capture.capture_complete = False
            capture.stop_reason = f'{type(error).__name__}: {error}'
            capture.capture_errors.append(capture.stop_reason)
            capture.write('error', message=capture.stop_reason, traceback=traceback.format_exc())
        finally:
            capture.cleanup()
            debugger.SetAsync(old_async)
            if old_target.IsValid():
                debugger.SetSelectedTarget(old_target)
            summary = {
                'requestedCalls': max_calls, 'operationObserved': capture.capture_complete,
                'entries': capture.entries, 'pairs': capture.pairs,
                'unmatchedEntries': sum(map(len, capture.pending.values())),
                'successfulFills': capture.successful_fills,
                'allFillsSucceeded': capture.pairs == max_calls == capture.successful_fills,
                'stopReason': capture.stop_reason, 'captureErrors': capture.capture_errors,
                'cleanupErrors': capture.cleanup_errors, 'cleanupWarnings': capture.cleanup_warnings,
                'watchdogError': capture.watchdog_error,
                'deadlineExceeded': time.monotonic() > capture.hard_deadline,
                'detachRequestSucceeded': capture.detach_request_succeeded,
                'detachedStateObserved': capture.detached_state_observed,
                'detachStateEvents': capture.detach_state_events,
                'detachObservationSource': capture.detach_observation_source,
                'resumeIndependentlyVerified': False, 'ownedBreakpointIds': capture.owned_breakpoints,
                'workqueueStepRecoveries': capture.workqueue_step_recoveries,
                'captureWarnings': capture.capture_warnings,
                'wholeAlgorithmEquivalence': 'not_evaluated',
            }
            summary['captureComplete'] = summary_complete(summary)
            capture.write('summary', **summary)
        print(f'CSP fill capture saved: {output_path}; complete={summary["captureComplete"]}; '
              f'pairs={capture.pairs}; successful fills={capture.successful_fills}', flush=True)
        return summary
