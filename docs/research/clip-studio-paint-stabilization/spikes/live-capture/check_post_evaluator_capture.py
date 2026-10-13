"""Host-only evaluator snapshot checks. Every address here is simulated memory."""
import struct
import unittest

from post_evaluator_capture import snapshot_evaluator


BASE = 0x100004000
EVALUATOR = 0x2000
CURVE = 0x8000


def loaded(address):
    return address + BASE - 0x100000000


def fixture(count=3):
    evaluator = bytearray(0x688)
    struct.pack_into('<Q', evaluator, 0, loaded(0x104a495f0))
    struct.pack_into('<I', evaluator, 0x80, 0x10)
    struct.pack_into('<I', evaluator, 0x198, 3)
    struct.pack_into('<Id', evaluator, 0x624, 1, 2.5)
    for offset in (0x88, 0x630):
        struct.pack_into('<QI6f', evaluator, offset, loaded(0x104a493b0),
                         0x800001f0, .25, .5, .75, 1, .125, .625)
    struct.pack_into('<Q', evaluator, 0x88 + 0x28, CURVE)
    curve = bytearray(0x16c)
    struct.pack_into('<Q', curve, 0, loaded(0x104a491a0))
    struct.pack_into('<i', curve, 0x168, count)
    for index in range(min(max(count, 0), 16)):
        struct.pack_into('<dd', curve, 0x68 + index * 16, index / 16, index / 8)
    return {EVALUATOR: evaluator, CURVE: curve}


class Memory:
    def __init__(self, data):
        self.data, self.reads, self.budgets = data, [], 0

    def read(self, address, size):
        self.reads.append((address, size))
        for start, raw in self.data.items():
            if start <= address and address + size <= start + len(raw):
                return bytes(raw[address - start:address - start + size])
        raise RuntimeError(f'Unavailable simulated memory {address:#x}+{size}')

    def budget(self):
        self.budgets += 1

    def capture(self, address=EVALUATOR):
        return snapshot_evaluator(address, self.read, loaded, self.budget)


