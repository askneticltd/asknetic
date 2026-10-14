// Static checks for the site (no dependencies). Usage: npm run check   (exit code 1 on any problem)
// Local links, images, srcset candidates, CSS urls and #anchors must resolve; no dead/placeholder links;
// valid tel: numbers; images have width/height; unique ids; no skipped heading levels; every icon has a
// sprite symbol; no CDN runtime dependencies; canonical URLs match sitemap.xml.
// Images: the file type matches the extension; srcset "640w" matches the file's real width; an <img>'s
// src is one of its own srcset files; width/height have the real aspect ratio.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.askneticgroup.co.tz/';
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
const problems = [];
const warn = (page, msg) => problems.push(`${page}: ${msg}`);
const lineOf = (html, index) => html.slice(0, index).split('\n').length;
const html = Object.fromEntries(pages.map(p => [p, fs.readFileSync(path.join(ROOT, p), 'utf8')]));
const ids = Object.fromEntries(pages.map(p => [p, new Set([...html[p].matchAll(/\sid="([^"]+)"/g)].map(m => m[1]))]));

/** Type and pixel size from the file's own header: { type, width, height } (width/height null for ICO/unknown). */
function imageInfo(file) {
  const b = fs.readFileSync(file);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { type: 'png', width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return { type: 'webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') { const v = b.readUInt32LE(21); return { type: 'webp', width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1 }; }
    if (chunk === 'VP8X') return { type: 'webp', width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { type: 'jpeg', width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
    return { type: 'jpeg', width: null, height: null };
  }
  if (b.readUInt32BE(0) === 0x00000100) return { type: 'ico', width: null, height: null };
  return { type: 'unknown', width: null, height: null };
}
const EXT_TYPE = { '.png': 'png', '.webp': 'webp', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.ico': 'ico' };
const imageCache = new Map();
/** imageInfo() for a site URL used by a page, or null if it is not a local image file. */
function localImage(page, raw) {
  let url = raw.trim();
  if (url.startsWith(SITE)) url = url.slice(SITE.length);
  if (/^(https?:|data:|\/\/)/.test(url)) return null;
  const rel = decodeURIComponent(url.split(/[?#]/)[0].replace(/^\//, ''));
  const ext = path.extname(rel).toLowerCase();
  if (!EXT_TYPE[ext] || !fs.existsSync(path.join(ROOT, rel))) return null;
  if (!imageCache.has(rel)) {
    const info = imageInfo(path.join(ROOT, rel));
    if (info.type !== EXT_TYPE[ext]) warn(page, `${rel} is a ${info.type.toUpperCase()} file with a ${ext} extension`);
    imageCache.set(rel, info);
  }
  return imageCache.get(rel);
}

function checkLocal(page, raw, where) {
  let url = raw.trim();
  if (url.startsWith(SITE)) url = '/' + url.slice(SITE.length);
  if (/^(https?:|mailto:|data:|\/\/)/.test(url)) return;
  if (url.startsWith('tel:')) {
    if (!/^tel:\+255[67]\d{8}$/.test(url)) warn(page, `${where}: malformed phone link ${url}`);
    return;
  }
  if (url === '#' || url.startsWith('javascript:')) { warn(page, `${where}: dead link "${url}"`); return; }
  const [pathPart, frag] = url.split('#');
  const file = pathPart.split('?')[0].replace(/^\//, '');
  const target = file === '' ? (pathPart.startsWith('/') ? 'index.html' : page) : decodeURIComponent(file);
  if (!fs.existsSync(path.join(ROOT, target))) { warn(page, `${where}: missing file ${url}`); return; }
  if (frag && target.endsWith('.html') && !(ids[target] || new Set()).has(frag)) warn(page, `${where}: missing anchor #${frag} in ${target}`);
}

for (const page of pages) {
  const s = html[page];
  for (const m of s.matchAll(/\s(href|src)="([^"]*)"/g)) checkLocal(page, m[2], `L${lineOf(s, m.index)} ${m[1]}`);
  for (const m of s.matchAll(/\ssrcset="([^"]*)"/g)) for (const c of m[1].split(',')) checkLocal(page, c.trim().split(/\s+/)[0], `L${lineOf(s, m.index)} srcset`);
  for (const m of s.matchAll(/\scontent="(https:\/\/www\.askneticgroup\.co\.tz\/[^"]+)"/g)) checkLocal(page, m[1], `L${lineOf(s, m.index)} meta`);
  for (const m of s.matchAll(/<img\b[^>]*>/g)) {
    if (!/\swidth="\d+"/.test(m[0]) || !/\sheight="\d+"/.test(m[0])) warn(page, `L${lineOf(s, m.index)}: <img> without width/height`);
    if (!/\salt="/.test(m[0])) warn(page, `L${lineOf(s, m.index)}: <img> without alt`);
    const at = `L${lineOf(s, m.index)}`;
    const src = (m[0].match(/\ssrc="([^"]*)"/) || [])[1] || '';
    const srcset = ((m[0].match(/\ssrcset="([^"]*)"/) || [])[1] || '').split(',').map(c => c.trim().split(/\s+/)).filter(c => c[0]);
    for (const [url, descriptor] of srcset) {
      const info = localImage(page, url);
      const w = /^(\d+)w$/.exec(descriptor || '');
      if (info && w && info.width !== null && info.width !== +w[1]) warn(page, `${at}: srcset says ${url} is ${w[1]}w, the file is ${info.width}px wide`);
    }
    if (srcset.length && !srcset.some(([url]) => url === src)) warn(page, `${at}: src ${src} is not one of its srcset files`);
    const info = localImage(page, src);
    const [aw, ah] = [+(m[0].match(/\swidth="(\d+)"/) || [])[1], +(m[0].match(/\sheight="(\d+)"/) || [])[1]];
    if (info && info.width && aw && ah && Math.abs(aw / ah - info.width / info.height) > 0.02 * (info.width / info.height)) {
      warn(page, `${at}: width/height ${aw}x${ah} do not match ${src} (${info.width}x${info.height})`);
    }
  }
  for (const m of s.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*\shref="([^"]+)"/g)) localImage(page, m[1]);
  for (const m of s.matchAll(/"(?:logo|image)"\s*:\s*"([^"]+)"/g)) localImage(page, m[1]); // JSON-LD
  const og = (s.match(/property="og:image" content="([^"]+)"/) || [])[1];
  const ogInfo = og && localImage(page, og);
  if (ogInfo && ogInfo.width) {
    const [w, h] = ['width', 'height'].map(k => +(s.match(new RegExp(`property="og:image:${k}" content="(\\d+)"`)) || [])[1]);
    if (w !== ogInfo.width || h !== ogInfo.height) warn(page, `og:image:width/height ${w}x${h} do not match ${og} (${ogInfo.width}x${ogInfo.height})`);
  }
  const seen = new Map();
  for (const m of s.matchAll(/\sid="([^"]+)"/g)) { if (seen.has(m[1])) warn(page, `duplicate id "${m[1]}"`); seen.set(m[1], 1); }
  for (const m of s.matchAll(/<([a-z]+)\b[^>]*\sclass="[^"]*"[^>]*\sclass="/g)) warn(page, `L${lineOf(s, m.index)}: duplicate class attribute`);
  let prev = 0;
  for (const m of s.matchAll(/<h([1-6])\b/g)) { const lvl = +m[1]; if (prev && lvl > prev + 1) warn(page, `L${lineOf(s, m.index)}: heading skips from h${prev} to h${lvl}`); prev = lvl; }
  for (const m of s.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)) if (/<h[1-6]\b/.test(m[0])) warn(page, `L${lineOf(s, m.index)}: heading inside <button>`);
  const symbols = new Set([...s.matchAll(/<symbol id="([^"]+)"/g)].map(m => m[1]));
  for (const m of s.matchAll(/<use href="#([^"]+)"/g)) if (!symbols.has(m[1])) warn(page, `icon #${m[1]} has no sprite symbol (run npm run build:icons)`);
  if (/cdn\.tailwindcss\.com|font-awesome|fonts\.googleapis\.com/.test(s)) warn(page, 'still loads a CDN runtime dependency');
  if ((s.match(/<h1\b/g) || []).length !== 1) warn(page, 'should have exactly one <h1>');
  if (page !== '404.html') {
    for (const tag of ['<title>', 'name="description"', 'rel="canonical"', 'property="og:image"']) if (!s.includes(tag)) warn(page, `missing ${tag}`);
  }
}

// Every page needs its own title and description (search results show them side by side)
for (const [name, re] of [['<title>', /<title>([^<]*)<\/title>/], ['meta description', /<meta name="description" content="([^"]*)"/]]) {
  const first = new Map();
  for (const page of pages) {
    const value = (html[page].match(re) || [])[1];
    if (value && first.has(value)) warn(page, `same ${name} as ${first.get(value)}`);
    else if (value) first.set(value, page);
  }
}

const css = fs.readFileSync(path.join(ROOT, 'assets/css/site.css'), 'utf8');
for (const m of css.matchAll(/url\(([^)]+)\)/g)) {
  const ref = path.join(ROOT, 'assets/css', m[1].replace(/["']/g, ''));
  if (!fs.existsSync(ref)) warn('site.css', `missing ${m[1]}`);
}

const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const listed = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
for (const page of pages.filter(p => p !== '404.html')) {
  const canon = (html[page].match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!listed.has(canon)) warn(page, `canonical ${canon} is not in sitemap.xml`);
}
if (listed.size !== pages.length - 1) warn('sitemap.xml', `lists ${listed.size} URLs for ${pages.length - 1} public pages`);

if (problems.length) {
  console.error(`${problems.length} problem(s):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`OK: ${pages.length} pages checked, no broken links, assets, anchors or markup problems found.`);
