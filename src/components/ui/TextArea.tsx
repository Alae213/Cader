import * as React from "react";
import { cn } from "@/lib/utils";

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Auto-resize: adjust height based on content
    React.useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to get accurate scrollHeight
      textarea.style.height = "auto";
      // Set to scrollHeight to expand without scrolling
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, [props.value]);

    // Merge the external ref with internal ref
    const combinedRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[14px] border-0 bg-bg-surface px-4 py-3",
          "text-base text-text-primary placeholder:text-text-muted",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-canvas",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "overflow-hidden resize-none",
          className
        )}
        ref={combinedRef}
        {...props}
        style={{ height: "auto", ...props.style }}
        rows={1}
      />
    );
  }
);

TextArea.displayName = "TextArea";
