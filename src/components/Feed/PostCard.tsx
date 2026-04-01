"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/shared/Avatar";
import { 
  ThumbsUp, 
  MessageCircle, 
  MoreHorizontal, 
  Pin,
  Trash2,
} from "lucide-react";
import { CommentsSection } from "./CommentsSection";
import { CommentInput } from "./CommentInput";
import { LevelBadge } from "./LevelBadge";
import { parseContentWithMentions } from "@/lib/mentions";

interface PostCardProps {
  post: {
    _id: string;
    communityId?: string;
    author?: {
      _id: string;
      clerkId?: string;
      displayName: string;
      avatarUrl?: string | null;
    } | null;
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
    authorId?: string;
  };
  communityId?: string;
  currentUserId?: string | null;
  isAdmin?: boolean;
  isOwner?: boolean;
  onClick?: () => void;
  onDeleted?: () => void;
  onCommentPosted?: () => void;
  onAuthorClick?: (clerkId: string) => void;
}

export function PostCard({ post, communityId, currentUserId, isAdmin = false, isOwner = false, onClick, onDeleted, onCommentPosted, onAuthorClick }: PostCardProps) {
  const { userId } = useAuth();
  
  // Combine owner + admin as "moderator" - same features for both
  const isModerator = isOwner || isAdmin;
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [isVotingPoll, setIsVotingPoll] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localUpvoteCount, setLocalUpvoteCount] = useState(post.upvoteCount ?? 0);
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount ?? 0);

  // Derive hasUpvoted from server data when available, fall back to local state
  const [hasUpvoted, setHasUpvoted] = useState(
    (post as any).userHasUpvoted ?? false
  );

  // Mutations
  const toggleUpvote = useMutation(api.functions.feed.toggleUpvote);
  const votePoll = useMutation(api.functions.feed.votePoll);
  const pinPost = useMutation(api.functions.feed.pinPost);
  const unpinPost = useMutation(api.functions.feed.unpinPost);

  // Get author's level
  const authorLevel = useQuery(
    api.functions.leaderboard.getUserLevel,
    communityId && post.authorId
      ? { communityId: communityId as any, userId: post.authorId as any }
      : "skip"
  );
  const deletePost = useMutation(api.functions.feed.deletePost);

  // Local state for poll — derive hasVoted from post data when available
  const [localPollOptions, setLocalPollOptions] = useState(post.pollOptions || []);
  const [hasVoted, setHasVoted] = useState(
    (post as any).pollVoterIds?.includes(userId ?? "") ?? false
  );

  // Sync local state when post prop changes (e.g. after refetch)
  useEffect(() => {
    setLocalUpvoteCount(post.upvoteCount ?? 0);
    setLocalCommentCount(post.commentCount ?? 0);
    setLocalPollOptions(post.pollOptions || []);
    if ((post as any).userHasUpvoted !== undefined) {
      setHasUpvoted((post as any).userHasUpvoted);
    }
    if ((post as any).pollVoterIds !== undefined) {
      setHasVoted((post as any).pollVoterIds?.includes(userId ?? "") ?? false);
    }
  }, [post._id, post.upvoteCount, post.commentCount, post.pollOptions]);

  // Close dropdown menu on outside click
  const menuRef = useRef<HTMLDivElement>(null);
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

  // Toggle comments on content click (Twitter/Reddit style)
  // If parent provides onClick, assume it handles navigation — don't toggle locally
  const handleContentClick = (e: React.MouseEvent) => {
    // Don't toggle if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    if (onClick) {
      // Parent handles navigation — don't toggle comments
      onClick();
    } else {
      // No parent handler — toggle comments locally
      setShowComments(prev => !prev);
    }
  };

  // Keyboard accessibility for content area
  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleContentClick(e as unknown as React.MouseEvent);
    }
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

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo`;
    return `${Math.floor(months / 12)}y`;
  };

  // Handle upvote
  const handleUpvote = async () => {
    if (!userId) {
      toast.error("You must be signed in to upvote");
      return;
    }

    setIsUpvoting(true);
    try {
      const result = await toggleUpvote({ postId: post._id as any });
      setLocalUpvoteCount(result.newCount);
      setHasUpvoted(result.upvoted);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upvote");
    } finally {
      setIsUpvoting(false);
    }
  };

  // Handle poll vote
  const handlePollVote = async (optionIndex: number) => {
    if (!userId) {
      toast.error("You must be signed in to vote");
      return;
    }

    if (hasVoted) {
      toast.error("You have already voted");
      return;
    }

    setIsVotingPoll(true);
    try {
      await votePoll({ postId: post._id as any, optionIndex });
      
      // Optimistic update — server returns { success: true } only
      // The useEffect sync will correct if server data differs
      const updatedOptions = localPollOptions.map((opt, i) => {
        if (i === optionIndex) {
          return { ...opt, votes: (opt.votes || 0) + 1 };
        }
        return opt;
      });
      setLocalPollOptions(updatedOptions);
      setHasVoted(true);
      toast.success("Vote recorded!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to vote");
      // Revert optimistic update on error
      setLocalPollOptions(post.pollOptions || []);
    } finally {
      setIsVotingPoll(false);
    }
  };

  // Handle pin/unpin
  const handleTogglePin = async () => {
    if (!userId) {
      toast.error("You must be signed in");
      return;
    }

    setIsPinning(true);
    try {
      if (post.isPinned) {
        await unpinPost({ postId: post._id as any });
        toast.success("Post unpinned");
      } else {
        await pinPost({ postId: post._id as any });
        toast.success("Post pinned");
      }
      setShowMenu(false);
      onDeleted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to pin post");
    } finally {
      setIsPinning(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!userId) {
      toast.error("You must be signed in");
      return;
    }

    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePost({ postId: post._id as any });
      toast.success("Post deleted");
      setShowMenu(false);
      onDeleted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const canModify = userId === post.authorId || isModerator;

  // Handle comment posted — update local count
  const handleCommentPosted = () => {
    setLocalCommentCount(prev => prev + 1);
    onCommentPosted?.();
  };

  // Calculate total votes for poll
  const totalPollVotes = localPollOptions.reduce((sum, opt) => sum + (opt.votes || 0), 0);

  // Check if poll is still active
  const isPollActive = !post.pollEndDate || post.pollEndDate > Date.now();

  return (
    <div 
      className={`
        group rounded-2xl p-5 transition-colors duration-200
        ${post.isPinned ? "bg-primary/5" : "bg-bg-elevated hover:bg-bg-muted/50"}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => post.author?.clerkId && onAuthorClick?.(post.author.clerkId)}
            className="cursor-pointer"
            type="button"
          >
            <Avatar
              src={post.author?.avatarUrl}
              name={post.author?.displayName || "User"}
              size="lg"
            />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <button
                onClick={() => post.author?.clerkId && onAuthorClick?.(post.author.clerkId)}
                className="cursor-pointer hover:underline"
                type="button"
              >
                <Text fontWeight="semibold">{post.author?.displayName || "User"}</Text>
              </button>
              {authorLevel && authorLevel > 1 && (
                <LevelBadge level={authorLevel} />
              )}
              {(isOwner || isAdmin) && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-medium">
                  Admin
                </span>
              )}
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                  <Pin className="w-3 h-3" />
                  <Text size="2" fontWeight="medium">Pinned</Text>
                </span>
              )}
            </div>
            <Text size="sm" theme="muted">{formatTimeAgo(post.createdAt)}</Text>
          </div>
        </div>

        {canModify && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl hover:bg-bg-muted transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-bg-elevated rounded-xl py-1 min-w-[140px] z-10">
                <button 
                  onClick={handleDelete}
                  className="w-full px-4 py-2.5 text-left hover:bg-bg-elevated flex items-center gap-3 text-red-500"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                  <Text size="sm">Delete</Text>
                </button>
                <button 
                  onClick={handleTogglePin}
                  className="w-full px-4 py-2.5 text-left hover:bg-bg-elevated flex items-center gap-3"
                  disabled={isPinning}
                >
                  <Pin className="w-4 h-4" />
                  <Text size="sm">{post.isPinned ? "Unpin" : "Pin"}</Text>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Tag */}
      {post.category && (
        <div className="mb-3">
          <span 
            className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: post.category.color }}
          >
            {post.category.name}
          </span>
        </div>
      )}

      {/* Content */}
      <div 
        onClick={handleContentClick} 
        onKeyDown={handleContentKeyDown}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
      >
        {/* Text content */}
        {post.content && (
          <Text className="mb-4 whitespace-pre-wrap leading-relaxed">
            {renderContentWithMentions(post.content)}
          </Text>
        )}

        {/* Media: Single Image */}
        {post.mediaUrls && post.mediaUrls.length === 1 && (
          <div className="mb-4 rounded-2xl overflow-hidden bg-bg-muted">
            <img 
              src={post.mediaUrls[0]} 
              alt="" 
              className="w-full max-h-[400px] object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.className = "mb-4 rounded-2xl overflow-hidden bg-bg-muted flex items-center justify-center min-h-[120px]";
                  parent.innerHTML = '<span class="text-text-muted text-sm">Image unavailable</span>';
                }
              }}
            />
          </div>
        )}

        {/* Media: Multiple Images */}
        {post.mediaUrls && post.mediaUrls.length > 1 && (
          <div className={`grid gap-1 mb-4 rounded-2xl overflow-hidden ${
            post.mediaUrls.length === 2 ? "grid-cols-2" :
            post.mediaUrls.length === 3 ? "grid-cols-2" :
            "grid-cols-2 grid-rows-2"
          }`}>
            {post.mediaUrls.slice(0, 4).map((url, i) => (
              <div key={i} className="relative bg-bg-muted">
                <img 
                  src={url} 
                  alt="" 
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                {i === 3 && post.mediaUrls && post.mediaUrls.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Text fontWeight="semibold" className="text-white text-lg">
                      +{post.mediaUrls.length - 4}
                    </Text>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Video embed */}
        {post.videoUrl && (
          <div className="mb-4 rounded-2xl overflow-hidden">
            <VideoEmbed url={post.videoUrl} />
          </div>
        )}

        {/* Poll */}
        {localPollOptions && localPollOptions.length > 0 && (
          <div className="mb-4 space-y-2">
            {localPollOptions.map((option, i) => {
              const percentage = totalPollVotes > 0 ? Math.round(((option.votes || 0) / totalPollVotes) * 100) : 0;
              
              return (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePollVote(i);
                  }}
                  disabled={hasVoted || isVotingPoll || !isPollActive}
                  className={`
                    w-full relative overflow-hidden rounded-xl p-4 text-left transition-all
                    ${hasVoted || !isPollActive
                      ? "bg-bg-muted"
                      : "hover:bg-bg-muted bg-bg-elevated"
                    }
                  `}
                >
                  {/* Progress bar background */}
                  {(hasVoted || !isPollActive) && (
                    <div 
                      className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-5 h-5 rounded-full border-2 shrink-0 transition-colors
                        ${hasVoted ? "border-primary bg-primary" : "border-border"}
                      `}>
                        {hasVoted && (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <Text fontWeight="medium">{option.text}</Text>
                    </div>
                    {(hasVoted || !isPollActive) && (
                      <Text size="sm" fontWeight="semibold" theme="muted">
                        {percentage}%
                      </Text>
                    )}
                  </div>
                </button>
              );
            })}
            <div className="flex items-center justify-between pt-1">
              <Text size="sm" theme="muted">
                {totalPollVotes} {totalPollVotes === 1 ? "vote" : "votes"}
              </Text>
              {!isPollActive && (
                <Text size="sm" fontWeight="medium" className="text-amber-400">
                  Poll closed
                </Text>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-1 pt-4 mt-2 border-t border-border/50">
        <button 
          onClick={handleUpvote}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200
            ${hasUpvoted 
              ? "text-primary bg-primary/10" 
              : "hover:bg-bg-muted text-text-secondary"
            }
          `}
          disabled={isUpvoting}
        >
          <ThumbsUp className={`w-4 h-4 ${hasUpvoted ? "fill-current" : ""}`} />
          <Text size="sm" fontWeight="medium" className="tabular-nums">
            {Number.isFinite(localUpvoteCount) ? localUpvoteCount : 0}
          </Text>
        </button>
        
        <button 
          onClick={() => setShowComments(prev => !prev)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            showComments 
              ? "bg-accent/10 text-accent" 
              : "hover:bg-bg-muted text-text-secondary"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <Text size="sm" fontWeight="medium" className="tabular-nums">
            {Number.isFinite(localCommentCount) ? localCommentCount : 0}
          </Text>
        </button>
      </div>

      {/* Always-visible comment input */}
      {communityId && (
        <div className="pt-3">
          <CommentInput
            postId={post._id}
            communityId={communityId}
            onSubmit={handleCommentPosted}
          />
        </div>
      )}

      {/* Comments Thread (toggleable) */}
      {showComments && communityId && (
        <CommentsSection
          postId={post._id}
          postAuthorId={post.authorId || ""}
          communityId={communityId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isOwner={isOwner}
          hideInput={true}
        />
      )}
    </div>
  );
}

// Video embed component
function VideoEmbed({ url }: { url: string }) {
  const getEmbedUrl = (videoUrl: string): string | null => {
    const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    
    const driveMatch = videoUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    
    return null;
  };

  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) {
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-bg-muted flex flex-col items-center justify-center gap-2 p-4">
        <Text size="sm" theme="muted" className="text-center">
          Video preview not available
        </Text>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Open in new tab
        </a>
      </div>
    );
  }

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-bg-muted">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
      />
    </div>
  );
}
