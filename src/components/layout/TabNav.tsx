"use client";

import { Home, Users, FileText, Trophy, BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/animate-ui/components/animate/tabs";

const STORAGE_KEY_PREFIX = "cader_tab_";

interface Tab {
  value: string;
  label: string;
  icon: React.ElementType;
}

interface TabNavProps {
  communitySlug: string;
  isOwner?: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const memberTabs: Tab[] = [
  { value: "about", label: "About", icon: Home },
  { value: "feed", label: "Feed", icon: Home },
  { value: "members", label: "Members", icon: Users },
  { value: "classrooms", label: "Classrooms", icon: FileText },
  { value: "leaderboard", label: "Leaderboard", icon: Trophy },
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

export function TabNav({ 
  communitySlug, 
  isOwner = false, 
  activeTab, 
  onTabChange
}: TabNavProps) {
  // Use different tabs based on ownership
  const tabs = isOwner ? ownerTabs : memberTabs;

  // Handle tab change - save to localStorage and notify parent
  const handleTabChange = (newTab: string) => {
    onTabChange(newTab);
    saveTabPreference(communitySlug, newTab);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
    <Tabs 
      value={activeTab} 
      onValueChange={handleTabChange}
    >
      <TabsList>
        {tabs.map((tab) => {
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
            >
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
    </div>
  );
}

// Helper function to get initial tab from localStorage
export function getInitialTab(communitySlug: string, isOwner: boolean): string {
  const memberTabsList = ["about", "feed", "members", "classrooms", "leaderboard"];
  const ownerTabsList = [...memberTabsList, "analysis"];
  const validTabs = isOwner ? ownerTabsList : memberTabsList;
  
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