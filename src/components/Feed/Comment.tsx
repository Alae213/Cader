"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/shared/Avatar";
import { LevelBadge } from "./LevelBadge";
import { parseContentWithMentions } from "@/lib/mentions";
import { 
  ThumbsUp, 
  MoreHorizontal, 
  Trash2,
  Reply,
} from "lucide-react";

interface CommentAuthor {
  _id: string;
  displayName: string;
  avatarUrl?: string;
  username?: string;
}

export interface CommentData {
  _id: string;
  postId: string;
  authorId: string;
  parentCommentId?: string;
  content: string;
  mentions?: string[];
  mediaUrls?: string[];
  upvoteCount?: number;
  createdAt: number;
  author: CommentAuthor | null;
  hasUpvoted?: boolean;
  authorIsOwner?: boolean;
  authorIsAdmin?: boolean;
  replies?: CommentData[];
}

interface CommentProps {
  comment: CommentData;
  postAuthorId: string;
  communityId: string;
  currentUserId?: string | null;
  isAdmin?: boolean;
  isOwner?: boolean;
  depth?: number;
  maxDepth?: number;
  onReply?: (commentId: string) => void;
}

export function Comment({ 
  comment, 
  postAuthorId, 
  communityId,
  currentUserId, 
  isAdmin = false,
  isOwner = false,
  depth = 0,
  maxDepth = 2,
  onReply 
}: CommentProps) {
  const { userId } = useAuth();
  
  // Combine owner + admin as "moderator" - same features
  const isModerator = isOwner || isAdmin;
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localUpvoteCount, setLocalUpvoteCount] = useState(comment.upvoteCount ?? 0);
  const [hasUpvoted, setHasUpvoted] = useState(comment.hasUpvoted ?? false);

  const toggleCommentUpvote = useMutation(api.functions.feed.toggleCommentUpvote);
  const deleteComment = useMutation(api.functions.feed.deleteComment);

  // Get author's level
  const authorLevel = useQuery(
    api.functions.leaderboard.getUserLevel,
     
    communityId && comment.authorId 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? { communityId: communityId as any, userId: comment.authorId as any }
      : "skip"
  );

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  // Render content with clickable @mentions
  const renderContentWithMentions = (content: string) => {
    const parts = parseContentWithMentions(content);
    
    return parts.map((part, index) => {
      if (part.type === 'mention') {
        return (
          <span
            key={index}
            className="text-blue-400 hover:underline cursor-pointer font-medium"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Navigate to user profile
            }}
          >
            @{part.value}
          </span>
        );
      }
      return <span key={index}>{part.value}</span>;
    });
  };

  const handleUpvote = async () => {
    if (!userId) {
      toast.error("You must be signed in to upvote");
      return;
    }

    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await toggleCommentUpvote({ commentId: comment._id as any });
      setLocalUpvoteCount(result.newCount);
      setHasUpvoted(result.upvoted);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upvote");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) {
      toast.error("You must be signed in");
      return;
    }

    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await deleteComment({ commentId: comment._id as any });
      toast.success("Comment deleted");
      setShowMenu(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete comment");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user can delete this comment
  const canDelete = userId && (
    comment.authorId === currentUserId || // comment author
    postAuthorId === currentUserId || // post author
    isModerator // admin/owner
  );

  // Check if user can reply (not at max depth)
  const canReply = depth < maxDepth - 1;

  // Is this comment's author the post author?
  const isPostAuthor = comment.authorId === postAuthorId;

  return (
    <div className="group">
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar
          src={comment.author?.avatarUrl}
          name={comment.author?.displayName || "User"}
          size="sm"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Text size="sm" fontWeight="semibold">
              {comment.author?.displayName || "User"}
            </Text>
            
            {/* Level badge */}
            {authorLevel && authorLevel > 1 && (
              <LevelBadge level={authorLevel} />
            )}
            
            {/* @username if available */}
            {comment.author?.username && (
              <Text size="sm" theme="muted">
                @{comment.author.username}
              </Text>
            )}

            {/* Post author badge */}
            {isPostAuthor && (
              <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-xs font-medium">
                OP
              </span>
            )}

            {/* Moderator badge (Owner or Admin) - show for comment author if they are owner/admin */}
            {(comment.authorIsOwner || comment.authorIsAdmin) && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-medium">
                Admin
              </span>
            )}

            <Text size="sm" theme="muted">·</Text>
            <Text size="sm" theme="muted">{formatTimeAgo(comment.createdAt)}</Text>
          </div>

          {/* Comment content */}
          <div className="mt-1">
            <Text size="sm" className="whitespace-pre-wrap">
              {renderContentWithMentions(comment.content)}
            </Text>
          </div>

          {/* Media attachments */}
          {comment.mediaUrls && comment.mediaUrls.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {comment.mediaUrls.map((url, i) => (
                <Image 
                  key={i}
                  src={url}
                  alt=""
                  width={200}
                  height={160}
                  className="rounded-lg max-h-40 object-cover"
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 mt-2">
            {/* Upvote */}
            <button
              onClick={handleUpvote}
              disabled={isLoading}
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors
                ${hasUpvoted 
                  ? "text-accent bg-accent/10" 
                  : "hover:bg-bg-muted text-text-secondary"
                }
              `}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? "fill-current" : ""}`} />
              <Text size="1" fontWeight="medium" className="tabular-nums">
                {Number.isFinite(localUpvoteCount) ? localUpvoteCount : 0}
              </Text>
            </button>

            {/* Reply */}
            {canReply && (
              <button
                onClick={() => onReply?.(comment._id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-bg-muted text-text-secondary transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                <Text size="1" fontWeight="medium">Reply</Text>
              </button>
            )}

            {/* Delete menu */}
            {canDelete && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded-md hover:bg-bg-muted transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                
                {showMenu && (
                  <div className="absolute left-0 top-full mt-1 bg-bg-elevated rounded-lg py-1 min-w-[120px] z-10">
                    <button 
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                      <Text size="sm">Delete</Text>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies (level 2) */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-8 mt-3 space-y-3 md:pl-4">
          {comment.replies.map((reply) => (
            <Comment
              key={reply._id}
              comment={reply}
              postAuthorId={postAuthorId}
              communityId={communityId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              depth={depth + 1}
              maxDepth={maxDepth}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
