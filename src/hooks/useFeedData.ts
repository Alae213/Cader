"use client";

import { useState, useMemo, useCallback } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCommunityData } from "@/contexts/CommunityDataContext";

type SortOption = "newest" | "most_liked" | "most_commented";

export interface Post {
  _id: string;
  communityId: string;
  authorId: string;
  author?: {
    _id: string;
    displayName: string;
    avatarUrl?: string | null;
  } | null;
  categoryId?: string;
  category?: {
    _id: string;
    name: string;
  } | null;
  content: string;
  contentType: "text" | "image" | "video";
  mediaUrls?: string[];
  videoUrl?: string;
  isPinned: boolean;
  upvoteCount: number;
  commentCount: number;
  createdAt: number;
}

export function useFeedData(communityId: string) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<SortOption>("newest");
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const communityIdTyped = communityId as Id<"communities">;

  // Always call hooks unconditionally - handle conditional logic after
  const contextData = useCommunityData();
  const contextCommunityData = contextData?.community;

  // Always call useQuery - pass "skip" when context has data to avoid duplicate fetching
  const communityDataQuery = useQuery(
    api.functions.communities.getById,
    contextCommunityData ? "skip" : { communityId: communityIdTyped }
  );

  // Always call useQuery for stats - skip when context has data
  const communityStatsQuery = useQuery(
    api.functions.communities.getCommunityStats,
    contextCommunityData ? "skip" : { communityId: communityIdTyped }
  );

  // Use context data if available, otherwise use query results
  const communityData = contextCommunityData || communityDataQuery;
  const communityStats = contextCommunityData ? {
    memberCount: contextCommunityData.memberCount,
    onlineCount: contextCommunityData.onlineCount,
    streak: contextCommunityData.streak,
  } : communityStatsQuery;

  const { results: allPosts, status, loadMore: loadMoreConvex } = usePaginatedQuery(
    api.functions.feed.listPosts,
    {
      communityId: communityIdTyped,
      categoryId: selectedCategoryId ? selectedCategoryId as Id<"categories"> : undefined,
      sortBy: selectedSort,
    },
    { initialNumItems: 20 }
  );

  const hasMore = status === "CanLoadMore";

  const loadMore = useCallback(() => {
    if (status === "CanLoadMore" && !isLoadingMore) {
      setIsLoadingMore(true);
      loadMoreConvex(20);
    }
  }, [status, isLoadingMore, loadMoreConvex]);

  const categories = useQuery(
    api.functions.categories.listCategories,
    { communityId: communityIdTyped }
  ) || [];

  const membership = useQuery(
    api.functions.memberships.getMyMembership,
    { communityId: communityIdTyped }
  );

  const isOwner = useMemo(() => {
    return membership?.isOwner ?? false;
  }, [membership?.isOwner]);

  const isAdmin = useMemo(() => {
    return membership?.isAdmin ?? false;
  }, [membership?.isAdmin]);

  const isMember = useMemo(() => {
    return membership?.isMember ?? false;
  }, [membership?.isMember]);

  return {
    allPosts,
    status,
    loadMore,
    hasMore,
    isLoadingMore,
    categories,
    communityData,
    communityStats,
    membership,
    isOwner,
    isAdmin,
    isMember,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedSort,
    setSelectedSort,
  };
}
