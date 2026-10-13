"""Host-only post boundary checks, with simulated registers and memory."""

import io
import json
import struct
import unittest

import capture_post_correction as post
from check_capture_helper import Thread
from check_post_evaluator_capture import fixture as evaluator_fixture, EVALUATOR, CURVE


def graph(node_type=0x20, count=2):
    header = bytearray(0xa8)
    struct.pack_into('<Q', header, 0, 0x104a53a78)
    struct.pack_into('<I', header, 0x20, node_type)
    struct.pack_into('<QQI', header, 0x30, 0x2000 if count else 0,
                     0x2000 + (count - 1) * 0x100 if count else 0, count)
    memory = {0x1000: bytes(header)}
    sizes = {0x20: (0x104a527b0, 0x88), 0x40: (0x104a52a00, 0x98),
             0x80: (0x104a53918, 0x78), 0: (0x104a52b60, 0x78)}
    for index in range(count):
        vtable, size = sizes[node_type]
        raw = bytearray(size)
        struct.pack_into('<Qdd', raw, 0, vtable, float(index), float(index + 1))
        struct.pack_into('<QQQI', raw, 0x28,
                         0x2000 + (index + 1) * 0x100 if index + 1 < count else 0,
                         0x2000 + (index - 1) * 0x100 if index else 0, 0x1000, 0x1234)
        memory[0x2000 + index * 0x100] = bytes(raw)
    return memory


class HostPost(post.PostCapture):
    def __init__(self, memory=None):
        super().__init__(None, 1, io.StringIO(), 30, 1)
        self.memory_map = graph() if memory is None else memory
        self.memory_map[0x3018] = struct.pack('<Q', 0x1000)
        self.reads = []
        self.registers = dict(x0=0x3000, w1=5, w2=0, w3=0, w4=0, sp=0x8000,
                              d0=0x4004000000000000, d1=0x3ff0000000000000,
                              x19=0x3000, fpcr=0, fpsr=0)

    def memory(self, address, size):
        self.reads.append((address, size))
        for start, raw in self.memory_map.items():
            if start <= address and address + size <= start + len(raw):
                return raw[address - start:address - start + size]
        raise post.CaptureError(f'Unavailable memory {address:#x}+{size}')

    def load_address(self, address):
        return address

    def reg(self, frame, name):
        return self.registers[name]

    def stack(self, thread):
        return []