class EvaluatorCaptureTests(unittest.TestCase):
    def test_null_is_complete_and_never_reads_memory(self):
        memory = Memory({})
        snap = memory.capture(0)
        self.assertEqual((snap['state'], snap['complete']), ('null', True))
        self.assertEqual(snap['address'], '0x0')
        self.assertIsNone(snap['main'])
        self.assertEqual(memory.reads, [])

    def test_present_snapshot_retains_raw_fields_and_explicit_null_curves(self):
        memory = Memory(fixture())
        snap = memory.capture()
        self.assertTrue(snap['complete'], snap['errors'])
        self.assertEqual(snap['imageBase'], hex(BASE))
        self.assertEqual(bytes.fromhex(snap['prefixHex']), memory.data[EVALUATOR][:0x630])
        self.assertEqual(snap['main']['address'], hex(EVALUATOR + 0x88))
        self.assertEqual(snap['secondary']['address'], hex(EVALUATOR + 0x630))
        curve = snap['main']['curves'][0]
        self.assertEqual(len(bytes.fromhex(curve['controlsHex'])), 3 * 16)
        self.assertEqual(snap['main']['curves'][1]['state'], 'null')
        self.assertEqual(memory.budgets, len(memory.reads))

    def test_unknown_evaluator_type_stops_after_vtable(self):
        data = fixture()
        struct.pack_into('<Q', data[EVALUATOR], 0, 99)
        memory = Memory(data)
        snap = memory.capture()
        self.assertFalse(snap['complete'])
        self.assertEqual(len(bytes.fromhex(snap['prefixHex'])), 8)
        self.assertEqual(memory.reads, [(EVALUATOR, 8)])

    def test_unread_present_object_never_becomes_null(self):
        snap = Memory({}).capture()
        self.assertEqual(snap['state'], 'present')
        self.assertFalse(snap['complete'])
        self.assertTrue(snap['errors'])

    def test_partial_secondary_response_is_not_a_disabled_default(self):
        data = fixture()
        data[EVALUATOR] = data[EVALUATOR][:0x630]
        snap = Memory(data).capture()
        self.assertFalse(snap['complete'])
        self.assertTrue(snap['main']['complete'])
        self.assertFalse(snap['secondary']['complete'])

    def test_unknown_response_and_curve_types_reject_without_following_pointers(self):
        for address, offset in ((EVALUATOR, 0x88), (CURVE, 0)):
            data = fixture()
            struct.pack_into('<Q', data[address], offset, 99)
            memory = Memory(data)
            snap = memory.capture()
            self.assertFalse(snap['complete'])
            self.assertNotIn((CURVE + 0x68, 48), memory.reads)

    def test_excessive_and_negative_counts_never_read_controls(self):
        for count in (-1, 17, 2**31 - 1):
            memory = Memory(fixture(count))
            snap = memory.capture()
            self.assertFalse(snap['complete'])
            self.assertFalse(any(address == CURVE + 0x68 for address, _ in memory.reads))
            self.assertEqual(snap['main']['curves'][0]['countHex'], struct.pack('<i', count).hex())

    def test_present_empty_and_single_control_are_not_absent(self):
        for count in (0, 1, 16):
            memory = Memory(fixture(count))
            snap = memory.capture()
            self.assertTrue(snap['complete'], snap['errors'])
            self.assertEqual(snap['main']['curves'][0]['state'], 'present')
            self.assertEqual(len(bytes.fromhex(snap['main']['curves'][0]['controlsHex'])), 16 * count)
            self.assertLessEqual(sum(size for _, size in memory.reads), 2300)

    def test_nonfinite_values_and_unsorted_controls_are_retained_but_incomplete(self):
        for address, offset, value, kind in ((EVALUATOR, 0x88 + 0xc, float('nan'), 'f'),
                                            (EVALUATOR, 0x628, float('inf'), 'd'),
                                            (CURVE, 0x68, float('inf'), 'd'),
                                            (CURVE, 0x68, 9, 'd')):
            data = fixture()
            struct.pack_into('<' + kind, data[address], offset, value)
            snap = Memory(data).capture()
            self.assertFalse(snap['complete'])
            self.assertTrue(snap['errors'])

    def test_short_read_is_retained_and_rejected(self):
        memory = Memory(fixture())
        read = memory.read
        def short(address, size):
            raw = read(address, size)
            return raw[:-1] if address == CURVE + 0x68 else raw
        snap = snapshot_evaluator(EVALUATOR, short, loaded, memory.budget)
        self.assertFalse(snap['complete'])
        self.assertEqual(len(bytes.fromhex(snap['main']['curves'][0]['controlsHex'])), 47)

    def test_six_maximum_curves_have_fixed_read_and_byte_bounds(self):
        data = fixture(16)
        for index in range(6):
            at = CURVE + index * 0x1000
            data[at] = bytearray(data[CURVE])
            response = 0x88 if index < 3 else 0x630
            struct.pack_into('<Q', data[EVALUATOR], response + 0x28 + (index % 3) * 16, at)
        memory = Memory(data)
        snap = memory.capture()
        self.assertTrue(snap['complete'], snap['errors'])
        self.assertEqual(len(memory.reads), 27)
        self.assertEqual(sum(size for _, size in memory.reads), 3912)

    def test_deadline_prevents_reads_and_cannot_report_complete(self):
        memory = Memory(fixture())
        def expired():
            raise TimeoutError('Synthetic deadline expired')
        snap = snapshot_evaluator(EVALUATOR, memory.read, loaded, expired)
        self.assertFalse(snap['complete'])
        self.assertEqual(memory.reads, [])
        self.assertIn('deadline', snap['errors'][0])

    def test_object_read_cannot_wrap_uint64_address_space(self):
        at = 2**64 - 8
        memory = Memory({at: struct.pack('<Q', loaded(0x104a495f0))})
        snap = memory.capture(at)
        self.assertFalse(snap['complete'])
        self.assertEqual(memory.reads, [(at, 8)])
        self.assertIn('range', snap['errors'][0])


if __name__ == '__main__':
    unittest.main()
