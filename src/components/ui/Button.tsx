import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent hover:bg-accent-hover text-white",
  secondary: "bg-bg-surface hover:bg-bg-elevated text-text-primary",
  tertiary: "bg-transparent hover:bg-bg-elevated text-accent",
  ghost: "bg-transparent hover:bg-bg-elevated/50 text-text-secondary",
  danger: "bg-error hover:bg-error/90 text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
  lg: "h-12 px-6 text-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const shadowStyle = variant === "primary" 
      ? { boxShadow: "inset 0 0.5px 0.5px 0.5px rgba(255, 255, 255, 0.19), 0 2px 4px 0 rgba(0, 0, 0, 0.15), 0 1px 1.5px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.2), 0 0 0 0 transparent" }
      : {};

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center rounded-[14px] font-sans font-medium cursor-pointer ",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas",
          "disabled:pointer-events-none disabled:opacity-50",
          // Variant and size
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        style={shadowStyle}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
