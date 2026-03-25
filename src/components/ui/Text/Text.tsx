import { cn } from "@/lib/utils";

export type TextSize = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type TextTheme = "default" | "primary" | "secondary" | "muted" | "inverse" | "accent" | "success" | "error" | "warning" | "info";

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
}

export function Text({
  size = "3",
  theme = "default",
  children,
  className,
  as: Component = "p",
}: TextProps) {
  return (
    <Component
      className={cn(
        themeClasses[theme],
        sizeClasses[size],
        // Body text typically uses leading-3 or leading-4
        (size === "3" || size === "4") && "leading-[1.25rem]",
        // Default letter spacing for body
        "tracking-normal",
        className
      )}
    >
      {children}
    </Component>
  );
}
