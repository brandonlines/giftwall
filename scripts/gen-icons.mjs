// Generates all giftwall app icons from inline SVG (single source of truth).
// Tooling-only dependency — to regenerate:
//   npm i -D @resvg/resvg-js && node scripts/gen-icons.mjs && npm rm @resvg/resvg-js
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, mkdirSync } from "node:fs";

const DIR = "assets/images";
const WHITE = "#FFFFFF";
const GOLD = "#FFC94D";
const TOP = "#3DA5FF";
const BOT = "#1366D6";

// The gift glyph on a 1024 canvas: a wrapped box (boxFill) with ribbon + bow (ribbon).
function gift(boxFill, ribbon) {
  return `
    <ellipse cx="512" cy="786" rx="250" ry="32" fill="#0A1A2F" opacity="0.13"/>
    <path d="M512 312 L368 262 L368 360 Z" fill="${ribbon}"/>
    <path d="M512 312 L656 262 L656 360 Z" fill="${ribbon}"/>
    <rect x="270" y="438" width="484" height="326" rx="34" fill="${boxFill}"/>
    <rect x="238" y="352" width="548" height="104" rx="26" fill="${boxFill}"/>
    <rect x="478" y="352" width="68" height="412" fill="${ribbon}"/>
    <rect x="480" y="292" width="64" height="66" rx="20" fill="${ribbon}"/>
  `;
}

// Subtle confetti scattered around (not over) the gift — white sparkles, dots,
// and diamonds, kept away from the centre so the gift stays crisp.
const sparkle = (cx, cy, r, o) => {
  const a = r * 0.28;
  return `<path d="M ${cx} ${cy - r} L ${cx + a} ${cy - a} L ${cx + r} ${cy} L ${cx + a} ${cy + a} L ${cx} ${cy + r} L ${cx - a} ${cy + a} L ${cx - r} ${cy} L ${cx - a} ${cy - a} Z" fill="#FFFFFF" opacity="${o}"/>`;
};
const dot = (cx, cy, r, o) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" opacity="${o}"/>`;
const diamond = (cx, cy, r, o) =>
  `<path d="M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z" fill="#FFFFFF" opacity="${o}"/>`;

const CONFETTI = `
  ${sparkle(255, 250, 30, 0.9)}
  ${dot(350, 348, 13, 0.5)}
  ${diamond(775, 248, 24, 0.85)}
  ${dot(688, 350, 12, 0.5)}
  ${sparkle(196, 505, 20, 0.6)}
  ${sparkle(826, 500, 22, 0.7)}
  ${dot(250, 722, 14, 0.55)}
  ${diamond(792, 716, 18, 0.6)}
`;

const GRAD = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${TOP}"/><stop offset="1" stop-color="${BOT}"/>
</linearGradient></defs>`;

function frame(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${inner}</svg>`;
}

const ICON = frame(
  `${GRAD}<rect width="1024" height="1024" fill="url(#g)"/>${CONFETTI}${gift(WHITE, GOLD)}`,
);
const FG = frame(gift(WHITE, GOLD)); // android foreground (transparent)
const BG = frame(`${GRAD}<rect width="1024" height="1024" fill="url(#g)"/>`); // android background
const MONO = frame(gift(WHITE, WHITE)); // single-colour silhouette (themed icons / splash)

const png = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();

writeFileSync(`${DIR}/icon.png`, png(ICON, 1024));
writeFileSync(`${DIR}/favicon.png`, png(ICON, 64));
writeFileSync(`${DIR}/android-icon-foreground.png`, png(FG, 1024));
writeFileSync(`${DIR}/android-icon-background.png`, png(BG, 1024));
writeFileSync(`${DIR}/android-icon-monochrome.png`, png(MONO, 1024));
writeFileSync(`${DIR}/splash-icon.png`, png(MONO, 512));
console.log("✓ generated icon.png, favicon.png, android-icon-*, splash-icon.png");

// --- Alternate app icons: one per theme. White gift (reads on every palette),
// the theme's "claim" pop as the ribbon, and a vibrant gradient from the theme's
// primary. `signature` pins the original icon so it stays the default.
function lighten(hex, t) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const m = (c) => Math.round(c + (255 - c) * t);
  return "#" + [m(r), m(g), m(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const THEME_ICONS = {
  signature: { ribbon: "#FFC94D", gradTop: "#3DA5FF", gradBot: "#1366D6" },
  birthdayBash: { ribbon: "#00E5E5", primary: "#E35420" },
  sweetBeginnings: { ribbon: "#D9555A", primary: "#6E8A6E" },
  modernRomance: { ribbon: "#D4AF37", primary: "#3A1320" },
  winterFrost: { ribbon: "#EF233C", primary: "#2B2D42" },
  cabinCozy: { ribbon: "#D87B57", primary: "#819970" },
  firesideCozy: { ribbon: "#F2C572", primary: "#A66F53" }, // claim==primary, so a gold pop instead
  northernLights: { ribbon: "#00E676", primary: "#00796B" },
  mountainChalet: { ribbon: "#B5A642", primary: "#6D4C41" },
};

const ICONS_DIR = "assets/app-icons";
mkdirSync(ICONS_DIR, { recursive: true });
for (const [key, p] of Object.entries(THEME_ICONS)) {
  const top = p.gradTop ?? lighten(p.primary, 0.34);
  const bot = p.gradBot ?? p.primary;
  const grad = `<defs><linearGradient id="g_${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>`;
  const icon = frame(
    `${grad}<rect width="1024" height="1024" fill="url(#g_${key})"/>${CONFETTI}${gift(WHITE, p.ribbon)}`,
  );
  const fg = frame(gift(WHITE, p.ribbon)); // transparent Android adaptive foreground
  writeFileSync(`${ICONS_DIR}/${key}.png`, png(icon, 1024));
  writeFileSync(`${ICONS_DIR}/${key}-foreground.png`, png(fg, 1024));
}
console.log(`✓ generated ${Object.keys(THEME_ICONS).length} themed app icons → ${ICONS_DIR}/`);
