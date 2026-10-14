// Adds a content hash to the shared CSS/JS references in every page (site.css?v=1a2b3c4d),
// so browsers can cache those files for a long time and still pick up every change.
// Run by `npm run build` after the CSS is compiled.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = ['assets/css/site.css', 'assets/js/site.js'];
const hashes = Object.fromEntries(ASSETS.map(a => [a, crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, a))).digest('hex').slice(0, 8)]));

for (const page of fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
  const file = path.join(ROOT, page);
  const before = fs.readFileSync(file, 'utf8');
  let html = before;
  for (const [asset, hash] of Object.entries(hashes)) {
    const re = new RegExp(`(["'/])${asset.replace(/[.]/g, '\\.')}(\\?v=[0-9a-f]+)?(["'])`, 'g');
    html = html.replace(re, `$1${asset}?v=${hash}$3`);
  }
  if (html !== before) fs.writeFileSync(file, html);
}
console.log(Object.entries(hashes).map(([a, h]) => `${a}?v=${h}`).join('\n'));
