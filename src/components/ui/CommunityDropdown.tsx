"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Compass, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/shared/Avatar";

export interface Community {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl?: string;
}

interface CommunityDropdownProps {
  currentCommunity?: Community | null;
  communities: Community[];
  onCreateCommunity?: () => void;
  onExploreCommunities?: () => void;
  className?: string;
}

export function CommunityDropdown({
  currentCommunity,
  communities,
  onCreateCommunity,
  onExploreCommunities,
  className,
}: CommunityDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const ref = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Derive isSearchActive from searchQuery
  const isSearchActive = searchQuery.length > 0;

  // Memoized filtered communities
  const filteredCommunities = React.useMemo(() =>
    communities.filter((community) =>
      community.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [communities, searchQuery]
  );

  // Memoized menu variants
  const menuVariants = React.useMemo(() => ({
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  }), []);

  // Reset state helper
  const resetState = () => {
    setIsOpen(false);
    setSearchQuery("");
    setFocusedIndex(-1);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        resetState();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when search becomes active
  React.useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchActive]);

  // Handle community selection
  const handleCommunitySelect = (slug: string) => {
    resetState();
    router.push(`/${slug}`);
  };

  // Handle create community
  const handleCreateClick = () => {
    resetState();
    onCreateCommunity?.();
  };

  // Handle explore
  const handleExploreClick = () => {
    resetState();
    onExploreCommunities?.();
  };

  // Toggle search mode
  const toggleSearch = () => {
    setSearchQuery((prev) => (prev ? "" : ""));
    setFocusedIndex(-1);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setFocusedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        resetState();
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => {
          const maxIndex = filteredCommunities.length - 1;
          return prev < maxIndex ? prev + 1 : 0;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => {
          const maxIndex = filteredCommunities.length - 1;
          return prev > 0 ? prev - 1 : maxIndex;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredCommunities.length) {
          handleCommunitySelect(filteredCommunities[focusedIndex].slug);
        }
        break;
    }
  };

  return (
    <div ref={ref} className={cn("relative", className)} onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      {/* Trigger button */}
      <button
        type="button"
        onKeyDown={handleKeyDown}
        aria-label={currentCommunity ? `Current community: ${currentCommunity.name}` : "Select a community"}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex items-center justify-between gap-2 w-[280px] rounded-[22px] bg-bg-surface px-4 py-2.5",
          "text-text-primary transition-colors hover:bg-bg-elevated",
          "focus:outline-none focus:ring-0",
          "active:scale-[0.96] transition-transform"
        )}
      >
        {currentCommunity ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {currentCommunity.thumbnailUrl ? (
                <img 
                  src={currentCommunity.thumbnailUrl} 
                  alt={currentCommunity.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <span className="text-lg font-serif text-white">
                    {currentCommunity.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <span className="text-sm font-medium truncate">
              {currentCommunity.name}
            </span>
          </div>
        ) : (
          <span className="text-sm text-text-muted">Select Community</span>
        )}
        <svg 
          aria-hidden="true"
          className={cn(
            "h-4 w-4 text-text-muted transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180"
          )} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={menuVariants}
            role="listbox"
            aria-label="Community list"
            aria-expanded={isOpen}
            className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-[22px] bg-bg-elevated py-2"
            style={{
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
          >
            {/* Create New Community Button */}
            <button
              type="button"
              onClick={handleCreateClick}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-left text-sm",
                "text-accent hover:bg-white/10 transition-colors",
                "active:scale-[0.96] transition-transform"
              )}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium">Create new community</span>
            </button>

            {/* Explore Communities Button */}
            <button
              type="button"
              onClick={handleExploreClick}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-left text-sm",
                "text-text-primary hover:bg-white/10 transition-colors",
                "active:scale-[0.96] transition-transform"
              )}
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Explore communities</span>
            </button>

            {/* Separator */}
            <div className="my-2 mx-4 h-[1px] bg-white/10" />


            {/* Communities List */}
            <div className="max-h-[300px] overflow-y-auto pb-2">
              {filteredCommunities.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-text-muted">
                  {searchQuery ? "No communities found" : "No communities yet"}
                </div>
              ) : (
                filteredCommunities.map((community, index) => (
                  <button
                    key={community.id}
                    type="button"
                    onClick={() => handleCommunitySelect(community.slug)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    role="option"
                    aria-selected={currentCommunity?.id === community.id}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-left text-sm",
                      "text-text-primary hover:bg-white/10 transition-colors",
                      focusedIndex === index && "bg-white/10",
                      "active:scale-[0.96] transition-transform"
                    )}
                  >
                    <div className="flex-shrink-0">
                      {community.thumbnailUrl ? (
                        <img 
                          src={community.thumbnailUrl} 
                          alt={community.name}
                          className="w-6 h-6 rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
                          <span className="text-sm font-serif text-white">
                            {community.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="truncate">{community.name}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}