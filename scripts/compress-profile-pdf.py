"""Make Asknetic-Company-Profile-web.pdf, a smaller copy of the company profile for the website.

The original Canva export (Asknetic-Company-Profile.pdf, 7.5 MB) stores most photos as
lossless PNG-style images. This script re-encodes each RGB photo object in place as a JPEG
(same pixel size; photos above 150 dpi on the page are reduced to 150 dpi) and leaves
everything else untouched: page content, text, vector art, patterns and transparency masks.
A photo is only replaced when the JPEG is clearly smaller. The original file is not modified.

One-off maintenance tool (not deployed). Requires Python 3, PyMuPDF and Pillow:
    python -m pip install pymupdf Pillow
    python scripts/compress-profile-pdf.py
"""
import io
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'Asknetic-Company-Profile.pdf'
DEST = ROOT / 'Asknetic-Company-Profile-web.pdf'
QUALITY = 76
MAX_DPI = 150
KEEP_IF_SAVING_BELOW = 0.25  # keep the original image unless the JPEG is at least 25% smaller

pymupdf.TOOLS.mupdf_display_errors(False)
doc = pymupdf.open(SRC)

# Largest size (in points) each image is drawn at, to know its effective resolution.
drawn = {}
for page in doc:
    for img in page.get_images(full=True):
        for rect in page.get_image_rects(img[0]):
            drawn[img[0]] = max(drawn.get(img[0], 0), rect.width)

before = after = replaced = 0
for xref in range(1, doc.xref_length()):
    if doc.xref_get_key(xref, 'Subtype')[1] != '/Image':
        continue
    if doc.xref_get_key(xref, 'ImageMask')[1] == 'true':
        continue
    info = doc.extract_image(xref)
    if not info or info.get('colorspace') != 3 or info.get('bpc') != 8:
        continue  # only 8-bit RGB photos; masks, greyscale and CMYK stay as they are
    raw_len = len(doc.xref_stream_raw(xref))
    im = Image.open(io.BytesIO(info['image'])).convert('RGB')
    width_pt = drawn.get(xref)
    if width_pt:
        target_w = round(width_pt / 72 * MAX_DPI)
        if im.width > target_w * 1.05:
            im = im.resize((target_w, round(im.height * target_w / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=QUALITY, optimize=True, progressive=False, subsampling='4:2:0')
    jpeg = buf.getvalue()
    before += raw_len
    if len(jpeg) > raw_len * (1 - KEEP_IF_SAVING_BELOW):
        after += raw_len
        continue
    doc.update_stream(xref, jpeg, compress=False)
    doc.xref_set_key(xref, 'Filter', '/DCTDecode')
    doc.xref_set_key(xref, 'DecodeParms', 'null')
    doc.xref_set_key(xref, 'Width', str(im.width))
    doc.xref_set_key(xref, 'Height', str(im.height))
    doc.xref_set_key(xref, 'BitsPerComponent', '8')
    after += len(jpeg)
    replaced += 1

doc.save(DEST, garbage=3, deflate=True)
print(f'{replaced} images re-encoded, image data {before // 1024} KB -> {after // 1024} KB')
print(f'{SRC.name}: {SRC.stat().st_size // 1024} KB -> {DEST.name}: {DEST.stat().st_size // 1024} KB')
