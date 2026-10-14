"""Host-only checks for fill capture decoding; no app or debugger actions.

Run with an ordinary Python interpreter from any directory. A dummy LLDB
module makes importing the recorder possible and rejects debugger API calls.
All inputs below are synthetic; no native process or memory is accessed.
"""

import copy
import io
import json
import struct
import sys
from pathlib import Path
from types import ModuleType
import unittest


class HostOnlyListener:
    def __init__(self, name):
        self.name = name

    def __getattr__(self, name):
        raise AssertionError(f"Host-only listener requested debugger action: {name}")


class HostOnlyLldb(ModuleType):
    def __getattr__(self, name):
        if name.startswith("__"):
            raise AttributeError(name)
        raise AssertionError(f"Host-only check requested debugger API: {name}")


host_lldb = HostOnlyLldb("lldb")
host_lldb.SBListener = HostOnlyListener
sys.modules["lldb"] = host_lldb
sys.path.insert(0, str(Path(__file__).resolve().parent))
import capture_fill as capture


def bitmap_header(width=10, height=2, stride=3, pointer=0xFEDCBA9876543210):
    raw = bytearray(range(48))
    struct.pack_into("<iii", raw, 8, width, height, stride)
    struct.pack_into("<Q", raw, 40, pointer)
    return bytes(raw)


def completed_summary(calls=1):
    return {
        "requestedCalls": calls,
        "entries": calls,
        "pairs": calls,
        "unmatchedEntries": 0,
        "operationObserved": True,
        "cleanupErrors": [],
        "captureErrors": [],
        "watchdogError": None,
        "deadlineExceeded": False,
        "detachRequestSucceeded": True,
        "detachedStateObserved": True,
    }


class HostThread:
    def __init__(self, thread_id=11):
        self.thread_id = thread_id

    def GetThreadID(self):
        return self.thread_id

    def GetFrameAtIndex(self, index):
        if index != 0:
            raise AssertionError("Only the synthetic current frame is available")
        return object()


class HostFillCapture(capture.FillCapture):
    """Use recorder callbacks unchanged with synthetic registers and memory."""

    def __init__(self, max_calls=1):
        super().__init__(None, 1, io.StringIO(), 30, max_calls,
                         "/example/research-app", "/example/original-arm64")
        self.seed_packed = ((-9 & 0xFFFFFFFF) << 32) | 7
        self.registers = {
            "x0": 0x1000, "x1": self.seed_packed, "w2": 0x400,
            "x3": 0x3000, "sp": 0x9000,
        }
        fill = bytearray(capture.OBJECT_SIZE)
        struct.pack_into("<iiii", fill, 0x140, 10, -20, 30, 40)
        struct.pack_into("<i", fill, 0x16C, 3)
        struct.pack_into("<QQ", fill, 0x190, 0x2000, 0x4000)
        struct.pack_into("<QQ", fill, 0x1A0, 0x2100, 0x4100)
        struct.pack_into("<iiii", fill, 0x1D0, 10, -20, 5, -6)
        self.memory_map = {
            0x1000: bytes(fill),
            0x2000: bitmap_header(9, 2, 2, 0x5000),
            0x2100: bytes(48),
            0x2200: bitmap_header(9, 2, 2, 0x5200),
            0x3000: struct.pack("<iiii", -1, -2, 30, 40),
            0x5000: bytes((0x81, 0xFE, 0x42, 0x7F)),
            0x5200: bytes((0x80, 0x01, 0x00, 0xFF)),
        }
        self.reads = []

    def memory(self, address, size):
        self.reads.append((address, size))
        for start, raw in self.memory_map.items():
            if start <= address and address + size <= start + len(raw):
                offset = address - start
                return raw[offset:offset + size]
        raise capture.CaptureError(f"Synthetic memory unavailable: {address:#x}, {size} bytes")

    def reg(self, frame, name):
        return self.registers[name]

    def stack(self, thread):
        return [{"pc": hex(capture.ENTRY), "sp": hex(self.registers["sp"])}]

    def set_initial_state(self, status=1):
        fill = bytearray(self.memory_map[0x1000])
        struct.pack_into("<QQ", fill, 0x1B0, 0x2200, 0x4200)
        self.memory_map[0x1000] = bytes(fill)
        self.registers.update(
            x0=0xDEAD, x3=0xBEEF, sp=0x9000 - capture.STACK_SIZE,
            x29=0x9000 - 0x10, x19=0x1000, x20=0x3000,
            x21=self.seed_packed, w0=status,
        )

    def set_return_state(self, status=1):
        fill = bytearray(self.memory_map[0x1000])
        struct.pack_into("<QQ", fill, 0x1B0, 0, 0)
        self.memory_map[0x1000] = bytes(fill)
        self.registers.update(x0=0xDEAD, x3=0xBEEF, x19=status, x20=0xAABB, x21=0xCCDD)

    def rows(self):
        return [json.loads(line) for line in self.output.getvalue().splitlines()]


