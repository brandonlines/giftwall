// Semantic color tokens. Screens reference these names, never raw hex, so
// swapping palettes is a data change here — not a code change in every screen.
//
// Token groups:
//   *background* = the screen layer;  *surface* = cards/items on top of it.
//   text/textMuted apply ON surface (cards); pageText/pageTextMuted apply ON
//   the background (e.g. section labels, empty states) — these differ in dark
//   themes where cards are light but the page is dark.

export type ThemeColors = {
  background: string;
  backgroundGradient?: readonly [string, string];
  surface: string;

  text: string;
  textMuted: string;
  pageText: string;
  pageTextMuted: string;

  primary: string;
  onPrimary: string;

  accent: string; // links / interactive highlights
  accentSoft: string; // soft chip backgrounds (invite banner, tags)
  onAccentSoft: string;

  claim: string; // "Claim this gift" CTA
  onClaim: string;
  claimMine: string; // you claimed it
  onClaimMine: string;
  claimedOther: string; // someone else claimed it
  onClaimedOther: string;

  danger: string;
  onDanger: string;

  border: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  placeholder: string;

  headerBg: string;
  headerTint: string;

  statusBar: "light" | "dark";

  // When true, card surfaces render a real background blur (glassmorphism).
  glass: boolean;
};

export type ThemeKey =
  | "winterFrost"
  | "cabinCozy"
  | "firesideCozy"
  | "northernLights"
  | "mountainChalet";

export type Theme = {
  key: ThemeKey;
  name: string;
  description: string;
  colors: ThemeColors;
};

