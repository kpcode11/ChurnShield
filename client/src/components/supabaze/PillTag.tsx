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
        variant === "soft" && "bg-[#fafafa] text-[#171717] border border-[#ededed]",
        variant === "dark" && "bg-[#202020] text-white",
        variant === "violet" && "bg-[#eddbf9] text-[#6b01c2]",
        variant === "danger" && "bg-[#e2005a]/12 text-[#e2005a] border border-[#e2005a]/25",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
