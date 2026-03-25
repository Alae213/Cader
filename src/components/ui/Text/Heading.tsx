import { cn } from "@/lib/utils";

export type HeadingSize = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

const sizeClasses: Record<HeadingSize, string> = {
  "0": "text-[10px] leading-[10px]",
  "1": "text-[12px] leading-[12px]",
  "2": "text-[14px] leading-[14px]",
  "3": "text-[16px] leading-[16px]",
  "4": "text-[18px] leading-[18px]",
  "5": "text-[20px] leading-[20px]",
  "6": "text-[24px] leading-[24px]",
  "7": "text-[28px] leading-[28px]",
  "8": "text-[36px] leading-[36px]",
  "9": "text-[48px] leading-[48px]",
};

export interface HeadingProps {
  size?: HeadingSize;
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

export function Heading({
  size = "6",
  children,
  className,
  as: Component = "h2",
}: HeadingProps) {
  return (
    <Component
      className={cn(
        "font-display font-normal text-text-primary",
        sizeClasses[size],
        // Tight leading for headings
        "leading-tight",
        // Tight letter spacing for display/titles
        size === "9" && "tracking-[-0.05em]",
        size === "8" && "tracking-[-0.05em]",
        size === "7" && "tracking-[-0.035em]",
        (size === "6" || size === "5") && "tracking-[-0.035em]",
        className
      )}
    >
      {children}
    </Component>
  );
}