class SeedDecodeChecks(unittest.TestCase):
    def test_signed_low_and_high_words(self):
        for x, y in (
            (0, 0),
            (1, 2),
            (-1, 7),
            (7, -1),
            (-2, -3),
            (-(2**31), 2**31 - 1),
            (2**31 - 1, -(2**31)),
        ):
            with self.subTest(x=x, y=y):
                packed = ((y & 0xFFFFFFFF) << 32) | (x & 0xFFFFFFFF)
                self.assertEqual(capture.decode_seed(packed), {"x": x, "y": y})


class FillHeaderDecodeChecks(unittest.TestCase):
    def test_fields_and_complete_raw_header(self):
        raw = bytearray((index * 37 + 11) & 0xFF for index in range(0x210))
        struct.pack_into("<iiii", raw, 0x140, -11, -29, 200, 401)
        struct.pack_into("<i", raw, 0x16C, -17)
        expected_pairs = {}
        for label, offset, object_pointer, control_pointer in (
            ("A", 0x190, 0x1122334455667788, 0x8877665544332211),
            ("C", 0x1A0, 0x8000000000000001, 0x1000200030004000),
            ("T", 0x1B0, 0, 0),
        ):
            struct.pack_into("<QQ", raw, offset, object_pointer, control_pointer)
            expected_pairs[label] = {
                "objectPointer": hex(object_pointer),
                "controlPointer": hex(control_pointer),
            }
        struct.pack_into("<iiii", raw, 0x1D0, -105, 213, -400, 799)
        decoded = capture.decode_fill_header(bytes(raw))
        self.assertEqual(decoded["gapWidth"], -17)
        self.assertEqual(decoded["domain"], [-11, -29, 200, 401])
        self.assertEqual(decoded["bitmapPairs"], expected_pairs)
        self.assertEqual(decoded["documentOffset"], [-105, 213])
        self.assertEqual(decoded["sourceTileOffset"], [-400, 799])
        self.assertEqual(decoded["bytesHex"], raw.hex())
        self.assertEqual(bytes.fromhex(decoded["bytesHex"]), raw)

    def test_short_header_is_rejected(self):
        for length in (0, 0x140, 0x20F):
            with self.subTest(length=length):
                with self.assertRaises(capture.CaptureError):
                    capture.decode_fill_header(bytes(length))


class BitmapHeaderDecodeChecks(unittest.TestCase):
    def test_fields_and_complete_raw_header(self):
        raw = bitmap_header()
        self.assertEqual(capture.decode_bitmap_header(raw), {
            "width": 10,
            "height": 2,
            "strideBytes": 3,
            "dataPointer": "0xfedcba9876543210",
            "dataBytes": 6,
            "bytesHex": raw.hex(),
        })

    def test_positive_dimensions_and_stride_are_required(self):
        for width, height, stride in (
            (0, 1, 1),
            (-1, 1, 1),
            (1, 0, 1),
            (1, -1, 1),
            (1, 1, 0),
            (1, 1, -1),
            (9, 1, 1),
            (17, 1, 2),
            (-(2**31), 1, 1),
            (1, -(2**31), 1),
            (1, 1, -(2**31)),
        ):
            with self.subTest(width=width, height=height, stride=stride):
                with self.assertRaises(capture.CaptureError):
                    capture.decode_bitmap_header(bitmap_header(width, height, stride))

    def test_stride_minimum_rounds_up(self):
        for width, stride in ((1, 1), (8, 1), (9, 2), (16, 2), (17, 3)):
            with self.subTest(width=width, stride=stride):
                decoded = capture.decode_bitmap_header(bitmap_header(width, 1, stride))
                self.assertEqual(decoded["dataBytes"], stride)

    def test_nonzero_data_pointer_is_required(self):
        with self.assertRaises(capture.CaptureError):
            capture.decode_bitmap_header(bitmap_header(pointer=0))

    def test_short_header_is_rejected(self):
        for length in (0, 16, 47):
            with self.subTest(length=length):
                with self.assertRaises(capture.CaptureError):
                    capture.decode_bitmap_header(bytes(length))

    def test_byte_limit_is_inclusive(self):
        raw = bitmap_header(8, 3, 1)
        self.assertEqual(capture.decode_bitmap_header(raw, max_bytes=3)["dataBytes"], 3)
        with self.assertRaises(capture.CaptureError):
            capture.decode_bitmap_header(raw, max_bytes=2)

    def test_default_byte_limit_and_large_signed_product(self):
        for height, stride in ((8388609, 1), (2**31 - 1, 2**31 - 1)):
            with self.subTest(height=height, stride=stride):
                with self.assertRaises(capture.CaptureError):
                    capture.decode_bitmap_header(bitmap_header(8, height, stride))
        decoded = capture.decode_bitmap_header(bitmap_header(8, 8388608, 1))
        self.assertEqual(decoded["dataBytes"], 8388608)


