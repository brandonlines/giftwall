import { themes, type ThemeColors } from "../themes";
import { contrastRatio, parseColor } from "../contrast";

describe("contrast math", () => {
  it("black on white is ~21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });
  it("identical colors are 1:1", () => {
    expect(contrastRatio("#3b5bdb", "#3b5bdb")).toBeCloseTo(1, 5);
  });
  it("composites rgba over white", () => {
    expect(parseColor("rgba(0,0,0,0)")).toEqual({ r: 255, g: 255, b: 255 });
  });
});

// WCAG AA floor for large/bold UI labels (and the absolute floor for any text).
// This would have caught the old white-on-pink "Claimed by someone" (~2.7:1).
const MIN_RATIO = 3.0;

const PAIRS: [keyof ThemeColors, keyof ThemeColors][] = [
  ["onPrimary", "primary"],
  ["onClaim", "claim"],
  ["onClaimMine", "claimMine"],
  ["onClaimedOther", "claimedOther"],
  ["onDanger", "danger"],
  ["onAccentSoft", "accentSoft"],
];

describe("theme token contrast (WCAG)", () => {
  for (const theme of Object.values(themes)) {
    for (const [fgKey, bgKey] of PAIRS) {
      it(`${theme.key}: ${String(fgKey)} on ${String(bgKey)} ≥ ${MIN_RATIO}:1`, () => {
        const ratio = contrastRatio(theme.colors[fgKey], theme.colors[bgKey]);
        expect(ratio).toBeGreaterThanOrEqual(MIN_RATIO);
      });
    }
  }
});
