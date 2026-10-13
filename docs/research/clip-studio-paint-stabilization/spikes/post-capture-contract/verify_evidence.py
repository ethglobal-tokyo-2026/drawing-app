"""Verify saved static extracts, optionally against the pinned original image."""

import argparse
import hashlib
import json
from pathlib import Path
import struct


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def segments(data):
    require(struct.unpack_from('<I', data)[0] == 0xfeedfacf, 'Expected thin Mach-O')
    position = 32
    result = []
    for _ in range(struct.unpack_from('<I', data, 16)[0]):
        command, size = struct.unpack_from('<II', data, position)
        require(size >= 8 and position + size <= len(data), 'Invalid Mach-O command')
        if command == 0x19:
            start, _, offset, length = struct.unpack_from('<QQQQ', data, position + 24)
            result.append((start, start + length, offset))
        position += size
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path)
    options = parser.parse_args()
    directory = Path(__file__).resolve().parent / 'evidence'
    manifest = json.loads((directory / 'manifest.json').read_text())
    metadata_raw = (directory / 'metadata.json').read_bytes()
    require(digest(metadata_raw) == manifest['metadataSha256'], 'Metadata hash mismatch')
    metadata = json.loads(metadata_raw)
    data = options.binary.read_bytes() if options.binary else None
    mapping = []
    if data is not None:
        require(digest(data) == manifest['imageSha256'], 'Original image fingerprint mismatch')
        mapping = segments(data)

    def check_image(record):
        raw = bytes.fromhex(record['bytesHex'])
        require(len(raw) == record['byteCount'], f'Byte length mismatch: {record["name"]}')
        require(digest(raw) == record['sha256'], f'Byte hash mismatch: {record["name"]}')
        if data is not None:
            address = int(record['address'], 16)
            match = [(a, z, o) for a, z, o in mapping if a <= address and address + len(raw) <= z]
            require(len(match) == 1, f'Unmapped image range: {record["name"]}')
            a, _, offset = match[0]
            require(data[offset + address - a:offset + address - a + len(raw)] == raw,
                    f'Image bytes differ: {record["name"]}')

    for record in manifest['extracts']:
        check_image(record)
        require(digest((directory / record['assemblyFile']).read_bytes()) == record['assemblySha256'],
                f'Assembly hash mismatch: {record["name"]}')
    for record in metadata['imageData']:
        check_image(record)
    for record in metadata['resource']['records']:
        raw = bytes.fromhex(record['bytesHex'])
        require(len(raw) == record['byteCount'] and digest(raw) == record['sha256'],
                f'Resource record mismatch: {record["name"]}')
    print(f'PASS: {len(manifest["extracts"])} assembly extracts, '
          f'{len(metadata["imageData"])} image data records, '
          f'{len(metadata["resource"]["records"])} resource records; '
          f'pinned image comparison={data is not None}')


if __name__ == '__main__':
    main()
