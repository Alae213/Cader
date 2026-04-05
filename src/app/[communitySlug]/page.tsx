"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/../convex/_generated/api";
import { CommunityShell } from "@/components/layout/CommunityShell";
import { CreateCommunityModal } from "@/components/community/CreateCommunityModal";
import { OnboardingModal } from "@/components/community/OnboardingModal";
import { Heading, Text } from "@/components/ui/Text";
import { CommunityDataContext, type CommunityPageData } from "@/contexts/CommunityDataContext";

export default function CommunityPage() {
  const params = useParams();
  const { userId: clerkId } = useAuth();
  const communitySlug = params.communitySlug as string;

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Fetch community page data (single query with all needed data)
  const communityData = useQuery(api.functions.communities.getCommunityPageData, { slug: communitySlug });

  // Fetch membership status (only if logged in)
  const membership = useQuery(
    api.functions.memberships.getMembershipBySlug,
    clerkId ? { slug: communitySlug, clerkId } : "skip"
  );

  // Fetch all user's memberships to get communities they belong to (created + joined)
  const userMemberships = useQuery(
    api.functions.memberships.listByUser,
    clerkId ? { userId: clerkId } : "skip"
  );

  // Get community IDs from user's memberships
  const userCommunityIds = (userMemberships || [])
    .filter(m => m.status === "active")
    .map(m => m.communityId);

  // Get community details for each membership
  const userCommunities = useQuery(
    api.functions.communities.listByIds,
    userCommunityIds.length > 0 ? { ids: userCommunityIds } : "skip"
  ) || [];

  // Mutation to update community video URL
  const updateCommunity = useMutation(api.functions.communities.updateCommunity);

  // Handle Join button click
  const handleJoinClick = () => {
    if (!clerkId) {
      // Store intent in session storage for after auth
      sessionStorage.setItem("joinCommunitySlug", communitySlug);
      // The SignInButton/SignUpButton with mode="modal" will handle auth
      // After sign in, we'll check for the stored slug and show onboarding
      return;
    }
    // User is logged in - show onboarding modal
    setShowOnboarding(true);
  };

  // Check for stored join intent on mount (after auth redirect)
  useEffect(() => {
    const storedSlug = sessionStorage.getItem("joinCommunitySlug");
    if (storedSlug === communitySlug && clerkId) {
      sessionStorage.removeItem("joinCommunitySlug");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowOnboarding(true);
    }
  }, [communitySlug, clerkId]);

  // Handle Edit Community button click
  const handleEditClick = () => {
    setShowCreateModal(true);
  };

  // Handle video URL change
  const handleVideoChange = async (url: string) => {
    if (!communityData?._id) return;
    
    try {
      await updateCommunity({
        communityId: communityData._id,
        videoUrl: url,
      });
    } catch (error) {
      console.error("Failed to update video URL:", error);
    }
  };

  // Loading state (while community loads)
  if (communityData === undefined) {
    return (
      <div className="min-h-screen ">
        <div className="mx-auto max-w-[1200px] px-4 py-6 animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-start gap-4 mb-6">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-[22px] bg-bg-elevated" />
            <div className="flex-1 space-y-3">
              <div className="h-8 w-48 bg-bg-elevated rounded" />
              <div className="h-4 w-64 bg-bg-elevated rounded" />
              <div className="h-3 w-24 bg-bg-elevated rounded" />
            </div>
          </div>
          {/* Tabs skeleton */}
          <div className="h-12 bg-bg-elevated rounded-lg mb-6" />
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="aspect-video bg-bg-elevated rounded-lg" />
              <div className="h-32 bg-bg-elevated rounded-lg" />
            </div>
            <div className="h-64 bg-bg-elevated rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // 404 - Community not found
  if (communityData === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heading size="8" className="text-text-primary">404</Heading>
          <Text size="4" theme="secondary" className="mt-2">
            This community doesn&apos;t exist or has been removed.
          </Text>
        </div>
      </div>
    );
  }

  // Determine membership status (needed for AboutTab to show Join button or Edit button)
  const isMember = membership?.isMember ?? false;
  const isOwner = membership?.isOwner ?? false;
  const isAdmin = membership?.isAdmin ?? false;
  
  // Show tabs for everyone (members, owners, and non-members can all see the community)
  const showAllTabs = true;

  // Transform Convex data to match CommunityShell interface
  const communityShellData = {
    id: communityData._id,
    name: communityData.name,
    slug: communityData.slug,
    description: communityData.description,
    imageUrl: communityData.logoUrl,
    memberCount: communityData.memberCount,
    isVerified: false,
    platformTier: communityData.platformTier || "free",
  };

  return (
    <CommunityDataContext.Provider value={{ community: communityData as CommunityPageData }}>
      <CommunityShell 
        community={communityShellData}
        showTabs={showAllTabs}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isMember={isMember}
        isAuthenticated={!!clerkId}
        userCommunities={userCommunities.map(c => ({
          id: c._id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          imageUrl: c.logoUrl,
          thumbnailUrl: c.logoUrl,
          memberCount: 0, // Will be fetched separately if needed
          isVerified: false,
        }))}
        aboutTabProps={{
          isMember,
          onJoinClick: handleJoinClick,
          onEditClick: handleEditClick,
          onVideoChange: handleVideoChange,
          communityData: communityData,
        }}
        onCreateCommunity={() => setShowCreateModal(true)}
        onExploreCommunities={() => window.location.href = "/explore"}
      />

      {/* Edit Community Modal */}
      <CreateCommunityModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      {/* Onboarding Modal for joining */}
      {communityData && (
        <OnboardingModal
          community={{
            _id: communityData._id,
            name: communityData.name,
            slug: communityData.slug,
            pricingType: communityData.pricingType,
            priceDzd: communityData.priceDzd,
          }}
          open={showOnboarding}
          onOpenChange={setShowOnboarding}
        />
      )}
    </CommunityDataContext.Provider>
  );
}
