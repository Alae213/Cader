"use client";

import { useState, useMemo, useCallback } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

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

  const communityData = useQuery(
    api.functions.communities.getById,
    { communityId: communityIdTyped }
  );

  const communityStats = useQuery(
    api.functions.communities.getCommunityStats,
    { communityId: communityIdTyped }
  );

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