class BitmapRowChecks(unittest.TestCase):
    def test_visible_pixels_are_msb_first_and_padding_stays_in_data(self):
        header = capture.decode_bitmap_header(bitmap_header())
        data = bytearray((0x80, 0xC0, 0xFF, 0x55, 0x7F, 0xAA))
        original = bytes(data)
        self.assertEqual(capture.bitmap_rows(header, data), ["1000000011", "0101010101"])
        self.assertEqual(bytes(data), original)
        self.assertEqual(len(data), header["dataBytes"])

    def test_all_single_byte_patterns_are_msb_first(self):
        header = capture.decode_bitmap_header(bitmap_header(8, 1, 1))
        for value in range(256):
            with self.subTest(value=value):
                self.assertEqual(capture.bitmap_rows(header, bytes((value,))), [f"{value:08b}"])

    def test_hidden_bits_and_row_padding_affect_only_retained_bytes(self):
        header = capture.decode_bitmap_header(bitmap_header(9, 2, 3))
        first = bytes((0x81, 0x80, 0x00, 0x42, 0x00, 0x00))
        second = bytes((0x81, 0xFF, 0xFE, 0x42, 0x7F, 0xFF))
        self.assertNotEqual(first, second)
        self.assertEqual(capture.bitmap_rows(header, first), ["100000011", "010000100"])
        self.assertEqual(capture.bitmap_rows(header, first), capture.bitmap_rows(header, second))
        self.assertEqual(first.hex(), "818000420000")
        self.assertEqual(second.hex(), "81fffe427fff")

    def test_data_length_must_match_without_truncation(self):
        header = capture.decode_bitmap_header(bitmap_header())
        for length in (0, 5, 7):
            with self.subTest(length=length):
                with self.assertRaises(capture.CaptureError):
                    capture.bitmap_rows(header, bytes(length))


class SummaryCompletenessChecks(unittest.TestCase):
    def test_full_call_sets_with_clean_observed_detach_are_complete(self):
        for calls in (1, 2, 64):
            with self.subTest(calls=calls):
                self.assertTrue(capture.summary_complete(completed_summary(calls)))

    def test_every_required_field_must_be_present(self):
        base = completed_summary()
        for key in base:
            with self.subTest(missing=key):
                summary = copy.deepcopy(base)
                del summary[key]
                self.assertFalse(capture.summary_complete(summary))

    def test_counts_and_cleanup_failures_are_incomplete(self):
        for key, value in (
            ("requestedCalls", 0),
            ("requestedCalls", 65),
            ("entries", 0),
            ("entries", 2),
            ("pairs", 0),
            ("pairs", 2),
            ("unmatchedEntries", 1),
            ("operationObserved", False),
            ("cleanupErrors", ["detach failed"]),
            ("captureErrors", ["bitmap read failed"]),
            ("watchdogError", "interrupt failed"),
            ("deadlineExceeded", True),
            ("detachRequestSucceeded", False),
            ("detachedStateObserved", False),
        ):
            with self.subTest(key=key, value=value):
                summary = completed_summary()
                summary[key] = value
                self.assertFalse(capture.summary_complete(summary))

    def test_partial_multiple_call_set_is_incomplete(self):
        summary = completed_summary(2)
        summary.update(entries=1, pairs=1)
        self.assertFalse(capture.summary_complete(summary))

    def test_malformed_field_values_are_incomplete(self):
        for key, value in (
            ("requestedCalls", True),
            ("requestedCalls", "1"),
            ("requestedCalls", None),
            ("entries", True),
            ("pairs", True),
            ("unmatchedEntries", False),
            ("operationObserved", 1),
            ("cleanupErrors", None),
            ("captureErrors", None),
            ("watchdogError", ""),
            ("deadlineExceeded", None),
            ("detachRequestSucceeded", 1),
            ("detachedStateObserved", 1),
        ):
            with self.subTest(key=key, value=value):
                summary = completed_summary()
                summary[key] = value
                self.assertFalse(capture.summary_complete(summary))

    def test_failed_native_fill_still_has_a_complete_observed_call(self):
        summary = completed_summary()
        summary.update(successfulFills=0, allFillsSucceeded=False)
        self.assertTrue(capture.summary_complete(summary))

    def test_summary_check_does_not_change_its_input(self):
        summary = completed_summary()
        original = copy.deepcopy(summary)
        self.assertTrue(capture.summary_complete(summary))
        self.assertEqual(summary, original)


