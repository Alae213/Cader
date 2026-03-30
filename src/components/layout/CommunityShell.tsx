"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TopBar } from "./TopBar";
import { TabNav, getInitialTab } from "./TabNav";

// Tab content components
import { AboutTab } from "@/components/community/AboutTab";
import { FeedTab } from "@/components/community/FeedTab";
import { MembersTab } from "@/components/community/MembersTab";
import { ClassroomsTab } from "@/components/community/ClassroomsTab";
import { LeaderboardTab } from "@/components/community/LeaderboardTab";
import { AnalysisTab } from "@/components/community/AnalysisTab";
import { ProfileModal } from "@/components/community/ProfileModal";
import { SettingsModal } from "@/components/community/SettingsModal";
import { ExploreModal } from "@/components/community/ExploreModal";

interface Community {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  memberCount: number;
  isVerified: boolean;
}

interface CommunityShellProps {
  community: Community;
  children?: React.ReactNode;
  showTabs?: boolean;
  isOwner?: boolean;
  isAdmin?: boolean;
  isMember?: boolean;
  isAuthenticated?: boolean;
  // Legacy props for About tab - will be refactored
  aboutTabProps?: {
    isMember: boolean;
    onJoinClick: () => void;
    onEditClick: () => void;
    onVideoChange?: (url: string) => void;
    communityData?: any;
  };
  // New props for TopBar - communities user belongs to (created + joined)
  userCommunities?: Community[];
  onCreateCommunity?: () => void;
  onExploreCommunities?: () => void;
  onLogout?: () => void;
}

export function CommunityShell({ 
  community, 
  children, 
  showTabs = false, 
  isOwner = false,
  isAdmin = false,
  isMember = false,
  isAuthenticated = false,
  aboutTabProps,
  // New props for TopBar
  userCommunities = [],
  onCreateCommunity,
  onExploreCommunities,
  onLogout
}: CommunityShellProps) {
  const { user: clerkUser } = useUser();
  
  // Get current user from Convex
  const currentUserQuery = useQuery(
    api.functions.users.getUserByClerkId,
    clerkUser ? { clerkId: clerkUser.id } : "skip"
  );
  
  // Convert null to undefined for type compatibility
  const currentUser = currentUserQuery ?? undefined;
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string>("");
  
  // Client-side tab state
  const [activeTab, setActiveTab] = useState<string>(() => 
    getInitialTab(community.slug, isOwner, isMember, isAuthenticated)
  );

  // Handle tab change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  // Handle profile click - show own profile
  const handleProfileClick = () => {
    // For now, show settings - could be expanded to show profile
    setShowSettingsModal(true);
  };

  // Handle settings click
  const handleSettingsClick = () => {
    setShowSettingsModal(true);
  };

  // Prepare community for TopBar (current community)
  const currentCommunity = {
    id: community.id,
    name: community.name,
    slug: community.slug,
    thumbnailUrl: community.imageUrl || community.thumbnailUrl
  };

  // Prepare communities for dropdown (user's communities)
  const communitiesForDropdown = userCommunities.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    thumbnailUrl: c.imageUrl || c.thumbnailUrl
  }));

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
          />
        ) : (
          children
        );
      case "community":
        return <FeedTab communityId={community.id} communitySlug={community.slug} />;
      case "map":
        return <MembersTab communityId={community.id} isOwner={isOwner} isAdmin={isAdmin} />;
      case "classrooms":
        return <ClassroomsTab communityId={community.id} isOwner={isOwner} currentUser={currentUser ?? undefined} />;
      case "leaderboard":
        return <LeaderboardTab communityId={community.id} />;
      case "analysis":
        return isOwner ? <AnalysisTab communityId={community.id} /> : null;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Glass container for TopBar + TabNav (desktop) */}
      <div 
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(31, 31, 31, 0.8)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0px 0px 2px 2px rgba(0, 0, 0, 0.17), inset 0px -5px 13px 0px rgba(255, 255, 255, 0.02), inset 0px 0px 20px 18px rgba(255, 255, 255, 0.01)',
        }}
      >
        {/* Top Bar */}
        <TopBar
          user={clerkUser ? { name: clerkUser.fullName, image: clerkUser.imageUrl } : null}
          currentCommunity={currentCommunity}
          communities={communitiesForDropdown}
          onCreateCommunity={onCreateCommunity}
          onExploreCommunities={onExploreCommunities}
          onProfileClick={handleProfileClick}
          onSettingsClick={handleSettingsClick}
          onLogout={() => {
            window.location.href = "/";
          }}
        />

        {/* Tab Navigation - desktop only (inside glass container) */}
        {showTabs && (
          <TabNav 
            communitySlug={community.slug} 
            isOwner={isOwner}
            isMember={isMember}
            isAuthenticated={isAuthenticated}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            variant="desktop"
          />
        )}
      </div>

      {/* Content area */}
      {showTabs && (
        <div className="pb-16 sm:pb-6 ">
          <main className="mx-auto max-w-5xl py-6 ">
            {renderTabContent()}
          </main>
        </div>
      )}

      {/* Mobile TabNav - separate glass container at bottom */}
      {showTabs && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-30 sm:hidden border-t border-white/[0.06]"
          style={{
            background: 'rgba(31, 31, 31, 0.8)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0px 0px 1px 2px rgba(0, 0, 0, 0.37), inset 0px -5px 13px 0px rgba(255, 255, 255, 0.03), inset 0px 0px 20px 18px rgba(255, 255, 255, 0.02)',
          }}
        >
          <TabNav 
            communitySlug={community.slug} 
            isOwner={isOwner}
            isMember={isMember}
            isAuthenticated={isAuthenticated}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            variant="mobile"
          />
        </div>
      )}

      {/* No tabs - just show children */}
      {!showTabs && (
        <main className="mx-auto max-w-5xl py-6">
          {children}
        </main>
      )}

      {/* Settings Modal */}
      <SettingsModal 
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        communitySlug={community.slug}
      />

      {/* Explore Modal */}
      <ExploreModal
        open={showExploreModal}
        onOpenChange={setShowExploreModal}
      />
    </div>
  );
}