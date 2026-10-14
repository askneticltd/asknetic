# Contact form backend: setup and testing

The Contact form (`contact.html`, `#contactForm`) posts with `fetch()` to `/api/contact.php`.
That script sends the enquiry through authenticated SMTP (PHPMailer) to **<info@askneticgroup.co.tz>**
and replies with JSON. The recipient is fixed in `api/contact.php`; visitors cannot change it.
Without JavaScript the browser posts the form normally and is redirected back to `contact.html`, which
shows a matching notice (see "How the endpoint protects itself").

This `private/` folder is a template for the server. **Do not upload it to the public web root.**

## Server layout (cPanel / shared hosting with PHP 7.4+)

```text
/home/ACCOUNT/
├── asknetic-private/            <- NOT web-accessible
│   ├── mail-config.php          <- real SMTP settings (copied from mail-config.example.php)
│   ├── vendor/  or  PHPMailer/  <- PHPMailer (see below)
│   └── contact-state/           <- created automatically: rate-limit and duplicate-check files
└── public_html/                 <- web root (the files from `npm run package`, see DEPLOYMENT.md)
    ├── contact.html
    └── api/contact.php
```

`api/contact.php` finds this folder at `../../asknetic-private` relative to itself. If the site lives
somewhere else, set the environment variable `ASKNETIC_PRIVATE_DIR` to the folder's absolute path
(for example `SetEnv ASKNETIC_PRIVATE_DIR /home/ACCOUNT/asknetic-private` in `.htaccess`, if the host allows it).

The PHP user must be able to create and write `asknetic-private/contact-state/`. If it cannot, the form
still works but the rate limit and duplicate check are off, and the error log says so.

The site must be served from the domain root, because the form posts to the absolute path `/api/contact.php`.

## 1. Install PHPMailer 6.1.0 or newer (choose one)

The endpoint uses `PHPMailer::ENCRYPTION_SMTPS` / `ENCRYPTION_STARTTLS`, which first appeared in
PHPMailer **6.1.0**; any later 6.x or 7.x release works (checked against 6.1.0, 6.9.3 and 7.1.1 sources).

**Composer (preferred)**, over SSH or cPanel Terminal:

```text
cd ~/asknetic-private
composer require phpmailer/phpmailer
```

This creates `asknetic-private/vendor/autoload.php`, which the endpoint loads automatically.

**Manual upload**: download a PHPMailer release (6.1.0 or newer) from <https://github.com/PHPMailer/PHPMailer/releases>
and upload its `src/` folder so that these files exist:

```text
asknetic-private/PHPMailer/src/Exception.php
asknetic-private/PHPMailer/src/PHPMailer.php
asknetic-private/PHPMailer/src/SMTP.php
```

## 2. Configure SMTP

Copy `mail-config.example.php` to `asknetic-private/mail-config.php`, fill in the real values, and
restrict its permissions (e.g. `chmod 600`). Expected keys:

| Key                 | Example                       | Notes                                          |
|---------------------|-------------------------------|------------------------------------------------|
| `SMTP_HOST`         | `mail.askneticgroup.co.tz`    | From cPanel > Email Accounts > Connect Devices |
| `SMTP_PORT`         | `465` or `587`                |                                                |
| `SMTP_ENCRYPTION`   | `ssl` (465) or `tls` (587)    | Unencrypted SMTP is not accepted               |
| `SMTP_USERNAME`     | the full mailbox address      |                                                |
| `SMTP_PASSWORD`     | the mailbox password          | Never place it in the web root or in Git       |
| `SMTP_FROM_EMAIL`   | the authenticated mailbox     | Optional, defaults to `SMTP_USERNAME`          |
| `SMTP_FROM_NAME`    | `Asknetic Group Website`      | Optional                                       |
| `ALLOWED_ORIGINS`   | `staging.example.com`         | Optional extra hosts allowed to post the form  |
| `RATE_LIMIT_MAX`    | `5`                           | Optional, messages per IP address per window   |
| `RATE_LIMIT_WINDOW` | `3600`                        | Optional, window in seconds                    |

Alternatively, set any of these as environment variables. Environment variables override the file.

The email is sent **From** the authenticated mailbox and uses the visitor's address only as **Reply-To**,
so SPF/DKIM/DMARC pass. Make sure SPF and DKIM are enabled for the domain (cPanel > Email Deliverability).

