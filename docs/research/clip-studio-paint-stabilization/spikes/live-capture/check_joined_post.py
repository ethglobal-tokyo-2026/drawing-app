"""Host-only joined capture checks. No target attachment or application input."""

import io
import json
import struct
import sys
import unittest
from types import SimpleNamespace as NS

import capture_joined_post as joined
from check_capture_helper import Thread
from check_post_correction import graph
from check_workqueue_recovery import address, module, owned, secondary


class HostJoined(joined.JoinedPostCapture):
    def __init__(self):
        super().__init__(None, 1, io.StringIO(), 30, 1)
        self.header_written = True
        self.memory_map = graph()
        holder = bytearray(0x15c)
        struct.pack_into('<Q', holder, 0x18, 0x1000)
        struct.pack_into('<d', holder, 0x130, 0.0025)
        self.memory_map.update({0x3000: holder, 0x4000: bytes(0x108)})
        self.registers = dict(x0=0x3000, x1=0x4000, x2=0x4500, x19=0x6000,
                              x20=0x7000, x21=0, x22=0x3000, x24=0x3000,
                              x25=0, x28=0, sp=0x8000, x30=joined.BEGIN_CALLER,
                              d0=0x3ff0000000000000, fpcr=0, fpsr=0)
        self.reads = []
        self.next_probe = 1
        self.deleted = []
        self.maximum_probes = 0
        self.upstream_result = {'complete': False, 'errors': ['Host upstream fixture omitted.']}
        self.primary_holder = 0x3000

    def reg(self, frame, name):
        return self.registers[name]

    def memory(self, address, size):
        self.reads.append((address, size))
        for start, raw in self.memory_map.items():
            if start <= address and address + size <= start + len(raw):
                return bytes(raw[address - start:address - start + size])
        raise joined.CaptureError(f'Unavailable memory {address:#x}+{size}')

    def load_address(self, address):
        return address

    def first_primary_holder(self):
        return self.primary_holder

    def upstream_snapshot(self, operation, caller, frame, sp):
        return self.upstream_result.copy()

    def hardware_breakpoint(self, address, label):
        result = self.next_probe
        self.next_probe += 1
        self.owned_breakpoints.append(result)
        return result

    def delete_breakpoint(self, breakpoint_id):
        self.deleted.append(breakpoint_id)

    def stack(self, thread):
        return []

    def rows(self, event):
        return [r['details'] for r in map(json.loads, self.output.getvalue().splitlines())
                if r.get('event') == event]

    def append(self, caller=joined.APPEND_CALLER):
        self.registers.update(x30=caller)
        self.source_entry('append', Thread(7))

    def finish(self):
        self.registers.update(x30=joined.FINISH_CALLER, x20=0x6000, x25=0x7000, w3=1)
        self.source_entry('finish', Thread(7))

    def post(self):
        self.registers.update(x30=joined.POST_CALLER, w1=5, w2=0, w3=0, w4=0,
                              d1=0x3ff0000000000000)
        self.entry(Thread(7))


