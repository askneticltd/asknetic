// Builds the inline SVG icon sprite of every page from Font Awesome Free 6.5.1 (devDependency).
//
// Icons in the HTML are written as:
//   <svg class="icon text-xs" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><use href="#fa-solid-phone"></use></svg>
// This script:
//   1. converts any legacy <i class="fa-solid fa-phone ..."></i> into that form (aliases resolved),
//   2. sets each icon's viewBox from the Font Awesome source (it gives the icon its width),
//   3. writes, right after <body>, a hidden sprite holding only the symbols that page uses.
// Run with `npm run build:icons` after adding or changing an icon. The output is committed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FA = path.join(ROOT, 'node_modules/@fortawesome/fontawesome-free');
const STYLES = { 'fa-solid': 'solid', 'fa-regular': 'regular', 'fa-brands': 'brands' };
const SPRITE_START = '<!-- icons:start -->';
const SPRITE_END = '<!-- icons:end -->';

if (!fs.existsSync(FA)) {
  console.error('Font Awesome not installed. Run `npm ci` first.');
  process.exit(1);
}

// alias -> canonical name, from metadata/icons.yml (aliases: names: - old-name)
const aliases = {};
{
  let current = null, inNames = false;
  for (const line of fs.readFileSync(path.join(FA, 'metadata/icons.yml'), 'utf8').split('\n')) {
    const top = line.match(/^([a-z0-9-]+):\s*$/);
    if (top) { current = top[1]; inNames = false; continue; }
    if (/^ {4}names:\s*$/.test(line)) { inNames = true; continue; }
    const item = line.match(/^ {6}- ([a-z0-9-]+)\s*$/);
    if (inNames && item) { aliases[item[1]] = current; continue; }
    if (!/^ {6}/.test(line)) inNames = false;
  }
}

const iconCache = {};
function loadIcon(style, name) {
  const key = `${style}-${name}`;
  if (!iconCache[key]) {
    const file = path.join(FA, 'svgs', style, `${name}.svg`);
    if (!fs.existsSync(file)) throw new Error(`Unknown icon ${style}/${name}`);
    const svg = fs.readFileSync(file, 'utf8');
    const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
    const paths = [...svg.matchAll(/<path d="([^"]+)"\s*\/>/g)].map(m => `<path fill="currentColor" d="${m[1]}"/>`);
    iconCache[key] = { id: `fa-${key}`, viewBox, symbol: `<symbol id="fa-${key}" viewBox="${viewBox}">${paths.join('')}</symbol>` };
  }
  return iconCache[key];
}

// 1. legacy <i class="fa-style fa-name extra"></i> -> <svg class="icon extra">
function convertLegacy(html) {
  return html.replace(/<i\s+([^>]*?)>\s*<\/i>/g, (whole, attrs) => {
    const cls = attrs.match(/class="([^"]*)"/);
    if (!cls) return whole;
    const classes = cls[1].split(/\s+/).filter(Boolean);
    const styleClass = classes.find(c => STYLES[c]);
    const nameClass = classes.find(c => c.startsWith('fa-') && !STYLES[c]);
    if (!styleClass || !nameClass) return whole;
    const style = STYLES[styleClass];
    const raw = nameClass.slice(3);
    const name = aliases[raw] || raw;
    const icon = loadIcon(style, name);
    const extra = classes.filter(c => c !== styleClass && c !== nameClass);
    const rest = attrs.replace(/\s*class="[^"]*"/, '').replace(/\s*aria-hidden="[^"]*"/, '').trim();
    return `<svg class="${['icon', ...extra].join(' ')}"${rest ? ' ' + rest : ''} viewBox="${icon.viewBox}" aria-hidden="true" focusable="false"><use href="#${icon.id}"></use></svg>`;
  });
}

// 2. viewBox of every <svg ...><use href="#fa-style-name"> from the source icon
function syncViewBoxes(html, used) {
  return html.replace(/<svg([^>]*)><use href="#fa-(solid|regular|brands)-([a-z0-9-]+)"><\/use><\/svg>/g, (whole, attrs, style, name) => {
    const icon = loadIcon(style, name);
    used.add(`${style}-${name}`);
    const withBox = /viewBox="/.test(attrs) ? attrs.replace(/viewBox="[^"]*"/, `viewBox="${icon.viewBox}"`) : `${attrs} viewBox="${icon.viewBox}"`;
    return `<svg${withBox}><use href="#${icon.id}"></use></svg>`;
  });
}

// 3. per-page sprite right after <body ...>
function writeSprite(html, used) {
  const symbols = [...used].sort().map(k => iconCache[k].symbol).join('\n');
  const sprite = `${SPRITE_START}\n<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">\n` +
    `<!-- Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0) Copyright 2023 Fonticons, Inc. -->\n` +
    `${symbols}\n</svg>\n${SPRITE_END}`;
  const existing = new RegExp(`${SPRITE_START}[\\s\\S]*?${SPRITE_END}`);
  if (existing.test(html)) return html.replace(existing, sprite);
  return html.replace(/(<body[^>]*>)/, `$1\n${sprite}`);
}

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
for (const page of pages) {
  const file = path.join(ROOT, page);
  const before = fs.readFileSync(file, 'utf8');
  const used = new Set();
  let html = convertLegacy(before);
  html = syncViewBoxes(html, used);
  html = used.size ? writeSprite(html, used) : html;
  if (html !== before) fs.writeFileSync(file, html);
  console.log(`${page}: ${used.size} icons${html !== before ? ' (updated)' : ''}`);
}
