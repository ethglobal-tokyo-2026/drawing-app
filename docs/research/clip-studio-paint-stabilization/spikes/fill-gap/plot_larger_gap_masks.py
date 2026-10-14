"""Plot two measured selection differences without modifying masks or source files."""

import argparse
import base64
import gzip
import hashlib
import io
import json
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
GREEN = (110, 205, 145)
RED = (235, 70, 65)
BLUE = (55, 105, 235)
WHITE = (245, 245, 245)
INK = (31, 36, 42)
GRAY = (89, 98, 108)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def selected_mask(packed):
    if packed["encoding"] != "zlib-base64" or packed["msbFirst"] is not True:
        raise ValueError("Expected complete MSB-first lossless comparison masks")
    width, height, stride = packed["width"], packed["height"], packed["strideBytes"]
    raw = zlib.decompress(base64.b64decode(packed["data"], validate=True))
    if len(raw) != stride * height or stride < (width + 7) // 8:
        raise ValueError("Mask bytes do not match their dimensions")
    return bytearray(bool(raw[y * stride + (x >> 3)] & (0x80 >> (x & 7)))
                     for y in range(height) for x in range(width))


def measured_overlay(report_path, fixture_id, gap):
    report_bytes = report_path.read_bytes()
    report = json.loads(report_bytes)
    if report["failures"]:
        raise ValueError(f"Comparison has retained failures: {report_path}")
    result = next(r for r in report["results"] if r["fixtureId"] == fixture_id and r["gapWidth"] == gap)
    manifest = json.loads((HERE / "fixtures/manifest.json").read_text())
    fixture = next(f for f in manifest["fixtures"] if f["id"] == fixture_id)
    source = gzip.decompress((HERE / "fixtures" / fixture["sourceRgbaGzip"]).read_bytes())
    if sha256(source) != fixture["sourceRgbaSha256"] or result["sourceRgbaSha256"] != fixture["sourceRgbaSha256"]:
        raise ValueError("Source bytes differ from the measured fixture")
    native, croquis = selected_mask(result["masks"]["native"]), selected_mask(result["masks"]["croquis"])
    native_only = croquis_only = 0
    pixels = bytearray()
    for p in range(fixture["width"] * fixture["height"]):
        if native[p] and not croquis[p]:
            color = RED
            native_only += 1
        elif croquis[p] and not native[p]:
            color = BLUE
            croquis_only += 1
        elif native[p]:
            color = GREEN
        elif source[p * 4 + 3]:
            color = tuple(source[p * 4:p * 4 + 3])
        else:
            color = WHITE
        pixels.extend(color)
    expected = result["classificationDifferences"]
    if native_only != expected["nativeOnly"]["selectedPixels"] or croquis_only != expected["croquisOnly"]["selectedPixels"]:
        raise ValueError("Plotted difference counts do not match the comparison report")
    return Image.frombytes("RGB", (fixture["width"], fixture["height"]), bytes(pixels)), {
        "reportPath": str(report_path), "reportSha256": sha256(report_bytes),
        "captureSha256": report["captureSha256"], "fixtureId": fixture_id, "gap": gap,
        "seed": result["seedMapping"]["mappedDocumentSeed"], "sourceRgbaSha256": fixture["sourceRgbaSha256"],
        "nativePixels": result["nativeSelection"]["selectedPixels"],
        "croquisPixels": result["croquisSelection"]["selectedPixels"],
        "nativeOnly": native_only, "croquisOnly": croquis_only,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    edge_path = HERE / "evidence/captures/edge-gap-2-large-pair-20261013T155604.899989Z-d29399af/larger-gap-comparison.json"
    pocket_path = HERE / "evidence/captures/narrow-pocket-large-ax-g10-20261013T162344.627766Z-0bbe8c28/larger-gap-comparison.json"
    edge, edge_data = measured_overlay(edge_path, "edge-gap-2", 20)
    pocket, pocket_data = measured_overlay(pocket_path, "narrow-pocket", 10)
    regular_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
    bold_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    font = lambda size, bold=False: ImageFont.truetype(bold_path if bold else regular_path, size)
    image = Image.new("RGB", (1600, 1110), (250, 250, 248))
    draw = ImageDraw.Draw(image)
    draw.text((50, 30), "Measured fill selection", font=font(40, True), fill=INK)
    draw.text((50, 87), "Final CSP A versus Croquis IN; visible RGBA was not evaluated", font=font(25), fill=GRAY)
    for x, color, label in [(50, GREEN, "Both selected"), (345, RED, "CSP only"), (590, BLUE, "Croquis only"), (900, (0, 0, 0), "Original source lines")]:
        draw.rectangle((x, 139, x + 24, 163), fill=color)
        draw.text((x + 35, 135), label, font=font(24), fill=INK)
    for left, right in [(50, 780), (820, 1550)]:
        draw.rounded_rectangle((left, 198, right, 1035), radius=14, fill=(255, 255, 255), outline=(215, 220, 223), width=2)
    draw.text((80, 220), "Edge opening 2  |  raw gap 20", font=font(30, True), fill=INK)
    draw.text((80, 265), "CSP 30,231  |  Croquis 45,870", font=font(26), fill=INK)
    draw.text((80, 309), "15,639 Croquis-only exterior pixels", font=font(25), fill=BLUE)
    image.paste(edge.resize((672, 560), Image.Resampling.NEAREST), (79, 366))
    draw.text((80, 980), "240 x 200 source  |  actual seed [120, 100]", font=font(23), fill=GRAY)
    draw.text((850, 220), "Small pocket  |  raw gap 10", font=font(30, True), fill=INK)
    draw.text((850, 265), "CSP 80,025  |  Croquis 79,523", font=font(26), fill=INK)
    draw.text((850, 309), "502 CSP-only pocket and passage pixels", font=font(25), fill=RED)
    image.paste(pocket, (865, 355))
    # The enlarged region is display-only; complete lossless masks remain in the reports.
    detail_rectangle = (372, 242, 418, 282)
    detail = pocket.crop(detail_rectangle).resize((184, 160), Image.Resampling.NEAREST)
    image.paste(detail, (865, 841))
    draw.rectangle((864, 840, 1050, 1002), outline=GRAY, width=2)
    draw.text((1075, 857), "Pocket detail (enlarged)", font=font(23, True), fill=INK)
    draw.text((1075, 900), "500 interior pixels", font=font(23), fill=RED)
    draw.text((1075, 935), "+ 2 passage-end pixels", font=font(23), fill=RED)
    draw.text((1075, 986), "Actual seed [319, 208]", font=font(22), fill=GRAY)
    draw.text((50, 1064), "Selection differences only. Returned rectangles and final visible color are separate measurements.", font=font(24), fill=GRAY)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    raw = buffer.getvalue()
    with args.output.open("xb") as destination:
        destination.write(raw)
    metadata = {"schema": "measured-fill-selection-plot/v1", "pngSha256": sha256(raw),
                "dimensions": list(image.size), "reports": [edge_data, pocket_data],
                "legend": {"green": "Both selected", "red": "CSP only", "blue": "Croquis only"},
                "pocketDetailExclusive": list(detail_rectangle),
                "scope": "Complete final native A versus Croquis IN; no visible RGBA equivalence claim."}
    with args.output.with_suffix(".json").open("x") as destination:
        json.dump(metadata, destination, indent=2)
        destination.write("\n")
    print(json.dumps({"output": str(args.output.resolve()), "sha256": sha256(raw), "dimensions": list(image.size)}))


if __name__ == "__main__":
    main()
