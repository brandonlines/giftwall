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

type Pair = [keyof ThemeColors, keyof ThemeColors];

// WCAG 2.1 AA: normal/small text needs 4.5:1. Body copy, muted captions, input
// text, placeholders, and chip/badge labels (which render at body size) live
// here — this is the AODA bar the user flagged.
const BODY_TEXT: Pair[] = [
  ["text", "surface"],
  ["textMuted", "surface"],
  ["pageText", "background"],
  ["pageTextMuted", "background"],
  ["inputText", "inputBg"],
  ["placeholder", "inputBg"],
  ["onAccentSoft", "accentSoft"],
  ["onClaimedOther", "claimedOther"],
];

// Large + bold UI labels (button text, the nav-bar title) qualify for the 3:1
// large-text exemption, so the brand-colored fills don't have to be darkened.
const UI_LABEL: Pair[] = [
  ["onPrimary", "primary"],
  ["onClaim", "claim"],
  ["onClaimMine", "claimMine"],
  ["onDanger", "danger"],
  ["headerTint", "headerBg"],
];

describe("theme token contrast (WCAG AA)", () => {
  for (const theme of Object.values(themes)) {
    for (const [fg, bg] of BODY_TEXT) {
      it(`${theme.key}: ${String(fg)} on ${String(bg)} ≥ 4.5:1 (body text)`, () => {
        expect(contrastRatio(theme.colors[fg], theme.colors[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
    for (const [fg, bg] of UI_LABEL) {
      it(`${theme.key}: ${String(fg)} on ${String(bg)} ≥ 3:1 (large UI label)`, () => {
        expect(contrastRatio(theme.colors[fg], theme.colors[bg])).toBeGreaterThanOrEqual(3.0);
      });
    }
  }
});
