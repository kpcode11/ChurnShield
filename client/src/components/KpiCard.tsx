import { cn } from "@/lib/utils";
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

const iconBgStyles = {
  default: "bg-primary/10 text-primary",
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
};

export function KpiCard({ title, value, change, changeType, icon: Icon, variant = "default" }: KpiCardProps) {
  return (
    <div className="bg-card rounded-xl p-5 card-shadow hover:card-shadow-hover transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", iconBgStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
            changeType === "up" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
          )}>
            {changeType === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change}
          </div>
        )}
      </div>
      <p className="text-[13px] text-muted-foreground font-medium">{title}</p>
      <p className="text-[26px] font-bold text-card-foreground mt-0.5 tracking-tight">{value}</p>
    </div>
  );
}
