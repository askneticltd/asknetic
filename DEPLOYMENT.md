# Building and deploying the Asknetic Group website

The site is plain HTML with a small PHP contact endpoint. Everything a browser needs is already built
and committed, so **deploying needs no build step**: run `npm run package` (or copy the allowlist below)
and upload the result to `public_html`.

## What runs where

| Part | Source | Built file (committed) |
|---|---|---|
| Styles | Tailwind 3.4.17 classes in the HTML, `tailwind.config.js`, `src/site.css` | `assets/css/site.css` (minified) |
| Icons | Font Awesome Free 6.5.1 (devDependency) | an inline SVG sprite at the top of each page |
| Fonts | Inter and Outfit, plus Cinzel Bold and Montserrat ExtraBold cut down to the letters of the header wordmark (all SIL Open Font License, see `assets/fonts/OFL-*.txt`) | `assets/fonts/*.woff2` |
| Menus, back-to-top, footer year | `assets/js/site.js` | same file |
| Contact form | `api/contact.php` + PHPMailer in the private folder | see `private/README.md` |

No page loads anything from a CDN. The only third-party content is the Google Maps frame on `contact.html`
and outgoing links (WhatsApp, Instagram).

## Rebuilding after a change

Requires Node.js 18 or newer.

```text
npm ci             # installs exactly tailwindcss 3.4.17 and @fortawesome/fontawesome-free 6.5.1
npm run build      # icons -> CSS -> cache-busting hashes in every page
npm run check      # links, images (type, srcset widths, sizes), anchors, headings, sitemap; must print "OK"
npm run package    # writes dist/ (the upload)
```

- **Changed or added Tailwind classes in a page?** Run `npm run build`; classes that are not compiled have no effect.
- **Adding an icon:** write `<svg class="icon"><use href="#fa-solid-NAME"></use></svg>` (or `fa-regular-`, `fa-brands-`)
  and run `npm run build`; the script adds the symbol and the `viewBox`.
- Do not edit `assets/css/site.css` by hand; edit `src/site.css` or the HTML and rebuild.
- `npm run build` also updates `?v=...` on the CSS/JS links. The server caches those files for a year, so
  without a rebuild visitors would keep the old file.

### Design tokens

All pages now share one Tailwind config. Before this change each page sent its own config to the Tailwind
CDN, and `services.html` differed slightly. These differences were reviewed before unifying:

| Token | Other pages | services.html | Now |
|---|---|---|---|
| `inksoft` | `#645A52` | `#665D56` (6 uses) | `#645A52`; a 2–4/255 per-channel difference, and the darker value has the better contrast |
| `dark` | not defined | `#11100F` (2 uses) | added to the shared palette; no other page used the name |
| `shadow-soft` | `0 20px 50px -20px …0.25` | `0 25px 70px -25px …0.30` (1 use) | the one use on services.html keeps its exact value as an arbitrary class |
| `shadow-card` | `0 10px 30px -10px …0.12` | `0 15px 45px -20px …0.20` | services.html never used it |
| `paper` | `#FFFFFF` | not defined | kept (unused) |

Two accessibility tokens were added: `flamedeep` (`#B85A18`) is now the background of buttons with white
text (4.65:1), and `flameink` (`#A4501A`) is used for small orange text on light backgrounds (at least
4.85:1 on every light background used). `flame` (`#E17A2E`) remains for icons, borders, decorative accents
and text on dark backgrounds.

## Deployment allowlist

`npm run package` builds `dist/` from this list and checks that every file a page references is inside it:

- every `*.html` file in the root (11 pages and `404.html`)
- `.htaccess`, `robots.txt`, `sitemap.xml`, `favicon.ico`
- `api/contact.php`
- `assets/` (CSS, JS, fonts and their licence files)
- `Asknetic-Company-Profile-web.pdf` (the 1.9 MB web copy linked from about-us.html; the original is 7.6 MB)
- only the `images-icons/` files that a page references (currently 97 of 132)

**Never upload:** `.git/`, `private/`, `drafts/`, `node_modules/`, `src/`, `scripts/`, `dist/` itself, `package*.json`,
`tailwind.config.js`, the Markdown files, the original `Asknetic-Company-Profile.pdf` (7.6 MB), or the
unreferenced originals in `images-icons/` (large photos kept in the repository as sources, such as
`ceo3.jpg`, the 1.9 MB original of the About Us hero). As a safety net, `.htaccess` answers 404 for hidden
files, `private/`, `drafts/`, `src/`, `scripts/`, `node_modules/` and similar paths if they are uploaded by mistake.

## Uploading to cPanel

1. Prepare the private folder **outside** `public_html` as described in `private/README.md`
   (`~/asknetic-private/` with PHPMailer 6.1.0 or newer and `mail-config.php`, `chmod 600`).
2. Run `npm run package`, then upload the **contents** of `dist/` into `public_html/` (keep the folder
   structure). In cPanel File Manager, turn on "Show Hidden Files" so `.htaccess` is visible.
3. Before relying on the HTTPS redirect, confirm in cPanel > SSL/TLS Status that the certificate covers both
   `askneticgroup.co.tz` and `www.askneticgroup.co.tz`. If it does not yet, comment out the two redirect rules
   in `.htaccess` (marked in the file) until AutoSSL has issued it.
4. Run the live checks in `LAUNCH-CHECKLIST.md`.

### About `.htaccess`

It was tested on Apache 2.4.58 locally against the `npm run package` output (119 checks, last run on 15 October 2026):
redirects, blocked paths, directory listings, the 404 page, compression, caching, content types and security
headers. A host can still differ, so verify it live. If the site shows
"500 Internal Server Error" right after upload, the host may not allow one of the directives: the usual
culprit is `Options -Indexes`. Remove that one line, reload, and ask the host to disable directory listings
for the account instead.

The canonical host is `https://www.askneticgroup.co.tz` (every page's canonical URL uses it). The redirect
rules only act on `askneticgroup.co.tz` and `www.askneticgroup.co.tz`, so local and staging copies are left
alone. `/.well-known/` is never redirected, so certificate validation keeps working.

**HSTS is deliberately off.** Enable it only after HTTPS has worked on both hostnames for a few days:
uncomment the `Strict-Transport-Security` line with `max-age=300`, check the site, then raise it to
`31536000`. HSTS cannot be undone quickly for visitors who have already received it.

## Optional maintenance tools (not needed to deploy)

These Python scripts recreated derived files from existing approved assets; their output is committed.
They need Python 3 with Pillow (and PyMuPDF for the PDF).

| Script | Output |
|---|---|
| `scripts/make-card-strips.py` | `images-icons/*-strip-*.webp`: the narrow bands the service cards actually show |
| `scripts/make-about-hero.py` | `images-icons/ceo3-{960,1280,1440,1672}.webp`: the About Us hero, from `ceo3.jpg` (original left untouched) |
| `scripts/make-service-heroes.py` | `images-icons/visa*.webp` and `car-hire*.webp`: the travel.html and car-hire.html heroes, from `visa.jpg` and `car-hire.jpg` (originals left untouched) |
| `scripts/compress-profile-pdf.py` | `Asknetic-Company-Profile-web.pdf` from the original (original left untouched) |
| `scripts/make-brand-icons.py` | `favicon.ico`, `images-icons/favicon-96.png`, `apple-touch-icon.png`, `og-image.jpg` |