## 3. Test on the real server

Live delivery has **not** been tested yet; it needs the real mailbox. Do this once after upload:

1. Submit the form on `contact.html` and check that the email arrives at <info@askneticgroup.co.tz>,
   and that pressing Reply in the mail client addresses the visitor. Check the message headers for
   SPF and DKIM "pass".
2. If you see the orange error message, check the PHP error log (cPanel > Errors, or `error_log` in
   `public_html/api/`). Lines are prefixed with `[asknetic contact]` and say whether the config,
   PHPMailer, the SMTP login or the rate-limit storage failed. Visitors never see these details. If the
   host writes an `error_log` file inside `public_html/api/`, delete it after debugging (the site's
   `.htaccess` already refuses to serve files named `error_log`).
3. Quick checks from a terminal (replace the domain):
   - `curl -i https://DOMAIN/api/contact.php` should return `405` with JSON.
   - `curl -i -X POST -H "Origin: https://DOMAIN" -d "name=&email=x&message=" https://DOMAIN/api/contact.php` should return `422`.
   - `curl -i -X POST -H "Origin: https://evil.example" -d "name=a&email=a@example.com&message=b" https://DOMAIN/api/contact.php` should return `403`.
4. Check that `asknetic-private/contact-state/` was created after the first real submission.

## Netlify (temporary static preview only)

Netlify does not run PHP. On Netlify you can test the layout, responsiveness, navigation,
accessibility and the form's client-side validation and sending state. A real submission there will
always show the orange error message, because `/api/contact.php` cannot run. Actual delivery has to be
tested on a PHP server (staging/live cPanel, or locally with `php -S localhost:8000` from the site root
plus a reachable SMTP account).

## How the endpoint protects itself

- POST only (`405` otherwise); `Cache-Control: no-store`.
- Same-origin check: requests whose `Origin`/`Referer` belongs to another website get `403`, as do
  requests the browser marks `Sec-Fetch-Site: cross-site` and opaque `Origin: null` requests without a
  Referer. Requests with neither header (non-browser clients, which could forge them anyway) are allowed,
  because the remaining checks still apply.
- Honeypot `bot_field`: if it is filled in, the bot gets a normal success reply and no email is sent.
- Server-side validation: trimmed, non-empty, valid UTF-8, length limits (name 100, email 254,
  message 5000 characters), `filter_var()` email check, no line breaks/control characters in name or email
  (header injection), control characters stripped from the message.
- Rate limit: at most 5 messages per visitor IP address per hour (configurable); the next one gets `429`
  with `Retry-After`. Attempts that reach the mail server count, including failed ones.
- Duplicate check: the same message from the same IP address is never sent twice within 10 minutes. A
  resubmission after a successful send gets a success reply without a second email; one made while the first
  is still being sent gets `409`. A failed send clears the mark so the visitor can retry.
- The state for these limits lives in `asknetic-private/contact-state/`, outside the web root. File names
  and contents are keyed hashes (no IP addresses, emails or message text), files are locked while in use,
  and stale files are deleted automatically.
- Timeouts: PHPMailer gives up on a mail server that stops answering after 8 seconds per step
  (PHPMailer's own default would wait up to 300 seconds per reply). The send finishes even if the
  visitor's browser stops waiting; the page waits up to 45 seconds and, if it gives up, tells the visitor the
  message may still arrive. A server that keeps trickling data without finishing a reply is not cut short
  by PHPMailer; the duplicate check still prevents a second copy.
- All visitor content is HTML-escaped in the HTML body; a plain-text alternative is included.
- Fixed recipient, fixed From; SMTP errors and exceptions are written to the server log only and the
  visitor only gets a generic message.
- Without JavaScript (`Accept: text/html`), every outcome redirects (`303`) to
  `contact.html#form-sent`, `#form-invalid`, `#form-busy`, `#form-limit` or `#form-error`.

## Hosting limitation: proxies

The rate limit uses `REMOTE_ADDR` only, because forwarding headers can be forged. If the site is later put
behind a proxy or CDN (for example Cloudflare), every visitor would share the proxy's address and the limit
would apply to all of them together. In that case have the host configure `mod_remoteip` (or cPanel's
Cloudflare integration) so that `REMOTE_ADDR` is the visitor's real address.
