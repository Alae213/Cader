"use client";

import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Comment, CommentData } from "./Comment";
import { CommentInput } from "./CommentInput";

// Configurable pagination constants
const INITIAL_COMMENTS = 5;
const LOAD_MORE_COUNT = 5;

interface CommentsSectionProps {
  postId: string;
  postAuthorId: string;
  communityId: string;
  currentUserId?: string | null;
  isAdmin?: boolean;
  isOwner?: boolean;
  hideInput?: boolean;
  initialLoad?: number;
  loadMoreCount?: number;
  replyingToCommentId?: string | null;
  onCommentDeleted?: () => void;
}

export function CommentsSection({
  postId,
  postAuthorId,
  communityId,
  currentUserId,
  isAdmin = false,
  isOwner = false,
  hideInput = false,
  initialLoad = INITIAL_COMMENTS,
  loadMoreCount = LOAD_MORE_COUNT,
  replyingToCommentId: externalReplyId,
  onCommentDeleted,
}: CommentsSectionProps) {
  const [internalReplyId, setInternalReplyId] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<"top" | "newest">("top");

  // Use either internal state or external prop
  const replyToCommentId = externalReplyId ?? internalReplyId;

  const validatedPostId = postId as Id<"posts">;
  const validatedCommunityId = communityId as Id<"communities">;

  // Fetch comments with native Convex pagination
  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.functions.feed.listComments,
    {
      postId: validatedPostId,
      sortBy,
    },
    { initialNumItems: initialLoad }
  );

  // Derive comments from results
  const comments = (results as CommentData[] | undefined) || [];
  const hasMore = status === "CanLoadMore";

  const handleLoadMore = () => {
    if (hasMore) {
      loadMore(loadMoreCount);
    }
  };

  const handleReply = (commentId: string) => {
    setInternalReplyId(commentId);
  };

  const handleReplySubmit = () => {
    setInternalReplyId(undefined);
  };

  const handleReplyCancel = () => {
    setInternalReplyId(undefined);
  };

  return (
    <div className="mt-4 ">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <Text fontWeight="semibold">
          Comments
        </Text>
        
        {/* Sort options */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy("top")}
            role="radio"
            aria-checked={sortBy === "top"}
            aria-label="Sort by top comments"
            tabIndex={0}
            className={`cursor-pointer px-2 py-1 rounded-md text-xs transition-colors ${
              sortBy === "top" 
                ? "bg-accent/10 text-accent" 
                : "hover:bg-bg-muted text-text-secondary"
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setSortBy("newest")}
            role="radio"
            aria-checked={sortBy === "newest"}
            aria-label="Sort by newest comments"
            tabIndex={0}
            className={`cursor-pointer px-2 py-1 rounded-md text-xs transition-colors ${
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
            communityId={validatedCommunityId}
            onSubmit={handleReplySubmit}
          />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-8 text-center">
          <Text size="sm" theme="muted">Loading comments...</Text>
        </div>
      )}

      {/* Comments list */}
      {!isLoading && (
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
              onReplySubmit={handleReplySubmit}
              onReplyCancel={handleReplyCancel}
              replyToCommentId={replyToCommentId}
              postId={postId}
              onCommentDeleted={onCommentDeleted}
            />
          ))}
        </div>
      )}

      {/* Load more button */}
      {hasMore && !isLoading && (
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
      {!isLoading && results !== undefined && comments.length === 0 && (
        <div className="py-8 text-center">
          <Text theme="muted" size="sm">
            No comments yet
          </Text>
        </div>
      )}
    </div>
  );
}
