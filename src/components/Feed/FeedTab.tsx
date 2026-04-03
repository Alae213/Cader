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
import { useComposerState } from "@/hooks/useComposerState";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
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

  // --- Presence heartbeat ---
  usePresenceHeartbeat(communityId, !!userId);

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

  // --- Composer state (consolidated) ---
  const composer = useComposerState({
    communityId,
    onResetImages: () => {
      // Image URLs are managed by useImageUpload hook — reset handled separately
    },
  });

  // --- Image upload ---
  const {
    imageUrls,
    isUploadingImages,
    uploadProgress,
    fadingImages,
    isDragOver,
    imageInputRef,
    handleImageSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
    removeImage,
  } = useImageUpload();

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);

  // --- Composer actions ---
  const handleCloseComposer = useCallback(() => {
    composer.close();
  }, [composer]);

  const handleExpandComposer = useCallback(() => {
    composer.expand();
  }, [composer]);

  // Click-outside handler for composer
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (composerRef.current && !composerRef.current.contains(event.target as Node)) {
        if (composer.expanded) {
          composer.close();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [composer]);

  // Submit handler
  const handleComposerSubmit = useCallback(async (data: {
    postType: "text" | "image" | "video";
    content: string;
    categoryId?: string;
    imageUrls?: string[];
    videoUrl?: string;
  }) => {
    if (!userId || !isMember) return;

    setIsSubmitting(true);
    composer.setError("");

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

      await createPost(postData);
      toast.success("Post created!");
      handleCloseComposer();
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) {
          composer.setError("Network error. Check your connection and try again.");
        } else if (msg.includes("must be signed in") || msg.includes("unauthorized")) {
          composer.setError("Please sign in to post.");
        } else if (msg.includes("member")) {
          composer.setError("You must be a member of this community to post.");
        } else if (msg.includes("onboarding")) {
          composer.setError("Please complete your profile setup first.");
        } else {
          composer.setError(err.message);
        }
      } else {
        composer.setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, isMember, communityIdTyped, createPost, handleCloseComposer, composer]);

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
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left Column - Full Width */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Post Composer */}
        <div ref={composerRef}>
          <PostComposer
            user={user ? {
              imageUrl: user.imageUrl,
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username,
              fullName: user.fullName,
            } : undefined}
            isMember={isMember}
            categories={categories}
            composerExpanded={composer.expanded}
            onExpand={handleExpandComposer}
            onClose={handleCloseComposer}
            onSubmit={handleComposerSubmit}
            isLoading={isSubmitting}
            error={composer.error}
            onErrorChange={composer.setError}
            imageUrls={imageUrls}
            isUploadingImages={isUploadingImages}
            uploadProgress={uploadProgress}
            fadingImages={fadingImages}
            imageInputRef={imageInputRef}
            onImageSelect={handleImageSelect}
            onRemoveImage={removeImage}
            isDragOver={isDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            postType={composer.postType}
            onPostTypeChange={composer.setPostType}
            content={composer.content}
            onContentChange={composer.setContent}
            composerCategoryId={composer.categoryId}
            onCategoryIdChange={composer.setCategoryId}
            videoUrl={composer.videoUrl}
            onVideoUrlChange={composer.setVideoUrl}
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
      </div>

      {/* Right Column - QuickInfoCard */}
      <div className="flex flex-col gap-4">
        {communityData ? (
          <QuickInfoCard
            community={communityData}
            isOwner={isOwner}
            isMember={isMember}
            streak={communityStats?.streak || 0}
            onJoinClick={() => {}}
            onEditClick={() => setShowEditModal(true)}
            onThumbnailChange={(thumbnailData) => updateCommunity({ communityId: communityIdTyped, logoUrl: thumbnailData })}
            onTaglineChange={(tagline) => updateCommunity({ communityId: communityIdTyped, tagline })}
            onLinksChange={(links) => updateCommunity({ communityId: communityIdTyped, links })}
          />
        ) : (
          <Skeleton className="h-64" />
        )}
        <Text size="2" className="text-text-secondary text-center flex items-center justify-center gap-1">
          Powered by
          <svg 
              width="18" 
              height="18" 
              viewBox="0 0 16 16" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <path d="M15.9502 2.68053C15.95 1.97316 15.669 1.29482 15.1688 0.794634C14.6686 0.294447 13.9902 0.0133573 13.2829 0.0131584C11.9891 3.34419e-05 10.9204 0.924408 10.6552 2.13903H10.5892C10.4662 1.53766 10.1397 0.997068 9.66463 0.60835C9.18957 0.219633 8.59504 0.00655129 7.98121 0.0050099C7.36739 0.00346851 6.77179 0.213562 6.29479 0.599888C5.81778 0.986215 5.48852 1.52516 5.36249 2.12591H5.29649C5.19833 1.65187 4.97337 1.21336 4.64561 0.857102C4.31785 0.500846 3.89957 0.2402 3.43534 0.102946C2.97111 -0.034308 2.47834 -0.0430266 2.00955 0.0777195C1.54076 0.198466 1.11351 0.444151 0.773352 0.78859C0.433193 1.13303 0.192869 1.56331 0.0779936 2.03358C-0.0368817 2.50384 -0.0220025 2.99647 0.121045 3.45894C0.264093 3.92142 0.529948 4.33641 0.890275 4.65969C1.2506 4.98297 1.69189 5.20243 2.16712 5.29466V5.34753C1.55751 5.46642 1.00821 5.79356 0.613293 6.27293C0.218378 6.7523 0.00242551 7.35407 0.00242551 7.97516C0.00242551 8.59625 0.218378 9.19802 0.613293 9.67739C1.00821 10.1568 1.55751 10.4839 2.16712 10.6028V10.6553C1.69141 10.7457 1.24922 10.9637 0.887841 11.286C0.526461 11.6083 0.259487 12.0227 0.115472 12.485C-0.0285422 12.9473 -0.0441795 13.4401 0.0702328 13.9106C0.184645 14.3811 0.424803 14.8117 0.765021 15.1562C1.10524 15.5008 1.53272 15.7464 2.00174 15.8667C2.47076 15.9871 2.96368 15.9777 3.42777 15.8396C3.89187 15.7014 4.30968 15.4397 4.63653 15.0825C4.96338 14.7252 5.18696 14.2858 5.28337 13.8113H5.34937C5.60024 15.0259 6.68287 15.9488 7.96387 15.9488C8.58005 15.9516 9.178 15.7398 9.65503 15.3498C10.1321 14.9597 10.4584 14.4158 10.578 13.8113H10.644C10.8949 15.0259 11.9775 15.9488 13.2585 15.9488C13.9224 15.9472 14.5619 15.6985 15.0525 15.2512C15.5431 14.8039 15.8495 14.1899 15.9122 13.529C15.9748 12.868 15.7891 12.2074 15.3913 11.6759C14.9935 11.1444 14.412 10.78 13.7602 10.6538V10.6013C14.3699 10.4824 14.9192 10.1553 15.3141 9.67589C15.709 9.19652 15.9249 8.59475 15.9249 7.97366C15.9249 7.35257 15.709 6.7508 15.3141 6.27143C14.9192 5.79206 14.3699 5.46492 13.7602 5.34603V5.29316C14.3743 5.1849 14.9305 4.86358 15.3311 4.38572C15.7317 3.90786 15.9509 3.30407 15.9502 2.68053ZM12.2662 11.6457C12.2664 11.7272 12.2504 11.808 12.2193 11.8833C12.1882 11.9587 12.1425 12.0272 12.0848 12.0848C12.0271 12.1425 11.9587 12.1882 11.8833 12.2193C11.8079 12.2505 11.7272 12.2664 11.6456 12.2663H4.31774C4.2362 12.2664 4.15543 12.2505 4.08007 12.2193C4.0047 12.1882 3.93623 12.1425 3.87857 12.0848C3.82091 12.0272 3.7752 11.9587 3.74406 11.8833C3.71292 11.808 3.69697 11.7272 3.69712 11.6457V4.31778C3.69697 4.23624 3.71292 4.15547 3.74406 4.0801C3.7752 4.00474 3.82091 3.93626 3.87857 3.8786C3.93623 3.82094 4.0047 3.77524 4.08007 3.7441C4.15543 3.71296 4.2362 3.69701 11.6456 3.69716H11.6456C11.7272 3.69701 11.8079 3.71296 11.8833 3.7441C11.9587 3.77524 12.0271 3.82094 12.0848 3.8786C12.1425 3.93626 12.1882 4.00474 12.2193 4.0801C12.2504 4.15547 12.2664 4.23624 12.2662 4.31778V11.6457Z" fill="currentColor"/>
            </svg>
            
        </Text>
      </div>

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
