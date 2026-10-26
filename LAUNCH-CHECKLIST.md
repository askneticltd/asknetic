# Launch checklist

**Status: not launched — code-ready for staging (15 October 2026).** The code-level fixes from the pre-launch
audits are done and were verified on a local copy of the `npm run package` output (Apache 2.4.58 + PHP 8.2.12,
Chrome 155, contact form tested with a stub mailer that sends nothing). Nothing here has been checked on the
live cPanel host, DNS, TLS certificate or real mailbox yet. The site is ready to go live only when every box
below is ticked.

## 1. Decisions and content needed from the owner

The site was left unchanged on these points, or placeholders were removed, because they need the owner's
input. None of them should be guessed by a developer.

- [x] **Phone numbers on the website.** The approved numbers are **+255 767 911 211** and **+255 655 911 211**
  (confirmed 15 October 2026). Every page uses only these: header/footer contact details, contact.html, all
  `tel:` links (`tel:+255767911211`, `tel:+255655911211`), the home page's search-engine data, the contact page
  description, and the WhatsApp button (`wa.me/255655911211`). A search of every text file in the project finds
  no other number.
- [ ] **Company profile PDF still shows the old number.** Page 20 ("Get in touch") of both
  `Asknetic-Company-Profile.pdf` (original) and `Asknetic-Company-Profile-web.pdf` (the copy linked from About Us)
  lists **+255 799 111 141** and +255 655 911 211. The PDF was exported from Canva and its editable design is not
  in the repository, so it was not changed. Ask whoever holds the Canva design to replace 799 111 141 with
  767 911 211, export a new PDF as `Asknetic-Company-Profile.pdf`, then run `scripts/compress-profile-pdf.py`
  to recreate the web copy. Until then, the downloadable PDF and the website disagree.
- [x] **About Us hero photo.** Replaced on 14 October 2026 with the supplied `images-icons/ceo3.jpg` (a 1672x941
  PNG despite its name), served as `ceo3-{960,1280,1440,1672}.webp` from `scripts/make-about-hero.py`. The original
  stays in the repository and is not uploaded. The photo is decorative (`alt=""`, hidden from screen readers).
  Overlay made lighter on 15 October 2026: the photo now has no overlay of its own (it had a flat 85% overlay,
  then a 30-40% tint with a darker band); only the text block has a soft dark scrim behind it (about 88% right
  behind the text). It cannot be lighter there without changing the heading colour: the darker orange end of
  "Asknetic Group" sits on the sunlit wall, and any flat overlay under 85% leaves it under 3:1. Contrast measured
  on the rendered page in Chrome at 17 widths (320-2560 px), as the 5th percentile of the background pixels behind
  each piece of text (one line-height wide): "About" (white) 8.86:1 or more, "Asknetic Group" 3.13:1 or more
  (needs 3:1; lowest at 2560 px), paragraph 6.05:1 or more (needs 4.5:1). Before the change the heading fell to
  2.57:1 at 2560 px. The visible photo is about 80% brighter on average than before.
- [ ] **Privacy notice and terms.** The contact form collects names, email addresses and messages, but the
  site has no privacy notice. The dead "Privacy Policy" / "Terms of Service" footer links were removed (an
  HTML comment marks where they go). Owner-review drafts are in `drafts/` (not uploaded, not linked):
  `privacy-notice-DRAFT.md` lists, as facts from the code, what personal data the site handles and the points
  only the owner and a legal adviser can decide (Tanzania's Personal Data Protection Act, 2022);
  `terms-of-use-DRAFT.md` lists topics only. No legal wording was written. Once approved texts exist they can
  be added as pages and linked from every footer and next to the contact form's Send button.
- [ ] **Google Maps frame (contact.html).** It loads from google.com when the visitor scrolls to it, so Google
  receives the visitor's IP address and may set cookies. Decide whether that stays (and the privacy notice
  says so) or the map loads only after a click.
