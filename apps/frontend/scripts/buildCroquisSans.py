# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools[woff]==4.66.1"]
# ///
"""
Builds Croquis Sans, the app's own build of Mona Sans, into apps/frontend/src/styles/fonts/.

Mona Sans's tabular zero is slashed, and the font has no feature that undoes it, so this build drops the
slash from the tabular zero: it's then the plain zero at tabular width, on every width and weight. The
license reserves the name "Mona", so the patched font carries another family name.

Source: Mona Sans 2.000, the build Google Fonts serves, from github/mona-sans at the commit Google Fonts
copied it from (SOURCE_COMMIT). The v2.0 release's own build adds an avar that shifts the in-between
widths, so it would change text that's set today.

Run it when moving to a new Mona Sans: set SOURCE_COMMIT and SOURCE_SHA256, then
`pnpm --filter frontend croquis-sans` (needs uv: https://docs.astral.sh/uv/).
"""

import hashlib
import io
import sys
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont

SOURCE_COMMIT = "0d07d5a501a2d8d4ea456fab73aad6b9fda2060a"
SOURCE_URL = f"https://raw.githubusercontent.com/github/mona-sans/{SOURCE_COMMIT}"
SOURCE_FONT = "googlefonts/variable/MonaSans%5Bwdth,wght%5D.ttf"
SOURCE_SHA256 = "fd6e79634b5ae804a45aac7e2e3c2a325b41291fba59034f4732b0135b8475b3"
SOURCE_LICENSE = "OFL.txt"

FAMILY = ("Mona Sans", "Croquis Sans")
POSTSCRIPT_FAMILY = ("MonaSans", "CroquisSans")
RESERVED_NAME = "Mona"
# The copyright and license records name the original, as the license requires.
KEPT_NAME_IDS = {0, 13, 14}

OUT = Path(__file__).resolve().parent.parent / "src/styles/fonts"
# What Google Fonts serves for Mona Sans, so text sets as it did: its latin file, and one file for its
# latin-ext and vietnamese ranges, which a page loads only for a character in them.
FILES = {
    "croquis-sans-latin.woff2": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, "
    "U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    "croquis-sans-latin-ext.woff2": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, "
    "U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EA0-1EFF, U+2020, "
    "U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
}
LAYOUT_FEATURES = ["ccmp", "dnom", "frac", "kern", "liga", "locl", "mark", "numr", "pnum", "tnum"]
# Where the build checks the tabular zero: each end and the middle of both axes.
CHECKED_WIDTHS = (75, 100, 125)
CHECKED_WEIGHTS = (200, 400, 700, 900)


def log(message: str) -> None:
    print(f"[croquis-sans] {message}", flush=True)


def fetch(path: str) -> bytes:
    url = f"{SOURCE_URL}/{path}"
    log(f"downloading {url}")
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def tabular_glyph(font: TTFont, glyph: str) -> str:
    """The glyph `tnum` swaps `glyph` for."""
    gsub = font["GSUB"].table
    for record in gsub.FeatureList.FeatureRecord:
        if record.FeatureTag != "tnum":
            continue
        for index in record.Feature.LookupListIndex:
            for table in gsub.LookupList.Lookup[index].SubTable:
                mapping = getattr(getattr(table, "ExtSubTable", table), "mapping", {})
                if glyph in mapping:
                    return mapping[glyph]
    sys.exit(f"[croquis-sans] tnum has no substitute for {glyph}; the font's figures changed")


