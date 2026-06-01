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
  | "signature"
  | "birthdayBash"
  | "sweetBeginnings"
  | "modernRomance"
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
  // The brand default — matches the app icon (blue gradient, gold ribbon, white
  // gift box on white cards).
  signature: {
    key: "signature",
    name: "Signature",
    description: "giftwall's own blue & gold.",
    colors: {
      background: "#EDF3FB",
      backgroundGradient: ["#F4F8FD", "#E5EFFB"],
      surface: "#FFFFFF",
      text: "#0A1A2F",
      textMuted: "#5B6B82",
      pageText: "#0A1A2F",
      pageTextMuted: "#54647C",
      primary: "#1366D6",
      onPrimary: "#FFFFFF",
      accent: "#1366D6",
      accentSoft: "#E3EEFB",
      onAccentSoft: "#0F52B5",
      claim: "#FFC94D", // the ribbon gold — the "claim a gift" pop
      onClaim: "#3D2E00",
      claimMine: "#1366D6",
      onClaimMine: "#FFFFFF",
      claimedOther: "#DCE5F0",
      onClaimedOther: "#47586A",
      danger: "#DC2647",
      onDanger: "#FFFFFF",
      border: "#DCE6F2",
      inputBg: "#FFFFFF",
      inputBorder: "#CFD9E6",
      inputText: "#0A1A2F",
      placeholder: "#6C7583",
      headerBg: "#1366D6",
      headerTint: "#FFFFFF",
      statusBar: "light",
      glass: false,
    },
  },

  // --- Event palettes (year-round celebrations) ----------------------------
  birthdayBash: {
    key: "birthdayBash",
    name: "Birthday Bash",
    description: "Tangerine disco & confetti — high-energy celebration.",
    colors: {
      background: "#F9F6F0",
      backgroundGradient: ["#FBF4ED", "#F6ECE0"],
      surface: "#FFFFFF",
      text: "#33261E",
      textMuted: "#847164",
      pageText: "#33261E",
      pageTextMuted: "#7C6757",
      primary: "#E35420",
      onPrimary: "#FFFFFF",
      accent: "#D24E1F",
      accentSoft: "#FFE3D3",
      onAccentSoft: "#B23E10",
      claim: "#00E5E5", // electric cyan CLAIM pop
      onClaim: "#003B40",
      claimMine: "#E35420",
      onClaimMine: "#FFFFFF",
      claimedOther: "#EDE3D8",
      onClaimedOther: "#6E5C4E",
      danger: "#DC2647",
      onDanger: "#FFFFFF",
      border: "#ECE0D2",
      inputBg: "#FFFFFF",
      inputBorder: "#DCCDBC",
      inputText: "#33261E",
      placeholder: "#807265",
      headerBg: "#EC6331", // tangerine header (darkened for white-title contrast)
      headerTint: "#FFFFFF",
      statusBar: "light",
      glass: false,
    },
  },

  sweetBeginnings: {
    key: "sweetBeginnings",
    name: "Sweet Beginnings",
    description: "Sunwashed sage & clay — calm baby-shower warmth.",
    colors: {
      background: "#F2EDE4",
      backgroundGradient: ["#F5F1E9", "#EDE6DA"],
      surface: "#FAF8F5",
      text: "#3A352C",
      textMuted: "#786F63",
      pageText: "#3A352C",
      pageTextMuted: "#72695B",
      primary: "#6E8A6E",
      onPrimary: "#FFFFFF",
      accent: "#B5654A",
      accentSoft: "#F5E2DA",
      onAccentSoft: "#A04E32",
      claim: "#D9555A", // coral blush CLAIM
      onClaim: "#FFFFFF",
      claimMine: "#6E8A6E",
      onClaimMine: "#FFFFFF",
      claimedOther: "#E8E0D4",
      onClaimedOther: "#6A5E4E",
      danger: "#C0492F",
      onDanger: "#FFFFFF",
      border: "#E5DECF",
      inputBg: "#FAF8F5",
      inputBorder: "#D8CFBD",
      inputText: "#3A352C",
      placeholder: "#777064",
      headerBg: "#6E8A6E",
      headerTint: "#FFFFFF",
      statusBar: "light",
      glass: false,
    },
  },

  modernRomance: {
    key: "modernRomance",
    name: "Modern Romance",
    description: "Black cherry & champagne gold — editorial wedding luxe.",
    colors: {
      background: "#F8F7F4",
      backgroundGradient: ["#FAF9F6", "#F2EFEA"],
      surface: "#FFFFFF",
      text: "#2A1A22",
      textMuted: "#7D6E76",
      pageText: "#2A1A22",
      pageTextMuted: "#6E5F68",
      primary: "#3A1320",
      onPrimary: "#FFFFFF",
      accent: "#7A2540",
      accentSoft: "#E9E1EE",
      onAccentSoft: "#4A3A55",
      claim: "#D4AF37", // champagne gold "mark as claimed"
      onClaim: "#3A2A00",
      claimMine: "#7A2540",
      onClaimMine: "#FFFFFF",
      claimedOther: "#CBC0D3", // digital lavender dim state
      onClaimedOther: "#463B52",
      danger: "#B3243F",
      onDanger: "#FFFFFF",
      border: "#E8E3E0",
      inputBg: "#FFFFFF",
      inputBorder: "#D8D2DA",
      inputText: "#2A1A22",
      placeholder: "#7A7278",
      headerBg: "#3A1320",
      headerTint: "#FFFFFF",
      statusBar: "light",
      glass: false,
    },
  },

  winterFrost: {
    key: "winterFrost",
    name: "Winter Frost",
    description: "Clean, crisp, high-contrast.",
    colors: {
      background: "#F4F6F9",
      surface: "#FFFFFF",
      text: "#2B2D42",
      textMuted: "#6C7586",
      pageText: "#2B2D42",
      pageTextMuted: "#676F7F",
      primary: "#2B2D42",
      onPrimary: "#FFFFFF",
      accent: "#EF233C",
      accentSoft: "#FDE7EA",
      onAccentSoft: "#CD1E34",
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
      placeholder: "#70757E",
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
      textMuted: "#7D7168",
      pageText: "#4E342E",
      pageTextMuted: "#6C6056",
      primary: "#819970",
      onPrimary: "#FFFFFF",
      accent: "#D87B57",
      accentSoft: "#F1E6DD",
      onAccentSoft: "#9B5335",
      claim: "#D87B57",
      onClaim: "#FFFFFF",
      claimMine: "#819970",
      onClaimMine: "#FFFFFF",
      claimedOther: "#D8CFC2",
      onClaimedOther: "#625649",
      danger: "#B5462E",
      onDanger: "#FFFFFF",
      border: "#D8CFC2",
      inputBg: "#FDFCFB",
      inputBorder: "#CDBFAF",
      inputText: "#4E342E",
      placeholder: "#7C7167",
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
      placeholder: "#7E7063",
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
      onClaimedOther: "#4B0822",
      danger: "#E0245E",
      onDanger: "#FFFFFF",
      border: "rgba(0,121,107,0.18)",
      inputBg: "rgba(255,255,255,0.9)",
      inputBorder: "rgba(0,121,107,0.25)",
      inputText: "#0A3D39",
      placeholder: "#5B7A77",
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
      textMuted: "#645C52",
      pageText: "#E0D7CD", // on the dark slate background
      pageTextMuted: "#ABB5BB",
      primary: "#6D4C41",
      onPrimary: "#FFFFFF",
      accent: "#B5A642",
      accentSoft: "#EDE6CF",
      onAccentSoft: "#71661D",
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
      placeholder: "#635C53",
      headerBg: "#6D4C41",
      headerTint: "#FFFFFF",
      statusBar: "light",
      glass: false,
    },
  },
};

export const themeList: Theme[] = Object.values(themes);
export const DEFAULT_THEME: ThemeKey = "signature";
