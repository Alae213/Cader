"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Avatar } from "@/components/shared/Avatar";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { X, ThumbsUp, MessageCircle, Pin, Trash2 } from "lucide-react";

interface Post {
  _id: string;
  author?: {
    _id: string;
    displayName: string;
    avatarUrl?: string;
  };
  category?: {
    _id: string;
    name: string;
    color: string;
  };
  content: string;
  contentType: "text" | "image" | "video" | "gif" | "poll";
  mediaUrls?: string[];
  videoUrl?: string;
  pollOptions?: { text: string; votes: number }[];
  isPinned: boolean;
  upvoteCount: number;
  commentCount: number;
  createdAt: number;
}

interface Comment {
  _id: string;
  author?: {
    _id: string;
    displayName: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: number;
  replies?: Comment[];
}

interface OpenPostModalProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenPostModal({ post, open, onOpenChange }: OpenPostModalProps) {
  const { userId } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch comments for this post
  const comments = useQuery(
    post ? api.functions.listComments : "skip",
    post ? { postId: post._id } : "skip"
  ) as Comment[] | null;

  const createComment = useMutation(api.functions.createComment);

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

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !post || !userId) return;
    
    setIsSubmitting(true);
    try {
      await createComment({
        postId: post._id,
        content: newComment.trim(),
      });
      setNewComment("");
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Post</DialogTitle>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 p-1 hover:bg-bg-elevated rounded"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Post Content */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Avatar
              src={post.author?.avatarUrl}
              name={post.author?.displayName || "User"}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <Text fontWeight="semibold">{post.author?.displayName || "User"}</Text>
                {post.isPinned && <Pin className="w-4 h-4 text-primary" />}
              </div>
              <Text size="2" theme="muted">{formatTimeAgo(post.createdAt)}</Text>
            </div>
          </div>

          {/* Category */}
          {post.category && (
            <span 
              className="inline-block px-2 py-0.5 rounded text-xs text-white"
              style={{ backgroundColor: post.category.color }}
            >
              {post.category.name}
            </span>
          )}

          {/* Content */}
          <div>
            {post.content && (
              <Text className="whitespace-pre-wrap">{post.content}</Text>
            )}

            {/* Images */}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {post.mediaUrls.map((url, i) => (
                  <img 
                    key={i} 
                    src={url} 
                    alt="" 
                    className="rounded-lg w-full h-64 object-cover"
                  />
                ))}
              </div>
            )}

            {/* Video */}
            {post.videoUrl && (
              <div className="mt-3">
                <VideoEmbed url={post.videoUrl} />
              </div>
            )}

            {/* Poll */}
            {post.pollOptions && post.pollOptions.length > 0 && (
              <div className="space-y-2 mt-3">
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

          {/* Stats */}
          <div className="flex items-center gap-4 py-3 border-y border-border">
            <button className="flex items-center gap-1 hover:text-primary transition-colors">
              <ThumbsUp className="w-4 h-4" />
              <Text size="sm">{post.upvoteCount}</Text>
            </button>
            
            <button className="flex items-center gap-1 hover:text-primary transition-colors">
              <MessageCircle className="w-4 h-4" />
              <Text size="sm">{post.commentCount} comments</Text>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-4">
          <Heading size="h4">Comments</Heading>
          
          {/* Comment List */}
          {!comments ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : comments.length === 0 ? (
            <Text theme="muted">No comments yet. Be the first to comment!</Text>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment._id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar
                        src={comment.author?.avatarUrl}
                        name={comment.author?.displayName || "User"}
                        size="sm"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Text size="sm" fontWeight="medium">
                            {comment.author?.displayName || "User"}
                          </Text>
                          <Text size="2" theme="muted">
                            {formatTimeAgo(comment.createdAt)}
                          </Text>
                        </div>
                        <Text size="sm" className="mt-1">{comment.content}</Text>
                        
                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-3 pl-3 border-l-2 border-border space-y-3">
                            {comment.replies.map((reply) => (
                              <div key={reply._id} className="flex items-start gap-2">
                                <Avatar
                                  src={reply.author?.avatarUrl}
                                  name={reply.author?.displayName || "User"}
                                  size="xs"
                                />
                                <div>
                                  <Text size="sm" fontWeight="medium">
                                    {reply.author?.displayName || "User"}
                                  </Text>
                                  <Text size="sm">{reply.content}</Text>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Comment Composer */}
          {userId && (
            <div className="flex gap-3">
              <TextArea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="min-h-[80px]"
              />
              <Button 
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                className="shrink-0"
              >
                {isSubmitting ? "Posting..." : "Post"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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