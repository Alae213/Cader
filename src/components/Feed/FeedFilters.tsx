"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUpDown, Clock, Heart, MessageCircle, ChevronDown } from "lucide-react";

export const SORT_OPTIONS: { value: "newest" | "most_liked" | "most_commented"; label: string; icon: typeof Clock }[] = [
  { value: "newest", label: "Newest first", icon: Clock },
  { value: "most_liked", label: "Most liked", icon: Heart },
  { value: "most_commented", label: "Most commented", icon: MessageCircle },
];

interface FeedFiltersProps {
  categories: Array<{ _id: string; name: string; color: string }>;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  selectedSort: "newest" | "most_liked" | "most_commented";
  setSelectedSort: (sort: "newest" | "most_liked" | "most_commented") => void;
}

export function FeedFilters({
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  selectedSort,
  setSelectedSort,
}: FeedFiltersProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="flex gap-2 mb-4 items-center flex-wrap" aria-label="Feed filters">
      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 flex-1 items-center [mask-image:linear-gradient(to_right,black_calc(100%-1rem),transparent)] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-1rem),transparent)]" role="group" aria-label="Filter by category">
        <button
          onClick={() => setSelectedCategoryId(null)}
          aria-label="Show all categories"
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors shrink-0 ${
            selectedCategoryId === null
              ? "bg-primary text-white"
              : "bg-bg-elevated text-text-secondary hover:bg-bg-muted"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() => setSelectedCategoryId(cat._id)}
            aria-label={`Filter by ${cat.name}`}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-2 shrink-0 ${
              selectedCategoryId === cat._id
                ? "bg-primary text-white"
                : "bg-bg-elevated text-text-secondary hover:bg-bg-muted"
            }`}
          >
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: cat.color }}
            />
            {cat.name}
          </button>
        ))}
      </div>
      
      {/* Sort Dropdown */}
      <div className="relative shrink-0" ref={sortDropdownRef}>
        <button
          onClick={() => setShowSortDropdown(!showSortDropdown)}
          aria-expanded={showSortDropdown}
          aria-haspopup="listbox"
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
            selectedSort !== "newest"
              ? "bg-primary text-white"
              : "bg-bg-elevated text-text-secondary hover:bg-bg-muted"
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          {SORT_OPTIONS.find(o => o.value === selectedSort)?.label}
          <ChevronDown className="w-3 h-3" />
        </button>
        
        {showSortDropdown && (
          <div className="absolute right-0 top-full mt-1 z-[100] rounded-lg bg-bg-elevated p-1 max-w-[calc(100vw-2rem)]" role="listbox" aria-label="Sort options">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSelectedSort(option.value);
                  setShowSortDropdown(false);
                }}
                role="option"
                aria-selected={selectedSort === option.value}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedSort === option.value
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-bg-elevated text-text-secondary"
                }`}
              >
                <option.icon className="w-4 h-4" />
                {option.label}
                {selectedSort === option.value && (
                  <span className="ml-auto text-primary">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
