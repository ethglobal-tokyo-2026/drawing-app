"""Host-only checks. No debugger attachment, target reads, launch, or GUI input."""

import io
import json
import struct
import traceback
import unittest
from types import SimpleNamespace

import capture_tablet_stroke as capture
from check_capture_helper import Thread


def queue(*, count=0, state=0, stabilization=30, history=None, **fields):
    raw = bytearray(236 if history is None else history)
    struct.pack_into('<Q', raw, 0x30, count)
    struct.pack_into('<i', raw, 0x38, count)
    struct.pack_into('<i', raw, 0x3c, stabilization)
    struct.pack_into('<i', raw, 0x50, 2)
    struct.pack_into('<d', raw, 0x58, 2.0)
    struct.pack_into('<d', raw, 0x70, 1.0)
    struct.pack_into('<i', raw, 0x88, state)
    for offset, value in fields.items():
        struct.pack_into('<i', raw, int(offset, 16), value)
    return bytes(raw)


class StrokeContractTests(unittest.TestCase):
    def begin(self, contract):
        record = contract.begin_call(1, queue(), 2, 'digitizer_normal', 0, (5.0, 8.0, 0.5))
        self.assertTrue(record['included'])
        self.assertFalse(contract.started)
        contract.finish_call(1, queue(count=1, state=1), 2, True)
        self.assertTrue(contract.started)
        self.assertFalse(contract.complete)

    def test_release_is_not_completion_until_final_emitted_phase(self):
        contract = capture.StrokeContract()
        self.begin(contract)
        contract.source_event(6)
        contract.begin_call(2, queue(count=1, state=1), 3, 'digitizer_normal', 0, (7., 9., 0.))
        contract.finish_call(2, queue(count=2, state=2), 1, True)
        self.assertTrue(contract.end_seen)
        self.assertFalse(contract.complete)
        contract.source_return(queue(count=2, state=2))
        contract.source_event(1)
        contract.begin_call(3, queue(count=2, state=2), 1, 'digitizer_normal', 0, (7., 9., 0.))
        contract.finish_call(3, queue(count=3, state=0), 3, True)
        self.assertFalse(contract.complete)
        contract.source_return(queue(count=3, state=0))
        self.assertTrue(contract.complete)
        self.assertEqual(contract.fixture_calls, [1, 2, 3])

    def test_flush_requires_terminal_wrapper_completion(self):
        contract = capture.StrokeContract()
        self.begin(contract)
        contract.source_event(6)
        record = contract.begin_call(2, queue(count=1, state=2), 1, 'digitizer_flush', 0, (5., 8., 0.))
        self.assertTrue(record['between_call_changes'])
        contract.finish_call(2, queue(count=2, state=0), 3, True)
        self.assertFalse(contract.complete)
        contract.terminal(queue(count=2, state=0), 3)
        self.assertFalse(contract.complete)
        contract.source_return(queue(count=2, state=0))
        self.assertTrue(contract.complete)

    def test_suppressed_call_is_saved_but_never_completes(self):
        contract = capture.StrokeContract()
        self.begin(contract)
        contract.begin_call(2, queue(count=1, state=1), 3, 'digitizer_normal', 0, (7., 9., 0.))
        contract.finish_call(2, queue(count=2, state=2), 3, False)
        self.assertEqual(contract.fixture_calls, [1, 2])
        self.assertFalse(contract.complete)

    def test_hover_is_recorded_outside_fixture(self):
        contract = capture.StrokeContract()
        result = contract.begin_call(1, queue(count=4), 1, 'digitizer_normal', 0, (7., 9., 0.))
        self.assertFalse(result['included'])
        contract.finish_call(1, queue(count=5), 1, True)
        self.assertFalse(contract.started)
        self.assertEqual(contract.fixture_calls, [])

    def test_incomplete_history_and_failed_begin_cannot_be_certified(self):
        for initial in (queue(count=1), queue(state=1)):
            with self.subTest(initial=initial.hex()), self.assertRaises(capture.shared.CaptureError):
                capture.StrokeContract().begin_call(1, initial, 2, 'digitizer_normal', 0, (1., 2., .5))
        for emitted, phase, state in ((False, 2, 1), (True, 1, 1), (True, 2, 0)):
            contract = capture.StrokeContract()
            contract.begin_call(1, queue(), 2, 'digitizer_normal', 0, (1., 2., .5))
            with self.subTest(emitted=emitted, phase=phase), self.assertRaises(capture.shared.CaptureError):
                contract.finish_call(1, queue(count=1, state=state), phase, emitted)
            self.assertFalse(contract.complete)

    def test_nonfinite_inputs_are_rejected_before_including_call(self):
        for value in (float('nan'), float('inf'), -float('inf')):
            with self.subTest(value=value), self.assertRaises(capture.shared.CaptureError):
                capture.StrokeContract().begin_call(1, queue(), 2, 'digitizer_normal', 0, (value, 2., .5))

    def test_config_reset_missing_pair_and_unexplained_state_changes_fail(self):
        for changed in (queue(count=1, state=1, stabilization=31), queue(count=2, state=1),
                        queue(count=1, state=2), queue(count=1, state=1, **{'dc': 1})):
            contract = capture.StrokeContract()
            self.begin(contract)
            with self.subTest(changed=changed.hex()), self.assertRaises(capture.shared.CaptureError):
                contract.begin_call(2, changed, 1, 'digitizer_normal', 0, (7., 9., .5))
        contract = capture.StrokeContract()
        self.begin(contract)
        with self.assertRaises(capture.shared.CaptureError):
            contract.source_event(2)
        with self.assertRaises(capture.shared.CaptureError):
            capture.StrokeContract().finish_call(4, queue(), 1, True)

    def test_normal_wrapper_flags_are_explicitly_recorded(self):
        contract = capture.StrokeContract()
        self.begin(contract)
        changed = queue(count=1, state=1, **{'d8': 1})
        result = contract.begin_call(2, changed, 1, 'digitizer_normal', 0, (7., 9., .5))
        self.assertEqual(result['between_call_changes'][0]['offset'], '0xd8')

    def test_early_pressure_end_is_provisional_until_idle_continuation_and_release_return(self):
        contract = capture.StrokeContract()
        self.begin(contract)
        contract.begin_call(2, queue(count=1, state=1), 1, 'digitizer_normal', 0, (7., 9., 0.))
        contract.finish_call(2, queue(count=2, state=0), 3, True)
        self.assertFalse(contract.complete)
        contract.begin_call(3, queue(count=2, state=0), 1, 'digitizer_normal', 0, (7., 10., 0.))
        contract.finish_call(3, queue(count=3, state=0), 1, True)
        self.assertFalse(contract.complete)
        contract.source_event(6)
        contract.source_return(queue(count=3, state=0))
        self.assertTrue(contract.complete)
        self.assertEqual(contract.final_pair, 2)
        self.assertEqual(contract.fixture_calls, [1, 2, 3])

    def test_new_active_segment_after_early_pressure_end_is_rejected(self):
        contract = capture.StrokeContract()
        self.begin(contract)
        contract.begin_call(2, queue(count=1, state=1), 1, 'digitizer_normal', 0, (7., 9., 0.))
        contract.finish_call(2, queue(count=2, state=0), 3, True)
        with self.assertRaises(capture.shared.CaptureError):
            contract.begin_call(3, queue(count=2, state=0), 2, 'digitizer_normal', 0, (7., 10., .5))

    def test_second_begin_or_nested_digitizer_call_is_rejected(self):
        contract = capture.StrokeContract()
        self.begin(contract)
        with self.assertRaises(capture.shared.CaptureError):
            contract.begin_call(2, queue(count=1, state=1), 2, 'digitizer_normal', 0, (7., 9., .5))
        contract.begin_call(2, queue(count=1, state=1), 1, 'digitizer_normal', 0, (7., 9., .5))
        with self.assertRaises(capture.shared.CaptureError):
            contract.begin_call(3, queue(count=1, state=1), 1, 'digitizer_normal', 0, (7., 9., .5))

    def test_prefeed_can_complete_after_native_release_before_phase_3_input(self):
        contract = capture.StrokeContract()
        self.begin(contract)
        self.assertTrue(hasattr(contract, 'source_event'), 'Native release observation is missing')
        contract.source_event(6)
        contract.begin_call(2, queue(count=1, state=1), 1, 'digitizer_normal', 0, (7., 9., 0.))
        contract.finish_call(2, queue(count=2, state=0), 3, True)
        self.assertFalse(contract.complete, 'Final arithmetic alone precedes the native release return')
        contract.source_return(queue(count=2, state=0))
        self.assertTrue(contract.complete)

    def test_input_phase_3_without_native_release_return_cannot_finish(self):
        contract = capture.StrokeContract()
        self.begin(contract)
        contract.begin_call(2, queue(count=1, state=1), 3, 'digitizer_normal', 0, (7., 9., 0.))
        contract.finish_call(2, queue(count=2, state=0), 3, True)
        self.assertFalse(contract.complete)

    def test_captured_hover_history_allows_begin_without_new_proximity_event(self):
        contract = capture.StrokeContract()
        self.assertTrue(hasattr(contract, 'initial_history'), 'Initial history tracking is missing')
        initial = [struct.pack('<dddq', 1., 2., 0., 100), struct.pack('<dddq', 2., 3., 0., 110)]
        contract.begin_call(1, queue(count=2), 2, 'digitizer_normal', 0, (3., 4., .5), initial)
        contract.finish_call(1, queue(count=3, state=1), 2, True)
        self.assertTrue(contract.started)
        self.assertEqual(contract.initial_history, initial)

    def test_release_before_begin_does_not_certify_unrelated_pressure_end(self):
        contract = capture.StrokeContract()
        contract.source_event(6)
        self.begin(contract)
        contract.begin_call(2, queue(count=1, state=1), 1, 'digitizer_normal', 0, (7., 9., 0.))
        contract.finish_call(2, queue(count=2, state=0), 3, True)
        self.assertFalse(contract.complete)

    def test_invalid_initial_history_and_history_count_mismatch_fail(self):
        for history in ([], [bytes(31)], [struct.pack('<dddq', float('nan'), 1., 0., 4)]):
            with self.subTest(history=history), self.assertRaises(capture.shared.CaptureError):
                capture.StrokeContract().begin_call(1, queue(count=1), 2, 'digitizer_normal', 0,
                                                   (1., 2., .5), history)
        contract = capture.StrokeContract()
        contract.begin_call(1, queue(), 2, 'digitizer_normal', 0, (1., 2., .5))
        with self.assertRaises(capture.shared.CaptureError):
            contract.finish_call(1, queue(count=2, state=1), 2, True)

    def test_terminal_must_match_last_flush_result(self):
        for raw, phase in ((queue(count=2, state=0), 1), (queue(count=3, state=0), 3)):
            contract = capture.StrokeContract()
            self.begin(contract)
            contract.begin_call(2, queue(count=1, state=2), 1, 'digitizer_flush', 0, (5., 8., 0.))
            contract.finish_call(2, queue(count=2, state=0), 3, True)
            with self.subTest(phase=phase), self.assertRaises(capture.shared.CaptureError):
                contract.terminal(raw, phase)
            self.assertFalse(contract.complete)