class JoinedTests(unittest.TestCase):
    def begun(self):
        capture = HostJoined()
        capture.install_initial_probes()
        self.assertEqual(len(capture.probes), 4)
        capture.source_entry('begin', Thread(7))
        self.assertEqual(len(capture.probes), 4)
        return capture

    def test_raw_source_records_and_effective_state_are_retained_in_order(self):
        capture = self.begun()
        capture.append()
        capture.finish()
        rows = [capture.rows('source_' + name)[0] for name in ('begin', 'append', 'finish')]
        self.assertEqual([row['sourceSequence'] for row in rows], [1, 2, 3])
        self.assertTrue(all(row['complete'] for row in rows))
        self.assertTrue(all(len(bytes.fromhex(row['recordHex'])) == 0x58 for row in rows))
        self.assertEqual(len(bytes.fromhex(rows[0]['beginHex'])), 0x108)
        self.assertNotIn('holderBefore', rows[0])
        self.assertEqual(rows[1]['scaleBits'], '3ff0000000000000')
        self.assertEqual(rows[2]['renderFlag'], 1)
        self.assertEqual(len(bytes.fromhex(rows[1]['holderBefore']['stateHex'])), 0x44)
        self.assertEqual(rows[1]['holderBefore']['pathAddress'], '0x1000')
        self.assertFalse(rows[0]['upstream']['complete'])
        self.assertEqual(rows[0]['callerReturn'], hex(joined.BEGIN_CALLER))

    def test_post_requires_finished_same_holder_and_thread_and_rotates_to_one_return_probe(self):
        capture = self.begun()
        capture.finish()
        capture.post()
        self.assertEqual(set(capture.probes), {'post_return'})
        self.assertEqual(len(capture.owned_breakpoints), 1)
        capture.registers.update(x0=0x1000, x19=0x3000, sp=0x8000 - 0xc0)
        capture.returned(Thread(7))
        self.assertTrue(capture.capture_complete)

    def test_missing_begin_finish_repeated_finish_and_append_after_finish_fail(self):
        with self.assertRaises(joined.CaptureError):
            HostJoined().append()
        for action in ('post', 'finish', 'append'):
            capture = self.begun()
            if action != 'post':
                capture.finish()
            with self.assertRaises(joined.CaptureError):
                getattr(capture, action)()
            self.assertFalse(capture.capture_complete)

    def test_same_holder_restart_remains_probed_and_is_rejected(self):
        capture = self.begun()
        self.assertIn('source_begin', capture.probes)
        with self.assertRaises(joined.CaptureError):
            capture.source_entry('begin', Thread(7))
        self.assertFalse(capture.rows('source_begin')[-1]['complete'])

    def test_wrong_thread_holder_primary_identity_and_caller_fail(self):
        for field, value in (('x0', 0x3010), ('x22', 0x3010), ('x30', 0x1234)):
            capture = self.begun()
            capture.registers.update(x30=joined.APPEND_CALLER)
            capture.registers[field] = value
            with self.assertRaises(joined.CaptureError):
                capture.source_entry('append', Thread(7))
        capture = self.begun()
        capture.registers['x30'] = joined.APPEND_CALLER
        with self.assertRaises(joined.CaptureError):
            capture.source_entry('append', Thread(8))
        capture = HostJoined()
        capture.primary_holder = 0x9000
        with self.assertRaises(joined.CaptureError):
            capture.source_entry('begin', Thread(7))

    def test_path_replacement_and_configuration_drift_are_not_accepted(self):
        for offset, format_string, value in ((0x18, '<Q', 0x9000), (0x138, '<I', 1),
                                              (0x130, '<d', 0.5), (0x11c, '<I', 1)):
            capture = self.begun()
            capture.append()
            struct.pack_into(format_string, capture.memory_map[0x3000], offset, value)
            with self.assertRaises(joined.CaptureError):
                capture.finish()

    def test_short_record_and_partial_holder_read_emit_incomplete_evidence(self):
        for address in (0x4000, 0x3000):
            capture = self.begun()
            capture.memory_map[address] = bytes(1)
            with self.assertRaises(joined.CaptureError):
                capture.append()
            row = capture.rows('source_append')[-1]
            self.assertFalse(row['complete'])
            self.assertTrue(row['errors'])

    def test_record_cap_aborts_without_truncating_a_complete_sequence(self):
        capture = self.begun()
        capture.source_sequence = joined.MAX_RECORDS
        with self.assertRaises(joined.CaptureError):
            capture.append()
        self.assertFalse(capture.capture_complete)
        self.assertEqual(capture.source_sequence, joined.MAX_RECORDS)

    def test_generated_caller_retains_record_but_upstream_is_separate(self):
        capture = self.begun()
        capture.append(joined.GENERATED_CALLER)
        row = capture.rows('source_append')[0]
        self.assertTrue(row['complete'])
        self.assertFalse(row['upstream']['complete'])

    def test_breakpoint_count_cannot_exceed_four(self):
        capture = HostJoined()
        capture.install_initial_probes()
        with self.assertRaises(joined.CaptureError):
            capture.arm('extra', 123, lambda thread: None)
        self.assertEqual(len(capture.probes), 4)

    def test_nonzero_fpcr_preserves_failure_and_cannot_start_a_source_group(self):
        capture = HostJoined()
        capture.registers['fpcr'] = 0x1000000
        with self.assertRaises(joined.CaptureError):
            capture.source_entry('begin', Thread(7))
        self.assertFalse(capture.rows('source_begin')[0]['complete'])
        self.assertEqual(capture.source_stage, 'awaiting_begin')

    def test_source_addresses_retain_aslr_caller_and_unslid_boundary_separately(self):
        capture = HostJoined()
        capture.load_address = lambda at: at + 0x4000
        capture.registers['x30'] += 0x4000
        capture.source_entry('begin', Thread(7))
        row = capture.rows('source_begin')[0]
        self.assertEqual(row['callerReturn'], hex(joined.BEGIN_CALLER))
        self.assertEqual(row['callerReturnLoad'], hex(joined.BEGIN_CALLER + 0x4000))
        self.assertEqual(row['boundary'], hex(joined.BEGIN))

    def test_joined_loop_uses_exact_shared_workqueue_guard_before_one_callback(self):
        for bad in (False, True):
            capture = HostJoined()
            delivered = []
            capture.probes = {'owned': (1, joined.BEGIN, lambda thread: delivered.append(thread.GetThreadID()))}
            library = module()
            capture.target = NS(ResolveLoadAddress=lambda pc: address(
                pc, library, '_pthread_wqthread', 0x2000),
                FindBreakpointByID=lambda bid: NS(IsValid=lambda: True, IsHardware=lambda: True,
                    FindLocationByID=lambda lid: NS(IsValid=lambda: lid == 1,
                        GetAddress=lambda: NS(GetLoadAddress=lambda target: joined.BEGIN))))
            stops = [owned(pc=joined.BEGIN), secondary(pc=0x1008 if bad else 0x1004)]
            capture.process = NS(GetStopID=lambda: 11, GetNumThreads=lambda: len(stops),
                                 GetThreadAtIndex=lambda index: stops[index])
            capture.memory_map = {0x1004: struct.pack('<II', 0x940003ff, 0xd4200020)}
            if bad:
                with self.assertRaises(joined.CaptureError):
                    capture.handle_stop(11)
                self.assertEqual(delivered, [])
            else:
                capture.handle_stop(11)
                self.assertEqual(delivered, [1])
                self.assertEqual(len(capture.workqueue_step_recoveries), 1)
                self.assertTrue(capture.capture_warnings)
                self.assertEqual(len(capture.rows('workqueue_step_recovery')), 1)