- [ ] **Official social profiles.** Only Instagram (`instagram.com/asknetic.group`) was linked to a real
  profile. The Facebook, X and LinkedIn icons pointed nowhere and were removed. Send the official URLs to
  restore any of them.
- [ ] **Newsletter on contact.html.** There is no mailing list or newsletter. The section is now headed "News and
  Updates" (it was "Our Newsletters") and says what it really does: "Email us" opens the visitor's email app with
  a request to info@ ("I would like to receive news and updates from Asknetic Group at this email address"); no
  subscription is created. Decide: remove the section, keep it as an email request, or connect an approved
  mailing service (which also needs consent wording and the privacy notice).
- [ ] **Company claims to confirm** (unchanged on the site):
  - client numbers: "over 50" clients (2024, about-us timeline) and "100+ clients" (2026);
  - "24-hour tracked service delivery" (home) and "24h Consignment Tracking" (about-us stats);
  - "24/7 Support" (home hero) and "24/7 Support mindset" (services);
  - "leading organisations", "market leader", "premier corporate services provider";
  - international reach: "worldwide network of partnerships" (home and the Managing Director's quote), "global
    standards", "Global Network ... global partnerships", "Worldwide connections", "local and international
    businesses" (home), "unmatched service delivery across Africa" and "best in class service provider in Africa"
    (about-us), "across Tanzania and East Africa" (about-us leadership);
  - "Years of multi-sector experience" and "Industry standards guaranteed" (home), for a company established in 2023;
  - "employing the best and brightest individuals, using the highest quality materials and the latest
    (construction) methods" (home and about-us);
  - Zanzibar: car hire and travel services "cover Zanzibar" since 2025 (about-us timeline), "Zanzibar Rentals" (home);
  - "trusted partner for government institutions" and "world-class service" (about-us, CEO profile);
  - about-us lists "medical services", which is not one of the seven sectors shown elsewhere;
  - the vision statement's grammar ("To become prominent and diverse company");
  - leadership: the "Managing Director" quote and "Kenan Richard, CEO" are presented separately; confirm the titles and whether they are the same person.
- [ ] **Client logos.** Written permission to show the logos of the public bodies and companies on the home and
  about pages (BOT, TRA, TANESCO, Judiciary of Tanzania, TPA, TRC, NHC, JKT, Embassy of Kuwait, Andy Enterprises,
  Active Maintenance).
- [ ] **Analytics.** None is installed, and the site sets no cookies of its own; the only third-party cookies
  can come from the Google Maps frame (see above). Adding analytics needs a chosen provider and ID, a consent
  approach and the privacy notice.
- [ ] **Social preview image.** `images-icons/og-image.jpg` is a crop of the existing homepage photo. A branded
  1200x630 image (logo and tagline) can replace it if the owner supplies or approves one.
- [ ] **Favicon.** Made from the flame mark of the existing logo on the header colour: `favicon.ico` (16/32/48),
  `images-icons/favicon-96.png` (the size Google asks for) and `apple-touch-icon.png` (180). Replace them if the
  owner has an official icon (re-run `scripts/make-brand-icons.py` with the new source).
- [ ] **Optional: larger photos for two service heroes.** The supplied `visa.jpg` (travel.html, 1254 px wide) and
  `car-hire.jpg` (car-hire.html, 1024 px) are served at their full size, but the hero is as wide as the window, so
  browsers enlarge them on screens wider than about 1250 / 1020 px (and on 2x tablets), which looks slightly soft.
  Supplying originals of 2000 px or wider and re-running `scripts/make-service-heroes.py` fixes it. Not a blocker.
- [ ] **Canonical host.** The code uses `https://www.askneticgroup.co.tz` everywhere. If the owner prefers the bare
  domain, update the canonicals, `og:url`s, `sitemap.xml`, `robots.txt` and the `.htaccess` redirect together.

## 2. Hosting setup (needs cPanel access)

Follow `DEPLOYMENT.md` ("Uploading to cPanel") and `private/README.md`.

- [ ] DNS for `askneticgroup.co.tz` and `www.askneticgroup.co.tz` points to the cPanel server.
- [ ] AutoSSL certificate covers both names (cPanel > SSL/TLS Status).
- [ ] PHP 7.4 or newer (8.x recommended) with `openssl` and `mbstring`.
- [ ] `~/asknetic-private/` exists outside `public_html`, with PHPMailer 6.1.0 or newer and `mail-config.php` (`chmod 600`).
- [ ] Mailbox and SMTP credentials created; cPanel > Email Deliverability shows SPF and DKIM valid (DMARC recommended).
- [ ] Contents of `dist/` (from `npm run package`) uploaded to `public_html`, including `.htaccess`. Nothing else.

## 3. Live checks on the production URLs

Each must be run against the live site and the output kept as a record.

- [ ] Redirects, one hop each:
  `curl -sI http://askneticgroup.co.tz/` → `301` to `https://www.askneticgroup.co.tz/`;
  `curl -sI http://www.askneticgroup.co.tz/` → `301` to the same; `curl -sI https://askneticgroup.co.tz/` → `301` to the same.
- [ ] `curl -sI https://www.askneticgroup.co.tz/` → `200` with `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, `Permissions-Policy`, `Content-Security-Policy` and `Cache-Control: no-cache`.
- [ ] `curl -sI -H "Accept-Encoding: br, gzip" https://www.askneticgroup.co.tz/assets/css/site.css` → `Content-Encoding: br` (or `gzip`) and `max-age=31536000`.
- [ ] `https://www.askneticgroup.co.tz/images-icons/` → `403`; `/private/README.md`, `/.git/config` and `/package.json` → `404`.
- [ ] `https://www.askneticgroup.co.tz/no-such-page` shows the branded 404 page with status `404`.
- [ ] `robots.txt` and `sitemap.xml` return `200`; every sitemap URL opens.
- [ ] Contact form: the `curl` checks in `private/README.md` §3 give `405`, `422` and `403`.
- [ ] Contact form: one real submission arrives at info@askneticgroup.co.tz; Reply addresses the sender; headers show SPF and DKIM `pass`.
- [ ] Contact form: `~/asknetic-private/contact-state/` was created; no `error_log` file is reachable in `public_html`.
- [ ] Browser console on every page: no errors and no Content-Security-Policy violations (the Google Maps frame on contact.html must load).
- [ ] Mobile performance on the live URL (PageSpeed Insights or the same throttled lab test): LCP under 4.0 s
  (aim for 2.5 s) and TBT under 600 ms. Field Core Web Vitals only exist weeks after launch.
- [ ] Manual pass on a real Android phone and an iPhone (Safari), and a short screen-reader check (NVDA or VoiceOver).
- [ ] After a few days of working HTTPS on both hostnames: enable HSTS as described in `DEPLOYMENT.md`.
- [ ] Take down the Netlify preview, or mark it `noindex`, so it does not compete with the real site in search results.

### Search result branding (site name "Asknetic Enterprises Limited" and the favicon)

- [ ] `curl -s https://www.askneticgroup.co.tz/ | grep -E '<title>|og:site_name|rel="(icon|canonical)"'` shows the
  "Asknetic Enterprises Limited | Business Services in Tanzania" title, that `og:site_name`, the canonical
  `https://www.askneticgroup.co.tz/` and both icon links.
- [ ] `curl -sI https://www.askneticgroup.co.tz/images-icons/favicon-96.png` and `.../favicon.ico` → `200` with
  `Content-Type: image/png` / `image/x-icon` (not `text/html`).
- [ ] The home page's JSON-LD passes <https://validator.schema.org/> with one `WebSite` and one `Organization`, no errors.
- [ ] Google Search Console > URL Inspection on `https://www.askneticgroup.co.tz/`: "URL is on Google" or
  available, indexing allowed, Googlebot smartphone crawl allowed; Test live URL, then Request indexing.
  The Rich Results Test does not check site names. Google picks the site name and favicon itself and can take
  days to weeks to update them after recrawling the home page.
