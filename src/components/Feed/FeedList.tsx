"use client";

import { useMemo } from "react";
import { PostCard } from "./PostCard";
import { Button } from "@/components/ui/Button";
import { Heading, Text } from "@/components/ui/Text";

export interface Post {
  _id: string;
  communityId: string;
  authorId: string;
  author?: { _id: string; displayName: string; avatarUrl?: string | null } | null;
  categoryId?: string;
  category?: { _id: string; name: string; color: string } | null;
  content: string;
  contentType: "text" | "image" | "video" | "gif" | "poll";
  mediaUrls?: string[];
  videoUrl?: string;
  pollOptions?: { text: string; votes: number }[];
  pollEndDate?: number;
  isPinned: boolean;
  upvoteCount: number;
  commentCount: number;
  createdAt: number;
}

interface FeedListProps {
  posts: Post[];
  communityId: string;
  userId: string | null | undefined;
  isAdmin: boolean;
  isOwner: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onAuthorClick: (clerkId: string) => void;
}

export function FeedList({
  posts,
  communityId,
  userId,
  isAdmin,
  isOwner,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onAuthorClick,
}: FeedListProps) {
  const pinnedPosts = useMemo(() => posts.filter((post) => post.isPinned), [posts]);
  const regularPosts = useMemo(() => posts.filter((post) => !post.isPinned), [posts]);

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl p-12 text-center bg-bg-elevated">
        <Heading size="h4" className="mb-2">
          No posts yet
        </Heading>
        <Text theme="muted">Be the first to post in this community!</Text>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pinnedPosts.length > 0 && (
        <>
          {pinnedPosts.map((post) => (
            <PostCard
              key={post._id}
              post={{ ...post, communityId }}
              communityId={communityId}
              currentUserId={userId}
              isAdmin={isAdmin}
              isOwner={isOwner}
              onAuthorClick={onAuthorClick}
            />
          ))}
          {regularPosts.length > 0 && <div className="h-px bg-border" />}
        </>
      )}

      {regularPosts.map((post) => (
        <PostCard
          key={post._id}
          post={{ ...post, communityId }}
          communityId={communityId}
          currentUserId={userId}
          isAdmin={isAdmin}
          isOwner={isOwner}
          onAuthorClick={onAuthorClick}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            variant="secondary"
            size="sm"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
