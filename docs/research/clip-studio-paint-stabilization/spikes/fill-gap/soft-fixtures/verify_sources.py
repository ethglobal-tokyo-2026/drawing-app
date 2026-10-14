"""Verify exact generated sources and retained Croquis final RGBA, without a binary-alpha assumption."""

import gzip
import hashlib
import json
import struct
import zlib
from collections import Counter
from pathlib import Path


DIRECTORY = Path(__file__).resolve().parent


def decoded_png(path, width, height):
    image = path.read_bytes()
    assert image[:8] == b"\x89PNG\r\n\x1a\n", path
    position, compressed, dimensions, kinds = 8, bytearray(), None, []
    while position < len(image):
        length = struct.unpack_from(">I", image, position)[0]
        kind = image[position + 4:position + 8]
        content = image[position + 8:position + 8 + length]
        checksum = struct.unpack_from(">I", image, position + 8 + length)[0]
        assert zlib.crc32(kind + content) == checksum, (path, kind)
        kinds.append(kind)
        if kind == b"IHDR":
            dimensions = struct.unpack(">2I5B", content)
        elif kind == b"IDAT":
            compressed.extend(content)
        position += length + 12
    assert position == len(image) and kinds == [b"IHDR", b"IDAT", b"IEND"], path
    assert dimensions == (width, height, 8, 6, 0, 0, 0), path
    rows = zlib.decompress(compressed)
    stride = width * 4 + 1
    assert len(rows) == stride * height, path
    assert all(rows[y * stride] == 0 for y in range(height)), path
    return b"".join(rows[y * stride + 1:(y + 1) * stride] for y in range(height))


def main():
    manifest = json.loads((DIRECTORY / "manifest.json").read_text())
    for fixture in manifest["fixtures"]:
        raw = gzip.decompress((DIRECTORY / fixture["sourceRgbaGzip"]).read_bytes())
        image = DIRECTORY / fixture["sourcePng"]
        assert hashlib.sha256(image.read_bytes()).hexdigest() == fixture["sourcePngSha256"], fixture["id"]
        assert hashlib.sha256(raw).hexdigest() == fixture["sourceRgbaSha256"], fixture["id"]
        assert decoded_png(image, fixture["width"], fixture["height"]) == raw, fixture["id"]
        assert dict(Counter(raw[3::4])) == {int(k): v for k, v in fixture["alphaHistogram"].items()}, fixture["id"]
        assert set(raw[0::4]) == set(raw[1::4]) == set(raw[2::4]) == {0}, fixture["id"]
        for key, (x, y) in fixture["probes"].items():
            assert list(raw[(y * fixture["width"] + x) * 4:(y * fixture["width"] + x) * 4 + 4]) == fixture["probeSourceRgba"][key]
    baselines = json.loads((DIRECTORY / "croquis-baselines.json").read_text())
    for result in baselines["results"]:
        fixture = next(f for f in manifest["fixtures"] if f["id"] == result["fixtureId"])
        raw = gzip.decompress((DIRECTORY / result["artifacts"]["finalRgbaGzip"]).read_bytes())
        marks = gzip.decompress((DIRECTORY / result["artifacts"]["marksGzip"]).read_bytes())
        assert len(raw) == fixture["width"] * fixture["height"] * 4
        assert len(marks) == fixture["width"] * fixture["height"]
        assert hashlib.sha256(raw).hexdigest() == result["finalRgbaSha256"]
        assert decoded_png(DIRECTORY / result["artifacts"]["finalPng"], fixture["width"], fixture["height"]) == raw
        assert marks.count(1) == result["interior"]["selectedPixels"]
        assert marks.count(7) == result["tucked"]["selectedPixels"]
    print(json.dumps({"verifiedSources": len(manifest["fixtures"]), "verifiedCroquisOutputs": len(baselines["results"]),
                      "status": "PNG checksums/decoded RGBA, raw hashes, dimensions, exact alpha histograms, probes, and output marks match."}))


if __name__ == "__main__":
    main()
