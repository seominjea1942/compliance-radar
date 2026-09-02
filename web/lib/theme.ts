/**
 * Design tokens lifted verbatim from `Compliance Radar.dc.html`.
 * Names describe role, values are the design's own hex codes. If the design
 * changes, change it here and nowhere else.
 */
export const c = {
  // Surfaces
  canvas: "#EDE8DF",       // outermost page
  paper: "#FFFFFF",        // cards
  shell: "#FAF7F1",        // app content area, nested cards
  rail: "#F4F0E7",         // sidebar, table headers
  chrome: "#EFEAE0",       // browser chrome bar
  wash: "#F0EBE0",         // map plate
  hover: "#F1ECE1",

  // Lines
  line: "#E7E0D2",
  lineSoft: "#EFE9DC",
  lineStrong: "#DED6C7",
  lineChrome: "#E1D9CA",
  lineCard: "#E3DCCF",
  lineRail: "#E3D3CC",

  // Ink
  ink: "#23201B",
  inkSoft: "#3B372F",
  body: "#57514A",
  muted: "#6E675C",
  faint: "#8A8175",
  mono: "#7C7466",
  ghost: "#A9A093",

  // Accents
  green: "#2E5A46",
  greenDeep: "#1F3F31",
  greenSoft: "#9FBFAC",
  greenTintBg: "#F2F6F3",
  greenTintLine: "#DCE6DF",

  // Urgent
  alert: "#A8412A",
  alertInk: "#8C3722",
  alertBg: "#FBF1ED",
  alertLine: "#EBD3C8",

  // Map pins
  pin: "#A79E8E",
  pinFaint: "#BFB7A8",
  road: "#E4DCCC",
  roadFaint: "#E9E2D4",
} as const;

/**
 * next/font hashes the real family names, so the design's literal
 * "'Newsreader',serif" would silently fall back to a system font. These point
 * at the CSS variables declared in app/layout.tsx instead.
 */
export const f = {
  serif: "var(--font-newsreader), Georgia, serif",
  sans: "var(--font-plex-sans), system-ui, sans-serif",
  mono: "var(--font-plex-mono), ui-monospace, monospace",
} as const;

/** Uppercase mono eyebrow used for section labels and source chips. */
export const eyebrow = {
  font: `500 10.5px ${f.mono}`,
  letterSpacing: ".12em",
  textTransform: "uppercase" as const,
};
