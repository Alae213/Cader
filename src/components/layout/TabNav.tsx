"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, FileText, Trophy, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY_PREFIX = "cader_tab_";

interface Tab {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface TabNavProps {
  communitySlug: string;
  isOwner?: boolean;
}

const memberTabs: Tab[] = [
  { href: "feed", label: "Feed", icon: Home },
  { href: "members", label: "Members", icon: Users },
  { href: "classrooms", label: "Classrooms", icon: FileText },
  { href: "leaderboard", label: "Leaderboard", icon: Trophy },
];

const ownerTabs: Tab[] = [
  ...memberTabs,
  { href: "analysis", label: "Analysis", icon: BarChart3 },
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

export function TabNav({ communitySlug, isOwner = false }: TabNavProps) {
  const pathname = usePathname();
  
  // Use different tabs based on ownership
  const tabs = isOwner ? ownerTabs : memberTabs;
  
  // Check if we're on a nested route
  const currentTab = pathname.split("/").pop() || "feed";

  // Handle tab click - save preference
  const handleTabClick = (tab: string) => {
    saveTabPreference(communitySlug, tab);
  };

  return (
    <nav className="flex items-center gap-1 border-b border-bg-elevated px-4">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.href || 
          (tab.href === "feed" && currentTab === communitySlug);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={`/${communitySlug}/${tab.href}`}
            onClick={() => handleTabClick(tab.href)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </Link>
        );
      })}
      
      {/* Settings tab - always at the end */}
      <Link
        href={`/${communitySlug}/settings`}
        className={cn(
          "relative ml-auto flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
          currentTab === "settings"
            ? "text-text-primary"
            : "text-text-muted hover:text-text-secondary"
        )}
      >
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">Settings</span>
        {currentTab === "settings" && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        )}
      </Link>
    </nav>
  );
}
