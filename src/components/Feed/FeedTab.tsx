"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog";
import { PostCard } from "./PostCard";
import { QuickInfoCard } from "@/components/community/QuickInfoCard";
import { EditCommunityModal } from "@/components/community/EditCommunityModal";
import { ProfilePanel } from "@/components/community/ProfilePanel";
import { 
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
  Copy,
  Check
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

// AN5: Hook to detect prefers-reduced-motion
function useReducedMotion(): boolean {
  const getInitial = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };
  const [reduced, setReduced] = useState(getInitial);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

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

const POST_TYPES: { value: "text" | "image" | "video" | "gif" | "poll"; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "Text", icon: null },
  { value: "image", label: "Image", icon: <ImageIcon className="w-4 h-4" /> },
  { value: "video", label: "Video", icon: <Video className="w-4 h-4" /> },
  { value: "gif", label: "GIF", icon: <Gift className="w-4 h-4" /> },
  { value: "poll", label: "Poll", icon: <BarChart3 className="w-4 h-4" /> },
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
  // Fix #12: Use env var for base URL, fallback to window.location.origin
  const baseUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
    : (process.env.NEXT_PUBLIC_APP_URL || '');
  const inviteLink = baseUrl ? `${baseUrl}/${communitySlug}` : `/${communitySlug}`;

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

// S7: Extracted avatar component to eliminate duplication + P1/P3: width/height/loading attributes
function ComposerAvatar({ user }: { user: ReturnType<typeof useUser>["user"] }) {
  if (user?.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.imageUrl}
        alt="Your avatar"
        width={40}
        height={40}
        loading="lazy"
        className="w-10 h-10 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
      <Text fontWeight="semibold" size="sm">
        {user?.firstName?.[0] || user?.username?.[0] || "?"}
      </Text>
    </div>
  );
}

