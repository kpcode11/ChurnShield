import { SB } from "./supabaze";

/** Supabaze chart palette — accents reserved for data viz per DESIGN.md */
export const CHART = {
  churned: SB.accentCrimson,
  stayed: SB.primary,
  stayedLight: SB.primarySoft,
  stayedDeep: SB.primaryDeep,
  neutral: SB.inkMute2,
  rawLine: SB.inkMute2,
  rollingLine: SB.primaryDeep,
  peakLine: SB.accentCrimson,
  /** Distinct hues for categorical breakdowns */
  category: [
    SB.primary,
    "#644fc1",
    "#054cff",
    SB.primaryDeep,
    "#6b01c2",
    SB.primarySoft,
    SB.accentCrimson,
    "#ffdb13",
  ] as const,
  /** Low → high churn rate */
  churnScale: [
    SB.primary,
    SB.primarySoft,
    "#644fc1",
    "#6b01c2",
    SB.accentCrimson,
  ] as const,
  /** Subscription ladder (Free → Platinum) */
  subscription: ["#9a9a9a", SB.primarySoft, "#644fc1", SB.accentCrimson] as const,
  /** Feature importance rank (top → bottom) */
  importance: [
    SB.primaryDeep,
    SB.primary,
    SB.primarySoft,
    "#644fc1",
    "#6b01c2",
    "#054cff",
    SB.inkMute2,
    SB.inkMute,
    "#b2b2b2",
    "#dfdfdf",
  ] as const,
} as const;

export function chartCategoryColor(index: number): string {
  return CHART.category[index % CHART.category.length];
}

export function chartChurnRateColor(rate: number, rates: number[]): string {
  if (!rates.length) return CHART.category[0];
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  if (max === min) return CHART.churnScale[0];
  const t = (rate - min) / (max - min);
  const idx = Math.min(
    Math.floor(t * CHART.churnScale.length),
    CHART.churnScale.length - 1,
  );
  return CHART.churnScale[idx];
}

export const chartTooltipStyle = {
  backgroundColor: SB.canvas,
  border: `1px solid ${SB.hairline}`,
  borderRadius: 6,
  fontSize: 12,
  color: SB.ink,
};

export const chartTick = { fontSize: 11, fill: SB.inkMute };

/** Risk tier colors (dashboard pie, prediction result) */
export const RISK = {
  low: CHART.stayed,
  medium: "#644fc1",
  high: CHART.churned,
} as const;

export function riskLevelColor(level: string): string {
  if (level === "High") return RISK.high;
  if (level === "Medium") return RISK.medium;
  return RISK.low;
}