class HostTabletCapture(capture.TabletCapture):
    def __init__(self, max_calls=512):
        super().__init__(None, 1, io.StringIO(), 30, max_calls)
        self.digitizer_queue = 0x1000
        self.initial_globals = {}
        self.registers = {f'x{i}': 0 for i in range(8)}
        self.registers.update(x0=0x1000, x1=0x2000, x7=0x3000,
                              x30=0x1020be034, sp=0x4000, w0=1, fpcr=0, fpsr=0)
        self.registers.update({f'd{i}': int.from_bytes(struct.pack('<d', value), 'little')
                               for i, value in enumerate((8.25, -6.5, .625))})
        self.memory_map = {0x1000: queue(), 0x2000: struct.pack('<i', 2),
                           0x3000: bytes(8) + struct.pack('<ddd', 8.25, -6.5, .625),
                           0x104d63f80: struct.pack('<Q', 0x1000),
                           0x104d64608: struct.pack('<Q', 0x5000), 0x5000: queue(),
                           0x1020be034: bytes.fromhex('c0020034')}
        self.reads = []
        self.owned_breakpoints = [1, 2, 3, 4]
        self.callbacks = {1: (capture.shared.ENTRY, self.entry), 2: (capture.shared.EXIT, self.exit),
                          3: (capture.TERMINAL, self.terminal), 4: (capture.DISPATCH, self.dispatch)}
        self.source_breakpoint = 4
        self.next_breakpoint = 5
        self.active_breakpoints = set(self.owned_breakpoints)
        self.target = SimpleNamespace(BreakpointDelete=self.delete_breakpoint)

    def delete_breakpoint(self, breakpoint_id):
        if breakpoint_id not in self.active_breakpoints:
            return False
        self.active_breakpoints.remove(breakpoint_id)
        return True

    def hardware_breakpoint(self, address, label):
        breakpoint_id = self.next_breakpoint
        self.next_breakpoint += 1
        self.owned_breakpoints.append(breakpoint_id)
        self.active_breakpoints.add(breakpoint_id)
        return breakpoint_id

    def reg(self, frame, name):
        return self.registers[name]

    def memory(self, address, size):
        self.reads.append((address, size))
        for start, raw in self.memory_map.items():
            if start <= address and address + size <= start + len(raw):
                offset = address - start
                return raw[offset:offset + size]
        raise AssertionError(f'Read exceeds host fixture: {address:#x}, {size} bytes')

    def active_globals(self):
        return {}

    def stack(self, thread):
        return [{'pc': '0x1021367c0', 'sp': '0x4000'}]

    def load_address(self, address):
        return address

    def rows(self):
        return [json.loads(line) for line in self.output.getvalue().splitlines()]


