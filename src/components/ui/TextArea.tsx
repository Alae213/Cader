import * as React from "react";
import { cn } from "@/lib/utils";

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[14px] border-0 bg-bg-surface px-4 py-3",
          "text-base text-text-primary placeholder:text-text-muted",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-canvas",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

TextArea.displayName = "TextArea";
