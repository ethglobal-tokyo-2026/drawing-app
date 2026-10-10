"""Verify the saved post-correction evidence; optionally compare an ARM64 image."""

import argparse
import bisect
import hashlib
import json
import re
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def decode_summary(manifest):
    lines = [f"Image SHA256: {manifest['image_sha256']}"]
    records = {record["label"]: record for record in manifest["data_records"]}

    def data(label):
        return bytes.fromhex(records[label]["bytes_hex"])

    for record in manifest["data_records"]:
        if record["kind"] == "double":
            value = struct.unpack("<d", bytes.fromhex(record["bytes_hex"]))[0]
            lines.append(f"{record['address']}: double {value!r}")
        elif record["kind"] == "double_table":
            values = struct.unpack("<8d", bytes.fromhex(record["bytes_hex"]))
            lines.append(f"{record['address']}: first eight lookup doubles {values!r}")
    for table in manifest["vtables"]:
        prefix = table["label"]
        info = struct.unpack("<Q", data(prefix + "_rtti_pointer"))[0]
        info_record = records[prefix + "_rtti"]
        require(info == int(info_record["address"], 16), prefix + ": RTTI pointer")
        name_address = struct.unpack_from("<Q", data(prefix + "_rtti"), 8)[0]
        name_address &= 0x7FFFFFFFFFFFFFFF
        require(name_address == int(records[prefix + "_name"]["address"], 16),
                prefix + ": RTTI name pointer")
        name = data(prefix + "_name").removesuffix(b"\0").decode("ascii")
        target = struct.unpack("<Q", data(prefix + "_method"))[0]
        lines.append(f"vtable {table['address']}, typeinfo {info:#x}, "
                     f"name {name_address:#x}: {name}")
        lines.append(f"  slot {table['slot']}: {target:#x}")
    return "\n".join(lines) + "\n"


def parse_image(data):
    require(struct.unpack_from("<I", data)[0] == 0xFEEDFACF, "Expected 64-bit Mach-O")
    segments = []
    function_data = None
    text_base = None
    pos = 32
    for _ in range(struct.unpack_from("<I", data, 16)[0]):
        command, size = struct.unpack_from("<II", data, pos)
        require(size >= 8 and pos + size <= len(data), "Invalid load command")
        if command == 0x19:
            name = data[pos + 8:pos + 24].rstrip(b"\0")
            address, _, offset, length = struct.unpack_from("<QQQQ", data, pos + 24)
            segments.append((address, address + length, offset))
            if name == b"__TEXT":
                text_base = address
        elif command == 0x26:
            offset, length = struct.unpack_from("<II", data, pos + 8)
            function_data = data[offset:offset + length]
        pos += size
    require(text_base is not None and function_data is not None,
            "Missing __TEXT or LC_FUNCTION_STARTS")
    starts = []
    address = text_base
    value = shift = 0
    for byte in function_data:
        value |= (byte & 127) << shift
        if byte & 128:
            shift += 7
        else:
            if value == 0:
                break
            address += value
            starts.append(address)
            value = shift = 0

    def read(address, length):
        for start, end, offset in segments:
            if start <= address and address + length <= end:
                result = data[offset + address - start:offset + address - start + length]
                require(len(result) == length, "Truncated mapped bytes")
                return result
        raise ValueError(f"Unmapped address range {address:#x} + {length}")

    return starts, read


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, help="Analyzed thin ARM64 executable")
    args = parser.parse_args()
    evidence = ROOT / "evidence"
    manifest = json.loads((evidence / "manifest.json").read_text())
    functions = manifest["functions"]
    actual_files = {path.name for path in evidence.glob("*.asm")}
    require(actual_files == {item["file"] for item in functions}, "Assembly file set differs")
    for item in functions:
        path = evidence / item["file"]
        content = path.read_bytes()
        require(sha256(content) == item["assembly_sha256"], f"{path.name}: text hash differs")
        start, end = int(item["start"], 16), int(item["end"], 16)
        header = re.search(rb"FUNCTION (0x[0-9a-f]+) size (\d+)", content)
        require(header is not None and int(header[1], 16) == start
                and int(header[2]) == end - start, f"{path.name}: function header differs")
        addresses = [int(value, 16) for value in re.findall(rb"^([0-9a-f]+):", content, re.M)]
        require(addresses == list(range(start, end, 4)), f"{path.name}: instruction range differs")
    summary = decode_summary(manifest)
    require((evidence / "constants-and-vtables.txt").read_text() == summary,
            "Decoded data summary differs")
    print(f"PASS: {len(functions)} assembly text hashes and complete instruction ranges")
    print(f"PASS: {len(manifest['data_records'])} saved data records and decoded constants/RTTI")
    if args.binary:
        binary = args.binary.read_bytes()
        require(sha256(binary) == manifest["image_sha256"], "Analyzed executable hash differs")
        starts, read = parse_image(binary)
        for item in functions:
            start, end = int(item["start"], 16), int(item["end"], 16)
            index = bisect.bisect_left(starts, start)
            require(index + 1 < len(starts) and starts[index:index + 2] == [start, end],
                    f"{item['file']}: LC_FUNCTION_STARTS boundary differs")
            require(sha256(read(start, end - start)) == item["instruction_bytes_sha256"],
                    f"{item['file']}: instruction bytes differ")
        for record in manifest["data_records"]:
            expected = bytes.fromhex(record["bytes_hex"])
            require(read(int(record["address"], 16), len(expected)) == expected,
                    f"{record['label']}: data bytes differ")
        print(f"PASS: executable SHA256 {manifest['image_sha256']}")
        print("PASS: all function boundaries, instruction-byte hashes, and data bytes match executable")
    else:
        print("Executable comparison omitted; supply --binary to perform it.")
    print("Static evidence integrity only; no stroke replay or output-equivalence claim.")


if __name__ == "__main__":
    main()
