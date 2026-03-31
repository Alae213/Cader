"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Comment, CommentData } from "./Comment";
import { CommentInput } from "./CommentInput";

interface CommentsSectionProps {
  postId: string;
  postAuthorId: string;
  communityId: string;
  currentUserId?: string | null;
  isAdmin?: boolean;
}

const COMMENTS_LIMIT = 5;

export function CommentsSection({
  postId,
  postAuthorId,
  communityId,
  currentUserId,
  isAdmin = false,
}: CommentsSectionProps) {
  const [replyToCommentId, setReplyToCommentId] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<"top" | "newest">("top");
  const [comments, setComments] = useState<CommentData[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use a ref to track the current cursor for the query
  const cursorRef = useRef<string | undefined>(undefined);
  // Use state to trigger refetches
  const [fetchKey, setFetchKey] = useState(0);

  // Fetch comments - refetch when fetchKey changes (which happens on load more or sort change)
  const results = useQuery(
    api.functions.feed.listComments,
    { 
      postId: postId as any,
      sortBy,
      limit: COMMENTS_LIMIT,
      cursor: cursorRef.current
    }
  );

  // Handle new results
  useEffect(() => {
    if (!results?.comments) return;

    if (cursorRef.current) {
      // Loading more - append new comments
      setComments(prev => {
        const existingIds = new Set(prev.map(c => c._id));
        const newComments = (results.comments as CommentData[]).filter(
          c => !existingIds.has(c._id)
        );
        return [...prev, ...newComments];
      });
    } else {
      // Initial load - replace comments
      setComments(results.comments as CommentData[]);
    }
    setHasMore(!!results.nextCursor);
  }, [results]);

  // Update cursor ref and trigger refetch when sort changes
  useEffect(() => {
    cursorRef.current = undefined;
    setFetchKey(k => k + 1);
    setComments([]);
    setHasMore(false);
  }, [sortBy]);

  const handleLoadMore = () => {
    if (results?.nextCursor && !cursorRef.current) {
      cursorRef.current = results.nextCursor;
      setFetchKey(k => k + 1);
    }
  };

  const handleReply = (commentId: string) => {
    setReplyToCommentId(commentId);
  };

  const handleReplySubmit = () => {
    setReplyToCommentId(undefined);
  };

  const handleReplyCancel = () => {
    setReplyToCommentId(undefined);
  };

  const totalCount = results?.totalCount || 0;

  return (
    <div className="mt-4 pt-4 border-t border-border">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <Text fontWeight="semibold">
          Comments ({totalCount})
        </Text>
        
        {/* Sort options */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy("top")}
            className={`px-2 py-1 rounded-md text-xs transition-colors ${
              sortBy === "top" 
                ? "bg-accent/10 text-accent" 
                : "hover:bg-bg-muted text-text-secondary"
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setSortBy("newest")}
            className={`px-2 py-1 rounded-md text-xs transition-colors ${
              sortBy === "newest" 
                ? "bg-accent/10 text-accent" 
                : "hover:bg-bg-muted text-text-secondary"
            }`}
          >
            Newest
          </button>
        </div>
      </div>

      {/* Main comment input */}
      <div className="mb-4">
        <CommentInput
          postId={postId}
          communityId={communityId}
          onSubmit={handleReplySubmit}
        />
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <Comment
            key={comment._id}
            comment={comment}
            postAuthorId={postAuthorId}
            communityId={communityId}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onReply={handleReply}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="mt-4 text-center">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            Load more comments
          </Button>
        </div>
      )}

      {/* Empty state */}
      {comments.length === 0 && (
        <div className="py-8 text-center">
          <Text theme="muted" size="sm">
            No comments yet
          </Text>
        </div>
      )}

      {/* Reply input (shown when replying) */}
      {replyToCommentId && (
        <div className="mt-4 pl-8 md:pl-4">
          <CommentInput
            postId={postId}
            parentCommentId={replyToCommentId}
            communityId={communityId}
            onSubmit={handleReplySubmit}
            onCancel={handleReplyCancel}
            placeholder="Write a reply..."
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
