"use client";

import { useRef } from "react";
import { ArrowUpDown, Clock, Heart, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

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
  const sortTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <nav className="w-full flex justify-between items-center flex-wrap" aria-label="Feed filters">
      {/* Category Pills using ToggleGroup */}
      <ToggleGroup
        value={selectedCategoryId ?? ""}
        onValueChange={(value) => setSelectedCategoryId(value || null)}
        className="w-fit rounded-[16px]"
      >
        <ToggleGroupItem
          value=""
          className="whitespace-nowrap rounded-[12px] px-4"
        >
          All
        </ToggleGroupItem>
        {categories.map((cat) => (
          <ToggleGroupItem
            key={cat._id}
            value={cat._id}
            className="whitespace-nowrap rounded-[12px] flex items-center gap-2 px-4"
          >
            {cat.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      
      {/* Sort Dropdown using Radix Select */}
      <Select
        value={selectedSort}
        onValueChange={(value) => setSelectedSort(value as typeof selectedSort)}
      >
        <SelectTrigger
          ref={sortTriggerRef}
          className={cn(
            "w-fit p-3 rounded-[16px] text-sm whitespace-nowrap transition-colors data-[placeholder]:text-inherit [&>span]:hidden [&>svg:last-child]:hidden !bg-transparent",
            selectedSort !== "newest"
              ? "!bg-bg-accent/5 text-accent"
              : "hover:!bg-white/5 text-text-secondary"
          )}
        >
          <ArrowUpDown className="w-4 h-4" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="flex items-center gap-2"
            >
              <span>{option.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </nav>
  );
}