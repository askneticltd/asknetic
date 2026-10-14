"""Make the wide "strip" derivatives used by the service cards (index.html, services.html).

The cards show each photo in a box only 96 px tall (h-24) with object-fit: cover, so the
browser only ever displays a horizontal band through the centre of the photo. These files
are that centre band at a 2.8:1 ratio, which is the narrowest box the cards reach (at a
320 px viewport). For every wider box, object-fit: cover crops these strips to exactly the
same region it used to crop from the full photo, so what visitors see does not change;
only the download gets smaller.

One-off maintenance tool (not deployed). Requires Python 3 and Pillow:
    python -m pip install Pillow
    python scripts/make-card-strips.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'images-icons'
RATIO = 2.8
WIDTHS = (400, 640, 960, 1280)
SOURCES = {  # output name -> largest source in the repo
    'ict-digital-solutions': 'ict-digital-solutions.webp',
    'building-maintenance': 'building-maintenance.webp',
    'agro-crop': 'agro-crop.webp',
    'building': 'building.webp',
    'general-supplies': 'general-supplies.webp',
    'travel-agency': 'travel-agency.webp',
    'cruiser42': 'cruiser42.jpg',
}

for name, src in SOURCES.items():
    with Image.open(ROOT / src) as im:
        im = im.convert('RGB')
        w, h = im.size
        band_h = round(w / RATIO)
        if band_h > h:  # never happens for these photos; keep the full height if it did
            band_h = h
        top = (h - band_h) // 2
        band = im.crop((0, top, w, top + band_h))
        for out_w in WIDTHS:
            out_h = round(out_w / RATIO)
            out = band.resize((out_w, out_h), Image.LANCZOS)
            dest = ROOT / f'{name}-strip-{out_w}.webp'
            out.save(dest, 'WEBP', quality=75, method=6)
            print(f'{dest.name}: {out_w}x{out_h}, {dest.stat().st_size // 1024} KB')
