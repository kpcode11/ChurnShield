import { useMemo } from "react";
import { useTheme } from "@/components/ThemeProvider";
import type { ResolvedTheme } from "@/components/ThemeProvider";
import { SB } from "./supabaze";

/** Supabaze chart palette — accents work on light and dark */
export const CHART = {
  churned: SB.accentCrimson,
  stayed: SB.primary,
  stayedLight: SB.primarySoft,
  stayedDeep: SB.primaryDeep,
  neutral: SB.inkMute2,
  rawLine: SB.inkMute2,
  rollingLine: SB.primaryDeep,
  peakLine: SB.accentCrimson,
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
  churnScale: [
    SB.primary,
    SB.primarySoft,
    "#644fc1",
    "#6b01c2",
    SB.accentCrimson,
  ] as const,
  subscription: ["#9a9a9a", SB.primarySoft, "#644fc1", SB.accentCrimson] as const,
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

export const RISK = {
  low: CHART.stayed,
  medium: "#644fc1",
  high: CHART.churned,
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

export function riskLevelColor(level: string): string {
  if (level === "High") return RISK.high;
  if (level === "Medium") return RISK.medium;
  return RISK.low;
}

export function buildChartTheme(resolvedTheme: ResolvedTheme) {
  const isDark = resolvedTheme === "dark";
  return {
    grid: isDark ? "#2a2a2a" : SB.hairlineCool,
    tick: { fontSize: 11, fill: isDark ? "#9a9a9a" : SB.inkMute },
    tooltip: {
      backgroundColor: isDark ? "#1c1c1c" : SB.canvas,
      border: `1px solid ${isDark ? "#333333" : SB.hairline}`,
      borderRadius: 6,
      fontSize: 12,
      color: isDark ? "#fafafa" : SB.ink,
    },
    rawLine: isDark ? "#707070" : CHART.rawLine,
    activeDotStroke: isDark ? "#1c1c1c" : SB.canvas,
  };
}

/** @deprecated use useChartTheme() */
export const chartTooltipStyle = buildChartTheme("light").tooltip;
/** @deprecated use useChartTheme() */
export const chartTick = buildChartTheme("light").tick;

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  return useMemo(() => buildChartTheme(resolvedTheme), [resolvedTheme]);
}
