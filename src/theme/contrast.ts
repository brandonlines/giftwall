// WCAG contrast math. Pure + unit-tested; used by the contrast test that guards
// every palette's text/background token pairs.

type RGB = { r: number; g: number; b: number };

// Parses #rgb, #rrggbb, rgb()/rgba(). For translucent colors we composite over
// white (glass surfaces sit on light backgrounds), which is the conservative
// assumption for readability.
export function parseColor(input: string): RGB {
  const s = input.trim();
  if (s.startsWith("#")) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b, a = 1] = m[1].split(",").map((x) => parseFloat(x.trim()));
    const over = (c: number) => Math.round(c * a + 255 * (1 - a));
    return { r: over(r), g: over(g), b: over(b) };
  }
  throw new Error(`Unparseable color: ${input}`);
}

function channelLuminance(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: string): number {
  const { r, g, b } = parseColor(color);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
