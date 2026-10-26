"""Make the favicon set and the social-share preview image from existing approved assets.

- Favicons: the flame mark is cut out of the existing logo (ask-logo-blvk.png / ask-logo-white.png
  differ only in the wordmark colour, so the pixels they share are the mark) and placed on the
  header colour (#352D27), where the logo already appears on the site. No new artwork is drawn.
  favicon-96.png is the icon search engines pick up (Google asks for a multiple of 48 px);
  favicon.ico (16/32/48) covers browser tabs and /favicon.ico requests.
- Social preview (og:image, 1200x630): a crop of the existing homepage hero photo
  (IMG_2562.PNG, the original of asknetic-home-hero-*.webp).

One-off maintenance tool (not deployed). Requires Python 3 and Pillow:
    python -m pip install Pillow
    python scripts/make-brand-icons.py
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / 'images-icons'
HEADER_BG = (53, 45, 39, 255)  # navysoft #352D27

white_text = Image.open(IMG / 'ask-logo-white.png').convert('RGBA')
light_text = Image.open(IMG / 'ask-logo-blvk.png').convert('RGBA')
wordmark = ImageChops.difference(white_text, light_text).convert('L').point(lambda v: 255 if v > 24 else 0)
mark = light_text.copy()
mark.putalpha(ImageChops.subtract(mark.getchannel('A'), wordmark.filter(ImageFilter.MaxFilter(5))))
mark = mark.crop(mark.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox())


def icon(size):
    canvas = Image.new('RGBA', (size, size), HEADER_BG)
    m = mark.copy()
    m.thumbnail((round(size * 0.86), round(size * 0.86)), Image.LANCZOS)
    canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return canvas.convert('RGB')


icon(96).save(IMG / 'favicon-96.png', optimize=True)
icon(180).save(IMG / 'apple-touch-icon.png', optimize=True)
icon(48).save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

hero = Image.open(IMG / 'IMG_2562.PNG').convert('RGB')  # 1536x1024
crop_h = round(hero.width * 630 / 1200)
top = 80  # keeps the faces in frame (the hero itself is anchored to the top)
hero.crop((0, top, hero.width, top + crop_h)).resize((1200, 630), Image.LANCZOS).save(
    IMG / 'og-image.jpg', 'JPEG', quality=82, optimize=True, progressive=True)

for f in (IMG / 'favicon-96.png', IMG / 'apple-touch-icon.png', ROOT / 'favicon.ico', IMG / 'og-image.jpg'):
    print(f.relative_to(ROOT), f.stat().st_size, 'bytes')
