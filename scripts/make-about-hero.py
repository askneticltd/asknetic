"""Make the responsive WebP files for the About Us hero (about-us.html) from images-icons/ceo3.jpg.

ceo3.jpg is the original and is left untouched (despite its name it is a 1672x941 PNG file with no colour
profile). It is not uploaded: only the WebP files below are referenced by the page.
If the About Us hero should show a different photo, replace ceo3.jpg and run this script again.
The hero <img> fills its section with object-fit: cover, centred, under a dark gradient overlay. Measured in
Chrome, the photo renders at these CSS widths (which the <img> sizes attribute repeats):
- viewports up to 767 px: the box is 424 px tall, so the photo is scaled to the box height (753 px wide)
  and only its centre column shows;
- 768-939 px: the box is 528 px tall, so the photo is 938 px wide;
- 940 px and wider: the photo is as wide as the viewport.
At 1x-3x pixel densities that needs 768-2300 device pixels, so the widths below cover phones (1440/1672),
laptops (1280/1440) and small 1x windows (960). None is wider than the original, so nothing is upscaled; the
crop and focal point stay as they are because only the file changes.

One-off maintenance tool (not deployed). Requires Python 3 and Pillow:
    python -m pip install Pillow
    python scripts/make-about-hero.py
"""
from pathlib import Path

from PIL import Image

IMG = Path(__file__).resolve().parent.parent / 'images-icons'
SOURCE = IMG / 'ceo3.jpg'
WIDTHS = (960, 1280, 1440, 1672)

with Image.open(SOURCE) as im:
    if im.info.get('icc_profile'):
        raise SystemExit('ceo3.jpg now has a colour profile: convert it to sRGB before running this script')
    print(f'{SOURCE.name}: {im.format} {im.width}x{im.height}, {SOURCE.stat().st_size} bytes')
    im = im.convert('RGB')
    for w in WIDTHS:
        if w > im.width:
            raise SystemExit(f'{w}px would upscale the {im.width}px original')
        h = round(im.height * w / im.width)
        out = im if w == im.width else im.resize((w, h), Image.LANCZOS)
        dest = IMG / f'ceo3-{w}.webp'
        out.save(dest, 'WEBP', quality=75, method=6)
        print(f'{dest.name}: {w}x{h}, {dest.stat().st_size} bytes')
