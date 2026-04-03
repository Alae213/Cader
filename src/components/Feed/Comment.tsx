"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/shared/Avatar";
import { LevelBadge } from "./LevelBadge";
import { CommentInput } from "./CommentInput";
import { parseContentWithMentions } from "@/lib/mentions";
import { 
  Heart, 
  MoreHorizontal, 
  Trash2,
  Reply,
  Loader2,
} from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { MenuItem } from "@/components/ui/menu-item";

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
  onReplySubmit?: () => void;
  onReplyCancel?: () => void;
  replyToCommentId?: string | null;
  postId?: string;
  onCommentDeleted?: () => void;
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
  onReply,
  onReplySubmit,
  onReplyCancel,
  replyToCommentId,
  postId = "",
  onCommentDeleted,
}: CommentProps) {
  const { userId } = useAuth();
  
  // Combine owner + admin as "moderator" - same features
  const isModerator = isOwner || isAdmin;
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpvoteLoading, setIsUpvoteLoading] = useState(false);
  const [localUpvoteCount, setLocalUpvoteCount] = useState(comment.upvoteCount ?? 0);
  const [hasUpvoted, setHasUpvoted] = useState(comment.hasUpvoted ?? false);

  const toggleCommentUpvote = useMutation(api.functions.feed.toggleCommentUpvote);
  const deleteComment = useMutation(api.functions.feed.deleteComment);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Optimistic delete state - use React state instead of DOM
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Get author's level
  const authorLevel = useQuery(
    api.functions.leaderboard.getUserLevel,
    communityId && comment.authorId 
      ? { communityId: communityId as Id<"communities">, userId: comment.authorId as Id<"users"> }
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

    // Prevent multiple clicks while loading
    if (isUpvoteLoading) return;

    // Optimistic update: immediately update UI before server responds
    const wasUpvoted = hasUpvoted;
    const previousCount = localUpvoteCount;
    
    setHasUpvoted(!wasUpvoted);
    setLocalUpvoteCount(wasUpvoted ? previousCount - 1 : previousCount + 1);
    setIsUpvoteLoading(true);

    // Fire mutation without awaiting for instant feel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toggleCommentUpvote({ commentId: comment._id as any })
      .then((result) => {
        // Server confirmed - sync with actual server state
        setLocalUpvoteCount(result.newCount);
        setHasUpvoted(result.upvoted);
      })
      .catch((error) => {
        // Server rejected - revert optimistic changes
        setHasUpvoted(wasUpvoted);
        setLocalUpvoteCount(previousCount);
        toast.error(error instanceof Error ? error.message : "Failed to upvote");
      })
      .finally(() => {
        setIsUpvoteLoading(false);
      });
  };

  const handleDelete = async () => {
    if (!userId) {
      toast.error("You must be signed in");
      return;
    }

    // Optimistic update - hide immediately via React state
    setIsDeleting(true);
    setIsDeleted(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deleteComment({ commentId: comment._id as any })
        .then(() => {
          toast.success("Comment deleted");
          setShowMenu(false);
        })
        .catch((error) => {
          // Revert visibility on error
          setIsDeleting(false);
          setIsDeleted(false);
          toast.error(error instanceof Error ? error.message : "Failed to delete comment");
        });
    } catch (error) {
      // Revert on error
      setIsDeleting(false);
      setIsDeleted(false);
      toast.error(error instanceof Error ? error.message : "Failed to delete comment");
    }
  };

  const handleDeleteCancel = () => {
    // No longer needed - hard delete
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  // Handle keyboard navigation for menu
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowMenu(false);
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

  // Don't render if deleted
  if (isDeleted) {
    return null;
  }

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
          <div className="mt-1 max-w-[65ch]">
            <Text size="sm" className="whitespace-pre-wrap break-words">
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
              disabled={isUpvoteLoading}
              aria-label={hasUpvoted ? "Remove like" : "Like comment"}
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200
                ${hasUpvoted 
                  ? "text-red-500 bg-red-500/10" 
                  : "hover:bg-red-500/10 hover:text-red-500 text-text-secondary cursor-pointer"
                }
                ${isUpvoteLoading ? "opacity-50 cursor-wait" : "cursor-pointer"}
              `}
            >
              {isUpvoteLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Heart className={`w-3.5 h-3.5 ${hasUpvoted ? "fill-current" : ""}`} />
              )}
              <Text size="1" fontWeight="medium" className="tabular-nums">
                {Number.isFinite(localUpvoteCount) ? localUpvoteCount : 0}
              </Text>
            </button>

            {/* Reply */}
            {canReply && (
              <button
                onClick={() => onReply?.(comment._id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent/10 hover:text-accent text-text-secondary transition-all duration-200 cursor-pointer"
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setShowMenu(!showMenu);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowMenu(false), 200)}
                  aria-expanded={showMenu}
                  aria-haspopup="menu"
                  aria-label="Comment options"
                  role="button"
                  tabIndex={0}
                  className="p-1 rounded-md hover:bg-bg-muted transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                
                {showMenu && (
                  <Dropdown 
                    className="absolute left-0 top-full mt-1 bg-bg-elevated rounded-lg py-1 min-w-[120px] z-10 shadow-lg border border-[var(--border)] !w-auto !max-w-none !backdrop-blur-none"
                    checkedIndex={-1}
                  >
                    <MenuItem
                      icon={Trash2}
                      label="Delete"
                      index={0}
                      destructive
                      onSelect={handleDelete}
                    />
                  </Dropdown>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reply input - shown inline below this comment, BEFORE nested replies */}
      {replyToCommentId === comment._id && postId && (
        <div className="mt-3 pl-4 border-l-2 border-accent/30">
          <div className="text-xs text-accent mb-2 font-medium">Replying to @{comment.author?.username || comment.author?.displayName || 'user'}</div>
          <CommentInput
            postId={postId}
            parentCommentId={comment._id}
            communityId={communityId}
            onSubmit={onReplySubmit}
            onCancel={onReplyCancel}
            placeholder="Write a reply..."
            autoFocus
          />
        </div>
      )}

      {/* Nested replies (level 2) */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-8 mt-3 space-y-3 md:pl-4 border-l-2 border-white/30">
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
              onReplySubmit={onReplySubmit}
              onReplyCancel={onReplyCancel}
              replyToCommentId={replyToCommentId}
              postId={postId}
              onCommentDeleted={onCommentDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
