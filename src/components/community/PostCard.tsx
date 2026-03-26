"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";
import { 
  ThumbsUp, 
  MessageCircle, 
  MoreHorizontal, 
  Pin,
  Trash2,
  Image,
  Video,
  BarChart3
} from "lucide-react";

interface PostCardProps {
  post: {
    _id: string;
    author?: {
      _id: string;
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
  onClick?: () => void;
  onDeleted?: () => void;
}

export function PostCard({ post, onClick, onDeleted }: PostCardProps) {
  const { userId } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localUpvoteCount, setLocalUpvoteCount] = useState(post.upvoteCount);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  // Mutations
  const toggleUpvote = useMutation(api.functions.feed.toggleUpvote);
  const pinPost = useMutation(api.functions.feed.pinPost);
  const unpinPost = useMutation(api.functions.feed.unpinPost);
  const deletePost = useMutation(api.functions.feed.deletePost);

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Handle upvote
  const handleUpvote = async () => {
    if (!userId) {
      toast.error("You must be signed in to upvote");
      return;
    }

    setIsLoading(true);
    try {
      const result = await toggleUpvote({ postId: post._id as any });
      setLocalUpvoteCount(result.newCount);
      setHasUpvoted(result.upvoted);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upvote");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pin/unpin
  const handleTogglePin = async () => {
    if (!userId) {
      toast.error("You must be signed in");
      return;
    }

    setIsLoading(true);
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
      setIsLoading(false);
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

    setIsLoading(true);
    try {
      await deletePost({ postId: post._id as any });
      toast.success("Post deleted");
      setShowMenu(false);
      onDeleted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete post");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if user can pin/delete (is owner or admin of the community)
  // For now, we'll allow the author to delete their own posts
  const canModify = userId && post.authorId; // Simplified check

  return (
    <Card className={post.isPinned ? "border-primary" : ""}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={post.author?.avatarUrl}
              name={post.author?.displayName || "User"}
              size="md"
            />
            <div>
              <div className="flex items-center gap-2">
                <Text>{post.author?.displayName || "User"}</Text>
                {post.isPinned && (
                  <Pin className="w-3 h-3 text-primary" />
                )}
              </div>
              <Text size="2" theme="muted">{formatTimeAgo(post.createdAt)}</Text>
            </div>
          </div>

          {/* Three-dot menu - only show if user can modify */}
          {canModify && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-bg-elevated rounded"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-8 bg-bg-base border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-10">
                  <button 
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2 text-red-500"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                    <Text size="sm">Delete</Text>
                  </button>
                  <button 
                    onClick={handleTogglePin}
                    className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2"
                    disabled={isLoading}
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
          <div className="mb-2">
            <span 
              className="inline-block px-2 py-0.5 rounded text-xs text-white"
              style={{ backgroundColor: post.category.color }}
            >
              {post.category.name}
            </span>
          </div>
        )}

        {/* Content */}
        <div onClick={onClick} className="cursor-pointer">
          {/* Text content */}
          {post.content && (
            <Text className="mb-3 whitespace-pre-wrap">{post.content}</Text>
          )}

          {/* Media: Images */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {post.mediaUrls.map((url, i) => (
                <img 
                  key={i} 
                  src={url} 
                  alt="" 
                  className="rounded-lg w-full h-48 object-cover"
                />
              ))}
            </div>
          )}

          {/* Video embed */}
          {post.videoUrl && (
            <div className="mb-3">
              <VideoEmbed url={post.videoUrl} />
            </div>
          )}

          {/* Poll */}
          {post.pollOptions && post.pollOptions.length > 0 && (
            <div className="space-y-2 mb-3">
              {post.pollOptions.map((option, i) => (
                <div 
                  key={i} 
                  className="p-3 bg-bg-elevated rounded-lg flex justify-between items-center"
                >
                  <Text size="sm">{option.text}</Text>
                  <Text size="sm" theme="muted">{option.votes} votes</Text>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 pt-3 border-t border-border">
          <button 
            onClick={handleUpvote}
            className={`flex items-center gap-1 transition-colors ${
              hasUpvoted ? "text-primary" : "hover:text-primary"
            }`}
            disabled={isLoading}
          >
            <ThumbsUp className={`w-4 h-4 ${hasUpvoted ? "fill-current" : ""}`} />
            <Text size="sm">{localUpvoteCount}</Text>
          </button>
          
          <button className="flex items-center gap-1 hover:text-primary transition-colors">
            <MessageCircle className="w-4 h-4" />
            <Text size="sm">{post.commentCount}</Text>
          </button>
        </div>
      </CardContent>
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
  if (!embedUrl) return null;

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-elevated">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
      />
    </div>
  );
}