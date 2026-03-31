"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
// Card and CardContent removed - using borderless design
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog";
import { PostCard } from "./PostCard";
import { OpenPostModal } from "./OpenPostModal";
import { QuickInfoCard } from "./QuickInfoCard";
import { 
  Users, 
  Zap, 
  ArrowUpDown, 
  Clock, 
  Heart, 
  MessageCircle,
  Image as ImageIcon, 
  Video,
  Gift,
  BarChart3, 
  X, 
  Plus,
  ImagePlus,
  ChevronDown,
  Share2,
  Copy,
  Check
} from "lucide-react";

interface FeedTabProps {
  communityId: string;
  communitySlug?: string;
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

// Community type for QuickInfoCard
interface CommunityData {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  links?: string[];
  pricingType: string;
  priceDzd?: number;
  memberCount: number;
  onlineCount?: number;
  ownerName?: string;
  ownerAvatar?: string | null;
}

// Category type
interface Category {
  _id: string;
  name: string;
  color: string;
}

// Sort options
type SortOption = "newest" | "most_liked" | "most_commented";

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof Clock }[] = [
  { value: "newest", label: "Newest first", icon: Clock },
  { value: "most_liked", label: "Most liked", icon: Heart },
  { value: "most_commented", label: "Most commented", icon: MessageCircle },
];

