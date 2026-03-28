"use client";

import { useRef, useEffect, forwardRef, type HTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropdown } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";

interface MenuItemProps extends HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  label: string;
  index: number;
  checked?: boolean;
  destructive?: boolean;
  onSelect?: () => void;
}

const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  (
    { icon: Icon, label, index, checked, destructive, onSelect, className, ...props },
    ref
  ) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const hasMounted = useRef(false);
    const { registerItem, activeIndex, checkedIndex } = useDropdown();

    useEffect(() => {
      registerItem(index, internalRef.current);
      return () => registerItem(index, null);
    }, [index, registerItem]);

    useEffect(() => {
      hasMounted.current = true;
    }, []);

    const isActive = activeIndex === index;
    const skipAnimation = !hasMounted.current;
    const shape = useShape();

    return (
      <div
        ref={(node) => {
          (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        data-proximity-index={index}
        tabIndex={index === (checkedIndex ?? 0) ? 0 : -1}
        role="menuitemradio"
        aria-checked={!!checked}
        aria-label={label}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onSelect?.();
          }
        }}
        className={cn(
          `relative z-10 flex items-center gap-2 ${shape.item} px-3 py-2.5 cursor-pointer outline-none transition-all duration-200`,
          destructive
            ? "text-red-11"
            : "text-text-secondary",
          isActive && !destructive && "bg-bg-elevated text-text-primary",
          checked && !destructive && "bg-accent-subtle text-text-primary",
          isActive && destructive && "bg-red-3/50",
          checked && destructive && "bg-red-3/50",
          className
        )}
        {...props}
      >
        <span className="inline-grid">
          <span className="col-start-1 row-start-1 invisible">
            <Icon size={16} strokeWidth={2} />
          </span>
          <Icon
            size={16}
            strokeWidth={isActive || checked ? 2 : 1.5}
            className={cn(
              "col-start-1 row-start-1 transition-[color,stroke-width] duration-200",
              destructive
                ? isActive || checked
                  ? "text-red-12"
                  : "text-red-10"
                : isActive || checked
                  ? "text-text-primary"
                  : "text-text-muted"
            )}
          />
        </span>
        <span className="inline-grid flex-1 text-[13px]">
          <span
            className="col-start-1 row-start-1 invisible"
            style={{ fontVariationSettings: fontWeights.semibold }}
            aria-hidden="true"
          >
            {label}
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1 transition-[color,font-variation-settings] duration-200 text-sm",
              destructive
                ? isActive || checked
                  ? "text-red-12"
                  : "text-red-11"
                : isActive || checked
                  ? "text-text-primary"
                  : "text-text-secondary"
            )}
            style={{
              fontVariationSettings: checked
                ? fontWeights.semibold
                : fontWeights.normal,
            }}
          >
            {label}
          </span>
        </span>
        <AnimatePresence>
          {checked && (
            <motion.svg
              key="check"
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-primary shrink-0"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
            >
              <motion.path
                d="M4 12L9 17L20 6"
                initial={{ pathLength: skipAnimation ? 1 : 0 }}
                animate={{
                  pathLength: 1,
                  transition: { duration: 0.12, ease: "easeOut" },
                }}
                exit={{
                  pathLength: 0,
                  transition: { duration: 0.06, ease: "easeIn" },
                }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

MenuItem.displayName = "MenuItem";

export { MenuItem };
export default MenuItem;
