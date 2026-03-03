import { cn } from "@/lib/utils";

type RiskLevel = "high" | "medium" | "low";

const styles: Record<RiskLevel, string> = {
  high: "bg-destructive/10 text-destructive border border-destructive/20",
  medium: "bg-accent/10 text-accent border border-accent/20",
  low: "bg-success/10 text-success border border-success/20",
};

const dots: Record<RiskLevel, string> = {
  high: "bg-destructive",
  medium: "bg-accent",
  low: "bg-success",
};

const labels: Record<RiskLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold", styles[level])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dots[level])} />
      {labels[level]}
    </span>
  );
}
