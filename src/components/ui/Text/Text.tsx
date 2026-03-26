import { cn } from "@/lib/utils";

export type TextSize = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "sm" | "lg" | "xl";
export type TextTheme = "default" | "primary" | "secondary" | "muted" | "inverse" | "accent" | "success" | "error" | "warning" | "info";

// Map readable sizes to numeric
const readableSizeMap: Record<string, TextSize> = {
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

const sizeClasses: Record<TextSize, string> = {
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
};

const themeClasses: Record<TextTheme, string> = {
  "default": "text-text-primary",
  "primary": "text-text-primary",
  "secondary": "text-text-secondary",
  "muted": "text-text-muted",
  "inverse": "text-text-inverse",
  "accent": "text-accent",
  "success": "text-success",
  "error": "text-error",
  "warning": "text-warning",
  "info": "text-info",
};

export interface TextProps {
  size?: TextSize;
  theme?: TextTheme;
  children: React.ReactNode;
  className?: string;
  as?: "p" | "span" | "div" | "small" | "strong" | "em";
  fontWeight?: string;
  capitalize?: boolean;
}

function resolveSize(size?: TextSize): string {
  if (!size) return sizeClasses["3"];
  // If it's already a valid numeric size, use it
  if (size in sizeClasses) return sizeClasses[size as TextSize];
  // Otherwise try to map from readable size
  const numericSize = readableSizeMap[size];
  return numericSize ? sizeClasses[numericSize] : sizeClasses["3"];
}

export function Text({
  size = "3",
  theme = "default",
  children,
  className,
  as: Component = "p",
  fontWeight,
  capitalize,
}: TextProps) {
  const sizeClass = resolveSize(size);
  
  return (
    <Component
      className={cn(
        themeClasses[theme],
        sizeClass,
        // Body text typically uses leading-3 or leading-4
        (size === "3" || size === "4" || size === "sm" || size === "lg") && "leading-[1.25rem]",
        // Default letter spacing for body
        "tracking-normal",
        fontWeight,
        capitalize && "capitalize",
        className
      )}
    >
      {children}
    </Component>
  );
}
