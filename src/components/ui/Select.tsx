"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface SelectOption {
  value: string;
  label: string;
  thumbnail?: string; // For community thumbnail
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  // Special prop for community select
  isCommunitySelect?: boolean;
}

export function Select({ options, value, onChange, placeholder = "Select...", className, isCommunitySelect = false }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Variants for framer motion animation
  const variants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-[14px] border-0 bg-bg-surface px-4 py-2",
          "text-base text-text-primary transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-canvas",
          selectedOption ? "" : "text-text-muted"
        )}
      >
        {isCommunitySelect && selectedOption && selectedOption.thumbnail ? (
          <>
            <img 
              src={selectedOption.thumbnail} 
              alt={`${selectedOption.label} thumbnail`} 
              className="h-8 w-8 rounded-full object-cover mr-2"
            />
            <span>{selectedOption.label}</span>
          </>
        ) : (
          <span>{selectedOption?.label || placeholder}</span>
        )}
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <AnimatePresence>
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants}
            className="absolute z-50 mt-1 w-full rounded-[14px] bg-bg-elevated py-1 shadow-lg"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange?.(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full px-4 py-2 text-left text-sm transition-colors rounded-[16px]",
                  option.value === value
                    ? "bg-accent-subtle text-accent"
                    : "text-text-primary hover:bg-bg-surface"
                )}
              >
                {isCommunitySelect && option.thumbnail ? (
                  <>
                    <img 
                      src={option.thumbnail} 
                      alt={`${option.label} thumbnail`} 
                      className="h-6 w-6 rounded-full object-cover mr-2"
                    />
                    <span>{option.label}</span>
                  </>
                ) : (
                  <span>{option.label}</span>
                )}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