export function FeedTab({ communityId, communitySlug = "" }: FeedTabProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const prefersReducedMotion = useReducedMotion(); // AN5
  
  // Cast string IDs to Convex Id types
  const communityIdTyped = communityId as Id<"communities">;

  // State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<SortOption>("newest");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  
  // Pagination state
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Inline composer state
  const [_composerOpen, setComposerOpen] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  
  // Composer form state
  const [postType, setPostType] = useState<"text" | "image" | "video" | "gif" | "poll">("text");
  const [content, setContent] = useState("");
  // Fix #10: Renamed for clarity — this is the category assigned to the post being composed
  // (separate from selectedCategoryId which is the feed filter)
  const [composerCategoryId, setComposerCategoryId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Additional fields for different post types
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 }); // Fix #15
  const [videoUrl, setVideoUrl] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  
  // Poll fields
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollEndDate, setPollEndDate] = useState(""); // ISO datetime-local string

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Edit community modal state
  const [showEditModal, setShowEditModal] = useState(false);

  // Profile panel state
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);

  // N1: Focus management — move focus to profile panel when it opens
  useEffect(() => {
    if (profileUserId && profilePanelRef.current) {
      const focusable = profilePanelRef.current.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusable?.focus();
    }
  }, [profileUserId]);

  // File input ref for image upload
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // AN3: Track images being faded out for removal animation
  const [fadingImages, setFadingImages] = useState<Set<number>>(new Set());

  // Refs for click-outside handler (Fix #3: avoid stale closures)
  const composerExpandedRef = useRef(composerExpanded);
  const contentRef = useRef(content);
  const imageUrlsRef = useRef(imageUrls);
  const videoUrlRef = useRef(videoUrl);
  const gifUrlRef = useRef(gifUrl);
  const pollQuestionRef = useRef(pollQuestion);
  const pollOptionsRef = useRef(pollOptions);
  const pollEndDateRef = useRef(pollEndDate);

  // Keep refs in sync
  useEffect(() => {
    composerExpandedRef.current = composerExpanded;
    contentRef.current = content;
    imageUrlsRef.current = imageUrls;
    videoUrlRef.current = videoUrl;
    gifUrlRef.current = gifUrl;
    pollQuestionRef.current = pollQuestion;
    pollOptionsRef.current = pollOptions;
    pollEndDateRef.current = pollEndDate;
  }, [composerExpanded, content, imageUrls, videoUrl, gifUrl, pollQuestion, pollOptions, pollEndDate]);

  // Mutations
  const createPost = useMutation(api.functions.feed.createPost);
  const updateCommunity = useMutation(api.functions.communities.updateCommunity);
  
  // Fetch posts with pagination (Fix #1)
  const postsResult = useQuery(
    api.functions.feed.listPosts, 
    { 
      communityId: communityIdTyped,
      categoryId: selectedCategoryId ? selectedCategoryId as Id<"categories"> : undefined,
      sortBy: selectedSort,
      limit: 20,
      cursor: cursor,
    }
  );

  // Accumulate posts across pages
  useEffect(() => {
    if (postsResult) {
      if (cursor === undefined) {
        // First page — replace all
        setAllPosts(postsResult.page as Post[]);
      } else {
        // Subsequent page — append
        setAllPosts(prev => [...prev, ...(postsResult.page as Post[])]);
      }
      setHasMore(!postsResult.isDone);
      setIsLoadingMore(false);
    }
  }, [postsResult, cursor]);

  // Reset pagination when filters change
  useEffect(() => {
    setCursor(undefined);
    setAllPosts([]);
    setHasMore(true);
  }, [selectedCategoryId, selectedSort]);

  // Load more handler
  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && postsResult && !postsResult.isDone) {
      setIsLoadingMore(true);
      setCursor(postsResult.continueCursor);
    }
  }, [hasMore, isLoadingMore, postsResult]);

  // Fetch categories
  const categories = useQuery(
    api.functions.categories.listCategories,
    { communityId: communityIdTyped }
  ) || [];

  // Fetch community data for QuickInfoCard
  const communityData = useQuery(
    api.functions.communities.getById,
    { communityId: communityIdTyped }
  );

  // Fetch community stats for streak
  const communityStats = useQuery(
    api.functions.communities.getCommunityStats, 
    { communityId: communityIdTyped }
  );

  // Fix #5: Real membership check (not just "is authenticated")
  const membership = useQuery(
    api.functions.memberships.getMyMembership,
    { communityId: communityIdTyped }
  );

  // Derive roles from actual membership data
  const isOwner = useMemo(() => {
    return membership?.isOwner ?? false;
  }, [membership?.isOwner]);

  const isAdmin = useMemo(() => {
    return membership?.isAdmin ?? false;
  }, [membership?.isAdmin]);

  const isMember = useMemo(() => {
    return membership?.isMember ?? false;
  }, [membership?.isMember]);

  // Handle click outside composer (Fix #3: use refs to avoid stale closures)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (composerRef.current && !composerRef.current.contains(event.target as Node)) {
        // Check all post types before closing using refs (stable references)
        const hasContent = contentRef.current.trim() || 
          imageUrlsRef.current.length > 0 || 
          videoUrlRef.current.trim() || 
          gifUrlRef.current.trim() || 
          pollQuestionRef.current.trim() || 
          pollOptionsRef.current.some(o => o.trim());
        
        if (composerExpandedRef.current && !hasContent) {
          setComposerExpanded(false);
          setComposerOpen(false);
        } else if (composerExpandedRef.current && hasContent) {
          // F4: Warn before discarding draft on click-outside
          toast.warning("Unsaved draft will be discarded");
          setComposerExpanded(false);
          setComposerOpen(false);
        }
      }

      // Fix #4: Close sort dropdown when clicking outside
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [composerExpanded]); // Only re-register when composerExpanded changes, not on every keystroke

  // Reset composer when closing
  const resetComposer = () => {
    setContent("");
    setComposerCategoryId("");
    setImageUrls([]);
    setVideoUrl("");
    setGifUrl("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollEndDate("");
    setUploadProgress({ current: 0, total: 0 });
    setPostType("text");
    setError("");
    // Fix #11: Clear draft from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`feed-draft-${communityId}`);
    }
  };

  // F4: Check if draft has meaningful content before discarding
  const hasDraftContent = useCallback(() => {
    return contentRef.current.trim() || 
      imageUrlsRef.current.length > 0 || 
      videoUrlRef.current.trim() || 
      gifUrlRef.current.trim() || 
      pollQuestionRef.current.trim() || 
      pollOptionsRef.current.some(o => o.trim());
  }, []);

  const handleCloseComposer = () => {
    if (hasDraftContent()) {
      toast.warning("Unsaved draft will be discarded");
    }
    setComposerExpanded(false);
    setComposerOpen(false);
    resetComposer();
  };

  // Fix #11: Draft persistence — save to localStorage on every change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!composerExpanded) return; // Only persist when composer is open

    const draft = {
      postType,
      content,
      composerCategoryId,
      imageUrls,
      videoUrl,
      gifUrl,
      pollQuestion,
      pollOptions,
      pollEndDate,
      savedAt: Date.now(),
    };

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`feed-draft-${communityId}`, JSON.stringify(draft));
      } catch {
        // localStorage may be full or unavailable — silently fail
      }
    }, 300); // Debounce writes

    return () => clearTimeout(timer);
  }, [postType, content, composerCategoryId, imageUrls, videoUrl, gifUrl, pollQuestion, pollOptions, pollEndDate, composerExpanded, communityId]);

  // Fix #11: Restore draft from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(`feed-draft-${communityId}`);
      if (!saved) return;

      const draft = JSON.parse(saved);
      // Only restore drafts less than 24 hours old
      if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`feed-draft-${communityId}`);
        return;
      }

      // Restore draft state
      if (draft.postType) setPostType(draft.postType);
      if (draft.content) setContent(draft.content);
      if (draft.composerCategoryId) setComposerCategoryId(draft.composerCategoryId);
      if (draft.imageUrls?.length) setImageUrls(draft.imageUrls);
      if (draft.videoUrl) setVideoUrl(draft.videoUrl);
      if (draft.gifUrl) setGifUrl(draft.gifUrl);
      if (draft.pollQuestion) setPollQuestion(draft.pollQuestion);
      if (draft.pollOptions?.length >= 2) setPollOptions(draft.pollOptions);
      if (draft.pollEndDate) setPollEndDate(draft.pollEndDate);
    } catch {
      // Corrupted draft — ignore
    }
  }, [communityId]);

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
    setUploadProgress({ current: 0, total: files.length }); // Fix #15

    try {
      // Process each file
      let index = 0;
      for (const file of Array.from(files)) {
        // Validate file type
        if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
          setError("Invalid format. Use JPG, PNG, WebP, or GIF.");
          index++;
          setUploadProgress(prev => ({ ...prev, current: index }));
          continue;
        }

        // Validate file size (max 10MB original)
        if (file.size > 10 * 1024 * 1024) {
          setError("File too large. Maximum size is 10MB.");
          index++;
          setUploadProgress(prev => ({ ...prev, current: index }));
          continue;
        }

          try {
            // Compress image before storing (target ~500KB for safety under 1MB Convex limit)
            const compressed = await compressImage(file, 1200, 0.6);
            
            // Fix #2: Check the base64 string length directly (not decoded size)
            // Convex's 1MB limit applies to the stored string, and base64 is ~33% larger than binary
            // Target: compressed base64 string < 700KB to leave headroom for other post data
            const base64StringSize = compressed.length; // Each char = 1 byte in JS string
            if (base64StringSize > 700 * 1024) {
              // Try with more compression
              const moreCompressed = await compressImage(file, 800, 0.4);
              setImageUrls(prev => [...prev, moreCompressed]);
            } else {
              setImageUrls(prev => [...prev, compressed]);
            }
          } catch {
            setError("Failed to process image");
          }
          index++;
          setUploadProgress(prev => ({ ...prev, current: index }));
      }
    } finally {
      setIsUploadingImages(false);
      setUploadProgress({ current: 0, total: 0 }); // Fix #15: reset progress
    }

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Remove image with fade-out animation (AN3)
  const removeImage = (index: number) => {
    setFadingImages(prev => new Set(prev).add(index));
    setTimeout(() => {
      setImageUrls(prev => prev.filter((_, i) => i !== index));
      setFadingImages(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, 200);
  };

  // Validate video URL format
  const isValidVideoUrl = (url: string): boolean => {
    if (!url) return true; // Empty is allowed (optional)
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    return !!(youtubeMatch || vimeoMatch || driveMatch);
  };

  // Validate GIF URL format (Fix #9: check for .gif extension or known GIF hosts)
  const isValidGifUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      new URL(url); // Must be a valid URL
    } catch {
      return false;
    }
    // Check for .gif extension (case-insensitive, ignoring query params)
    const urlWithoutQuery = url.split('?')[0].toLowerCase();
    if (urlWithoutQuery.endsWith('.gif')) return true;
    // Known GIF hosts that may serve GIFs without .gif extension
    const gifHosts = ['giphy.com', 'tenor.com', 'gfycat.com', 'imgur.com'];
    return gifHosts.some(host => url.includes(host));
  };

  // Handle composer submit
  const handleComposerSubmit = async () => {
    if (!userId || !isMember) return;

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
      // Fix #7: Check for duplicate poll options
      const uniqueOptions = new Set(validOptions.map(o => o.trim().toLowerCase()));
      if (uniqueOptions.size < validOptions.length) {
        setError("Poll options must be unique");
        return;
      }
      // Fix #6: Validate poll end date is in the future
      if (pollEndDate) {
        const endDate = new Date(pollEndDate);
        if (endDate.getTime() <= Date.now()) {
          setError("Poll end date must be in the future");
          return;
        }
      }
    }

    setIsLoading(true);
    setError("");

    // Fix #8: Build optimistic post for instant UI feedback
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticPost: Post = {
      _id: optimisticId,
      communityId,
      authorId: userId!,
      author: {
        _id: userId!,
        displayName: user?.fullName || user?.username || "You",
        avatarUrl: user?.imageUrl || null,
      },
      categoryId: composerCategoryId || undefined,
      category: composerCategoryId
        ? categories.find((c: Category) => c._id === composerCategoryId) || null
        : null,
      content: postType === "poll" ? pollQuestion.trim() : content.trim(),
      contentType: postType,
      mediaUrls: postType === "image" ? imageUrls : postType === "gif" ? [gifUrl] : undefined,
      videoUrl: postType === "video" ? videoUrl : undefined,
      pollOptions: postType === "poll"
        ? pollOptions.filter(o => o.trim()).map(text => ({ text: text.trim(), votes: 0 }))
        : undefined,
      pollEndDate: postType === "poll" && pollEndDate ? new Date(pollEndDate).getTime() : undefined,
      isPinned: false,
      upvoteCount: 0,
      commentCount: 0,
      createdAt: Date.now(),
    };

    // Prepend optimistic post to feed
    setAllPosts(prev => [optimisticPost, ...prev]);

    try {
      const postData: Parameters<typeof createPost>[0] = {
        communityId: communityIdTyped,
        content: content.trim(),
        contentType: postType,
        categoryId: composerCategoryId ? composerCategoryId as Id<"categories"> : undefined,
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
        // Fix #6: Include poll end date if set
        if (pollEndDate) {
          postData.pollEndDate = new Date(pollEndDate).getTime();
        }
      }

      await createPost(postData);
      
      toast.success("Post created!");
      setComposerExpanded(false);
      setComposerOpen(false);
      resetComposer();
      // Reset pagination to show the new post at the top
      setCursor(undefined);
    } catch (err) {
      // Rollback: remove optimistic post on failure
      setAllPosts(prev => prev.filter(p => p._id !== optimisticId));
      // Fix #13: Distinguish error types for better messaging
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) {
          setError("Network error. Check your connection and try again.");
        } else if (msg.includes("must be signed in") || msg.includes("unauthorized")) {
          setError("Please sign in to post.");
        } else if (msg.includes("member")) {
          setError("You must be a member of this community to post.");
        } else if (msg.includes("onboarding")) {
          setError("Please complete your profile setup first.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle expand composer
  const handleExpandComposer = () => {
    setComposerOpen(true);
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

  // Separate pinned and regular posts from accumulated posts (memoized to avoid re-filter on every render)
  const pinnedPosts = useMemo(() => allPosts.filter((post: Post) => post.isPinned), [allPosts]);
  const regularPosts = useMemo(() => allPosts.filter((post: Post) => !post.isPinned), [allPosts]);

  if (postsResult === undefined) {
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
    <div className="flex gap-6 flex-col lg:flex-row w-full min-h-dvh">
      {/* Main Feed Column - Full width */}
      <main className="flex-1 min-w-0 w-full max-w-3xl mx-auto">
              {/* Post Composer - First */}
        {isMember && (
          <div className="rounded-2xl p-5 mb-3 bg-bg-elevated" ref={composerRef}>
              {!composerExpanded ? (
                <button
                  onClick={handleExpandComposer}
                  className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg bg-bg-elevated hover:bg-bg-muted transition-colors"
                >
                  {/* User Avatar */}
                  <ComposerAvatar user={user} />
                  <Text theme="muted" className="line-clamp-1">What&apos;s on your mind?</Text>
                </button>
              ) : (
                <div className={`space-y-4 ${prefersReducedMotion ? '' : 'animate-in fade-in slide-in-from-top-2 duration-200'}`}>
                  {/* User Avatar and Name in expanded view */}
                  <div className="flex items-center gap-3">
                    <ComposerAvatar user={user} />
                    <div className="flex-1 min-w-0">
                      <Text fontWeight="semibold" className="truncate">
                        {user?.fullName || user?.username || "User"}
                      </Text>
                    </div>
                  </div>
                  
                  {/* Post Type Selector */}
                  <div className="flex gap-2 pb-3 border-b border-border overflow-x-auto" role="group" aria-label="Post type">
                    {POST_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setPostType(type.value)}
                        aria-label={`Create ${type.label.toLowerCase()} post`}
                        aria-pressed={postType === type.value}
                        className={`px-4 py-2.5 min-h-[44px] rounded-lg transition-colors flex items-center gap-1 ${
                          postType === type.value 
                            ? "bg-primary text-white" 
                            : "bg-bg-elevated hover:bg-bg-muted"
                        }`}
                      >
                        {type.icon}
                        <Text size="sm">{type.label}</Text>
                      </button>
                    ))}
                  </div>

                  {/* Content based on post type */}
                  <div className="space-y-3">
                    {/* Text Post */}
                    {postType === "text" && (
                      <div className="relative">
                        <label htmlFor="post-text" className="sr-only">Post content</label>
                        <TextArea
                          id="post-text"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="What's on your mind?"
                          className="min-h-[100px] pr-12 max-w-prose"
                          autoFocus
                          maxLength={5000}
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
                            <Text size="sm" theme="muted">
                              {uploadProgress.total > 1
                                ? `Processing image ${uploadProgress.current} of ${uploadProgress.total}...`
                                : "Compressing image..."}
                            </Text>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                imageInputRef.current?.click();
                              }
                            }}
                            aria-label="Upload images"
                            className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                              isUploadingImages
                                ? "border-border bg-bg-elevated/50 pointer-events-none cursor-not-allowed"
                                : "border-border cursor-pointer hover:border-primary/50 hover:bg-bg-elevated/50"
                            }`}
                          >
                            <ImagePlus className="w-8 h-8 mx-auto text-text-muted mb-2" />
                            <Text size="sm" theme="muted">Click to upload images</Text>
                            <Text size="2" theme="muted">Max 10MB per image (will be compressed)</Text>
                          </button>
                        )}
                        
                        {/* Image previews */}
                        {imageUrls.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {imageUrls.map((url, i) => (
                              <div key={i} className={`relative group transition-all duration-200 ${fadingImages.has(i) ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={url} 
                                  alt={`Image preview ${i + 1}`} 
                                  loading="lazy"
                                  className="w-20 h-20 object-cover rounded-lg border border-border" 
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(i)}
                                  aria-label="Remove image"
                                  className="absolute -top-2 -right-2 bg-destructive text-white rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center -m-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        <label htmlFor="video-caption" className="sr-only">Video caption</label>
                        <TextArea
                          id="video-caption"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Add a caption (optional)"
                        />
                        <div>
                          <label htmlFor="video-url" className="block text-sm font-medium mb-1">Video URL</label>
                          <Input
                            id="video-url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="Paste YouTube, Vimeo, or Google Drive link"
                            className={videoUrl && !isValidVideoUrl(videoUrl) ? "border-destructive" : ""}
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
                        <label htmlFor="gif-caption" className="sr-only">GIF caption</label>
                        <TextArea
                          id="gif-caption"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Add a caption (optional)"
                        />
                        <div>
                          <label htmlFor="gif-url" className="block text-sm font-medium mb-1">GIF URL</label>
                          <Input
                            id="gif-url"
                            value={gifUrl}
                            onChange={(e) => setGifUrl(e.target.value)}
                            placeholder="Paste GIF URL"
                            className={gifUrl && !isValidGifUrl(gifUrl) ? "border-destructive" : ""}
                          />
                          {gifUrl && !isValidGifUrl(gifUrl) && (
                            <Text size="2" theme="error" className="mt-1">Invalid GIF URL. Must end in .gif or be from a known GIF host</Text>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Poll Post */}
                    {postType === "poll" && (
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="poll-question" className="block text-sm font-medium mb-1">Question</label>
                          <TextArea
                            id="poll-question"
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder="Ask a question..."
                            className="min-h-[60px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Text size="sm" fontWeight="medium">Options</Text>
                          {pollOptions.map((option, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <span
                                aria-hidden="true"
                                className="w-5 h-5 rounded-full border-2 border-border bg-bg-elevated shrink-0 block"
                              />
                              <label htmlFor={`poll-option-${i}`} className="sr-only">Option {i + 1}</label>
                              <Input
                                id={`poll-option-${i}`}
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
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-destructive hover:bg-destructive/10 rounded shrink-0"
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
                              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-muted transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              <Text size="sm">Add option</Text>
                            </button>
                          )}
                        </div>
                        {/* Fix #6: Poll end date/time picker with timezone-safe min */}
                        <div className="space-y-2">
                          <Text size="sm" fontWeight="medium">End date (optional)</Text>
                          <Input
                            type="datetime-local"
                            value={pollEndDate}
                            onChange={(e) => setPollEndDate(e.target.value)}
                            min={(() => {
                              const d = new Date(Date.now() + 60 * 60 * 1000);
                              const pad = (n: number) => String(n).padStart(2, '0');
                              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                            })()}
                            className="max-w-xs"
                          />
                          <Text size="2" theme="muted">Leave empty for no expiration</Text>
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
                              onClick={() => setComposerCategoryId(
                                composerCategoryId === cat._id ? "" : cat._id
                              )}
                              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                composerCategoryId === cat._id
                                  ? "text-white"
                                  : "bg-bg-elevated hover:bg-bg-muted"
                              }`}
                              style={{ 
                                backgroundColor: composerCategoryId === cat._id ? cat.color : undefined,
                                // S6: Add opacity overlay for better dark mode compatibility
                                ...(composerCategoryId === cat._id ? { mixBlendMode: 'normal' } : {})
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
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md" role="alert">
                      <Text size="sm" theme="error">{error}</Text>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between pt-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={handleCloseComposer}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleComposerSubmit} 
                      disabled={isLoading}
                      aria-busy={isLoading}
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
        <nav className="flex gap-2 mb-4 items-center flex-wrap" aria-label="Feed filters">
          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 flex-1 items-center [mask-image:linear-gradient(to_right,black_calc(100%-1rem),transparent)] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-1rem),transparent)]" role="group" aria-label="Filter by category">
            <button
              onClick={() => setSelectedCategoryId(null)}
              aria-label="Show all categories"
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
                aria-label={`Filter by ${cat.name}`}
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
              aria-expanded={showSortDropdown}
              aria-haspopup="listbox"
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                selectedSort !== "newest"
                  ? "bg-primary text-white"
                  : "bg-bg-elevated text-text-secondary hover:bg-bg-muted"
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              {SORT_OPTIONS.find(o => o.value === selectedSort)?.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {/* Sort Dropdown Menu — AN1: enter animation */}
            {showSortDropdown && (
              <div className={`absolute right-0 top-full mt-1 z-[100] rounded-lg bg-bg-elevated p-1 max-w-[calc(100vw-2rem)] ${prefersReducedMotion ? '' : 'animate-in fade-in zoom-in-95 duration-200'}`} role="listbox" aria-label="Sort options">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedSort(option.value);
                      setShowSortDropdown(false);
                    }}
                    role="option"
                    aria-selected={selectedSort === option.value}
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
        </nav>

        {/* Feed - Third */}
        {allPosts.length === 0 ? (
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
                    post={{ ...post, communityId }}
                    communityId={communityId}
                    currentUserId={userId}
                    isAdmin={isAdmin}
                    isOwner={isOwner}
                    onAuthorClick={(clerkId: string) => setProfileUserId(clerkId)}
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
                post={{ ...post, communityId }}
                communityId={communityId}
                currentUserId={userId}
                isAdmin={isAdmin}
                isOwner={isOwner}
                onAuthorClick={(clerkId: string) => setProfileUserId(clerkId)}
              />
            ))}

            {/* Load More Button (Fix #1: pagination) */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  variant="secondary"
                  size="sm"
                >
                  {isLoadingMore ? "Loading..." : "Load more posts"}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Right Sidebar - QuickInfoCard */}
      <aside className="w-full lg:w-80 shrink-0 order-first lg:order-none">
        {communityData ? (
          <QuickInfoCard
            community={communityData}
            isOwner={isOwner}
            isMember={isMember}
            streak={communityStats?.streak || 0}
            onJoinClick={() => {}}
            onEditClick={() => setShowEditModal(true)}
            onInviteClick={() => setShowInviteModal(true)}
            onThumbnailChange={async (data) => {
              try {
                await updateCommunity({
                  communityId: communityIdTyped,
                  logoUrl: data,
                });
                toast.success("Thumbnail updated!");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update thumbnail");
              }
            }}
            onTaglineChange={async (value) => {
              try {
                await updateCommunity({
                  communityId: communityIdTyped,
                  tagline: value,
                });
                toast.success("Description updated!");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update description");
              }
            }}
            onLinksChange={async (links) => {
              try {
                await updateCommunity({
                  communityId: communityIdTyped,
                  links: links,
                });
                toast.success("Links updated!");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update links");
              }
            }}
          />
        ) : (
          <Skeleton className="h-64" />
        )}
      </aside>

      {/* Invite Friend Modal */}
      <InviteFriendModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        communityName={communityData?.name || "Community"}
        communitySlug={communitySlug}
      />

      {/* Edit Community Modal */}
      {communityData && (
        <EditCommunityModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          community={communityData}
        />
      )}

      {/* Profile Panel */}
      <div ref={profilePanelRef}>
        <ProfilePanel
          userId={profileUserId || undefined}
          open={!!profileUserId}
          onOpenChange={(open) => { if (!open) setProfileUserId(null); }}
        />
      </div>
    </div>
  );
}
