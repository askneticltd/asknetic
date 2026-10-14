# Launch checklist

**Status: not launched — code-ready for staging (14 October 2026).** The code-level fixes from the pre-launch
audits are done and were verified on a local copy of the `npm run package` output (Apache 2.4.58 + PHP 8.2.12,
Chrome 155, contact form tested with a stub mailer that sends nothing). Nothing here has been checked on the
live cPanel host, DNS, TLS certificate or real mailbox yet. The site is ready to go live only when every box
below is ticked.

## 1. Decisions and content needed from the owner

The site was left unchanged on these points, or placeholders were removed, because they need the owner's
input. None of them should be guessed by a developer.

- [ ] **Phone numbers disagree.** The website shows **+255 767 911 211** (first number everywhere, and the
  number in the search-engine data on the home page) and +255 655 911 211 (also the WhatsApp number). The
  company profile PDF linked from About Us (page 20) shows **+255 799 111 141** and +255 655 911 211; the
  previous website also used 799 111 141, and 767 911 211 was introduced on 5 October 2026. Confirm which
  numbers are current; then update either the website or the PDF so both match.
- [x] **About Us hero photo.** Replaced on 14 October 2026 with the supplied `images-icons/ceo3.jpg` (a 1672x941
  PNG despite its name), served as `ceo3-{960,1280,1440,1672}.webp` from `scripts/make-about-hero.py`. The original
  stays in the repository and is not uploaded. The photo is decorative (`alt=""`, hidden from screen readers).
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
- [ ] **Newsletter on contact.html.** There is no mailing list. The form now says what it really does:
  "Email us" opens the visitor's email app with a request to info@. Decide: remove the section, keep it as an
  email request, or connect an approved mailing service (which also needs consent wording and the privacy notice).
- [ ] **Company claims to confirm** (unchanged on the site):
  - client numbers: "over 50" clients (2024, about-us timeline) and "100+ clients" (2026);
  - "24-hour tracked service delivery" (home) and "24h Consignment Tracking" (about-us stats);
  - "24/7 Support" (home hero) and "24/7 Support mindset" (services);
  - "leading organisations", "market leader", "premier corporate services provider";
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
- [ ] **Favicon.** Made from the flame mark of the existing logo on the header colour. Replace it if the owner has an official icon.
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