class TabletAdapterTests(unittest.TestCase):
    def begin(self, recorder):
        recorder.entry(Thread(11))
        recorder.memory_map[0x1000] = queue(count=1, state=1)
        recorder.registers.update(sp=0x4000 - 0xb0, w0=1)
        recorder.exit(Thread(11))

    def test_adapter_saves_caller_and_floating_point_mode_with_begin_pair(self):
        recorder = HostTabletCapture()
        self.begin(recorder)
        entries = [row for row in recorder.rows() if row['kind'] == 'entry']
        self.assertIn('caller_family', entries[0])
        self.assertEqual(entries[0]['caller_family'], 'digitizer_normal')
        self.assertEqual(entries[0]['fpcr_bits'], '0x00000000')
        self.assertEqual(entries[0]['fpsr_bits'], '0x00000000')
        self.assertTrue(recorder.stroke.started)
        self.assertEqual((recorder.entries, recorder.pairs), (1, 1))

    def test_adapter_reads_output_only_when_emitted_and_uses_saved_pointers(self):
        recorder = HostTabletCapture()
        self.begin(recorder)
        recorder.registers.update(sp=0x4000)
        recorder.memory_map[0x2000] = struct.pack('<i', 3)
        recorder.entry(Thread(11))
        recorder.registers.update(x0=99, x1=99, x7=99, sp=0x4000 - 0xb0, w0=0)
        recorder.memory_map[0x1000] = queue(count=2, state=2)
        recorder.reads = []
        recorder.exit(Thread(11))
        result = recorder.rows()[-1]
        self.assertFalse(result['emitted'])
        self.assertNotIn('output', result)
        self.assertNotIn((0x3008, 24), recorder.reads)
        self.assertEqual(recorder.stroke.fixture_calls, [1, 2])
        self.assertFalse(recorder.stroke.complete)

    def test_adapter_records_ignored_gesture_pair_without_claiming_digitizer_start(self):
        recorder = HostTabletCapture()
        recorder.registers.update(x0=0x5000, x30=0x1020d9780)
        recorder.entry(Thread(11))
        recorder.registers.update(sp=0x4000 - 0xb0)
        recorder.exit(Thread(11))
        entries = [row for row in recorder.rows() if row['kind'] == 'entry']
        self.assertIn('ignored_queue', entries[0])
        self.assertTrue(entries[0]['ignored_queue'])
        self.assertEqual(recorder.stroke.fixture_calls, [])
        self.assertFalse(recorder.stroke.started)

    def test_adapter_rejects_unknown_caller_changed_singleton_and_fpcr(self):
        for registers, replacement in (({'x30': 0xdeadbeef}, None),
                                       ({}, struct.pack('<Q', 0x9000))):
            recorder = HostTabletCapture()
            recorder.registers.update(registers)
            if replacement:
                recorder.memory_map[0x104d63f80] = replacement
            with self.assertRaises(capture.shared.CaptureError):
                recorder.entry(Thread(11))
        recorder = HostTabletCapture()
        self.begin(recorder)
        recorder.registers.update(sp=0x4000, fpcr=0x1000000)
        recorder.memory_map[0x2000] = struct.pack('<i', 1)
        with self.assertRaises(capture.shared.CaptureError):
            recorder.entry(Thread(11))

    def test_call_limit_is_failure_not_completion(self):
        recorder = HostTabletCapture(max_calls=1)
        self.begin(recorder)
        self.assertFalse(recorder.stroke.complete)
        recorder.registers.update(sp=0x4000)
        with self.assertRaises(capture.shared.CaptureError):
            recorder.entry(Thread(11))
        self.assertFalse(recorder.capture_complete)

    def test_deque_extraction_crosses_blocks_and_preserves_oldest_first_bytes(self):
        recorder = HostTabletCapture()
        raw = bytearray(queue(count=2))
        struct.pack_into('<QQ', raw, 0x10, 0x8000, 0x8010)
        struct.pack_into('<Q', raw, 0x28, 127)
        first, second = struct.pack('<dddq', 5.25, -2., 0., 100), struct.pack('<dddq', 6., -3., 0., 110)
        recorder.memory_map.update({0x8000: struct.pack('<QQ', 0x10000, 0x12000),
                                    0x10fe0: first, 0x12000: second})
        self.assertEqual(recorder.initial_history(bytes(raw)), [first, second])
        self.assertEqual(recorder.reads, [(0x8000, 16), (0x10fe0, 32), (0x12000, 32)])
        struct.pack_into('<Q', raw, 0x18, 0x8008)
        recorder.reads = []
        with self.assertRaises(capture.shared.CaptureError):
            recorder.initial_history(bytes(raw))
        self.assertEqual(recorder.reads, [])

    def test_adapter_native_release_certifies_prefeed_without_phase_3_input(self):
        recorder = HostTabletCapture()
        self.begin(recorder)
        recorder.memory_map[0x6000] = bytes(96)
        recorder.registers.update(x0=0x1000, x1=6, x2=0x6000, sp=0x4000)
        recorder.dispatch(Thread(11))
        recorder.registers.update(x1=0x2000, x2=100, d2=0)
        recorder.memory_map[0x2000] = struct.pack('<i', 1)
        recorder.entry(Thread(11))
        recorder.memory_map[0x2000] = struct.pack('<i', 3)
        recorder.memory_map[0x1000] = queue(count=2, state=0)
        recorder.registers.update(sp=0x4000 - 0xb0)
        recorder.exit(Thread(11))
        self.assertFalse(recorder.stroke.complete)
        self.assertEqual(len(recorder.active_breakpoints), 4)
        recorder.registers.update(sp=0x4000)
        recorder.source_return(Thread(11))
        self.assertTrue(recorder.stroke.complete)
        self.assertEqual(len(recorder.active_breakpoints), 4)
        self.assertEqual(recorder.callbacks[recorder.source_breakpoint][0], capture.DISPATCH)
        self.assertTrue(recorder.stroke.native_release_seen)
        self.assertFalse(recorder.stroke.input_end_seen)
        event = next(row for row in recorder.rows() if row['kind'] == 'native_dispatch')
        self.assertEqual(event['event_kind_u32'], 6)
        self.assertEqual(len(bytes.fromhex(event['packet']['bytes_le'])), 96)

    def test_adapter_terminal_preserves_final_wrapper_packet(self):
        recorder = HostTabletCapture()
        self.begin(recorder)
        recorder.memory_map[0x6000] = bytes(96)
        recorder.registers.update(x1=6, x2=0x6000, sp=0x4000)
        recorder.dispatch(Thread(11))
        recorder.memory_map[0x1000] = queue(count=1, state=2)
        recorder.memory_map[0x2000] = struct.pack('<i', 1)
        recorder.registers.update(x1=0x2000, x2=100, x30=0x1020bdef0, sp=0x4000, d2=0)
        recorder.entry(Thread(11))
        recorder.memory_map[0x2000] = struct.pack('<i', 3)
        recorder.memory_map[0x1000] = queue(count=2, state=0)
        recorder.registers.update(sp=0x4000 - 0xb0)
        recorder.exit(Thread(11))
        self.assertFalse(recorder.stroke.complete)
        packet = bytes(range(96))
        output = bytes(8) + struct.pack('<ddd', 4.25, 5.25, 0.)
        recorder.memory_map.update({0x6000: packet, 0x7004: struct.pack('<i', 3), 0x7008: output})
        recorder.registers.update(x21=0x1000, x20=0x6000, x19=0x9000, sp=0x7000)
        recorder.terminal(Thread(11))
        self.assertFalse(recorder.stroke.complete)
        self.assertEqual(recorder.rows()[-1]['input_packet']['bytes_le'], packet.hex())
        self.assertEqual(recorder.rows()[-1]['output_packet']['bytes_le'], output.hex())
        recorder.registers.update(sp=0x4000)
        recorder.source_return(Thread(11))
        self.assertTrue(recorder.stroke.complete)

    def test_native_source_return_requires_thread_stack_and_verified_instruction(self):
        recorder = HostTabletCapture()
        self.begin(recorder)
        recorder.memory_map[0x6000] = bytes(96)
        recorder.registers.update(x1=6, x2=0x6000, sp=0x4000)
        recorder.dispatch(Thread(11))
        with self.assertRaises(capture.shared.CaptureError):
            recorder.source_return(Thread(12))
        recorder.registers.update(sp=0x4008)
        with self.assertRaises(capture.shared.CaptureError):
            recorder.source_return(Thread(11))
        recorder.memory_map[0x1020be034] = bytes(4)
        with self.assertRaises(capture.shared.CaptureError):
            recorder.verify_source_return_address(0x1020be034)
        self.assertFalse(recorder.stroke.complete)

    def test_loaded_instruction_mismatch_is_recorded_and_rejected(self):
        recorder = HostTabletCapture()
        recorder.memory_map[0x8000] = b'\x01\x02\x03\x04'
        recorder.verify_instructions({'terminal': (0x8000, b'\x01\x02\x03\x04')})
        self.assertTrue(recorder.rows()[-1]['matches'])
        with self.assertRaises(capture.shared.CaptureError):
            recorder.verify_instructions({'terminal': (0x8000, b'\x00\x02\x03\x04')})
        self.assertFalse(recorder.rows()[-1]['matches'])


def run_checks():
    failures = []
    for case in (StrokeContractTests, TabletAdapterTests):
        for name in unittest.defaultTestLoader.getTestCaseNames(case):
            try:
                case(name).debug()
                print('PASS:', name, flush=True)
            except BaseException:
                failures.append(name)
                print('FAIL:', name, '\n', traceback.format_exc(), flush=True)
    if failures:
        raise AssertionError('Tablet stroke host checks failed')
    print('No target behavior, event timing, physical pen input, or pen feel was tested.')


if __name__ == '__main__':
    run_checks()
