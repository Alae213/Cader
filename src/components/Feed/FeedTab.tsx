"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Id } from "../../../convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFeedData, Post } from "@/hooks/useFeedData";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { PostComposer } from "./PostComposer";
import { FeedFilters } from "./FeedFilters";
import { FeedList } from "./FeedList";
import { QuickInfoCard } from "@/components/community/QuickInfoCard";
import { EditCommunityModal } from "@/components/community/EditCommunityModal";
import { ProfilePanel } from "@/components/community/ProfilePanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Copy, Check } from "lucide-react";

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

interface FeedTabProps {
  communityId: string;
  communitySlug?: string;
}

export function FeedTab({ communityId, communitySlug = "" }: FeedTabProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const prefersReducedMotion = useReducedMotion();
  const communityIdTyped = communityId as Id<"communities">;

  // --- Data layer ---
  const {
    allPosts,
    status,
    loadMore,
    hasMore,
    isLoadingMore,
    categories,
    communityData,
    communityStats,
    isOwner,
    isAdmin,
    isMember,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedSort,
    setSelectedSort,
  } = useFeedData(communityId);

  // --- Composer state ---
  const [, setComposerOpen] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [postType, setPostType] = useState<"text" | "image" | "video" | "gif" | "poll">("text");
  const [content, setContent] = useState("");
  const [composerCategoryId, setComposerCategoryId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollEndDate, setPollEndDate] = useState("");
  const [composerError, setComposerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);

  // --- Image upload ---
  const {
    imageUrls,
    isUploadingImages,
    uploadProgress,
    fadingImages,
    imageInputRef,
    handleImageSelect,
    removeImage,
  } = useImageUpload();

  // --- Draft persistence ---
  const { restoreDraft, saveDraft } = useDraftPersistence(communityId, composerExpanded);

  // Restore draft on mount
  useEffect(() => {
    restoreDraft({
      setPostType,
      setContent,
      setComposerCategoryId,
      setImageUrls: () => {},
      setVideoUrl,
      setGifUrl,
      setPollQuestion,
      setPollOptions,
      setPollEndDate,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save draft on state change
  useEffect(() => {
    saveDraft({
      postType,
      content,
      composerCategoryId,
      imageUrls,
      videoUrl,
      gifUrl,
      pollQuestion,
      pollOptions,
      pollEndDate,
    });
  }, [postType, content, composerCategoryId, imageUrls, videoUrl, gifUrl, pollQuestion, pollOptions, pollEndDate, saveDraft]);

  // --- Modal state ---
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);

  // N1: Focus management
  useEffect(() => {
    if (profileUserId && profilePanelRef.current) {
      const focusable = profilePanelRef.current.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusable?.focus();
    }
  }, [profileUserId]);

  // --- Mutations ---
  const createPost = useMutation(api.functions.feed.createPost);
  const updateCommunity = useMutation(api.functions.communities.updateCommunity);

  // --- Composer actions ---
  const resetComposer = useCallback(() => {
    setContent("");
    setComposerCategoryId("");
    setVideoUrl("");
    setGifUrl("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollEndDate("");
    setPostType("text");
    setComposerError("");
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`feed-draft-${communityId}`);
    }
  }, [communityId]);

  const handleCloseComposer = useCallback(() => {
    setComposerExpanded(false);
    setComposerOpen(false);
    resetComposer();
  }, [resetComposer]);

  const handleExpandComposer = useCallback(() => {
    setComposerOpen(true);
    setComposerExpanded(true);
  }, []);

  // Click-outside handler for composer
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (composerRef.current && !composerRef.current.contains(event.target as Node)) {
        if (composerExpanded) {
          setComposerExpanded(false);
          setComposerOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [composerExpanded]);

  // Submit handler
  const handleComposerSubmit = useCallback(async (data: {
    postType: "text" | "image" | "video" | "gif" | "poll";
    content: string;
    categoryId?: string;
    imageUrls?: string[];
    videoUrl?: string;
    gifUrl?: string;
    pollQuestion?: string;
    pollOptions?: { text: string; votes: number }[];
    pollEndDate?: number;
  }) => {
    if (!userId || !isMember) return;

    setIsSubmitting(true);
    setComposerError("");

    try {
      const postData: Parameters<typeof createPost>[0] = {
        communityId: communityIdTyped,
        content: data.content.trim(),
        contentType: data.postType,
        categoryId: data.categoryId ? data.categoryId as Id<"categories"> : undefined,
      };

      if (data.postType === "image" && data.imageUrls?.length) {
        postData.mediaUrls = data.imageUrls;
      }
      if (data.postType === "video" && data.videoUrl) {
        postData.videoUrl = data.videoUrl;
      }
      if (data.postType === "gif" && data.gifUrl) {
        postData.mediaUrls = [data.gifUrl];
      }
      if (data.postType === "poll") {
        postData.pollOptions = data.pollOptions || [];
        postData.content = data.pollQuestion || data.content;
        if (data.pollEndDate) {
          postData.pollEndDate = data.pollEndDate;
        }
      }

      await createPost(postData);
      toast.success("Post created!");
      handleCloseComposer();
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) {
          setComposerError("Network error. Check your connection and try again.");
        } else if (msg.includes("must be signed in") || msg.includes("unauthorized")) {
          setComposerError("Please sign in to post.");
        } else if (msg.includes("member")) {
          setComposerError("You must be a member of this community to post.");
        } else if (msg.includes("onboarding")) {
          setComposerError("Please complete your profile setup first.");
        } else {
          setComposerError(err.message);
        }
      } else {
        setComposerError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, isMember, communityIdTyped, createPost, handleCloseComposer]);

  // --- Loading skeleton ---
  if (status === "LoadingFirstPage") {
    return (
      <div className="flex gap-6 flex-col lg:flex-row">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <div className="w-full lg:w-80 space-y-4">
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // --- Main render ---
  return (
    <div className="flex gap-6 flex-col lg:flex-row w-full min-h-dvh">
      {/* Main Feed Column */}
      <main className="flex-1 min-w-0 w-full max-w-3xl mx-auto">
        {/* Post Composer */}
        <div ref={composerRef}>
          <PostComposer
            user={user}
            isMember={isMember}
            categories={categories}
            composerExpanded={composerExpanded}
            onExpand={handleExpandComposer}
            onClose={handleCloseComposer}
            onSubmit={handleComposerSubmit}
            isLoading={isSubmitting}
            error={composerError}
            onErrorChange={setComposerError}
            imageUrls={imageUrls}
            isUploadingImages={isUploadingImages}
            uploadProgress={uploadProgress}
            fadingImages={fadingImages}
            imageInputRef={imageInputRef}
            onImageSelect={handleImageSelect}
            onRemoveImage={removeImage}
            postType={postType}
            onPostTypeChange={setPostType}
            content={content}
            onContentChange={setContent}
            composerCategoryId={composerCategoryId}
            onCategoryIdChange={setComposerCategoryId}
            videoUrl={videoUrl}
            onVideoUrlChange={setVideoUrl}
            gifUrl={gifUrl}
            onGifUrlChange={setGifUrl}
            pollQuestion={pollQuestion}
            onPollQuestionChange={setPollQuestion}
            pollOptions={pollOptions}
            onPollOptionsChange={setPollOptions}
            pollEndDate={pollEndDate}
            onPollEndDateChange={setPollEndDate}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>

        {/* Category Filter and Sort */}
        <FeedFilters
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          selectedSort={selectedSort}
          setSelectedSort={setSelectedSort}
        />

        {/* Post List */}
        <FeedList
          posts={allPosts as unknown as Post[]}
          communityId={communityId}
          userId={userId}
          isAdmin={isAdmin}
          isOwner={isOwner}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
          onAuthorClick={(clerkId: string) => setProfileUserId(clerkId)}
        />
      </main>

      {/* Right Sidebar */}
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
                await updateCommunity({ communityId: communityIdTyped, logoUrl: data });
                toast.success("Thumbnail updated!");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update thumbnail");
              }
            }}
            onTaglineChange={async (value) => {
              try {
                await updateCommunity({ communityId: communityIdTyped, tagline: value });
                toast.success("Description updated!");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update description");
              }
            }}
            onLinksChange={async (links) => {
              try {
                await updateCommunity({ communityId: communityIdTyped, links });
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

      {/* Modals */}
      <InviteFriendModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        communityName={communityData?.name || "Community"}
        communitySlug={communitySlug}
      />

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
