"""Make the responsive WebP files for service-page hero backgrounds from their original photos.

The originals (listed in SOURCES) are left untouched and are not uploaded: only the WebP files are
referenced by the pages. visa.jpg is in fact a PNG file despite its name.
The hero <img> fills its section with object-fit: cover, centred, under a dark overlay, so for the square
originals below the photo is drawn at the viewport width (at least the 360-448 px box height on phones).
Each original gets {name}-400/800/1200.webp plus {name}.webp at its own width, skipping any size that
would upscale it or is within 10% of the original; the page's srcset lists the same files.
If a hero should show a different photo, replace the original and run this script again.

One-off maintenance tool (not deployed). Requires Python 3 and Pillow:
    python -m pip install Pillow
    python scripts/make-service-heroes.py
"""
from pathlib import Path

from PIL import Image

IMG = Path(__file__).resolve().parent.parent / 'images-icons'
SOURCES = {
    'visa': 'visa.jpg',          # travel.html
    'car-hire': 'car-hire.jpg',  # car-hire.html
}
WIDTHS = (400, 800, 1200)

for name, original in SOURCES.items():
    source = IMG / original
    with Image.open(source) as im:
        if im.info.get('icc_profile'):
            raise SystemExit(f'{original} now has a colour profile: convert it to sRGB before running this script')
        print(f'{original}: {im.format} {im.width}x{im.height}, {source.stat().st_size} bytes')
        im = im.convert('RGB')
        for w in [w for w in WIDTHS if w < im.width * 0.9] + [im.width]:
            h = round(im.height * w / im.width)
            out = im if w == im.width else im.resize((w, h), Image.LANCZOS)
            dest = IMG / (f'{name}.webp' if w == im.width else f'{name}-{w}.webp')
            out.save(dest, 'WEBP', quality=75, method=6)
            print(f'  {dest.name}: {w}x{h}, {dest.stat().st_size} bytes')
