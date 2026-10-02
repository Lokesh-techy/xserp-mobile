/** @author Lokesh */
// Renders the XSERP icon set from vector source. Run: npm run icons
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { PETALS, VIEWBOX } = require('./xmark');

const out = path.join(__dirname, '..', 'images');
fs.mkdirSync(out, { recursive: true });

const [vx, vy, vw, vh] = VIEWBOX.split(' ').map(Number);
const GRAD = { navy: ['#FFFFFF', '#D6E9FF'], blue: ['#5CC3FF', '#1C75ED'] };

/** The mark scaled to `size` px and centred in a 1024 canvas. `solid` paints every petal one colour (monochrome). */
function mark(size, solid) {
  const s = size / Math.max(vw, vh);
  const tx = (1024 - vw * s) / 2 - vx * s;
  const ty = (1024 - vh * s) / 2 - vy * s;
  const defs = Object.entries(PETALS)
    .map(([k, p]) => {
      const [a, b] = GRAD[p.tone];
      const down = k.startsWith('bottom');
      return `<linearGradient id="p-${k}" x1="0" y1="${down ? 1 : 0}" x2="1" y2="${down ? 0 : 1}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
    })
    .join('');
  const glow = solid ? '' : `<circle cx="331.46" cy="336.5" r="22" fill="url(#glow)"/>`;
  const petals = Object.entries(PETALS)
    .map(([k, p]) => `<path d="${p.d}" fill="${solid ?? `url(#p-${k})`}" fill-rule="evenodd"/>`)
    .join('');
  return { defs, body: `<g transform="translate(${tx} ${ty}) scale(${s})">${glow}${petals}</g>` };
}

const BG_DEFS = `
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#004195"/><stop offset="0.55" stop-color="#00265A"/><stop offset="1" stop-color="#001A3D"/>
  </linearGradient>
  <radialGradient id="sheen" cx="0.22" cy="0.12" r="0.8">
    <stop offset="0" stop-color="#5CC3FF" stop-opacity="0.35"/><stop offset="1" stop-color="#209BE1" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#5CC3FF" stop-opacity="0.9"/><stop offset="1" stop-color="#5CC3FF" stop-opacity="0"/>
  </radialGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000A1F" flood-opacity="0.45"/>
  </filter>`;

const background = `<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#sheen)"/>`;

function svg(content, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>${BG_DEFS}${defs}</defs>${content}</svg>`;
}

function render(name, svgText, width = 1024) {
  const png = new Resvg(svgText, { fitTo: { mode: 'width', value: width } }).render().asPng();
  fs.writeFileSync(path.join(out, name), png);
  console.log('wrote', name);
}

const full = mark(560);
render('icon.png', svg(`${background}<g filter="url(#lift)">${full.body}</g>`, full.defs));
render('android-icon-background.png', svg(background));
const fg = mark(430); // inside the 66% adaptive-icon safe zone
render('android-icon-foreground.png', svg(`<g filter="url(#lift)">${fg.body}</g>`, fg.defs));
const mono = mark(430, '#FFFFFF');
render('android-icon-monochrome.png', svg(mono.body, mono.defs));
const splash = mark(1000);
render('splash-icon.png', svg(splash.body, splash.defs));
render('favicon.png', svg(`${background}${full.body}`, full.defs), 48);
