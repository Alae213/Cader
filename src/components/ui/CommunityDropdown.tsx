"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Compass, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/dropdown";
import { MenuItem } from "@/components/ui/menu-item";

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

// Custom community icon component that works as a LucideIcon
const CommunityIcon = React.forwardRef<SVGSVGElement, React.ComponentProps<typeof Square>>(
  ({ className, ...props }, ref) => (
    <Square ref={ref} className={cn("w-4 h-4", className)} {...props} />
  )
);
CommunityIcon.displayName = "CommunityIcon";

export function CommunityDropdown({
  currentCommunity,
  communities,
  onCreateCommunity,
  onExploreCommunities,
  className,
}: CommunityDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Reset state helper
  const resetState = () => {
    setIsOpen(false);
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

  // Handle community selection
  const handleCommunitySelect = (slug: string) => {
    resetState();
    router.push(`/${slug}`);
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Find the index of current community in the communities array
  const currentCommunityIndex = currentCommunity
    ? communities.findIndex((c) => c.id === currentCommunity.id)
    : -1;

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger button - icon only using Button component */}
      <Button
        variant="ghost"
        size="md"
        onClick={toggleDropdown}
        aria-label="Open community menu"
        aria-expanded={isOpen}
        className="p-2"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 12 20"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0.702509 13.2926C1.09284 12.8995 1.72829 12.8984 2.12 13.2901L4.58579 15.7559C5.36684 16.5369 6.63316 16.5369 7.41421 15.7559L9.88 13.2901C10.2717 12.8984 10.9072 12.8995 11.2975 13.2926C11.6859 13.6837 11.6848 14.3153 11.295 14.7051L7.41421 18.5859C6.63317 19.3669 5.36684 19.3669 4.58579 18.5859L0.705005 14.7051C0.315239 14.3153 0.314123 13.6837 0.702509 13.2926Z" fill="currentColor" />
          <path d="M11.2975 7.28749C10.9072 7.68059 10.2717 7.68171 9.88 7.28999L7.41421 4.82421C6.63316 4.04316 5.36684 4.04316 4.58579 4.82421L2.12 7.28999C1.72829 7.68171 1.09284 7.68059 0.702509 7.28749C0.314123 6.89635 0.315239 6.26476 0.705005 5.87499L4.58579 1.99421C5.36683 1.21316 6.63316 1.21316 7.41421 1.99421L11.295 5.87499C11.6848 6.26476 11.6859 6.89635 11.2975 7.28749Z" fill="currentColor" />
        </svg>
      </Button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-2"
          >
            <Dropdown checkedIndex={currentCommunityIndex >= 0 ? currentCommunityIndex + 2 : undefined}>
              {/* Create New Community */}
              <MenuItem
                index={0}
                icon={Plus}
                label="New community"
                onSelect={() => {
                  resetState();
                  onCreateCommunity?.();
                }}
              />

              {/* Explore Communities */}
              <MenuItem
                index={1}
                icon={Compass}
                label="Explore"
                onSelect={() => {
                  resetState();
                  onExploreCommunities?.();
                }}
              />

              {/* Communities List */}
              {communities.map((community) => (
                <MenuItem
                  key={community.id}
                  index={communities.indexOf(community) + 2}
                  icon={CommunityIcon}
                  label={community.name}
                  checked={currentCommunity?.id === community.id}
                  onSelect={() => handleCommunitySelect(community.slug)}
                />
              ))}
            </Dropdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
