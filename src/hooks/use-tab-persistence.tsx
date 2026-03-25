"use client";

import { useState, useEffect, useCallback } from "react";

export type TabName = "feed" | "members" | "classrooms" | "leaderboard" | "analysis" | "settings";

interface UseTabPersistenceOptions {
  communitySlug: string;
  isMember: boolean;
  isOwner: boolean;
}

const STORAGE_KEY_PREFIX = "cader_tab_";

// Tabs accessible to members (non-owners)
const memberTabs: TabName[] = ["feed", "members", "classrooms", "leaderboard"];

// Tabs accessible to owners (includes analysis)
const ownerTabs: TabName[] = [...memberTabs, "analysis"];

// All possible tabs
const allTabs: TabName[] = [...ownerTabs, "settings"];

export function useTabPersistence({
  communitySlug,
  isMember,
  isOwner,
}: UseTabPersistenceOptions) {
  const [currentTab, setCurrentTab] = useState<TabName>("feed");
  const [isInitialized, setIsInitialized] = useState(false);

  // Get the storage key for this community
  const getStorageKey = useCallback(() => {
    return `${STORAGE_KEY_PREFIX}${communitySlug}`;
  }, [communitySlug]);

  // Determine which tabs are accessible
  const getAccessibleTabs = useCallback(() => {
    if (isOwner) return ownerTabs;
    if (isMember) return memberTabs;
    return []; // No tabs for non-members
  }, [isMember, isOwner]);

  // Validate if a tab is accessible
  const isTabAccessible = useCallback(
    (tab: TabName) => {
      const accessibleTabs = getAccessibleTabs();
      return accessibleTabs.includes(tab);
    },
    [getAccessibleTabs]
  );

  // Get the fallback tab based on access level
  const getFallbackTab = useCallback(() => {
    const accessibleTabs = getAccessibleTabs();
    if (accessibleTabs.length === 0) return "feed"; // Default, will be hidden anyway
    // For members, default to feed; for owners, default to feed (analysis is extra)
    return accessibleTabs[0];
  }, [getAccessibleTabs]);

  // Initialize: read from localStorage on mount
  useEffect(() => {
    if (!communitySlug) return;

    const storageKey = getStorageKey();
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && isTabAccessible(stored as TabName)) {
        setCurrentTab(stored as TabName);
      } else {
        // Stored tab is not accessible or doesn't exist - use fallback
        setCurrentTab(getFallbackTab());
      }
    } catch {
      // localStorage not available, use fallback
      setCurrentTab(getFallbackTab());
    }
    setIsInitialized(true);
  }, [communitySlug, getStorageKey, isTabAccessible, getFallbackTab]);

  // Write to localStorage when tab changes
  const setTab = useCallback(
    (tab: TabName) => {
      // Validate tab is accessible
      if (!isTabAccessible(tab)) {
        console.warn(`Tab "${tab}" is not accessible`);
        return;
      }

      setCurrentTab(tab);

      // Persist to localStorage
      try {
        const storageKey = getStorageKey();
        localStorage.setItem(storageKey, tab);
      } catch {
        // localStorage not available - that's fine, tab still works in memory
      }
    },
    [getStorageKey, isTabAccessible]
  );

  // Clear stored tab (useful on logout)
  const clearStoredTab = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
    } catch {
      // localStorage not available
    }
  }, [getStorageKey]);

  return {
    currentTab,
    setTab,
    clearStoredTab,
    isInitialized,
    accessibleTabs: getAccessibleTabs(),
  };
}
