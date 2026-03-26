"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { TopBar } from "./TopBar";
import { TabNav, getInitialTab } from "./TabNav";

// Tab content components
import { AboutTab } from "@/components/community/AboutTab";
import { FeedTab } from "@/components/community/FeedTab";
import { MembersTab } from "@/components/community/MembersTab";
import { ClassroomsTab } from "@/components/community/ClassroomsTab";
import { LeaderboardTab } from "@/components/community/LeaderboardTab";
import { AnalysisTab } from "@/components/community/AnalysisTab";

interface Community {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  memberCount: number;
  isVerified: boolean;
}

interface CommunityShellProps {
  community: Community;
  children?: React.ReactNode;
  showTabs?: boolean;
  isOwner?: boolean;
  // Legacy props for About tab - will be refactored
  aboutTabProps?: {
    isMember: boolean;
    onJoinClick: () => void;
    onEditClick: () => void;
    onVideoChange?: (url: string) => void;
    communityData?: any;
  };
}

export function CommunityShell({ 
  community, 
  children, 
  showTabs = false, 
  isOwner = false,
  aboutTabProps 
}: CommunityShellProps) {
  const { user } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Client-side tab state
  const [activeTab, setActiveTab] = useState<string>(() => 
    getInitialTab(community.slug, isOwner)
  );

  // Handle tab change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "about":
        return aboutTabProps ? (
          <AboutTab 
            community={aboutTabProps.communityData}
            isOwner={isOwner}
            isMember={aboutTabProps.isMember}
            onJoinClick={aboutTabProps.onJoinClick}
            onEditClick={aboutTabProps.onEditClick}
            onVideoChange={aboutTabProps.onVideoChange}
          />
        ) : (
          children
        );
      case "feed":
        return <FeedTab communityId={community.id} />;
      case "members":
        return <MembersTab communityId={community.id} />;
      case "classrooms":
        return <ClassroomsTab communityId={community.id} />;
      case "leaderboard":
        return <LeaderboardTab communityId={community.id} />;
      case "analysis":
        return isOwner ? <AnalysisTab communityId={community.id} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bg-canvas">
      {/* Top Bar */}
      <TopBar
        user={user ? { name: user.fullName, image: user.imageUrl } : null}
        onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Tab Navigation with content below */}
      {showTabs ? (
        <div className=" bg-bg-canvas">
          <TabNav 
            communitySlug={community.slug} 
            isOwner={isOwner}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          
          {/* Tab Content */}
          <main className="mx-auto max-w-5xl px-4 py-6">
            {renderTabContent()}
          </main>
        </div>
      ) : (
        /* No tabs - just show children */
        <main className="mx-auto max-w-5xl px-4 py-6">
          {children}
        </main>
      )}
    </div>
  );
}