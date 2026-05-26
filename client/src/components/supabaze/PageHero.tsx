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
    <header className={cn("border-b border-[#dfdfdf] pb-8", className)}>
      {badge && (
        <PillTag variant="green" className="mb-4">
          {badge}
        </PillTag>
      )}
      <h1 className="text-[28px] sm:text-[36px] font-medium leading-[1.15] tracking-[-0.02em] text-[#171717] max-w-3xl">
        {title}
      </h1>
      {lead && (
        <p className="mt-3 text-lg font-normal leading-[1.55] text-[#707070] max-w-2xl">{lead}</p>
      )}
      {children}
    </header>
  );
}
