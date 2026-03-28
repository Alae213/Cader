"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Home, Users, FileText, Trophy, BarChart3, Map } from "lucide-react";
import { Tabs as TabsPrimitive, TabsList as TabsListPrimitive, TabsTrigger as TabsTriggerPrimitive } from "@/components/animate-ui/primitives/animate/tabs";
import { useTabs } from "@/components/animate-ui/primitives/animate/tabs";
import { cn } from "@/lib/utils";

const STORAGE_KEY_PREFIX = "cader_tab_";

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
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const publicTabs: Tab[] = [
  { value: "about", label: "About", icon: Home },
];

const memberTabs: Tab[] = [
  { value: "community", label: "Community", icon: Home },
  { value: "classrooms", label: "Classrooms", icon: FileText },
  { value: "leaderboard", label: "Leaderboard", icon: Trophy },
  { value: "map", label: "Map", icon: Map },
  { value: "about", label: "About", icon: Home },
];

const ownerTabs: Tab[] = [
  ...memberTabs,
  { value: "analysis", label: "Analysis", icon: BarChart3 },
];

// Save tab preference to localStorage
function saveTabPreference(communitySlug: string, tab: string) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${communitySlug}`;
    localStorage.setItem(key, tab);
  } catch {
    // localStorage not available
  }
}

// Custom TabsList that contains the underline
function TabListWithUnderline({ 
  children, 
  tabs,
  className 
}: { 
  children: React.ReactNode; 
  tabs: Tab[];
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
function TabTrigger({ 
  value, 
  children, 
  className,
  icon: Icon 
}: { 
  value: string; 
  children: React.ReactNode; 
  className?: string;
  icon: React.ElementType;
}) {
  return (
    <TabsTriggerPrimitive
      value={value}
      className={cn(
        "flex flex-col gap-1 pr-2 py-1 mb-2",
        "text-sm font-medium whitespace-nowrap",
        "transition-colors duration-200 ease-out",
        "text-text-secondary hover:text-white hover:bg-white/5",
        "data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:cursor-default",
        "data-[state=inactive]:cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-0",
        "rounded-lg",
        "sm:flex-row sm:gap-2",
        className
      )}
    >
      {/* Mobile: Icon + Text (vertical), Desktop: Text only */}
      <Icon className="size-4 sm:size-0" />
      <span className="text-[13px] sm:text-sm">{children}</span>
    </TabsTriggerPrimitive>
  );
}

export function TabNav({ 
  communitySlug, 
  isOwner = false,
  isMember = false,
  isAuthenticated = false,
  activeTab, 
  onTabChange
}: TabNavProps) {
  // Use different tabs based on ownership, membership, and auth status
  let tabs: Tab[];
  
  if (isOwner) {
    tabs = ownerTabs;
  } else if (isMember) {
    tabs = memberTabs;
  } else {
    // Non-members (authenticated or not) only see About tab
    tabs = publicTabs;
  }

  // Handle tab change - save to localStorage and notify parent
  const handleTabChange = (newTab: string) => {
    onTabChange(newTab);
    saveTabPreference(communitySlug, newTab);
  };

  return (
    <>
      {/* Desktop: sticky at top */}
      <div className="sticky top-14 z-30 w-full bg-bg-base hidden sm:block pt-1 gap-2">
        <div className="mx-auto max-w-5xl">
          <TabsPrimitive 
            value={activeTab} 
            onValueChange={handleTabChange}
          >
            <TabListWithUnderline 
              tabs={tabs}
              className="flex h-auto w-full justify-start gap-3 overflow-x-auto bg-transparent p-0 scrollbar-hide"
            >
              {tabs.map((tab) => (
                <TabTrigger
                  key={tab.value}
                  value={tab.value}
                  icon={tab.icon}
                >
                  {tab.label}
                </TabTrigger>
              ))}
            </TabListWithUnderline>
          </TabsPrimitive>
        </div>
      </div>

      {/* Mobile: sticky at bottom with icons only */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-bg-base sm:hidden border-t border-bg-elevated">
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
    </>
  );
}

// Helper function to get initial tab from localStorage
export function getInitialTab(communitySlug: string, isOwner: boolean, isMember: boolean = false, isAuthenticated: boolean = false): string {
  const publicTabsList = ["about"];
  const memberTabsList = ["community", "classrooms", "leaderboard", "map", "about"];
  const ownerTabsList = [...memberTabsList, "analysis"];
  
  let validTabs: string[];
  
  if (isOwner) {
    validTabs = ownerTabsList;
  } else if (isMember) {
    validTabs = memberTabsList;
  } else {
    // Non-members only see About tab
    validTabs = publicTabsList;
  }
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${communitySlug}`;
    const stored = localStorage.getItem(key);
    if (stored && validTabs.includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  
  return "about";
}
