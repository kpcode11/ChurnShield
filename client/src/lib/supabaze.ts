/** Design tokens from supabase/DESIGN.md (Supabaze) */
export const SB = {
  primary: "#3ecf8e",
  primaryDeep: "#24b47e",
  primarySoft: "#4ade80",
  ink: "#171717",
  inkSecondary: "#212121",
  inkMute: "#707070",
  inkMute2: "#9a9a9a",
  inkFaint: "#b2b2b2",
  onPrimary: "#171717",
  onDark: "#ffffff",
  canvas: "#ffffff",
  canvasSoft: "#fafafa",
  canvasNight: "#1c1c1c",
  canvasNightSoft: "#202020",
  hairline: "#dfdfdf",
  hairlineStrong: "#c7c7c7",
  hairlineCool: "#ededed",
  accentCrimson: "#e2005a",
} as const;

export const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-medium text-[#171717] transition-colors hover:bg-[#24b47e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ecf8e] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const btnOutline =
  "inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