export const themes: Record<ThemeKey, Theme> = {
  winterFrost: {
    key: "winterFrost",
    name: "Winter Frost",
    description: "Clean, crisp, high-contrast.",
    colors: {
      background: "#F4F6F9",
      surface: "#FFFFFF",
      text: "#2B2D42",
      textMuted: "#8D99AE",
      pageText: "#2B2D42",
      pageTextMuted: "#8D99AE",
      primary: "#2B2D42",
      onPrimary: "#FFFFFF",
      accent: "#EF233C",
      accentSoft: "#FDE7EA",
      onAccentSoft: "#EF233C",
      claim: "#EF233C",
      onClaim: "#FFFFFF",
      claimMine: "#2B2D42",
      onClaimMine: "#FFFFFF",
      claimedOther: "#E2E6EC",
      onClaimedOther: "#5C6470",
      danger: "#EF233C",
      onDanger: "#FFFFFF",
      border: "#E2E6EC",
      inputBg: "#FFFFFF",
      inputBorder: "#D5DBE3",
      inputText: "#2B2D42",
      placeholder: "#AAB3C0",
      headerBg: "#FFFFFF",
      headerTint: "#2B2D42",
      statusBar: "dark",
      glass: false,
    },
  },

  cabinCozy: {
    key: "cabinCozy",
    name: "Cabin Cozy",
    description: "Grounded, organic, calming.",
    colors: {
      background: "#E8E0D5",
      surface: "#FDFCFB",
      text: "#4E342E",
      textMuted: "#9C8E82",
      pageText: "#4E342E",
      pageTextMuted: "#8A7B6E",
      primary: "#819970",
      onPrimary: "#FFFFFF",
      accent: "#D87B57",
      accentSoft: "#F1E6DD",
      onAccentSoft: "#A85A39",
      claim: "#D87B57",
      onClaim: "#FFFFFF",
      claimMine: "#819970",
      onClaimMine: "#FFFFFF",
      claimedOther: "#D8CFC2",
      onClaimedOther: "#6B5E50",
      danger: "#B5462E",
      onDanger: "#FFFFFF",
      border: "#D8CFC2",
      inputBg: "#FDFCFB",
      inputBorder: "#CDBFAF",
      inputText: "#4E342E",
      placeholder: "#A89A8C",
      headerBg: "#819970",
      headerTint: "#FFFFFF",
      statusBar: "light",
      glass: false,
    },
  },

  firesideCozy: {
    key: "firesideCozy",
    name: "Fireside Cozy",
    description: "Warm, ember-toned, comforting.",
    colors: {
      background: "#F2EBD9",
      surface: "#FDFBF7",
      text: "#2B1B17",
      textMuted: "#6D4C41",
      pageText: "#2B1B17",
      pageTextMuted: "#6D4C41",
      primary: "#A66F53",
      onPrimary: "#FFFFFF",
      accent: "#A66F53",
      accentSoft: "#EFE2CF",
      onAccentSoft: "#8A573D",
      claim: "#A66F53",
      onClaim: "#FFFFFF",
      claimMine: "#6D4C41",
      onClaimMine: "#FFFFFF",
      claimedOther: "#E4DAC4",
      onClaimedOther: "#6D4C41",
      danger: "#B5462E",
      onDanger: "#FFFFFF",
      border: "#E4DAC4",
      inputBg: "#FDFBF7",
      inputBorder: "#D9CBAE",
      inputText: "#2B1B17",
      placeholder: "#A2917F",
      headerBg: "#A66F53",
      headerTint: "#FFFFFF",
      statusBar: "light",
      glass: false,
    },
  },

  northernLights: {
    key: "northernLights",
    name: "Northern Lights",
    description: "Dreamy, shimmering, gradient-rich.",
    colors: {
      background: "#B2EBF2",
      backgroundGradient: ["#B2EBF2", "#E1BEE7"],
      surface: "rgba(255,255,255,0.85)",
      text: "#0A3D39",
      textMuted: "#4A6F6B",
      pageText: "#0A3D39",
      pageTextMuted: "#3E6360",
      primary: "#00796B",
      onPrimary: "#FFFFFF",
      accent: "#00796B",
      accentSoft: "rgba(255,255,255,0.7)",
      onAccentSoft: "#00796B",
      claim: "#00E676",
      onClaim: "#0B3D22",
      claimMine: "#00796B",
      onClaimMine: "#FFFFFF",
      claimedOther: "#FF4081",
      onClaimedOther: "#5A0A28",
      danger: "#E0245E",
      onDanger: "#FFFFFF",
      border: "rgba(0,121,107,0.18)",
      inputBg: "rgba(255,255,255,0.9)",
      inputBorder: "rgba(0,121,107,0.25)",
      inputText: "#0A3D39",
      placeholder: "#6B8F8B",
      headerBg: "#B2EBF2",
      headerTint: "#00796B",
      statusBar: "dark",
      glass: true,
    },
  },

  mountainChalet: {
    key: "mountainChalet",
    name: "Mountain Chalet",
    description: "Luxe dark mode, textured slate & brass.",
    colors: {
      background: "#37474F",
      surface: "#E0D7CD",
      text: "#2E2A26", // on the light linen cards
      textMuted: "#6B6258",
      pageText: "#E0D7CD", // on the dark slate background
      pageTextMuted: "#9AA7AD",
      primary: "#6D4C41",
      onPrimary: "#FFFFFF",
      accent: "#B5A642",
      accentSoft: "#EDE6CF",
      onAccentSoft: "#7A6F1F",
      claim: "#B5A642",
      onClaim: "#2B2B2B",
      claimMine: "#6D4C41",
      onClaimMine: "#FFFFFF",
      claimedOther: "#C9BFB2",
      onClaimedOther: "#4A4239",
      danger: "#C0492F",
      onDanger: "#FFFFFF",
      border: "#C9BFB2",
      inputBg: "#E0D7CD",
      inputBorder: "#C2B7A8",
      inputText: "#2E2A26",
      placeholder: "#8A8073",
      headerBg: "#6D4C41",
      headerTint: "#FFFFFF",
      statusBar: "light",
      glass: false,
    },
  },
};

export const themeList: Theme[] = Object.values(themes);
export const DEFAULT_THEME: ThemeKey = "winterFrost";
