"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Home, FileText, Trophy } from "lucide-react";
import { Tabs as TabsPrimitive, TabsList as TabsListPrimitive, TabsTrigger as TabsTriggerPrimitive } from "@/components/animate-ui/primitives/animate/tabs";
import { useTabs } from "@/components/animate-ui/primitives/animate/tabs";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/Text";

interface Tab {
  value: string;
  label: string;
  icon: React.ElementType;
}

interface TabNavProps {
  communitySlug: string;
  isOwner?: boolean;
  isMember?: boolean;
  isAuthenticated?: boolean;
  isNewCommunity?: boolean; // When true, default to "About" tab for owner
  activeTab: string;
  onTabChange: (tab: string) => void;
  variant?: "desktop" | "mobile" | "both";
}

const publicTabs: Tab[] = [
  { value: "about", label: "About", icon: Home },
];

const memberTabs: Tab[] = [
  { value: "about", label: "About", icon: Home },
  { value: "community", label: "Community", icon: Home },
  { value: "classrooms", label: "Classrooms", icon: FileText },
  { value: "leaderboard", label: "Leaderboard", icon: Trophy },
];

const ownerTabs: Tab[] = [
  ...memberTabs,
];

// Custom TabsList that contains the underline
function TabListWithUnderline({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  const { activeValue } = useTabs();
  const listRef = useRef<HTMLDivElement>(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  // Update underline position when activeTab changes
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    // Find the active button
    const buttons = listElement.querySelectorAll<HTMLElement>('[role="tab"]');
    let activeButton: HTMLElement | null = null;

    for (const btn of Array.from(buttons)) {
      if (btn.getAttribute('data-state') === 'active') {
        activeButton = btn;
        break;
      }
    }

    if (activeButton) {
      const listRect = listElement.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      setUnderlineStyle({
        left: buttonRect.left - listRect.left,
        width: buttonRect.width,
      });
    }
  }, [activeValue]);

  return (
    <div className={cn("relative", className)} ref={listRef}>
      {/* Animated underline */}
      <motion.div
        className="absolute bottom-0 h-[1.5px] bg-white rounded-full"
        animate={{
          left: underlineStyle.left,
          width: underlineStyle.width,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      />
      {children}
    </div>
  );
}

// Custom tab trigger with our styling
// Allows re-clicking the current tab to trigger refresh
function TabTrigger({ 
  value, 
  children, 
  className,
  icon: Icon,
  onClick,
}: { 
  value: string; 
  children: React.ReactNode; 
  className?: string;
  icon: React.ElementType;
  onClick?: (value: string) => void;
}) {
  const { activeValue } = useTabs();
  const isActive = activeValue === value;
  
  const handleClick = () => {
    onClick?.(value);
  };
  
  return (
    <TabsTriggerPrimitive
      value={value}
      className={cn(
        "flex flex-col gap-1 pr-2 py-1 mb-2",
        "text-sm font-medium whitespace-nowrap",
        "transition-colors duration-200 ease-out",
        "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/6",
        "data-[state=active]:text-[var(--text-primary)] data-[state=active]:bg-transparent data-[state=active]:cursor-pointer",
        "data-[state=inactive]:cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-0",
        "rounded-lg hover:text-[var(--text-primary)]",
        "sm:flex-row sm:gap-2",
        className
      )}
      onClick={handleClick}
    >
      {/* Mobile: Icon + Text (vertical), Desktop: Text only */}
      <Icon className="size-4 sm:size-0" />
      <Text size="3" theme={isActive ? "default" : "secondary"}>{children}</Text>
    </TabsTriggerPrimitive>
  );
}

export function TabNav({ 
  communitySlug, 
  isOwner = false,
  isMember = false,
  isAuthenticated = false,
  isNewCommunity = false,
  activeTab, 
  onTabChange,
  variant = "both"
}: TabNavProps) {
  // Hide entirely for users who are not members (regardless of auth status)
  const shouldHide = !isMember;
  
  // Use different tabs based on ownership and membership
  let tabs: Tab[];
  
  if (isOwner) {
    tabs = ownerTabs;
  } else if (isMember) {
    tabs = memberTabs;
  } else {
    // Non-members only see About tab (but TabNav is hidden for them)
    tabs = publicTabs;
  }

  // Hide entirely for users who are not members
  if (shouldHide) {
    return null;
  }

  // Handle tab change - notify parent (no localStorage saving)
  const handleTabChange = (newTab: string) => {
    onTabChange(newTab);
  };

  return (
    <>
      {/* Desktop: sticky at top */}
      {(variant === "desktop" || variant === "both") && (
        <div className="sticky top-14 z-30 w-full hidden sm:block pt-1 gap-2">
          <div className="mx-auto max-w-5xl">
            <TabsPrimitive 
              value={activeTab} 
              onValueChange={handleTabChange}
            >
              <TabListWithUnderline 
                className="flex h-auto w-full justify-start gap-3 overflow-x-auto bg-transparent p-0 scrollbar-hide"
              >
                {tabs.map((tab) => (
                  <TabTrigger
                    key={tab.value}
                    value={tab.value}
                    icon={tab.icon}
                    onClick={handleTabChange}
                  >
                    {tab.label}
                  </TabTrigger>
                ))}
              </TabListWithUnderline>
            </TabsPrimitive>
          </div>
        </div>
      )}

      {/* Mobile: sticky at bottom with icons only */}
      {(variant === "mobile" || variant === "both") && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-30 sm:hidden border-t border-white/[0.06]"
          style={{
            background: 'rgba(31, 31, 31, 0.8)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          <TabsPrimitive 
            value={activeTab} 
            onValueChange={handleTabChange}
          >
            <TabsListPrimitive className="flex h-auto w-full justify-around gap-1 bg-transparent p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTriggerPrimitive
                    key={tab.value}
                    value={tab.value}
                    onClick={() => handleTabChange(tab.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 pr-2 py-2",
                      "text-xs font-medium whitespace-nowrap",
                      "transition-colors duration-200 ease-out",
                      "text-text-secondary hover:text-white",
                      "data-[state=active]:text-white data-[state=active]:bg-transparent",
                      "focus-visible:outline-none focus-visible:ring-0",
                      "rounded-lg",
                    )}
                  >
                    <Icon className="size-5" />
                  </TabsTriggerPrimitive>
                );
              })}
            </TabsListPrimitive>
          </TabsPrimitive>
        </div>
      )}
    </>
  );
}

// Helper function to get initial tab - supports new community flag
export function getInitialTab(
  _communitySlug: string, 
  isOwner: boolean, 
  isMember: boolean = false,
  isNewCommunity: boolean = false
): string {
  // If this is a newly created community (owned by user), default to About
  if (isOwner && isNewCommunity) {
    return "about";
  }
  
  // Otherwise, default to community for members/owners
  if (isOwner || isMember) {
    return "community";
  }
  
  // Non-members only see About tab
  return "about";
}
