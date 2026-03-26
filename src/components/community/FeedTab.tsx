"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PostComposer } from "./PostComposer";
import { PostCard } from "./PostCard";
import { OpenPostModal } from "./OpenPostModal";
import { Users, Zap } from "lucide-react";

interface FeedTabProps {
  communityId: string;
}

// Shared Post type that matches Convex query return
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
    color: string;
  } | null;
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

export function FeedTab({ communityId }: FeedTabProps) {
  const { userId } = useAuth();
  const [showComposer, setShowComposer] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Fetch posts
  const posts = useQuery(api.functions.feed.listPosts, { communityId: communityId as any }) || [];
  
  // Fetch categories (placeholder for now)
  const categories: { _id: string; name: string; color: string }[] = [];

  // Fetch community stats for sidebar
  const communityStats = useQuery(api.functions.communities.getCommunityStats, { communityId: communityId as any });

  if (!posts) {
    return (
      <div className="flex gap-6">
        {/* Main feed skeleton */}
        <div className="flex-1 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        {/* Sidebar skeleton */}
        <div className="w-80 space-y-4">
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Feed Column */}
      <div className="flex-1">
        {/* Post Composer Trigger */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <button
              onClick={() => setShowComposer(true)}
              className="w-full text-left px-4 py-3 rounded-lg bg-bg-elevated hover:bg-bg-muted transition-colors"
            >
              <Text theme="muted">What's on your mind?</Text>
            </button>
          </CardContent>
        </Card>

        {/* Feed */}
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heading size="h4" className="mb-2">No posts yet</Heading>
              <Text theme="muted">Be the first to post in this community!</Text>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post: Post) => (
              <PostCard
                key={post._id}
                post={post}
                onClick={() => setSelectedPost(post)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Column */}
      <div className="w-80 shrink-0">
        <Card>
          <CardContent className="p-4 space-y-4">
            <Heading size="h4">Community Info</Heading>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Text size="2" theme="muted">Members</Text>
                <Text fontWeight="semibold">{communityStats?.memberCount || 0}</Text>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <Text size="2" theme="muted">Online Now</Text>
                <Text fontWeight="semibold">{communityStats?.onlineCount || 0}</Text>
              </div>
            </div>

            {communityStats?.streak && communityStats.streak > 0 && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <Text size="2" theme="muted">Day Streak</Text>
                  <Text fontWeight="semibold">{communityStats.streak} days</Text>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Post Composer Modal */}
      <PostComposer
        communityId={communityId}
        categories={categories}
        open={showComposer}
        onOpenChange={setShowComposer}
      />

      {/* Open Post Modal */}
      <OpenPostModal
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      />
    </div>
  );
}