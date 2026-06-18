// Generates the full favicon set + the OpenGraph image from GT Walsheim.
//
// Glyphs are outlined to vector paths with opentype.js so the output
// renders identically without the font installed, then rasterised with
// sharp. One-off generator — the deps are intentionally NOT in
// package.json (they'd bloat every CI install). To regenerate:
//
//   npm i --no-save opentype.js sharp png-to-ico
//   node scripts/generate-favicons.mjs
//
// Outputs land in public/ (favicon.svg/.ico, sized PNGs, apple-touch,
// mask-icon.svg, og.png). No PWA manifest/icons — not an installable app.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pub = path.join(root, 'public');
const fontsDir = path.join(pub, 'fonts');

const INK = '#14161c';
const ACCENT = '#1a23ff';
const MUTED = '#6b6e78';
const BG = '#ffffff';

const load = (file) => {
  const b = readFileSync(path.join(fontsDir, file));
  return opentype.parse(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
};
const ultra = load('GTWalsheim-UltraBold.otf');
const ultraIt = load('GTWalsheim-UltraBoldOblique.otf');
const bold = load('GTWalsheim-Bold.otf');

const F = 1000;
const glyph = (font, text, x = 0, y = 0) => {
  const p = font.getPath(text, x, y, F);
  return { d: p.toPathData(2), bbox: p.getBoundingBox() };
};
const adv = (font, text) => font.getAdvanceWidth(text, F);
const union = (...bs) => ({
  x1: Math.min(...bs.map((b) => b.x1)),
  y1: Math.min(...bs.map((b) => b.y1)),
  x2: Math.max(...bs.map((b) => b.x2)),
  y2: Math.max(...bs.map((b) => b.y2)),
});

// ---- The "M." mark, centred in a `size` box (optionally with a tile). ----
function mark(size, { tile = true, mono = false, padRatio = 0.1 } = {}) {
  const m = glyph(ultra, 'M');
  const dotX = adv(ultra, 'M') * 0.92;
  const dot = glyph(ultra, '.', dotX);
  const bb = union(m.bbox, dot.bbox);
  const w = bb.x2 - bb.x1;
  const h = bb.y2 - bb.y1;
  const pad = size * padRatio;
  const s = Math.min((size - pad * 2) / w, (size - pad * 2) / h);
  const tx = (size - w * s) / 2 - bb.x1 * s;
  const ty = (size - h * s) / 2 - bb.y1 * s;
  const r = size * 0.1875;
  const bgRect = tile
    ? `<rect width="${size}" height="${size}" rx="${r}" fill="${BG}"/>`
    : '';
  const mFill = mono ? '#000000' : INK;
  const dFill = mono ? '#000000' : ACCENT;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${bgRect}<g transform="translate(${tx} ${ty}) scale(${s})"><path d="${m.d}" fill="${mFill}"/><path d="${dot.d}" fill="${dFill}"/></g></svg>`;
}

const png = (svg) => sharp(Buffer.from(svg)).png();
const master = await png(mark(1024)).toBuffer();
const resize = (n) => sharp(master).resize(n, n).png().toBuffer();
const out = (name, buf) => writeFileSync(path.join(pub, name), buf);

// Scalable favicon (no width/height so it scales freely).
out(
  'favicon.svg',
  Buffer.from(mark(512).replace(' width="512" height="512"', '')),
);
// Safari pinned-tab mask (monochrome, transparent).
out('mask-icon.svg', Buffer.from(mark(512, { tile: false, mono: true })));

// Sized PNGs. (No PWA/manifest icons — this is intentionally not an
// installable web app.) apple-touch-icon is a bookmark icon, not PWA.
const sizes = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'favicon-48x48.png': 48,
  'apple-touch-icon.png': 180,
};
for (const [name, n] of Object.entries(sizes)) out(name, await resize(n));

// favicon.ico (16/32/48).
out(
  'favicon.ico',
  await pngToIco([await resize(16), await resize(32), await resize(48)]),
);

// ---- OpenGraph image (1200x630). ----
function og() {
  const W = 1200;
  const H = 630;
  const padX = 96;
  const maxW = W - padX * 2;
  // Cap height of a glyph in F units, used to size text to a px target.
  const capOf = (font, ch) => {
    const b = font.getPath(ch, 0, 0, F).getBoundingBox();
    return b.y2 - b.y1;
  };

  // Wordmark: MRIDA upright + NG italic, scaled to ~132px cap height.
  const w1 = glyph(ultra, 'MRIDA');
  const w2 = glyph(ultraIt, 'NG', adv(ultra, 'MRIDA'));
  const wScale = 132 / capOf(ultra, 'M');
  const wordBaseline = 300;

  // Tagline, scaled to ~56px cap but never wider than the content box,
  // with a blue terminal dot like the homepage headline.
  const tag = 'I build calm, considered software for the web';
  const tg = glyph(bold, tag);
  const tdot = glyph(bold, '.', adv(bold, tag));
  const tScale = Math.min(56 / capOf(bold, 'I'), maxW / adv(bold, tag + '.'));
  const tagBaseline = 444;

  // Domain footer line, muted.
  const site = glyph(bold, 'mrida.ng');
  const sScale = 30 / capOf(bold, 'm');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <g transform="translate(${padX} ${wordBaseline}) scale(${wScale})"><path d="${w1.d}" fill="${ACCENT}"/><path d="${w2.d}" fill="${ACCENT}"/></g>
  <g transform="translate(${padX} ${tagBaseline}) scale(${tScale})"><path d="${tg.d}" fill="${INK}"/><path d="${tdot.d}" fill="${ACCENT}"/></g>
  <rect x="${padX}" y="540" width="${maxW}" height="2" fill="rgba(20,22,28,0.12)"/>
  <g transform="translate(${padX} 588) scale(${sScale})"><path d="${site.d}" fill="${MUTED}"/></g>
</svg>`;
}
out('og.png', await png(og()).toBuffer());

// Note: no web app manifest is emitted on purpose — this site is not an
// installable PWA, and a manifest with icons + display:standalone is what
// makes browsers offer "Install".

console.log('Generated favicon set + og.png into public/');