// Invite Friend Modal Component
function InviteFriendModal({ 
  open, 
  onOpenChange,
  communityName,
  communitySlug 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  communityName: string;
  communitySlug: string;
}) {
  const [copied, setCopied] = useState(false);
  const inviteLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/${communitySlug}` 
    : `/${communitySlug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <Text theme="muted" size="sm">
              Share &quot;{communityName}&quot; with your friends and grow the community!
            </Text>
            
            <div className="flex gap-2">
              <Input 
                value={inviteLink} 
                readOnly 
                className="flex-1"
              />
              <Button 
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export function FeedTab({ communityId, communitySlug = "" }: FeedTabProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  
  // State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<SortOption>("newest");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  
  // Inline composer state
  const [showComposer, setShowComposer] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  
  // Composer form state
  const [postType, setPostType] = useState<"text" | "image" | "video" | "gif" | "poll">("text");
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Additional fields for different post types
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  
  // Poll fields
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);

  // File input ref for image upload
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Mutations
  const createPost = useMutation(api.functions.feed.createPost);
  
  // Fetch posts with sorting
  const posts = useQuery(
    api.functions.feed.listPosts, 
    { 
      communityId: communityId as any,
      categoryId: selectedCategoryId ? selectedCategoryId as any : undefined,
      sortBy: selectedSort
    }
  ) || [];
  
  // Fetch categories
  const categories = useQuery(
    api.functions.categories.listCategories,
    { communityId: communityId as any }
  ) || [];

  // Fetch community data for QuickInfoCard
  const communityData = useQuery(
    api.functions.communities.getById,
    { communityId: communityId as any }
  );

  // Fetch community stats for streak
  const communityStats = useQuery(
    api.functions.communities.getCommunityStats, 
    { communityId: communityId as any }
  );

  // Check if user is member/owner (simplified)
  const isOwner = useMemo(() => {
    return false;
  }, []);

  const isMember = useMemo(() => {
    return !!userId;
  }, [userId]);

  // Handle click outside composer
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (composerRef.current && !composerRef.current.contains(event.target as Node)) {
        // Check all post types before closing
        const hasContent = content.trim() || 
          imageUrls.length > 0 || 
          videoUrl.trim() || 
          gifUrl.trim() || 
          pollQuestion.trim() || 
          pollOptions.some(o => o.trim());
        
        if (composerExpanded && !hasContent) {
          setComposerExpanded(false);
          setShowComposer(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [composerExpanded, content, imageUrls, videoUrl, gifUrl, pollQuestion, pollOptions]);

  // Reset composer when closing
  const resetComposer = () => {
    setContent("");
    setSelectedCategory("");
    setImageUrls([]);
    setVideoUrl("");
    setGifUrl("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPostType("text");
    setError("");
  };

  // Compress image and convert to base64
  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if needed
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with compression (smaller than PNG/base64)
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle image file selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError("");
    setIsUploadingImages(true);

    try {
      // Process each file
      for (const file of Array.from(files)) {
        // Validate file type
        if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
          setError("Invalid format. Use JPG, PNG, WebP, or GIF.");
          continue;
        }

        // Validate file size (max 10MB original)
        if (file.size > 10 * 1024 * 1024) {
          setError("File too large. Maximum size is 10MB.");
          continue;
        }

        try {
          // Compress image before storing (target ~500KB for safety under 1MB Convex limit)
          const compressed = await compressImage(file, 1200, 0.6);
          
          // Check compressed size (base64 is ~33% larger than original)
          const base64Size = Math.round((compressed.length * 3) / 4);
          if (base64Size > 900 * 1024) {
            // Try with more compression
            const moreCompressed = await compressImage(file, 800, 0.4);
            setImageUrls(prev => [...prev, moreCompressed]);
          } else {
            setImageUrls(prev => [...prev, compressed]);
          }
        } catch {
          setError("Failed to process image");
        }
      }
    } finally {
      setIsUploadingImages(false);
    }

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Validate video URL format
  const isValidVideoUrl = (url: string): boolean => {
    if (!url) return true; // Empty is allowed
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    return !!(youtubeMatch || vimeoMatch || driveMatch);
  };

  // Validate GIF URL format (basic)
  const isValidGifUrl = (url: string): boolean => {
    if (!url) return false;
    // Basic URL format check
    return url.startsWith("http://") || url.startsWith("https://");
  };

  // Handle composer submit
  const handleComposerSubmit = async () => {
    if (!userId) return;

    // Validate based on post type
    if (postType === "text" && !content.trim()) {
      setError("Please enter some text");
      return;
    }

    if (postType === "image" && imageUrls.length === 0 && !content.trim()) {
      setError("Please add an image or caption");
      return;
    }

    if (postType === "video") {
      if (!videoUrl.trim()) {
        setError("Please enter a video URL");
        return;
      }
      if (!isValidVideoUrl(videoUrl)) {
        setError("Invalid video URL. Use YouTube, Vimeo, or Google Drive");
        return;
      }
    }

    if (postType === "gif") {
      if (!gifUrl.trim()) {
        setError("Please enter a GIF URL");
        return;
      }
      if (!isValidGifUrl(gifUrl)) {
        setError("Invalid GIF URL");
        return;
      }
    }

    if (postType === "poll") {
      if (!pollQuestion.trim()) {
        setError("Please enter a poll question");
        return;
      }
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        setError("Please add at least 2 options");
        return;
      }
    }

    setIsLoading(true);
    setError("");

    try {
      const postData: any = {
        communityId,
        content: content.trim(),
        contentType: postType,
        categoryId: selectedCategory || undefined,
      };

      // Add type-specific data
      if (postType === "image" && imageUrls.length > 0) {
        postData.mediaUrls = imageUrls;
      }
      if (postType === "video" && videoUrl) {
        postData.videoUrl = videoUrl;
      }
      if (postType === "gif" && gifUrl) {
        postData.mediaUrls = [gifUrl];
      }
      if (postType === "poll") {
        postData.pollOptions = pollOptions
          .filter(o => o.trim())
          .map(text => ({ text: text.trim(), votes: 0 }));
        postData.content = pollQuestion;
      }

      await createPost(postData);
      
      toast.success("Post created!");
      setComposerExpanded(false);
      setShowComposer(false);
      resetComposer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle expand composer
  const handleExpandComposer = () => {
    setShowComposer(true);
    setComposerExpanded(true);
  };

  // Poll helper functions
  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  // Separate pinned and regular posts
  const pinnedPosts = posts.filter((post: Post) => post.isPinned);
  const regularPosts = posts.filter((post: Post) => !post.isPinned);

  // Find current sort option index
  const currentSortIndex = SORT_OPTIONS.findIndex(o => o.value === selectedSort);

  if (!posts) {
    return (
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Main feed skeleton */}
        <div className="flex-1 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        {/* Sidebar skeleton */}
        <div className="w-full lg:w-80 space-y-4">
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 flex-col lg:flex-row w-full">
      {/* Main Feed Column - Full width */}
      <div className="flex-1 min-w-0 w-full max-w-3xl">
              {/* Post Composer - First */}
        {userId && (
          <div className="rounded-2xl p-5 mb-3 bg-bg-elevated" ref={composerRef}>
              {!composerExpanded ? (
                <button
                  onClick={handleExpandComposer}
                  className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg bg-bg-elevated hover:bg-bg-muted transition-colors"
                >
                  {/* User Avatar */}
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt="Your avatar"
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Text fontWeight="semibold" size="sm">
                        {user?.firstName?.[0] || user?.username?.[0] || "?"}
                      </Text>
                    </div>
                  )}
                  <Text theme="muted" className="line-clamp-1">What&apos;s on your mind?</Text>
                </button>
              ) : (
                <div className="space-y-4">
                  {/* User Avatar and Name in expanded view */}
                  <div className="flex items-center gap-3">
                    {user?.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt="Your avatar"
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Text fontWeight="semibold" size="sm">
                          {user?.firstName?.[0] || user?.username?.[0] || "?"}
                        </Text>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Text fontWeight="semibold" className="truncate">
                        {user?.fullName || user?.username || "User"}
                      </Text>
                    </div>
                  </div>
                  
                  {/* Post Type Selector */}
                  <div className="flex gap-2 pb-3 border-b border-border overflow-x-auto" role="group" aria-label="Post type">
                    <button
                      type="button"
                      onClick={() => setPostType("text")}
                      aria-pressed={postType === "text"}
                      className={`p-2 rounded-md transition-colors ${
                        postType === "text" 
                          ? "bg-primary text-white" 
                          : "bg-bg-elevated hover:bg-bg-muted"
                      }`}
                    >
                      <Text size="sm">Text</Text>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostType("image")}
                      aria-pressed={postType === "image"}
                      className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                        postType === "image" 
                          ? "bg-primary text-white" 
                          : "bg-bg-elevated hover:bg-bg-muted"
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <Text size="sm">Image</Text>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostType("video")}
                      aria-pressed={postType === "video"}
                      className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                        postType === "video" 
                          ? "bg-primary text-white" 
                          : "bg-bg-elevated hover:bg-bg-muted"
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <Text size="sm">Video</Text>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostType("gif")}
                      aria-pressed={postType === "gif"}
                      className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                        postType === "gif" 
                          ? "bg-primary text-white" 
                          : "bg-bg-elevated hover:bg-bg-muted"
                      }`}
                    >
                      <Gift className="w-4 h-4" />
                      <Text size="sm">GIF</Text>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostType("poll")}
                      aria-pressed={postType === "poll"}
                      className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                        postType === "poll" 
                          ? "bg-primary text-white" 
                          : "bg-bg-elevated hover:bg-bg-muted"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <Text size="sm">Poll</Text>
                    </button>
                  </div>

                  {/* Content based on post type */}
                  <div className="space-y-3">
                    {/* Text Post */}
                    {postType === "text" && (
                      <div className="relative">
                        <TextArea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="What's on your mind?"
                          className="min-h-[100px] pr-12"
                          autoFocus
                        />
                        <span className="absolute bottom-2 right-2 text-xs text-text-muted">
                          {content.length}/5000
                        </span>
                      </div>
                    )}

                    {/* Image Post */}
                    {postType === "image" && (
                      <div className="space-y-3">
                        <TextArea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Add a caption (optional)"
                        />
                        
                        {/* Hidden file input - allow multiple images */}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleImageSelect}
                          className="hidden"
                          multiple
                        />
                        
                        {/* Upload area */}
                        {isUploadingImages ? (
                          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                            <div className="animate-spin w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full mb-2" />
                            <Text size="sm" theme="muted">Compressing images...</Text>
                          </div>
                        ) : (
                          <div 
                            onClick={() => imageInputRef.current?.click()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                imageInputRef.current?.click();
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label="Upload images"
                            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-bg-elevated/50 transition-colors"
                          >
                            <ImagePlus className="w-8 h-8 mx-auto text-text-muted mb-2" />
                            <Text size="sm" theme="muted">Click to upload images</Text>
                            <Text size="2" theme="muted">Max 10MB per image (will be compressed)</Text>
                          </div>
                        )}
                        
                        {/* Image previews */}
                        {imageUrls.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {imageUrls.map((url, i) => (
                              <div key={i} className="relative group">
                                <img 
                                  src={url} 
                                  alt="" 
                                  className="w-20 h-20 object-cover rounded-lg border border-border" 
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(i)}
                                  aria-label="Remove image"
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Video Post */}
                    {postType === "video" && (
                      <div className="space-y-3">
                        <TextArea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Add a caption (optional)"
                        />
                        <div>
                          <Input
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="Paste YouTube, Vimeo, or Google Drive link"
                            className={videoUrl && !isValidVideoUrl(videoUrl) ? "border-red-500" : ""}
                          />
                          {videoUrl && !isValidVideoUrl(videoUrl) && (
                            <Text size="2" theme="error" className="mt-1">Invalid URL. Use YouTube, Vimeo, or Google Drive</Text>
                          )}
                        </div>
                      </div>
                    )}

                    {/* GIF Post */}
                    {postType === "gif" && (
                      <div className="space-y-3">
                        <TextArea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Add a caption (optional)"
                        />
                        <Input
                          value={gifUrl}
                          onChange={(e) => setGifUrl(e.target.value)}
                          placeholder="Paste GIF URL"
                        />
                      </div>
                    )}

                    {/* Poll Post */}
                    {postType === "poll" && (
                      <div className="space-y-3">
                        <TextArea
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          placeholder="Ask a question..."
                          className="min-h-[60px]"
                        />
                        <div className="space-y-2">
                          <Text size="sm" fontWeight="medium">Options</Text>
                          {pollOptions.map((option, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <button
                                type="button"
                                className="w-5 h-5 rounded-full border-2 border-border bg-bg-elevated shrink-0"
                                disabled
                              />
                              <Input
                                value={option}
                                onChange={(e) => updatePollOption(i, e.target.value)}
                                placeholder={`Option ${i + 1}`}
                                className="flex-1"
                              />
                              {pollOptions.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removePollOption(i)}
                                  aria-label="Remove option"
                                  className="p-2 text-red-500 hover:bg-red-50 rounded shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          {pollOptions.length < 4 && (
                            <button
                              type="button"
                              onClick={addPollOption}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Plus className="w-4 h-4" />
                              <Text size="sm">Add option</Text>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Category Selector */}
                    {categories.length > 0 && (
                      <div className="space-y-2">
                        <Text size="sm" fontWeight="medium">Category (optional)</Text>
                        <div className="flex gap-2 flex-wrap">
                          {categories.map((cat: Category) => (
                            <button
                              key={cat._id}
                              type="button"
                              onClick={() => setSelectedCategory(
                                selectedCategory === cat._id ? "" : cat._id
                              )}
                              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                selectedCategory === cat._id
                                  ? "text-white"
                                  : "bg-bg-elevated hover:bg-bg-muted"
                              }`}
                              style={{ 
                                backgroundColor: selectedCategory === cat._id ? cat.color : undefined 
                              }}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <Text size="sm" theme="error">{error}</Text>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between pt-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setComposerExpanded(false);
                        setShowComposer(false);
                        resetComposer();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleComposerSubmit} 
                      disabled={isLoading}
                      size="sm"
                    >
                      {isLoading ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
        )}

        {/* Category Filter and Sort Row - Second */}
        <div className="flex gap-2 mb-4 items-center flex-wrap">
          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 flex-1 items-center">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors shrink-0 ${
                selectedCategoryId === null
                  ? "bg-primary text-white"
                  : "bg-bg-elevated text-text-secondary hover:bg-bg-muted"
              }`}
            >
              All
            </button>
            {categories.map((cat: Category) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategoryId(cat._id)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-2 shrink-0 ${
                  selectedCategoryId === cat._id
                    ? "bg-primary text-white"
                    : "bg-bg-elevated text-text-secondary hover:bg-bg-muted"
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </button>
            ))}
          </div>
          
          {/* Sort Dropdown - outside overflow container */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                selectedSort !== "newest"
                  ? "bg-blue-500 text-white"
                  : "bg-bg-elevated text-text-secondary hover:bg-bg-muted"
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              {SORT_OPTIONS.find(o => o.value === selectedSort)?.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {/* Sort Dropdown Menu */}
            {showSortDropdown && (
              <div className="absolute right-0 top-full mt-1 z-[100] shadow-lg rounded-lg bg-bg-base border border-border p-1">
                {SORT_OPTIONS.map((option, index) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedSort(option.value);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedSort === option.value
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-bg-elevated text-text-secondary"
                    }`}
                  >
                    <option.icon className="w-4 h-4" />
                    {option.label}
                    {selectedSort === option.value && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Feed - Third */}
        {posts.length === 0 ? (
          <div className="rounded-2xl p-12 text-center bg-bg-elevated">
            <Heading size="h4" className="mb-2">No posts yet</Heading>
            <Text theme="muted">Be the first to post in this community!</Text>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pinned Posts (not affected by sorting) */}
            {pinnedPosts.length > 0 && (
              <>
                {pinnedPosts.map((post: Post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onClick={() => setSelectedPost(post)}
                  />
                ))}
                {/* Divider if there are regular posts */}
                {regularPosts.length > 0 && (
                  <div className="h-px bg-border" />
                )}
              </>
            )}
            
            {/* Regular Posts (sorted) */}
            {regularPosts.map((post: Post) => (
              <PostCard
                key={post._id}
                post={post}
                onClick={() => setSelectedPost(post)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar - QuickInfoCard */}
      <div className="w-full lg:w-80 shrink-0">
        {/* Mobile: Show at top */}
        <div className="lg:hidden">
          {communityData ? (
            <QuickInfoCard
              community={communityData}
              isOwner={isOwner}
              isMember={isMember}
              streak={communityStats?.streak || 0}
              onJoinClick={() => {}}
              onEditClick={() => {}}
              onInviteClick={() => setShowInviteModal(true)}
            />
          ) : (
            <Skeleton className="h-64" />
          )}
        </div>
        
        {/* Desktop: Show on right */}
        <div className="hidden lg:block">
          {communityData ? (
            <QuickInfoCard
              community={communityData}
              isOwner={isOwner}
              isMember={isMember}
              streak={communityStats?.streak || 0}
              onJoinClick={() => {}}
              onEditClick={() => {}}
              onInviteClick={() => setShowInviteModal(true)}
            />
          ) : (
            <Skeleton className="h-64" />
          )}
        </div>
      </div>

      {/* Open Post Modal - Keep as is */}
      <OpenPostModal
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      />

      {/* Invite Friend Modal */}
      <InviteFriendModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        communityName={communityData?.name || "Community"}
        communitySlug={communitySlug}
      />
    </div>
  );
}
