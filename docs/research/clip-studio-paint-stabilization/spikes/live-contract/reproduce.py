"""Regenerate the native packet evidence from the identified ARM64 image."""

import argparse
import contextlib
import hashlib
import io
import os
from pathlib import Path
import struct
import subprocess
import sys

EXPECTED_SHA256 = '6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd'
DISASSEMBLY = {
    'correct-pressure.asm': [(0x1020571a8,)],
    'device-type.asm': [(0x102194e64,), (0x102072aa4,)],
    'dispatch-producer.asm': [(0x1021f0b1c,)],
    'event-to-packet.asm': [(0x1020572a8,)],
    'fallback-clock.asm': [(0x1031088a4,), (0x103121190,)],
    'fallback-timestamp.asm': [(0x10310f644,)],
    'interval-settings.asm': [(0x1005e9444,)],
    'interval-writer.asm': [(0x1020be418,)],
    'mac-packet-producer.asm': [(0x10205767c, 0x1020579a0)],
    'other-packet-producer.asm': [(0x103201a20, 0x103201c70)],
    'output-callback.asm': [(0x1021f0b90,)],
    'platform-version.asm': [(0x102072aac,)],
}

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
if not os.environ.get('CSP_ARM64'):
    parser.error('Set CSP_ARM64 to the extracted Clip Studio Paint ARM64 image.')
binary = Path(os.environ['CSP_ARM64'])
actual_hash = hashlib.sha256(binary.read_bytes()).hexdigest()
if actual_hash != EXPECTED_SHA256:
    parser.error(f'Image SHA-256 is {actual_hash}; expected {EXPECTED_SHA256}.')

# This import reads the selected image after its identity has been checked.
import inspect_binary as image

args.output.mkdir(parents=True, exist_ok=True)
for name, ranges in DISASSEMBLY.items():
    print(f'Regenerating {name}', flush=True)
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        for address_range in ranges:
            image.disasm(*address_range)
    (args.output / name).write_text(output.getvalue())

for name in ('event-to-packet', 'mac-packet-producer', 'platform-version'):
    output = subprocess.check_output(
        [sys.executable, str(Path(__file__).with_name('annotate_selectors.py')),
         str(args.output / f'{name}.asm')], text=True, timeout=30,
    )
    (args.output / f'{name}-selectors.asm').write_text(output)

constants = io.StringIO()
for address, format_string in [
    (0x104b22068, '<q'), (0x104b22070, '<I'), (0x104513b28, '<3q'),
    (0x1042ecf58, '<d'), (0x1042ef008, '<2I'), (0x104510f80, '<2I'),
    (0x104510f88, '<d'),
]:
    offset = image.offset(address)
    value = struct.unpack_from(format_string, image.DATA, offset)
    data = image.DATA[offset:offset + struct.calcsize(format_string)]
    print(f'VA {address:#x}; file offset {offset:#x}; format {format_string}; '
          f'value {value}; bytes {data.hex()}', file=constants)
    print('section', [(hex(a), hex(z), hex(o), name)
                      for a, z, o, name in image.sections if a <= address < z],
          file=constants)
(args.output / 'constants.txt').write_text(constants.getvalue())

print('Regenerating imported symbols and Objective-C metadata excerpts', flush=True)
symbols = subprocess.check_output(
    ['objdump', '--macho', '--indirect-symbols', str(binary)], text=True, timeout=30,
)
selected = '\n'.join(line for line in symbols.splitlines()
                     if any(address in line for address in
                            ['103bd9f98', '103bd9e00', '103bd9e3c', '103bdf4e8']))
(args.output / 'indirect-symbols.txt').write_text(selected + '\n')
metadata = subprocess.check_output(
    ['objdump', '--macho', '--objc-meta-data', str(binary)], text=True, timeout=30,
).splitlines()
excerpt = io.StringIO()
for first, last in [(1920, 1940), (2045, 2070)]:
    for index in range(first - 1, last):
        print(f'{index + 1}: {metadata[index]}', file=excerpt)
for address in [0x104af5858, 0x104af5bc0, 0x104af7718, 0x104af7720]:
    pointer = struct.unpack_from('<Q', image.DATA, image.offset(address))[0]
    offset = image.offset(pointer)
    name = image.DATA[offset:image.DATA.index(b'\0', offset)].decode()
    print(hex(address), '->', hex(pointer), '->', name, file=excerpt)
(args.output / 'objc-relevant-metadata.txt').write_text(excerpt.getvalue())
print(f'Generated {len(DISASSEMBLY) + 6} evidence files; image SHA-256 {actual_hash}.')
