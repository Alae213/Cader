"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface SearchIconProps {
  className?: string;
  onOpenSearch?: () => void;
  onCloseSearch?: () => void;
}

export function SearchIcon({ className, onOpenSearch, onCloseSearch }: SearchIconProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleSearch = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      onCloseSearch?.();
    } else {
      onOpenSearch?.();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={toggleSearch}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          "text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
        )}
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Search 
            className={cn("h-5 w-5", isOpen && "animate-spin slow")}
          />
        </motion.div>
      </button>
      
      {isOpen && (
        <div className="absolute left-0 -top-4 h-4 w-[1px] bg-bg-elevated" />
      )}
    </div>
  );
}