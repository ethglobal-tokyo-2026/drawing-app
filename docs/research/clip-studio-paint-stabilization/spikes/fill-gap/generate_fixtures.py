"""Generate exact binary-alpha PNG and compressed RGBA sources for fill research."""

import gzip
import hashlib
import json
import struct
import zlib
from collections import deque
from pathlib import Path


OUT = Path(__file__).resolve().parent / "fixtures"
BLACK = (0, 0, 0, 255)
GREEN = (0, 180, 0, 255)
CLEAR = (0, 0, 0, 0)


def chunk(kind, content):
    return struct.pack(">I", len(content)) + kind + content + struct.pack(">I", zlib.crc32(kind + content))


def png(width, height, rgba):
    rows = b"".join(b"\0" + rgba[y * width * 4:(y + 1) * width * 4] for y in range(height))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">2I5B", width, height, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


class Source:
    def __init__(self, width=640, height=480):
        self.width, self.height = width, height
        self.rgba = bytearray(width * height * 4)

    def rectangle(self, left, top, right, bottom, color=BLACK):
        assert 0 <= left < right <= self.width and 0 <= top < bottom <= self.height
        row = bytes(color) * (right - left)
        for y in range(top, bottom):
            start = (y * self.width + left) * 4
            self.rgba[start:start + len(row)] = row

    def outline(self, left, top, right, bottom, thickness=3):
        self.rectangle(left, top, right + 1, top + thickness)
        self.rectangle(left, bottom - thickness + 1, right + 1, bottom + 1)
        self.rectangle(left, top, left + thickness, bottom + 1)
        self.rectangle(right - thickness + 1, top, right + 1, bottom + 1)

    def line(self, start, end, skip=None):
        x, y = start
        dx, dy = abs(end[0] - x), -abs(end[1] - y)
        sx, sy = (1 if x < end[0] else -1), (1 if y < end[1] else -1)
        error = dx + dy
        index = 0
        points = []
        while True:
            points.append([x, y])
            if skip is None or not skip[0] <= index < skip[1]:
                self.rectangle(x - 1, y - 1, x + 2, y + 2)
            if (x, y) == end:
                return points
            twice = error * 2
            if twice >= dy:
                error += dy
                x += sx
            if twice <= dx:
                error += dx
                y += sy
            index += 1

    def topology(self, seed):
        sx, sy = seed
        assert 0 <= sx < self.width and 0 <= sy < self.height
        seed_at = (sy * self.width + sx) * 4
        seed_color = self.rgba[seed_at:seed_at + 4]
        empty = seed_color[3] < 128
        eligible = bytearray(self.width * self.height)
        for p in range(len(eligible)):
            at = p * 4
            eligible[p] = (self.rgba[at + 3] < 128 if empty else
                           self.rgba[at + 3] >= 128 and
                           sum(abs(self.rgba[at + k] - seed_color[k]) for k in range(3)) < 72)
        selected = bytearray(len(eligible))
        queue = deque([sy * self.width + sx])
        selected[queue[0]] = 1
        count = 0
        edges = set()
        while queue:
            p = queue.popleft()
            count += 1
            x, y = p % self.width, p // self.width
            if x == 0: edges.add("left")
            if x == self.width - 1: edges.add("right")
            if y == 0: edges.add("top")
            if y == self.height - 1: edges.add("bottom")
            neighbors = []
            if x: neighbors.append(p - 1)
            if x + 1 < self.width: neighbors.append(p + 1)
            if y: neighbors.append(p - self.width)
            if y + 1 < self.height: neighbors.append(p + self.width)
            for q in neighbors:
                if eligible[q] and not selected[q]:
                    selected[q] = 1
                    queue.append(q)
        return {"eligiblePixels": sum(eligible), "seedComponentPixels": count,
                "seedComponentTouches": sorted(edges), "seedRgba": list(seed_color),
                "candidateRule": "alpha<128" if empty else "alpha>=128 and summed RGB distance<72",
                "fillKind": "paper" if empty else "recolor"}


