import { SurfaceCard } from "./SurfaceCard";

interface ChartPanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  padding?: "sm" | "md" | "lg";
}

export function ChartPanel({
  title,
  subtitle,
  children,
  className,
  action,
  padding = "md",
}: ChartPanelProps) {
  return (
    <SurfaceCard padding={padding} className={className}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium leading-snug text-foreground">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-[13px] leading-[1.45] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </SurfaceCard>
  );
}
