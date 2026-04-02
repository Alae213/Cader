"use client";

import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
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
  isOwner?: boolean;
  hideInput?: boolean;
}

export function CommentsSection({
  postId,
  postAuthorId,
  communityId,
  currentUserId,
  isAdmin = false,
  isOwner = false,
  hideInput = false,
}: CommentsSectionProps) {
  const [replyToCommentId, setReplyToCommentId] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<"top" | "newest">("top");

  // Fetch comments with native Convex pagination (Fix #2)
  const { results, status, loadMore } = usePaginatedQuery(
    api.functions.feed.listComments,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postId: postId as any,
      sortBy,
    },
    { initialNumItems: 5 }
  );

  // Derive comments from results
  const comments = (results as CommentData[] | undefined) || [];
  const hasMore = status === "CanLoadMore";

  const handleLoadMore = () => {
    if (hasMore) {
      loadMore(5);
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

  return (
    <div className="mt-4 pt-4 border-t border-border">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <Text fontWeight="semibold">
          Comments
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
      {!hideInput && (
        <div className="mb-4">
          <CommentInput
            postId={postId}
            communityId={communityId}
            onSubmit={handleReplySubmit}
          />
        </div>
      )}

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
            isOwner={isOwner}
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
          >
            Load more comments
          </Button>
        </div>
      )}

      {/* Empty state - only show after loading completes */}
      {results !== undefined && comments.length === 0 && (
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