class UpstreamTests(unittest.TestCase):
    def fixture(self):
        capture = HostJoined()
        capture.upstream_snapshot = joined.JoinedPostCapture.upstream_snapshot.__get__(capture)
        brush, event, stack, movement = bytearray(0x1a4), bytearray(0xd8), bytearray(0x800), bytearray(0x90)
        struct.pack_into('<ii', brush, 0x128, 3, -4)
        struct.pack_into('<ii', brush, 0x190, 2, 0)
        struct.pack_into('<dd', event, 0x80, 12, 14)
        struct.pack_into('<diii', event, 0xa0, .75, 900, 450, -360)
        struct.pack_into('<i', event, 0xb8, 1)
        struct.pack_into('<q', event, 0xd0, 12345678)
        struct.pack_into('<Q', movement, 0, joined.MOVEMENT_VTABLE)
        struct.pack_into('<d', movement, 0x10, 1.25)
        struct.pack_into('<d', movement, 0x88, .25)
        struct.pack_into('<dd', stack, 0x190, 100, 200)
        struct.pack_into('<dd', stack, 0x1e0, 110, 210)
        struct.pack_into('<Q', stack, 0x278, 0xa000)
        struct.pack_into('<ii', stack, 0x4e8, 8, 1)
        capture.memory_map.update({0x6000: brush, 0x7000: event, 0x8000: stack, 0xa000: movement})
        capture.first_vector_object = lambda global_address: 0xa000
        capture.registers.update(d8=0x4000000000000000, d9=0x4008000000000000, d10=0x4010000000000000)
        return capture

    def test_begin_retains_actual_initializer_inputs_and_direct_append_movement(self):
        capture = self.fixture()
        capture.source_entry('begin', Thread(7))
        begin = capture.rows('source_begin')[0]['upstream']
        self.assertTrue(begin['complete'], begin['errors'])
        self.assertEqual(begin['movementStage'], 'before_initialization')
        self.assertNotIn('movement', begin)
        self.assertEqual(begin['movementBeforeInitialization']['scaleHex'], struct.pack('<d', 1.25).hex())
        self.assertEqual(begin['constructorPointHex'], struct.pack('<dd', 100, 200).hex())
        self.assertEqual(begin['startupPositionBits'], '0000000000000000')
        self.assertEqual(begin['movementInitializer']['cBits'], '4008000000000000')
        struct.pack_into('<i', capture.memory_map[0x6000], 0x194, 1)
        capture.append()
        later = capture.rows('source_append')[0]['upstream']
        self.assertTrue(later['complete'], later['errors'])
        self.assertEqual(later['movement']['bytesHex'], capture.memory_map[0xa000].hex())
        self.assertEqual(later['startupPositionBits'], '3ff0000000000000')

    def test_missing_reflections_or_device4_mode_are_explicitly_incomplete(self):
        for reflected in (True, False):
            capture = self.fixture()
            if reflected:
                struct.pack_into('<I', capture.memory_map[0x6000], 0x148, 1)
            else:
                struct.pack_into('<i', capture.memory_map[0x7000], 0xb8, 4)
            capture.source_entry('begin', Thread(7))
            row = capture.rows('source_begin')[0]
            self.assertTrue(row['complete'])
            self.assertFalse(row['upstream']['complete'])
            self.assertTrue(row['upstream']['errors'])

    def test_device4_platform_is_complete_only_after_loaded_instruction_verification(self):
        capture = self.fixture()
        struct.pack_into('<i', capture.memory_map[0x7000], 0xb8, 4)
        capture.verified_platform = 2
        capture.source_entry('begin', Thread(7))
        upstream = capture.rows('source_begin')[0]['upstream']
        self.assertTrue(upstream['complete'], upstream['errors'])
        self.assertEqual(upstream['movementInitializer']['platformValue'], 2)
        self.assertEqual(upstream['movementInitializer']['platformGetter'], '0x102194e64')

    def test_movement_deque_crosses_pages_exactly_and_caps_without_truncation(self):
        capture = self.fixture()
        raw = capture.memory_map[0xa000]
        struct.pack_into('<QQ', raw, 0x20, 0xb000, 0xb010)
        struct.pack_into('<QQ', raw, 0x38, 511, 2)
        capture.memory_map.update({0xb000: struct.pack('<QQ', 0xc000, 0xd000),
                                  0xcff8: struct.pack('<q', -2), 0xd000: struct.pack('<q', 7)})
        snap = capture.movement_snapshot(0xa000)
        self.assertTrue(snap['complete'], snap['errors'])
        self.assertEqual(snap['timestamps'], [struct.pack('<q', v).hex() for v in (-2, 7)])
        struct.pack_into('<Q', raw, 0x40, joined.MAX_TIMESTAMPS + 1)
        snap = capture.movement_snapshot(0xa000)
        self.assertFalse(snap['complete'])
        self.assertEqual(snap['timestamps'], [])
        self.assertTrue(snap['bytesHex'])

    def test_partial_upstream_reads_preserve_previous_fields(self):
        capture = self.fixture()
        capture.memory_map[0x7000] = capture.memory_map[0x7000][:0xa8]
        capture.source_entry('begin', Thread(7))
        upstream = capture.rows('source_begin')[0]['upstream']
        self.assertFalse(upstream['complete'])
        self.assertEqual(upstream['eventFields']['0xa0'], struct.pack('<d', .75).hex())


def run_checks():
    result = unittest.TextTestRunner(verbosity=2, stream=sys.stdout).run(
        unittest.TestSuite(unittest.defaultTestLoader.loadTestsFromTestCase(test)
                           for test in (JoinedTests, UpstreamTests)))
    if not result.wasSuccessful():
        raise AssertionError('Joined post capture host checks failed')
    print(f'PASS: {result.testsRun} joined capture host checks', flush=True)
