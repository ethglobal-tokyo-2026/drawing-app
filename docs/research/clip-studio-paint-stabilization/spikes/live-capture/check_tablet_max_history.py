import struct
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_tablet_stroke import HostTabletCapture, queue

recorder = HostTabletCapture()
front, count = 127, 1000
raw = bytearray(queue(count=count))
struct.pack_into('<QQ', raw, 0x10, 0x8000, 0x8048)
struct.pack_into('<Q', raw, 0x28, front)
blocks = [bytearray(4096) for _ in range(9)]
expected = []
for index in range(count):
    record = struct.pack('<dddq', index + 0.125, -index - 0.5, index / 1000, index * 7)
    expected.append(record)
    logical = front + index
    offset = (logical & 127) * 32
    blocks[logical >> 7][offset:offset + 32] = record
addresses = [0x10000 + index * 0x2000 for index in range(9)]
recorder.memory_map[0x8000] = struct.pack('<9Q', *addresses)
recorder.memory_map.update(zip(addresses, map(bytes, blocks)))
actual = recorder.initial_history(bytes(raw))
assert actual == expected, 'Maximum-sized initial history differs or is reordered'
assert len(recorder.reads) == 10, f'Expected one map read plus nine block reads: {recorder.reads!r}'
assert max(size for _, size in recorder.reads) <= 4096
print('PASS: all 1000 initial history records extracted exactly across nine blocks; ten bounded host reads.')
print('No CSP process or native device was accessed.')
