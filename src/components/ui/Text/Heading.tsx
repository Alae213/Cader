import { cn } from "@/lib/utils";

export type HeadingSize = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "sm" | "lg" | "xl" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

// Map readable sizes to numeric
const readableSizeMap: Record<string, HeadingSize> = {
  "h1": "9",
  "h2": "8",
  "h3": "7",
  "h4": "6",
  "h5": "5",
  "h6": "4",
  "xs": "1",
  "sm": "2",
  "base": "3",
  "lg": "4",
  "xl": "5",
  "2xl": "6",
  "3xl": "7",
  "4xl": "8",
  "5xl": "9",
};

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
  "sm": "text-[14px] leading-[14px]",
  "lg": "text-[18px] leading-[18px]",
  "xl": "text-[20px] leading-[20px]",
  "h1": "text-[48px] leading-[48px]",
  "h2": "text-[36px] leading-[36px]",
  "h3": "text-[28px] leading-[28px]",
  "h4": "text-[24px] leading-[24px]",
  "h5": "text-[20px] leading-[20px]",
  "h6": "text-[18px] leading-[18px]",
};

export interface HeadingProps {
  size?: HeadingSize;
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

function resolveSize(size?: HeadingSize): string {
  if (!size) return sizeClasses["6"];
  // If it's already a valid numeric size, use it
  if (size in sizeClasses) return sizeClasses[size as HeadingSize];
  // Otherwise try to map from readable size
  const numericSize = readableSizeMap[size];
  return numericSize ? sizeClasses[numericSize] : sizeClasses["6"];
}

export function Heading({
  size = "6",
  children,
  className,
  as: Component = "h2",
}: HeadingProps) {
  const sizeClass = resolveSize(size);
  
  return (
    <Component
      className={cn(
        "font-display font-normal text-text-primary",
        sizeClass,
        // Tight leading for headings
        "leading-tight",
        // Tight letter spacing for display/titles
        size === "9" || size === "h1" && "tracking-[-0.05em]",
        size === "8" || size === "h2" && "tracking-[-0.05em]",
        size === "7" || size === "h3" && "tracking-[-0.035em]",
        (size === "6" || size === "h4" || size === "5" || size === "h5") && "tracking-[-0.035em]",
        className
      )}
    >
      {children}
    </Component>
  );
}
