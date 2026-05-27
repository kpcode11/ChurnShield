import { cn } from "@/lib/utils";
import { PillTag } from "./PillTag";

interface PageHeroProps {
  title: string;
  lead?: string;
  badge?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHero({ title, lead, badge, children, className }: PageHeroProps) {
  return (
    <header className={cn("border-b border-border pb-8", className)}>
      {badge && (
        <PillTag variant="green" className="mb-4">
          {badge}
        </PillTag>
      )}
      <h1 className="max-w-3xl text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[36px]">
        {title}
      </h1>
      {lead && (
        <p className="mt-3 max-w-2xl text-lg font-normal leading-[1.55] text-muted-foreground">{lead}</p>
      )}
      {children}
    </header>
  );
}
