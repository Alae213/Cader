"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/../convex/_generated/api";
import { CommunityShell } from "@/components/layout/CommunityShell";
import { CreateCommunityModal } from "@/components/community/CreateCommunityModal";
import { OnboardingModal } from "@/components/community/OnboardingModal";
import { Heading, Text } from "@/components/ui/Text";

export default function CommunityPage() {
  const params = useParams();
  const { userId: clerkId } = useAuth();
  const communitySlug = params.communitySlug as string;

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Fetch community from Convex
  const community = useQuery(api.functions.getBySlug, { slug: communitySlug });

  // Fetch membership status (only if logged in)
  const membership = useQuery(
    api.functions.getMembershipBySlug,
    clerkId ? { slug: communitySlug, clerkId } : "skip"
  );

  // Mutation to update community video URL
  const updateCommunity = useMutation(api.functions.updateCommunity);

  // Handle Join button click
  const handleJoinClick = () => {
    if (!clerkId) {
      // Store intent in session storage for after auth
      sessionStorage.setItem("joinCommunitySlug", communitySlug);
      // Trigger Clerk sign in - the user will be redirected back
      // After sign in, we'll check for the stored slug and show onboarding
      window.location.href = "/sign-in";
      return;
    }
    // User is logged in - show onboarding modal
    setShowOnboarding(true);
  };

  // Check for stored join intent on mount (after auth redirect)
  useState(() => {
    const storedSlug = sessionStorage.getItem("joinCommunitySlug");
    if (storedSlug === communitySlug && clerkId) {
      sessionStorage.removeItem("joinCommunitySlug");
      setShowOnboarding(true);
    }
  });

  // Handle Edit Community button click
  const handleEditClick = () => {
    setShowCreateModal(true);
  };

  // Handle video URL change
  const handleVideoChange = async (url: string) => {
    if (!community?._id) return;
    
    try {
      await updateCommunity({
        communityId: community._id,
        videoUrl: url,
      });
    } catch (error) {
      console.error("Failed to update video URL:", error);
    }
  };

  // Loading state (while community loads)
  if (community === undefined) {
    return (
      <div className="min-h-screen bg-bg-canvas">
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
  if (community === null) {
    return (
      <div className="min-h-screen bg-bg-canvas flex items-center justify-center">
        <div className="text-center">
          <Heading size="8" className="text-text-primary">404</Heading>
          <Text size="4" theme="secondary" className="mt-2">
            This community doesn't exist or has been removed.
          </Text>
        </div>
      </div>
    );
  }

  // Determine membership status
  const isMember = membership?.isMember ?? false;
  const isOwner = membership?.isOwner ?? false;
  const showAllTabs = isMember || isOwner;

  // Transform Convex data to match CommunityShell interface
  const communityData = {
    id: community._id,
    name: community.name,
    slug: community.slug,
    description: community.description,
    imageUrl: community.logoUrl,
    memberCount: community.memberCount,
    isVerified: false,
  };

  return (
    <>
      <CommunityShell 
        community={communityData}
        showTabs={showAllTabs}
        isOwner={isOwner}
        aboutTabProps={{
          isMember,
          onJoinClick: handleJoinClick,
          onEditClick: handleEditClick,
          onVideoChange: handleVideoChange,
          communityData: community,
        }}
      />

      {/* Edit Community Modal */}
      <CreateCommunityModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      {/* Onboarding Modal for joining */}
      {community && (
        <OnboardingModal
          community={{
            _id: community._id,
            name: community.name,
            slug: community.slug,
            pricingType: community.pricingType,
            priceDzd: community.priceDzd,
          }}
          open={showOnboarding}
          onOpenChange={setShowOnboarding}
        />
      )}
    </>
  );
}