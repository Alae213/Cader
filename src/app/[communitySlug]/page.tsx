"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/../convex/_generated/api";
import { CommunityShell } from "@/components/layout/CommunityShell";
import { TabNav } from "@/components/layout/TabNav";
import { Heading, Text } from "@/components/ui/Text";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const STORAGE_KEY_PREFIX = "cader_tab_";

export default function CommunityPage() {
  const params = useParams();
  const router = useRouter();
  const { userId: clerkId } = useAuth();
  const communitySlug = params.communitySlug as string;

  // Fetch community from Convex
  const community = useQuery(api.functions.getBySlug, { slug: communitySlug });

  // Fetch membership status (only if logged in)
  const membership = useQuery(
    api.functions.getMembershipBySlug,
    clerkId ? { slug: communitySlug, clerkId } : "skip"
  );

  // Check if user has a stored tab preference
  useEffect(() => {
    if (!communitySlug || !clerkId || !membership) return;
    
    // Only redirect if user is a member (not for About page visitors)
    if (!membership.isMember && !membership.isOwner) return;

    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${communitySlug}`;
      const storedTab = localStorage.getItem(storageKey);
      
      // Valid tabs for redirect
      const validTabs = membership.isOwner 
        ? ["feed", "members", "classrooms", "leaderboard", "analysis"]
        : ["feed", "members", "classrooms", "leaderboard"];

      // If stored tab is valid and different from default, redirect
      if (storedTab && validTabs.includes(storedTab)) {
        router.replace(`/${communitySlug}/${storedTab}`);
      }
    } catch {
      // localStorage not available, stay on About
    }
  }, [communitySlug, clerkId, membership, router]);

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
          <div className="space-y-4">
            <div className="h-32 bg-bg-elevated rounded-lg" />
            <div className="h-32 bg-bg-elevated rounded-lg" />
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
    isVerified: false, // TODO: Add verified field to schema if needed
  };

  return (
    <CommunityShell 
      community={communityData}
      showTabs={showAllTabs}
      isOwner={isOwner}
    >
      {/* About Tab Content - shown on /[communitySlug] route */}
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <span className="font-medium text-white">AH</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Text size="2" theme="secondary">Ahmed Hassan</Text>
                  <Text size="1" theme="muted">· 2 hours ago</Text>
                </div>
                <Text size="3" className="mt-1">
                  Just launched a new course on React Native! 🚀 
                  Building mobile apps has never been easier. 
                  Check it out and let me know what you think!
                </Text>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary">React Native</Badge>
                  <Badge variant="accent">Course</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-success flex items-center justify-center">
                <span className="font-medium text-white">SA</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Text size="2" theme="secondary">Sara Amrani</Text>
                  <Text size="1" theme="muted">· 5 hours ago</Text>
                </div>
                <Text size="3" className="mt-1">
                  📢 New session this Friday! We'll be covering 
                  TypeScript best practices and how to improve your 
                  code quality. Don't miss it!
                </Text>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="warning">Live Session</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-chargily flex items-center justify-center">
                <span className="font-medium text-white">OM</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Text size="2" theme="secondary">Omar Bouali</Text>
                  <Text size="1" theme="muted">· Yesterday</Text>
                </div>
                <Text size="3" className="mt-1">
                  Just hit 1000 points on the leaderboard! 🎉 
                  Thanks to everyone who's been supporting my learning journey.
                  Never stop coding! 💻
                </Text>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="success">Achievement</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CommunityShell>
  );
}
