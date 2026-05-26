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
  default: "bg-muted text-foreground border-border",
  danger: "bg-[#e2005a]/10 text-[#e2005a] border-[#e2005a]/30",
  warning: "bg-[#644fc1]/10 text-[#644fc1] border-[#644fc1]/30 dark:text-[#b794f6]",
  success: "bg-[#3ecf8e]/15 text-[#24b47e] border-[#3ecf8e]/40 dark:text-[#3ecf8e]",
};

export function KpiCard({ title, value, change, changeType, icon: Icon, variant = "default" }: KpiCardProps) {
  const accent = variantAccent[variant];

  return (
    <div
      className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
      style={accent ? { borderLeftWidth: 4, borderLeftColor: accent } : undefined}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-md border", iconBgStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <div
            className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
            style={{ color: changeType === "up" ? CHART.churned : CHART.stayedDeep }}
          >
            {changeType === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change}
          </div>
        )}
      </div>
      <p className="text-[13px] font-normal text-muted-foreground">{title}</p>
      <p
        className="mt-1 text-[28px] font-medium leading-tight tracking-[-0.02em] text-foreground"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
