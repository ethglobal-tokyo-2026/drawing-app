"""Reproduce selected read-only CSP 5.1.4 ARM64 findings using macOS tools."""

import argparse
import hashlib
import plistlib
import re
import struct
import subprocess
import tempfile
from pathlib import Path


EXPECTED_HASH = "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "--app",
    type=Path,
    default=Path("/Applications/CLIP STUDIO 1.5/App/CLIP STUDIO PAINT.app"),
)
parser.add_argument(
    "--range", dest="ranges", action="append", default=[], metavar="START:END",
    help="Disassemble an additional half-open virtual address range; accepts hexadecimal.",
)
parser.add_argument(
    "--double", dest="doubles", action="append", default=[], type=lambda value: int(value, 0),
    help="Read an additional IEEE 754 double at a virtual address.",
)
args = parser.parse_args()
contents = args.app / "Contents"
metadata = plistlib.loads((contents / "Info.plist").read_bytes())
print("Installed version:", metadata["CFBundleShortVersionString"], flush=True)

with tempfile.TemporaryDirectory(prefix="csp-core-verification-") as temporary:
    binary = Path(temporary) / "paint-arm64"
    subprocess.run(
        ["lipo", str(contents / "MacOS" / "CLIP STUDIO PAINT"),
         "-thin", "arm64", "-output", str(binary)],
        check=True,
        timeout=30,
    )
    data = binary.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    print("Analyzed arm64 SHA256:", digest, flush=True)
    if digest != EXPECTED_HASH:
        raise SystemExit("Executable differs from the analyzed snapshot; addresses must be re-established.")

    segments = []
    position = 32
    for _ in range(struct.unpack_from("<I", data, 16)[0]):
        command, size = struct.unpack_from("<II", data, position)
        if command == 0x19:
            address, _, offset, length = struct.unpack_from("<QQQQ", data, position + 24)
            segments.append((address, address + length, offset))
        position += size

    def file_offset(address):
        for start, end, offset in segments:
            if start <= address < end:
                return offset + address - start
        raise ValueError(f"Unmapped address: {address:#x}")

    for address in [0x1042ECB78, 0x104302FD8, 0x1042EE828, 0x104520F48, 0x10433F0A0, *args.doubles]:
        print(f"{address:#x} double = {struct.unpack_from('<d', data, file_offset(address))[0]}")
    for address in (0x104517F58, 0x1042E4790, 0x1042ED458):
        print(f"{address:#x} two int32 = {struct.unpack_from('<2i', data, file_offset(address))}")

    ranges = [
        ("Window configuration", 0x1021366BC, 0x1021367C0),
        ("Fast-motion and fixed-mode window updates", 0x102136A94, 0x102136B6C),
        ("Normalized averaging", 0x102136EF0, 0x102137024),
        ("Post-correction strength conversion", 0x1028E13D8, 0x1028E1408),
        ("Post-correction scale conversion", 0x1028E1504, 0x1028E1540),
    ]
    for value in args.ranges:
        fields = value.split(":")
        if len(fields) != 2:
            raise SystemExit("--range requires START:END, for example 0x1027878ec:0x102787a1c")
        start, end = (int(field, 0) for field in fields)
        if start >= end or start % 4 or end % 4:
            raise SystemExit("Ranges must increase and have 4-byte-aligned boundaries.")
        file_offset(start)
        file_offset(end - 1)
        ranges.append((f"Requested range {value}", start, end))

    for label, start, end in ranges:
        print(f"\n{label}:")
        assembly = subprocess.check_output(
            ["objdump", "-d", "--no-show-raw-insn", f"--start-address={start:#x}",
             f"--stop-address={end:#x}", str(binary)],
            text=True,
            timeout=30,
        )
        for line in assembly.splitlines():
            if re.match(r"^[0-9a-f]+:\s", line):
                # Enclosing-symbol labels are misleading for stripped functions.
                print(re.sub(r" <[^>]*>", "", line))
