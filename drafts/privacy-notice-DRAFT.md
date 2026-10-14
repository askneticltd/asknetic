# DRAFT FOR OWNER REVIEW — NOT APPROVED, DO NOT PUBLISH

**Status:** prepared on 14 October 2026 by the website developer as input for the owner and a legal adviser.
It is **not** a privacy notice. It contains no legal wording. Part A lists, as facts checked in the website's
code, what personal data the website handles. Part B lists what only the owner (with legal advice) can
decide or write. Nothing here is linked from the website, and this folder is not part of the upload package
(`npm run package` leaves it out; `.htaccess` also refuses to serve `.md` files).

When an approved text exists: create `privacy.html` from an existing page (same header and footer), add it to
`sitemap.xml`, link it where the HTML comment in every footer says "Privacy Policy and Terms of Service links
go here", and add a short link next to the **Send message** button on `contact.html`.

---

## Part A — What the website does with personal data (facts from the code)

### A1. Contact form (`contact.html` → `/api/contact.php`)

- **Fields collected:** name (up to 100 characters), email address (up to 254), message (up to 5,000).
  A hidden anti-spam field is also sent; real visitors leave it empty.
- **What happens to them:** the server sends them as one email to **info@askneticgroup.co.tz** through the
  company's own SMTP mailbox. The email shows the name, email address, message and the time of submission
  (Dar es Salaam time). The visitor's address is set as "Reply-To" so staff can answer.
- **Not stored on the web server:** there is no database. The website keeps no copy of the message.
  The copy that exists is the email in the company mailbox (and wherever staff forward it).
- **Abuse protection (kept in a private folder outside the public website):**
  - to allow at most 5 messages per hour from one internet (IP) address, the server records the times of
    recent messages under a *keyed hash* of the sender's IP address (the address itself is not written down);
  - to avoid sending the same message twice, it records whether a message was sent, under a keyed hash of
    IP address + email + name + message (the text itself is not written down);
  - these small files are deleted by an automatic clean-up once they are more than about an hour old. The
    clean-up runs during later form submissions (on about 1 in 20 of them), so on a quiet website a file can
    remain until that happens.
- **Error log:** if sending fails, a line describing the technical failure is written to the hosting
  account's PHP error log. The code does not write the visitor's message there.

### A2. Hosting server

- Like any website, the web server receives each visitor's IP address, browser type and the pages requested.
  Whether and how long the hosting provider keeps these access logs is set by the host
  (cPanel account) — **to be confirmed with the host** (see B6).

### A3. Cookies, analytics and tracking

- The website itself sets **no cookies** and uses no browser storage (checked: no `Set-Cookie` header from the
  pages or the form endpoint; no `document.cookie`, `localStorage` or `sessionStorage` in the code).
- **No analytics, advertising or tracking scripts** are installed. Fonts, styles and scripts are served from
  the website's own domain (no Google Fonts or other CDNs).

### A4. Third-party content and links

- **Google Maps (contact.html only):** a Google Maps frame showing the office location. It loads from
  `www.google.com` when the visitor scrolls near it. Loading it sends the visitor's IP address and the page
  address to Google, and Google may set or read its own cookies under Google's privacy policy.
- **WhatsApp button (every page):** a link to `wa.me` that opens WhatsApp with a ready-made greeting. Nothing
  is sent until the visitor presses Send in WhatsApp; after that, WhatsApp (Meta) handles the conversation.
- **Instagram link (footer):** opens the company's Instagram profile.
- **Email and phone links:** open the visitor's own email or phone app.
- **"Our Newsletters" (contact.html):** there is no mailing list. The button opens the visitor's email app
  with a request addressed to info@askneticgroup.co.tz; nothing is sent until the visitor sends that email.

---

## Part B — To be decided or written by the owner (with legal advice)

The developer has not written any of these; each needs an approved answer before a notice is published.

1. **Who is responsible:** the registered company name (the footer says "Asknetic Enterprises Ltd"), its
   registration details, and the address to show (the site and the company profile give Peninsula Noble
   Center, Oysterbay, PO Box 3176, Dar es Salaam).
2. **Contact for privacy questions and requests:** info@askneticgroup.co.tz or a dedicated address.
3. **Purposes and the legal grounds** for handling enquiries, in the wording the adviser approves.
4. **Retention:** how long enquiry emails are kept in the mailbox; whether they are copied into other systems
   (spreadsheets, CRM, WhatsApp); who in the company can read them.
5. **Where the data is held:** the country of the email hosting and web hosting, and how any transfer outside
   Tanzania (including to Google for the map) should be described.
6. **Hosting logs:** what the hosting provider logs and for how long (ask the host).
7. **Legal obligations under Tanzania's Personal Data Protection Act, 2022:** for example whether the company
   must register with the Personal Data Protection Commission, and how visitors exercise their rights and in
   what time the company answers. The adviser decides the content.
8. **Google Maps:** keep the map loading automatically, or change it to load only after a click (then no data
   goes to Google until the visitor chooses). This decides what the notice must say about cookies.
9. **Effective date, version, and language(s)** (English and/or Swahili).
10. **Future changes:** analytics, a mailing list or new forms must not be added until the notice covers them
    (and, for analytics, a consent approach is chosen).
