"""Verify each PNG's exact RGBA pixels, chunk checksums, and retained source hashes."""

import gzip
import hashlib
import json
import struct
import zlib
from pathlib import Path


def main():
    directory = Path(__file__).resolve().parent / "fixtures"
    manifest = json.loads((directory / "manifest.json").read_text())
    for fixture in manifest["fixtures"]:
        rgba = gzip.decompress((directory / fixture["sourceRgbaGzip"]).read_bytes())
        image = (directory / fixture["sourcePng"]).read_bytes()
        assert hashlib.sha256(rgba).hexdigest() == fixture["sourceRgbaSha256"], fixture["id"]
        assert hashlib.sha256(image).hexdigest() == fixture["sourcePngSha256"], fixture["id"]
        assert image[:8] == b"\x89PNG\r\n\x1a\n", fixture["id"]
        position, compressed, dimensions = 8, bytearray(), None
        while position < len(image):
            length = struct.unpack_from(">I", image, position)[0]
            kind = image[position + 4:position + 8]
            content = image[position + 8:position + 8 + length]
            checksum = struct.unpack_from(">I", image, position + 8 + length)[0]
            assert zlib.crc32(kind + content) == checksum, (fixture["id"], kind)
            if kind == b"IHDR":
                dimensions = struct.unpack(">2I5B", content)
            elif kind == b"IDAT":
                compressed.extend(content)
            position += length + 12
        assert dimensions == (fixture["width"], fixture["height"], 8, 6, 0, 0, 0), fixture["id"]
        rows = zlib.decompress(compressed)
        stride = fixture["width"] * 4 + 1
        assert len(rows) == stride * fixture["height"], fixture["id"]
        decoded = bytearray()
        for y in range(fixture["height"]):
            assert rows[y * stride] == 0, fixture["id"]
            decoded.extend(rows[y * stride + 1:(y + 1) * stride])
        assert decoded == rgba, fixture["id"]
        assert all(rgba[p] in (0, 255) for p in range(3, len(rgba), 4)), fixture["id"]
    print(json.dumps({"verifiedFixtures": len(manifest["fixtures"]),
                      "status": "PNG bytes, RGBA bytes, binary alpha, dimensions, and hashes match"}))


if __name__ == "__main__":
    main()
