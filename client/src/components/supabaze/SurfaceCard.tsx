import { cn } from "@/lib/utils";

interface SurfaceCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  dark?: boolean;
  style?: React.CSSProperties;
}

const paddingMap = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function SurfaceCard({ children, className, padding = "lg", dark = false, style }: SurfaceCardProps) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
        dark
          ? "border-[#202020] bg-[#1c1c1c] text-white"
          : "border-[#dfdfdf] bg-white text-[#171717]",
        paddingMap[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