def save(name, source, seed, description, geometry, probes):
    raw = bytes(source.rgba)
    image = png(source.width, source.height, raw)
    (OUT / f"{name}.png").write_bytes(image)
    (OUT / f"{name}.rgba.gz").write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
    topology = source.topology(seed)
    assert topology["seedRgba"][3] in (0, 255)
    return {"id": name, "description": description, "width": source.width, "height": source.height,
            "seed": {"x": seed[0], "y": seed[1]}, "sourcePng": f"{name}.png",
            "sourceRgbaGzip": f"{name}.rgba.gz", "sourceRgbaSha256": hashlib.sha256(raw).hexdigest(),
            "sourcePngSha256": hashlib.sha256(image).hexdigest(), "geometry": geometry,
            "withoutGapClosing": topology, "probes": probes}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    fixtures = []
    for width in (1, 3, 5, 10, 20, 21):
        source = Source()
        source.outline(160, 100, 480, 360)
        left = 320 - width // 2
        source.rectangle(left, 358, left + width, 361, CLEAR)
        assert all(source.rgba[(y * 640 + x) * 4 + 3] == 0
                   for y in range(358, 361) for x in range(left, left + width))
        fixtures.append(save(f"axis-gap-{width}", source, (320, 230),
                             f"Three-pixel black rectangle with {width} clear bottom columns.",
                             {"outlineInclusive": [160, 100, 480, 360], "lineThickness": 3,
                              "openingExclusive": [left, 358, left + width, 361], "openingWidth": width},
                             {"inside": [320, 230], "outside": [320, 420], "opening": [320, 359]}))
        assert fixtures[-1]["withoutGapClosing"]["seedComponentTouches"] == ["bottom", "left", "right", "top"]
        if width == 5:
            fixtures.append(save("axis-near-line", source, (320, 103),
                                 "The five-column opening, with the seed one row below the upper outline.",
                                 fixtures[-1]["geometry"],
                                 {"inside": [320, 230], "outside": [320, 420], "seed": [320, 103]}))

    source = Source(240, 200)
    source.outline(20, 20, 220, 180)
    source.rectangle(119, 178, 121, 181, CLEAR)
    fixtures.append(save("edge-gap-2", source, (120, 100),
                         "Exact 240 by 200 source with its outline twenty pixels from physical sides.",
                         {"outlineInclusive": [20, 20, 220, 180], "lineThickness": 3,
                          "openingExclusive": [119, 178, 121, 181], "openingWidth": 2},
                         {"inside": [120, 100], "outside": [120, 190], "opening": [120, 179]}))

    source = Source()
    vertices = [(320, 80), (500, 230), (320, 400), (140, 230)]
    for i in range(4):
        points = source.line(vertices[i], vertices[(i + 1) % 4], (80, 89) if i == 1 else None)
        if i == 1: skipped = points[80:89]
    fixtures.append(save("diagonal-opening", source, (320, 230),
                         "Bresenham diamond, drawn with a three-pixel square pen, omitting nine path centers.",
                         {"vertices": vertices, "lineThickness": 3, "skippedPathCenters": skipped},
                         {"inside": [320, 230], "outside": [540, 420], "opening": skipped[4]}))
    assert fixtures[-1]["withoutGapClosing"]["seedComponentTouches"]

    source = Source()
    source.outline(160, 100, 480, 360)
    source.outline(380, 250, 410, 275)
    source.rectangle(380, 261, 383, 263, CLEAR)
    fixtures.append(save("narrow-pocket", source, (320, 230),
                         "Closed outer room with a small inner pocket reached through a two-pixel passage.",
                         {"outerOutlineInclusive": [160, 100, 480, 360],
                          "pocketOutlineInclusive": [380, 250, 410, 275], "lineThickness": 3,
                          "passageExclusive": [380, 261, 383, 263], "passageWidth": 2},
                         {"room": [320, 230], "pocket": [395, 262], "outside": [320, 420]}))
    assert fixtures[-1]["withoutGapClosing"]["seedComponentTouches"] == []

    source = Source()
    source.rectangle(160, 140, 300, 320, GREEN)
    source.rectangle(340, 140, 480, 320, GREEN)
    source.rectangle(300, 228, 340, 232, GREEN)
    fixtures.append(save("recolor-bridge-4", source, (230, 230),
                         "Two opaque green regions joined by a four-pixel-high green bridge.",
                         {"lobesExclusive": [[160, 140, 300, 320], [340, 140, 480, 320]],
                          "bridgeExclusive": [300, 228, 340, 232], "bridgeHeight": 4, "green": GREEN},
                         {"left": [230, 230], "right": [410, 230], "bridge": [320, 230], "outside": [320, 420]}))
    assert fixtures[-1]["withoutGapClosing"]["seedComponentPixels"] == 50560

    manifest = {"schema": "fill-fixtures/v1", "pixelFormat": "RGBA8 straight alpha",
                "nativePresetValues": [1, 3, 5, 10, 20], "comparisonFillRgb": [255, 0, 0],
                "coordinates": "Zero-based document pixels; rectangle right and bottom are exclusive unless named Inclusive.",
                "fixtures": fixtures}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"fixtures": len(fixtures), "output": str(OUT),
                      "sourceBytes": sum(f["width"] * f["height"] * 4 for f in fixtures)}))


if __name__ == "__main__":
    main()
