import { cn } from "@/lib/utils";
import { CHART, RISK } from "@/lib/chart-colors";
import { type LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  variant?: "default" | "danger" | "warning" | "success";
}

const variantAccent = {
  default: undefined,
  danger: CHART.churned,
  warning: RISK.medium,
  success: CHART.stayed,
};

const iconBgStyles = {
  default: { bg: "#fafafa", color: "#171717", border: "#ededed" },
  danger: { bg: `${CHART.churned}12`, color: CHART.churned, border: `${CHART.churned}40` },
  warning: { bg: `${RISK.medium}12`, color: RISK.medium, border: `${RISK.medium}40` },
  success: { bg: `${CHART.stayed}18`, color: CHART.stayedDeep, border: `${CHART.stayed}50` },
};

export function KpiCard({ title, value, change, changeType, icon: Icon, variant = "default" }: KpiCardProps) {
  const accent = variantAccent[variant];
  const iconStyle = iconBgStyles[variant];

  return (
    <div
      className="rounded-xl border border-[#dfdfdf] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      style={accent ? { borderLeftWidth: 4, borderLeftColor: accent } : undefined}
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-md border"
          style={{
            backgroundColor: iconStyle.bg,
            color: iconStyle.color,
            borderColor: iconStyle.border,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              changeType === "up" ? "bg-[#fafafa]" : "bg-[#fafafa]",
            )}
            style={{ color: changeType === "up" ? CHART.churned : CHART.stayedDeep }}
          >
            {changeType === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change}
          </div>
        )}
      </div>
      <p className="text-[13px] font-normal text-[#707070]">{title}</p>
      <p
        className="mt-1 text-[28px] font-medium leading-tight tracking-[-0.02em]"
        style={{ color: accent ?? "#171717" }}
      >
        {value}
      </p>
    </div>
  );
}
