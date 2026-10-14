"""Generate exact partial-alpha fill sources, independently of the original fixtures."""

import gzip
import hashlib
import json
import struct
import zlib
from collections import Counter
from pathlib import Path


OUT = Path(__file__).resolve().parent
WIDTH, HEIGHT = 640, 480
SEED = {"x": 320, "y": 230}
GAP = (315, 358, 325, 362)


def png(rgba):
    def chunk(kind, data):
        return (struct.pack(">I", len(data)) + kind + data
                + struct.pack(">I", zlib.crc32(kind + data)))
    rows = b"".join(b"\0" + rgba[y * WIDTH * 4:(y + 1) * WIDTH * 4]
                    for y in range(HEIGHT))
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">2I5B", WIDTH, HEIGHT, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


def overlap(left, top, right, bottom, x, y):
    return max(0, min(right, x + 1) - max(left, x)) * max(0, min(bottom, y + 1) - max(top, y))


def source(alpha=None):
    rgba = bytearray(WIDTH * HEIGHT * 4)
    for y in range(99, 362):
        for x in range(159, 482):
            if GAP[0] <= x < GAP[2] and GAP[1] <= y < GAP[3]:
                continue
            if alpha is None:
                # Exact area coverage of a continuous outer rectangle minus its clear interior.
                coverage = (overlap(159.75, 99.75, 481.25, 361.25, x, y)
                            - overlap(163, 103, 478, 358, x, y))
                value = int(coverage * 255 + 0.5)
            else:
                on_outline = (160 <= x <= 480 and 100 <= y <= 360
                              and not (163 <= x < 478 and 103 <= y < 358))
                value = alpha if on_outline else 0
            rgba[(y * WIDTH + x) * 4 + 3] = value
    return bytes(rgba)


def write_new_or_identical(path, content):
    if path.exists():
        if path.read_bytes() != content:
            raise RuntimeError(f"Refusing to replace different retained bytes: {path}")
    else:
        with path.open("xb") as handle:
            handle.write(content)


def main():
    fixtures = []
    probes = {"inside": [320, 230], "outside": [320, 420], "opening": [320, 359],
              "topCore": [320, 101], "leftCore": [161, 230],
              "outerFringe": [320, 99], "outerCornerFringe": [159, 99],
              "innerPaper": [320, 103], "outsidePaper": [320, 98]}
    for alpha in (64, 128, 192, 255, None):
        name = f"soft-axis-gap10-alpha{alpha:03}" if alpha is not None else "soft-axis-gap10-aa-outer"
        rgba = source(alpha)
        image = png(rgba)
        write_new_or_identical(OUT / f"{name}.png", image)
        write_new_or_identical(OUT / f"{name}.rgba.gz", gzip.compress(rgba, compresslevel=9, mtime=0))
        probe_rgba = {key: list(rgba[(y * WIDTH + x) * 4:(y * WIDTH + x) * 4 + 4])
                      for key, (x, y) in probes.items()}
        assert probe_rgba["inside"] == [0, 0, 0, 0]
        assert probe_rgba["opening"] == [0, 0, 0, 0]
        fixtures.append({"id": name, "width": WIDTH, "height": HEIGHT, "seed": SEED,
                         "description": (f"Three-pixel black outline, alpha {alpha}, ten clear bottom columns."
                                         if alpha is not None else
                                         "Three-pixel opaque black core with an analytic area-coverage outer fringe and ten clear bottom columns."),
                         "sourcePng": f"{name}.png", "sourceRgbaGzip": f"{name}.rgba.gz",
                         "sourcePngSha256": hashlib.sha256(image).hexdigest(),
                         "sourceRgbaSha256": hashlib.sha256(rgba).hexdigest(),
                         "alphaHistogram": dict(sorted(Counter(rgba[3::4]).items())),
                         "geometry": {"coreOutlineInclusive": [160, 100, 480, 360],
                                      "coreLineThickness": 3, "openingExclusive": list(GAP), "openingWidth": 10,
                                      "uniformOutlineAlpha": alpha,
                                      "antialiasing": None if alpha is not None else {
                                          "method": "Exact pixel-square area overlap; round alpha by floor(coverage * 255 + 0.5).",
                                          "outerRectangleContinuousExclusive": [159.75, 99.75, 481.25, 361.25],
                                          "clearInteriorContinuousExclusive": [163, 103, 478, 358],
                                          "openingClearRectangleExclusive": list(GAP),
                                          "coverage": "area(pixel intersection outer rectangle) minus area(pixel intersection clear interior); opening forced clear."}},
                         "probes": probes, "probeSourceRgba": probe_rgba})
    manifest = {"schema": "soft-fill-fixtures/v1", "pixelFormat": "RGBA8 straight alpha",
                "comparisonFillRgb": [255, 0, 0], "comparisonGaps": [10, 20],
                "coordinates": "Zero-based document pixels; right/bottom exclusive unless named Inclusive.",
                "requiredNativeSettings": {"reference": "Refer only to editing layer", "multipleReference": False,
                                           "colorMargin": 10, "antialiasing": True, "areaScaling": False,
                                           "fillNarrowAreas": True, "paint": "#ff0000"},
                "fixtures": fixtures}
    write_new_or_identical(OUT / "manifest.json", (json.dumps(manifest, indent=2) + "\n").encode())
    print(json.dumps({"generatedSources": len(fixtures), "directory": str(OUT),
                      "alphaHistograms": {f["id"]: f["alphaHistogram"] for f in fixtures}}))


if __name__ == "__main__":
    main()
