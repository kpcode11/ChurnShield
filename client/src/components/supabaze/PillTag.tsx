import { cn } from "@/lib/utils";

interface PillTagProps {
  children: React.ReactNode;
  variant?: "green" | "soft" | "dark" | "violet" | "danger";
  className?: string;
  style?: React.CSSProperties;
}

export function PillTag({ children, variant = "soft", className, style }: PillTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-normal leading-[1.45]",
        variant === "green" && "bg-[#3ecf8e] text-[#171717]",
        variant === "soft" && "border border-border bg-muted text-foreground",
        variant === "dark" && "bg-[#202020] text-white",
        variant === "violet" && "bg-[#eddbf9] text-[#6b01c2] dark:bg-[#6b01c2]/20 dark:text-[#d4b8f5]",
        variant === "danger" && "border border-[#e2005a]/25 bg-[#e2005a]/12 text-[#e2005a]",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