class PostTests(unittest.TestCase):
    def test_null_endpoint_evaluator_is_explicitly_captured(self):
        snap = HostPost().path_snapshot(0x1000)
        self.assertTrue(snap['complete'])
        self.assertEqual(snap['endpointEvaluator']['state'], 'null')
        self.assertTrue(snap['endpointEvaluator']['complete'])

    def test_unread_endpoint_evaluator_makes_path_incomplete_without_losing_nodes(self):
        test = HostPost()
        raw = bytearray(test.memory_map[0x1000])
        struct.pack_into('<Q', raw, 0x88, 0x8000)
        test.memory_map[0x1000] = bytes(raw)
        snap = test.path_snapshot(0x1000)
        self.assertFalse(snap['complete'])
        self.assertEqual(len(snap['nodes']), 2)
        self.assertEqual(snap['endpointEvaluator']['state'], 'present')
        self.assertFalse(snap['endpointEvaluator']['complete'])

    def test_entry_and_return_both_snapshot_present_configuration(self):
        test = HostPost()
        data = evaluator_fixture()
        for offset in (0, 0x88, 0x630):
            value = struct.unpack_from('<Q', data[EVALUATOR], offset)[0]
            struct.pack_into('<Q', data[EVALUATOR], offset, value - 0x4000)
        struct.pack_into('<Q', data[CURVE], 0, 0x104a491a0)
        test.memory_map.update({0x5000: data[EVALUATOR], CURVE: data[CURVE]})
        raw = bytearray(test.memory_map[0x1000])
        struct.pack_into('<Q', raw, 0x88, 0x5000)
        test.memory_map[0x1000] = bytes(raw)
        test.entry(Thread(7))
        test.registers.update(x0=0x1000, sp=0x8000 - 0xc0)
        test.returned(Thread(7))
        rows = [json.loads(row) for row in test.output.getvalue().splitlines()]
        boundaries = [row for row in rows if row['kind'] == 'boundary']
        self.assertEqual(len(boundaries), 2)
        self.assertTrue(all(row['path']['endpointEvaluator']['complete'] for row in boundaries))
        self.assertEqual(boundaries[0]['path']['endpointEvaluator'], boundaries[1]['path']['endpointEvaluator'])

    def test_complete_graph_preserves_every_allocated_byte(self):
        for kind, size in ((0, 0x78), (0x20, 0x88), (0x40, 0x98), (0x80, 0x78)):
            test = HostPost(graph(kind))
            snap = test.path_snapshot(0x1000)
            self.assertTrue(snap['complete'])
            self.assertEqual(len(bytes.fromhex(snap['headerHex'])), 0xa8)
            self.assertEqual([len(bytes.fromhex(n['bytesHex'])) for n in snap['nodes']], [size, size])
            self.assertEqual(bytes.fromhex(snap['nodes'][0]['bytesHex']), test.memory_map[0x2000])

    def test_closed_flag_does_not_follow_an_invented_ring(self):
        test = HostPost()
        raw = bytearray(test.memory_map[0x1000])
        struct.pack_into('<I', raw, 0x20, 0x120)
        test.memory_map[0x1000] = bytes(raw)
        self.assertEqual(len(test.path_snapshot(0x1000)['nodes']), 2)

    def test_invalid_graph_is_rejected_and_partial_bytes_are_retained(self):
        for offset, value in ((0x28, 0x2000), (0x30, 99), (0x38, 99), (0, 99)):
            test = HostPost()
            raw = bytearray(test.memory_map[0x2000])
            struct.pack_into('<Q', raw, offset, value)
            test.memory_map[0x2000] = bytes(raw)
            snap = test.path_snapshot(0x1000)
            self.assertFalse(snap['complete'])
            self.assertTrue(snap['errors'])
            self.assertTrue(snap['headerHex'])

    def test_count_limit_fails_without_silent_truncation(self):
        test = HostPost()
        raw = bytearray(test.memory_map[0x1000])
        struct.pack_into('<I', raw, 0x40, post.MAX_NODES + 1)
        test.memory_map[0x1000] = bytes(raw)
        snap = test.path_snapshot(0x1000)
        self.assertFalse(snap['complete'])
        self.assertIn('limit', snap['errors'][0])
        self.assertFalse(snap['nodes'])

    def test_path_type_checks_vtable_without_constraining_node_flags(self):
        test = HostPost()
        raw = bytearray(test.memory_map[0x1000])
        struct.pack_into('<I', raw, 0x20, 0x80)
        test.memory_map[0x1000] = bytes(raw)
        self.assertFalse(test.path_snapshot(0x1000)['complete'])

    def test_source_replacement_never_rereads_freed_source(self):
        test = HostPost()
        test.entry(Thread(7))
        test.memory_map = {0x3018: struct.pack('<Q', 0x4000)}
        replacement = graph(0x80, 0)[0x1000]
        test.memory_map[0x4000] = replacement
        test.registers.update(x0=0x4000, sp=0x8000 - 0xc0)
        test.returned(Thread(7))
        rows = [json.loads(row) for row in test.output.getvalue().splitlines()]
        boundaries = [row for row in rows if row['kind'] == 'boundary']
        self.assertEqual([row['path']['address'] for row in boundaries], ['0x1000', '0x4000'])
        self.assertTrue(test.capture_complete)

    def test_pairing_rejects_wrong_thread_stack_holder_and_return_pointer(self):
        for changes, tid in (({}, 8), ({'sp': 8}, 7), ({'x19': 0}, 7), ({'x0': 9}, 7)):
            test = HostPost()
            test.entry(Thread(7))
            test.registers.update(x0=0x1000, sp=0x8000 - 0xc0)
            test.registers.update(changes)
            with self.assertRaises(post.CaptureError):
                test.returned(Thread(tid))
            self.assertFalse(test.capture_complete)

    def test_unfinished_or_invalid_entry_cannot_complete(self):
        test = HostPost()
        test.entry(Thread(7))
        self.assertFalse(test.capture_complete)
        with self.assertRaises(post.CaptureError):
            test.entry(Thread(7))
        invalid = HostPost()
        invalid.registers['w4'] = 3
        with self.assertRaises(post.CaptureError):
            invalid.entry(Thread(7))


def run_checks():
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(PostTests))
    if not result.wasSuccessful():
        raise AssertionError('Post capture host checks failed')
    print(f'PASS: {result.testsRun} post capture host checks', flush=True)
