// Builds dist/: exactly the files to upload to public_html. Usage: npm run package
//
// Allowlist: every root *.html page, .htaccess, robots.txt, sitemap.xml, favicon.ico, api/contact.php,
// assets/ (compiled CSS, JS, fonts and their licences), the web copy of the company profile, and only
// the images-icons/ files that a page actually references. Everything else stays out, including
// .git/, private/, node_modules/, src/, scripts/, the original 7.5 MB PDF and the unused image originals.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://www.askneticgroup.co.tz/';

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const fixed = ['.htaccess', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'api/contact.php', 'Asknetic-Company-Profile-web.pdf'];
const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name).replace(/\\/g, '/')]);
const assets = walk('assets');

// Local references made by the pages: src, href, srcset candidates and absolute URLs on this site
function references(html) {
  const refs = new Set();
  const add = u => {
    if (!u) return;
    u = u.trim().split(/\s+/)[0];
    if (u.startsWith(SITE)) u = u.slice(SITE.length);
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/.test(u)) return;
    u = u.replace(/^\//, '').split(/[?#]/)[0];
    if (u) refs.add(decodeURIComponent(u));
  };
  for (const m of html.matchAll(/\s(?:src|href)="([^"]*)"/g)) add(m[1]);
  for (const m of html.matchAll(/\scontent="(https:\/\/www\.askneticgroup\.co\.tz\/[^"]*)"/g)) add(m[1]); // og:image etc.
  for (const m of html.matchAll(/\ssrcset="([^"]*)"/g)) m[1].split(',').forEach(add);
  for (const m of html.matchAll(/"(?:logo|image|url)"\s*:\s*"([^"]+)"/g)) add(m[1]); // JSON-LD
  return refs;
}

const wanted = new Set([...pages, ...fixed, ...assets]);
const missing = [];
for (const page of pages) {
  for (const ref of references(fs.readFileSync(path.join(ROOT, page), 'utf8'))) {
    if (ref.startsWith('images-icons/')) wanted.add(ref);
    if (!fs.existsSync(path.join(ROOT, ref)) && !ref.endsWith('/')) missing.push(`${page}: ${ref}`);
  }
}
const css = fs.readFileSync(path.join(ROOT, 'assets/css/site.css'), 'utf8');
for (const m of css.matchAll(/url\(([^)]+)\)/g)) {
  const ref = path.posix.normalize(path.posix.join('assets/css', m[1].replace(/["']/g, '')));
  if (!fs.existsSync(path.join(ROOT, ref))) missing.push(`site.css: ${ref}`);
}
if (missing.length) {
  console.error('Missing local files:\n  ' + missing.join('\n  '));
  process.exit(1);
}

fs.rmSync(DIST, { recursive: true, force: true });
let bytes = 0;
for (const rel of [...wanted].sort()) {
  const src = path.join(ROOT, rel), dest = path.join(DIST, rel);
  if (!fs.existsSync(src)) { console.error('Allowlisted file not found: ' + rel); process.exit(1); }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  bytes += fs.statSync(src).size;
}
const images = [...wanted].filter(f => f.startsWith('images-icons/')).length;
const unused = fs.readdirSync(path.join(ROOT, 'images-icons')).length - images;
console.log(`dist/: ${wanted.size} files, ${(bytes / 1048576).toFixed(1)} MB (${images} referenced images; ${unused} unreferenced images left out)`);