class FillPairingChecks(unittest.TestCase):
    def started_call(self):
        recorder, thread = HostFillCapture(), HostThread()
        recorder.entry(thread)
        recorder.set_initial_state()
        return recorder, thread

    def initial_call(self):
        recorder, thread = self.started_call()
        recorder.initial(thread)
        recorder.set_return_state()
        return recorder, thread

    def test_real_callbacks_save_pointers_and_record_complete_boundaries(self):
        recorder, thread = self.started_call()
        recorder.initial(thread)
        recorder.set_return_state()
        recorder.memory_map[0x5000] = bytes((0xFF, 0xFF, 0xAA, 0xAA))
        recorder.memory_map[0x3000] = struct.pack("<iiii", 10, 11, 20, 21)
        recorder.returned(thread)
        rows = recorder.rows()
        self.assertEqual([row["phase"] for row in rows], ["entry", "initial", "return"])
        self.assertEqual({row["selfPointer"] for row in rows}, {"0x1000"})
        self.assertEqual({row["arguments"]["outputRectPointer"] for row in rows}, {"0x3000"})
        self.assertEqual({row["callId"] for row in rows}, {"1"})
        for row in rows:
            self.assertEqual(row["arguments"]["seed"], {"x": 7, "y": -9})
            self.assertEqual(row["seedDocument"], {"x": 17, "y": -29})
            self.assertTrue(row["snapshot"]["complete"])
            self.assertEqual(len(bytes.fromhex(row["snapshot"]["header"]["bytesHex"])), 528)
        self.assertEqual(rows[0]["snapshot"]["bitmaps"]["C"]["state"], "unallocated")
        self.assertEqual(rows[0]["snapshot"]["bitmaps"]["T"]["state"], "null")
        self.assertEqual(rows[1]["snapshot"]["bitmaps"]["T"]["state"], "present")
        self.assertEqual(rows[2]["snapshot"]["bitmaps"]["T"]["state"], "null")
        self.assertEqual(rows[2]["snapshot"]["bitmaps"]["A"]["dataHex"], "ffffaaaa")
        self.assertEqual(rows[2]["outputRect"]["values"], [10, 11, 20, 21])
        self.assertTrue(rows[2]["selectedPixelsAreCompletedFill"])
        self.assertEqual(recorder.entries, 1)
        self.assertEqual(recorder.pairs, 1)
        self.assertEqual(recorder.successful_fills, 1)
        self.assertTrue(recorder.capture_complete)
        self.assertFalse(any(recorder.pending.values()))
        self.assertTrue(all(address not in (0xDEAD, 0xBEEF) for address, size in recorder.reads))

    def test_false_native_returns_preserve_masks_without_claiming_completed_pixels(self):
        recorder, thread = self.started_call()
        recorder.registers["w0"] = 0
        recorder.initial(thread)
        recorder.set_return_state(status=0)
        recorder.returned(thread)
        rows = recorder.rows()
        self.assertFalse(rows[1]["initialFloodSucceeded"])
        self.assertFalse(rows[2]["success"])
        self.assertFalse(rows[2]["selectedPixelsAreCompletedFill"])
        self.assertEqual(rows[2]["snapshot"]["bitmaps"]["A"]["dataHex"], "81fe427f")
        self.assertEqual(recorder.pairs, 1)
        self.assertEqual(recorder.successful_fills, 0)
        self.assertTrue(recorder.capture_complete)

    def test_other_thread_is_rejected(self):
        recorder, thread = self.started_call()
        with self.assertRaisesRegex(capture.CaptureError, "Unmatched fill boundary"):
            recorder.initial(HostThread(12))
        self.assertEqual(len(recorder.pending[11]), 1)
        self.assertEqual(recorder.pairs, 0)

    def test_stack_and_frame_pointer_mismatches_are_rejected(self):
        for register, value, message in (
            ("sp", 0x9000 - capture.STACK_SIZE + 16, "Fill stack mismatch"),
            ("x29", 0x9000 - 0x20, "Fill frame pointer mismatch"),
        ):
            with self.subTest(register=register):
                recorder, thread = self.started_call()
                recorder.registers[register] = value
                with self.assertRaisesRegex(capture.CaptureError, message):
                    recorder.initial(thread)
                self.assertFalse(recorder.pending[11][0]["midpointObserved"])

    def test_initial_saved_pointer_and_seed_mismatches_are_rejected(self):
        for register, message in (
            ("x19", "Initial fill object mismatch"),
            ("x20", "Initial output rectangle mismatch"),
            ("x21", "Initial seed mismatch"),
        ):
            with self.subTest(register=register):
                recorder, thread = self.started_call()
                recorder.registers[register] += 1
                with self.assertRaisesRegex(capture.CaptureError, message):
                    recorder.initial(thread)
                self.assertFalse(recorder.pending[11][0]["midpointObserved"])

    def test_nested_or_concurrent_entry_is_rejected(self):
        for thread_id in (11, 12):
            with self.subTest(thread_id=thread_id):
                recorder = HostFillCapture(max_calls=2)
                recorder.entry(HostThread())
                with self.assertRaisesRegex(capture.CaptureError, "Nested or concurrent"):
                    recorder.entry(HostThread(thread_id))
                self.assertEqual(recorder.entries, 1)

    def test_duplicate_initial_boundary_is_rejected(self):
        recorder, thread = self.started_call()
        recorder.initial(thread)
        with self.assertRaisesRegex(capture.CaptureError, "Duplicate initial"):
            recorder.initial(thread)
        self.assertEqual(len(recorder.rows()), 2)

    def test_return_without_initial_boundary_is_rejected(self):
        recorder, thread = self.started_call()
        recorder.set_return_state()
        with self.assertRaisesRegex(capture.CaptureError, "did not include the initial boundary"):
            recorder.returned(thread)
        self.assertEqual(recorder.pairs, 0)
        self.assertEqual(len(recorder.pending[11]), 1)

    def test_invalid_native_boolean_is_rejected(self):
        recorder, thread = self.started_call()
        recorder.registers["w0"] = 2
        with self.assertRaisesRegex(capture.CaptureError, "Unexpected initial fill Boolean"):
            recorder.initial(thread)
        recorder, thread = self.initial_call()
        recorder.registers["x19"] = 2
        with self.assertRaisesRegex(capture.CaptureError, "Unexpected final fill Boolean"):
            recorder.returned(thread)
        self.assertEqual(recorder.pairs, 0)

    def test_invariant_changes_leave_call_unpaired(self):
        for key, offset in (
            ("gapWidth", 0x16C),
            ("domain", 0x140),
            ("documentOffset", 0x1D0),
            ("sourceTileOffset", 0x1D8),
        ):
            with self.subTest(key=key):
                recorder, thread = self.initial_call()
                raw = bytearray(recorder.memory_map[0x1000])
                value = struct.unpack_from("<i", raw, offset)[0]
                struct.pack_into("<i", raw, offset, value + 1)
                recorder.memory_map[0x1000] = bytes(raw)
                with self.assertRaisesRegex(capture.CaptureError, f"Fill {key} changed within a call"):
                    recorder.returned(thread)
                self.assertEqual(recorder.pairs, 0)
                self.assertEqual(len(recorder.pending[11]), 1)
                self.assertFalse(recorder.capture_complete)

    def test_missing_bitmap_error_is_retained_in_boundary(self):
        recorder = HostFillCapture()
        del recorder.memory_map[0x2000]
        with self.assertRaisesRegex(capture.CaptureError, "Incomplete fill entry"):
            recorder.entry(HostThread())
        snapshot = recorder.rows()[0]["snapshot"]
        self.assertFalse(snapshot["complete"])
        self.assertTrue(snapshot["errors"])
        self.assertIn("Synthetic memory unavailable", snapshot["bitmaps"]["A"]["errors"][0])
        self.assertEqual(recorder.pairs, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