def drop_slash(font: TTFont) -> None:
    """Removes the tabular zero's slash, the one contour the plain zero lacks, with its deltas."""
    plain = font.getBestCmap()[ord("0")]
    tabular = tabular_glyph(font, plain)
    glyf = font["glyf"]
    plain_ends = list(glyf[plain].endPtsOfContours)
    zero = glyf[tabular]
    ends = list(zero.endPtsOfContours)
    if zero.isComposite() or len(ends) != len(plain_ends) + 1 or ends[:-1] != plain_ends:
        sys.exit(
            f"[croquis-sans] {tabular} isn't {plain}'s contours and a slash "
            f"(contour ends {ends}, {plain}'s {plain_ends}); patch it by hand"
        )
    if zero.program.getBytecode():
        sys.exit(f"[croquis-sans] {tabular} is hinted, and its instructions would point at the slash")
    start, stop = ends[-2] + 1, ends[-1] + 1
    log(f"dropping {tabular}'s slash, points {start}-{stop - 1}, and its deltas in every master")
    # Read before the outline changes: gvar decodes a glyph's deltas against its point count.
    variations = font["gvar"].variations[tabular]
    coordinates = list(zero.coordinates)
    del coordinates[start:stop]
    flags = bytearray(zero.flags)
    del flags[start:stop]
    zero.coordinates = type(zero.coordinates)(coordinates)
    zero.flags = flags
    zero.endPtsOfContours = ends[:-1]
    zero.numberOfContours = len(ends) - 1
    for variation in variations:
        del variation.coordinates[start:stop]
    zero.recalcBounds(glyf)
    advance, _ = font["hmtx"][tabular]
    font["hmtx"][tabular] = (advance, zero.xMin)


def rename(font: TTFont) -> None:
    for record in font["name"].names:
        if record.nameID in KEPT_NAME_IDS:
            continue
        text = record.toUnicode()
        renamed = text.replace(*FAMILY).replace(*POSTSCRIPT_FAMILY)
        if RESERVED_NAME in renamed:
            sys.exit(f"[croquis-sans] name {record.nameID} still says {RESERVED_NAME}: {renamed!r}")
        if renamed != text:
            record.string = renamed
    log(f"family renamed to {font['name'].getDebugName(16) or font['name'].getDebugName(1)}")


def check(path: Path) -> None:
    """Fails unless the built tabular zero is plain and as wide as the other tabular digits."""
    font = TTFont(path)
    cmap = font.getBestCmap()
    plain = cmap[ord("0")]
    tabular = tabular_glyph(font, plain)
    one_tabular = tabular_glyph(font, cmap[ord("1")])
    contours = lambda glyphs, name: sum(op == "closePath" for op, _ in record(glyphs[name]))
    for width in CHECKED_WIDTHS:
        for weight in CHECKED_WEIGHTS:
            glyphs = font.getGlyphSet(location={"wdth": width, "wght": weight})
            if glyphs[tabular].width != glyphs[one_tabular].width:
                sys.exit(f"[croquis-sans] at wdth {width} wght {weight}, {tabular} isn't tabular width")
            if contours(glyphs, tabular) != contours(glyphs, plain):
                sys.exit(f"[croquis-sans] at wdth {width} wght {weight}, {tabular} still has its slash")
    log(f"checked {path.name}: the tabular zero is plain and tabular width at every checked width and weight")


def record(glyph) -> list:
    pen = RecordingPen()
    glyph.draw(pen)
    return pen.value


def main() -> None:
    source = fetch(SOURCE_FONT)
    digest = hashlib.sha256(source).hexdigest()
    if digest != SOURCE_SHA256:
        sys.exit(f"[croquis-sans] the source font's SHA-256 is {digest}, not {SOURCE_SHA256}")
    # The source's own timestamp stays, so a rebuild of the same source writes the same bytes.
    font = TTFont(io.BytesIO(source), recalcTimestamp=False)
    drop_slash(font)
    rename(font)
    patched = io.BytesIO()
    font.save(patched)

    OUT.mkdir(parents=True, exist_ok=True)
    for name, unicodes in FILES.items():
        options = subset.Options()
        options.flavor = "woff2"
        options.layout_features = LAYOUT_FEATURES
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        options.hinting = False
        options.glyph_names = False
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=subset.parse_unicodes(unicodes.replace(" ", "")))
        part = TTFont(io.BytesIO(patched.getvalue()), recalcTimestamp=False)
        subsetter.subset(part)
        path = OUT / name
        part.flavor = "woff2"
        part.save(path)
        log(f"wrote {path.relative_to(OUT.parents[4])} ({path.stat().st_size} bytes)")
        if name == next(iter(FILES)):
            check(path)

    license_path = OUT / "OFL.txt"
    license_path.write_bytes(fetch(SOURCE_LICENSE))
    log(f"wrote {license_path.relative_to(OUT.parents[4])}")


if __name__ == "__main__":
    main()
