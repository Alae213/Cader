"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Compass, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";

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
  const [isSearchActive, setIsSearchActive] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsSearchActive(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter communities based on search query (client-side)
  const filteredCommunities = communities.filter((community) =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle community selection
  const handleCommunitySelect = (slug: string) => {
    setIsOpen(false);
    setSearchQuery("");
    setIsSearchActive(false);
    router.push(`/${slug}`);
  };

  // Handle create community
  const handleCreateClick = () => {
    setIsOpen(false);
    onCreateCommunity?.();
  };

  // Handle explore
  const handleExploreClick = () => {
    setIsOpen(false);
    onExploreCommunities?.();
  };

  // Toggle search mode
  const toggleSearch = () => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      setSearchQuery("");
    }
  };

  // Variants for framer motion animation
  const menuVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger button - shows current community when closed */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-[14px] bg-bg-surface px-3 py-2",
          "text-text-primary transition-colors hover:bg-bg-elevated",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-canvas"
        )}
      >
        {currentCommunity ? (
          <>
            <Avatar 
              src={currentCommunity.thumbnailUrl} 
              alt={currentCommunity.name} 
              size="sm" 
            />
            <span className="text-sm font-medium truncate max-w-[120px]">
              {currentCommunity.name}
            </span>
          </>
        ) : (
          <span className="text-sm text-text-muted">Select Community</span>
        )}
        <svg 
          className={cn(
            "h-4 w-4 text-text-muted transition-transform duration-200",
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
            className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-[14px] bg-bg-elevated py-2 shadow-lg"
          >
            {/* Create New Community Button */}
            <button
              type="button"
              onClick={handleCreateClick}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm",
                "text-accent hover:bg-bg-surface transition-colors"
              )}
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Create new Community</span>
            </button>

            {/* Explore Communities Button */}
            <button
              type="button"
              onClick={handleExploreClick}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm",
                "text-text-primary hover:bg-bg-surface transition-colors"
              )}
            >
              <Compass className="h-5 w-5" />
              <span>Explore Communities</span>
            </button>

            {/* Separator */}
            <div className="my-2 h-[1px] bg-bg-surface" />

            {/* Search / My Communities Header */}
            <div className="px-4 py-2">
              {isSearchActive ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search communities..."
                    className={cn(
                      "flex-1 rounded-[10px] bg-bg-surface px-3 py-2 text-sm",
                      "text-text-primary placeholder:text-text-muted",
                      "focus:outline-none focus:ring-2 focus:ring-accent"
                    )}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={toggleSearch}
                    className="rounded-full p-2 text-text-muted hover:bg-bg-surface"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={toggleSearch}
                  className={cn(
                    "flex w-full items-center justify-between text-sm",
                    "text-text-muted hover:text-text-primary transition-colors"
                  )}
                >
                  <span>My communities</span>
                  <Search className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Communities List */}
            <div className="max-h-[300px] overflow-y-auto">
              {filteredCommunities.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-text-muted">
                  {searchQuery ? "No communities found" : "No communities yet"}
                </div>
              ) : (
                filteredCommunities.map((community) => (
                  <button
                    key={community.id}
                    type="button"
                    onClick={() => handleCommunitySelect(community.slug)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left text-sm",
                      "text-text-primary hover:bg-bg-surface transition-colors",
                      currentCommunity?.id === community.id && "bg-bg-surface"
                    )}
                  >
                    <Avatar
                      src={community.thumbnailUrl}
                      alt={community.name}
                      size="sm"
                    />
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