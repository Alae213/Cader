"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Avatar } from "@/components/shared/Avatar";
import { 
  Heart, 
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
      username?: string | null;
      avatarUrl?: string | null;
    } | null;
    category?: {
      _id: string;
      name: string;
      color: string;
    } | null;
    content: string;
    contentType: "text" | "image" | "video";
    mediaUrls?: string[];
    videoUrl?: string;
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
  const [isPinning, setIsPinning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localUpvoteCount, setLocalUpvoteCount] = useState(post.upvoteCount ?? 0);
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount ?? 0);

  // Derive hasUpvoted from server data when available, fall back to local state
  const [hasUpvoted, setHasUpvoted] = useState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (post as any).userHasUpvoted ?? false
  );

  // Mutations
  const toggleUpvote = useMutation(api.functions.feed.toggleUpvote);
  const pinPost = useMutation(api.functions.feed.pinPost);
  const unpinPost = useMutation(api.functions.feed.unpinPost);

  // Get author's level
  const authorLevel = useQuery(
    api.functions.leaderboard.getUserLevel,
     
    communityId && post.authorId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? { communityId: communityId as any, userId: post.authorId as any }
      : "skip"
  );
  const deletePost = useMutation(api.functions.feed.deletePost);

  // Sync local state when post prop changes (e.g. after refetch)
   
  useEffect(() => {
    setLocalUpvoteCount(post.upvoteCount ?? 0);
    setLocalCommentCount(post.commentCount ?? 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((post as any).userHasUpvoted !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHasUpvoted((post as any).userHasUpvoted);
    }
  }, [post._id, post.upvoteCount, post.commentCount, post, userId]);

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // Handle upvote with optimistic UI
  const handleUpvote = async () => {
    if (!userId) {
      toast.error("You must be signed in to upvote");
      return;
    }

    // Optimistic update: immediately update UI before server responds
    const wasUpvoted = hasUpvoted;
    const previousCount = localUpvoteCount;
    
    setHasUpvoted(!wasUpvoted);
    setLocalUpvoteCount(wasUpvoted ? previousCount - 1 : previousCount + 1);
    
    setIsUpvoting(true);
    
    try {
      // Fire mutation without awaiting for instant feel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toggleUpvote({ postId: post._id as any })
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
          setIsUpvoting(false);
        });
    } catch (error) {
      // Revert on error
      setHasUpvoted(wasUpvoted);
      setLocalUpvoteCount(previousCount);
      toast.error(error instanceof Error ? error.message : "Failed to upvote");
      setIsUpvoting(false);
    }
  };

  // Handle pin/unpin with optimistic UI
  const handleTogglePin = async () => {
    if (!userId) {
      toast.error("You must be signed in");
      return;
    }

    // Optimistic update: immediately update pinned state
    const wasPinned = post.isPinned;
    
    setShowMenu(false);
    setIsPinning(true);
    
    const mutation = wasPinned ? unpinPost : pinPost;
    const loadingToast = toast.loading(wasPinned ? "Unpinning post..." : "Pinning post...");
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await mutation({ postId: post._id as any });
      // Server confirmed
      toast.success(wasPinned ? "Post unpinned" : "Post pinned", { id: loadingToast });
      onDeleted?.();
    } catch (error) {
      console.error("Pin error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to pin post", { id: loadingToast });
    } finally {
      setIsPinning(false);
    }
  };

  // Handle delete with optimistic UI
  const handleDelete = async () => {
    if (!userId) {
      toast.error("You must be signed in");
      return;
    }

    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) {
      return;
    }

    // Optimistic update: immediately mark as deleting
    setShowMenu(false);
    setIsDeleting(true);
    
    // Show loading toast
    const loadingToast = toast.loading("Deleting post...");
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await deletePost({ postId: post._id as any });
      // Server confirmed
      toast.success("Post deleted", { id: loadingToast });
      onDeleted?.();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete post", { id: loadingToast });
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

  // Handle comment deleted — update local count
  const handleCommentDeleted = () => {
    setLocalCommentCount(prev => prev - 1);
  };

  return (
    <Card 
      className={`
        group rounded-[24px] p-4 transition-colors duration-200 overflow-visible
        ${post.isPinned ? "bg-primary/5" : "bg-bg-base hover:bg-bg-muted/50"}
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
            <div className="flex flex-row items-center gap-2">
            {post.author?.username && (
                <Text size="sm" theme="muted">@{post.author.username}</Text>
              )}
            <Text size="sm" theme="muted">{formatTimeAgo(post.createdAt)}</Text>
            </div>
          </div>
        </div>

        {canModify && (
          <Select open={showMenu} onOpenChange={setShowMenu}>
            <SelectTrigger className="w-fit p-2 rounded-[16px] transition-colors [&>span]:hidden [&>svg:last-child]:hidden bg-transparent hover:bg-white/10 cursor-pointer">
              <MoreHorizontal className="w-5 h-5" />
            </SelectTrigger>
            <SelectContent className="w-[160px]">
              <SelectItem 
                value="delete" 
                onSelect={() => { handleDelete(); setShowMenu(false); }}
                className="text-red-500 focus:text-red-500"
                hideCheck
                disabled={isDeleting}
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-4 h-4" />
                  <Text size="sm">Delete</Text>
                </div>
              </SelectItem>
              <SelectItem 
                value="pin"
                onSelect={() => { handleTogglePin(); setShowMenu(false); }}
                hideCheck
                disabled={isPinning}
              >
                <div className="flex items-center gap-3">
                  <Pin className="w-4 h-4" />
                  <Text size="sm">{post.isPinned ? "Unpin" : "Pin"}</Text>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      

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
          <Text className="my-2 px-2 whitespace-pre-wrap leading-relaxed">
            {renderContentWithMentions(post.content)}
          </Text>
        )}

        {/* Media: Single Image */}
        {post.mediaUrls && post.mediaUrls.length === 1 && (
          <div className="rounded-2xl overflow-hidden bg-bg-muted">
            <Image 
              src={post.mediaUrls[0]} 
              alt="" 
              width={400}
              height={400}
              className="w-full max-h-[400px] object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.className = "rounded-2xl overflow-hidden bg-bg-muted flex items-center justify-center min-h-[120px]";
                  parent.innerHTML = '<span class="text-text-muted text-sm">Image unavailable</span>';
                }
              }}
            />
          </div>
        )}

        {/* Media: Multiple Images */}
        {post.mediaUrls && post.mediaUrls.length > 1 && (
          <div className={`grid gap-1 rounded-2xl overflow-hidden ${
            post.mediaUrls.length === 2 ? "grid-cols-2" :
            post.mediaUrls.length === 3 ? "grid-cols-2" :
            "grid-cols-2 grid-rows-2"
          }`}>
            {post.mediaUrls.slice(0, 4).map((url, i) => (
              <div key={i} className="relative bg-bg-muted">
                <Image 
                  src={url} 
                  alt="" 
                  width={200}
                  height={160}
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
          <div className="rounded-2xl overflow-hidden">
            <VideoEmbed url={post.videoUrl} />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center my-3 justify-between">
        <div className="flex items-center gap-2">
        <div className="divide-y- divide-white/10 flex h-9 items-center gap-0 divide-x rounded-full border border-white/20 bg-bg-canvas/80">
          {/* Upvote Button */}
          <button 
            onClick={handleUpvote}
            className={`
              flex items-center gap-1.5 h-full cursor-pointer rounded-l-full px-3 py-1.5 transition-colors
              ${hasUpvoted 
                ? "text-red-500 bg-red-500/10" 
                : "hover:bg-red-500/10 hover:text-red-500 text-text-secondary cursor-pointer "
              }
            `}
            disabled={isUpvoting}
          >
            <Heart className={`w-[18px] h-[18px] ${hasUpvoted ? "fill-current" : ""}`} />
            <Text size="sm" fontWeight="medium" className="hidden md:inline tabular-nums">
              Like
            </Text>
          </button>
          
          {/* Upvote Count */}
          <span className="flex items-center">
            <button 
              onClick={handleUpvote}
              className={`
                h-9 gap-1.5 rounded-none rounded-r-full pr-3 pl-2.5  
                 focus:bg-white/10 active:bg-white/10 transition-colors
                ${hasUpvoted ? "text-primary" : "text-text-secondary"}
              `}
              disabled={isUpvoting}
            >
              <Text size="sm" fontWeight="medium" className="tabular-nums">
                {Number.isFinite(localUpvoteCount) ? localUpvoteCount : 0}
              </Text>
            </button>
          </span>
        </div>

        {/* Comments Button */}
        <button 
          onClick={() => setShowComments(prev => !prev)}
          className="flex items-center gap-1.5 h-9 rounded-full px-3 pr-4 py-1.5 text-text-secondary hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round">
            <path d="M21.5 12c0-5-3.694-8-9.5-8s-9.5 3-9.5 8c0 1.294.894 3.49 1.037 3.83l.037.092c.098.266.49 1.66-1.074 3.722 2.111 1 4.353-.644 4.353-.644 1.551.815 3.397 1 5.147 1 5.806 0 9.5-3 9.5-8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round"></path>
          </svg>
          <Text size="sm" fontWeight="medium" className="hidden md:inline tabular-nums">
            {Number.isFinite(localCommentCount) ? localCommentCount : 0} comments
          </Text>
          <Text size="sm" fontWeight="medium" className="inline md:hidden tabular-nums">
            {Number.isFinite(localCommentCount) ? localCommentCount : 0}
          </Text>
        </button>
        </div>

        {/* Category Tag */}
      {post.category && (
        <div className="mb-2">
          <span 
            className="inline-block px-3 py-1 rounded-[8px] text-xs font-medium text-white bg-white/5"
          >
            {post.category.name}
          </span>
        </div>
      )}
      </div>

       <hr className="h-px w-full border-0 rounded-full "
                      style={{
                        background: "rgba(242, 242, 242, 0.15)",
                        boxShadow: "0 1px 0 0 rgba(0, 0, 0, 0.70)",
                      }}/>

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
          onCommentDeleted={handleCommentDeleted}
        />
      )}

      {/* Always-visible comment input */}
      {communityId && (
        <div>
          <CommentInput
            postId={post._id}
            communityId={communityId}
            onSubmit={handleCommentPosted}
          />
        </div>
      )}

      
    </Card>
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
