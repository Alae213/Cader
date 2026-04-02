"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Text, Heading } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Users, Edit3, Play, Lock, Star, Ticket, X, Check, Trash } from "lucide-react";
import { QuickInfoCard } from "./QuickInfoCard";
import { EditCommunityModal } from "./EditCommunityModal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";

// Video URL validation and embed conversion
function getEmbedUrl(videoUrl: string): string | null {
  if (!videoUrl) return null;
  
  // YouTube
  const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  
  // Vimeo
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  // Google Drive
  const driveMatch = videoUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  
  return null;
}

function getVideoPlatform(videoUrl: string): string | null {
  if (!videoUrl) return null;
  if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) return "YouTube";
  if (videoUrl.includes("vimeo.com")) return "Vimeo";
  if (videoUrl.includes("drive.google.com")) return "Google Drive";
  return null;
}

// Video Modal Component
function VideoModal({
  open,
  onOpenChange,
  url,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string;
  onSave: (url: string) => void;
}) {
  const [inputValue, setInputValue] = useState(url || "");
  const [error, setError] = useState("");
  
  // Sync URL when modal opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue(url || "");
      setError("");
    }
  }, [open, url]);

  const embedUrl = getEmbedUrl(inputValue);
  const platform = getVideoPlatform(inputValue);
  const isValid = inputValue === "" || embedUrl !== null;

  const handleSave = () => {
    if (!inputValue.trim()) {
      onSave("");
      onOpenChange(false);
      return;
    }
    
    if (!embedUrl) {
      setError("Invalid URL. Use YouTube, Vimeo, or Google Drive links.");
      return;
    }
    
    onSave(inputValue);
    onOpenChange(false);
    toast.success("Video updated");
  };

  const handleRemove = () => {
    onSave("");
    onOpenChange(false);
    toast.success("Video removed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Add Video</DialogTitle>
        
        <div className="space-y-4">
          {/* URL Input */}
          <div className="p-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError("");
              }}
              placeholder="Paste YouTube, Vimeo, or Google Drive link"
              className={!isValid ? "border-red-500" : ""}
            />
            {inputValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-bg-surface rounded-md hover:bg-error/20 hover:text-error backdrop-blur-lg"
                onClick={() => {
                  setInputValue("");
                  setError("");
                }}
              >
                <Trash className="w-3 h-3" />
              </Button>
            )}
            {error && <Text size="2" theme="error" className="mt-1">{error}</Text>}
          </div>

          {/* Live Preview */}
          {embedUrl ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-surface">
              <iframe
                title="Video preview"
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-surface justify-center items-center flex">
              <div className="text-center">
                <Text size="3" theme="secondary">Video preview will appear here</Text>
              </div>
            </div>
          )}

          {/* Platform indicator */}
          {inputValue && platform && embedUrl && (
            <Text size="2" theme="secondary">
              Platform: {platform}
            </Text>
          )}

          {/* Validation feedback */}
          {inputValue && !embedUrl && (
            <Text size="2" theme="error">
              Invalid video URL
            </Text>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-4 w-full">
          <div className="flex gap-2 ml-auto w-full">
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} className="w-full">
              Cancel
            </Button>
            <Button size="md" onClick={handleSave} className="w-full">
              <Check className="w-4 h-4 mr-1" /> Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Video embed component
function VideoEmbed({ 
  url, 
  onChange,
  isOwner,
  modalOpen,
  onModalOpenChange,
}: { 
  url?: string; 
  onChange?: (url: string) => void;
  isOwner: boolean;
  modalOpen?: boolean;
  onModalOpenChange?: (open: boolean) => void;
}) {
  const embedUrl = url ? getEmbedUrl(url) : null;

  // Owner: show video with edit button
  if (embedUrl) {
    return (
      <>
        <div className="relative aspect-video rounded-[16px] overflow-hidden bg-bg-elevated ">
          <iframe
            title="Community video introduction"
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {isOwner && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={() => onModalOpenChange?.(true)}
            >
              <Edit3 className="w-4 h-4 mr-1" /> Edit
            </Button>
          )}
        </div>
        {isOwner && modalOpen !== undefined && (
          <VideoModal
            open={modalOpen}
            onOpenChange={onModalOpenChange!}
            url={url}
            onSave={onChange!}
          />
        )}
      </>
    );
  }

  // Owner: show add placeholder
  if (isOwner) {
    return (
      <>
        <div 
          className="aspect-video hover:bg-accent-subtle rounded-[16px] bg-black/50 shadow-input-shadow border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-accent transition-colors"
          onClick={() => onModalOpenChange?.(true)}
        >
          <div className="text-center">
            <Play className="w-12 h-12 mx-auto text-text-muted mb-2" />
            <Text theme="secondary">Add a video to introduce your community</Text>
          </div>
        </div>
        {modalOpen !== undefined && (
          <VideoModal
            open={modalOpen}
            onOpenChange={onModalOpenChange!}
            url={url}
            onSave={onChange!}
          />
        )}
      </>
    );
  }

  // Non-owner empty state
  return (
    <div className="aspect-video rounded-[16px] bg-bg-elevated flex items-center justify-center">
      <Text theme="muted">No video introduction yet.</Text>
    </div>
  );
}

// Format price for display
function formatPrice(pricingType?: string, priceDzd?: number): string {
  if (!pricingType || pricingType === "free") return "Free";
  if (!priceDzd) return "";
  
  const typeLabels: Record<string, string> = {
    monthly: "/mo",
    annual: "/yr",
    one_time: "",
  };
  
  return `${priceDzd.toLocaleString()} DZD${typeLabels[pricingType] || ""}`;
}

interface AboutTabProps {
  community: {
    _id: string;
    name: string;
    slug: string;
    tagline?: string;
    description?: string;
    logoUrl?: string;
    videoUrl?: string;
    links?: string[];
    pricingType: string;
    priceDzd?: number;
    memberCount: number;
    onlineCount?: number;
    ownerName?: string;
    ownerAvatar?: string | null;
  };
  isOwner: boolean;
  isMember: boolean;
  onJoinClick: () => void;
}

export function AboutTab({ 
  community, 
  isOwner, 
  isMember,
  onJoinClick,
}: AboutTabProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  
  // Fetch community stats for streak
  const communityStats = useQuery(
    api.functions.communities.getCommunityStats,
    { communityId: community._id as Id<"communities"> }
  );
  
  // Mutations for inline editing
  const updateCommunity = useMutation(api.functions.communities.updateCommunity);

  const [savingField, setSavingField] = useState<string | null>(null);
  
  // Description state with debounce
  const [description, setDescription] = useState(community.description || "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  };

  // Sync description when community data changes
  useEffect(() => {
    setDescription(community.description || "");
    // Adjust height after content loads
    setTimeout(adjustTextareaHeight, 0);
  }, [community.description]);

  // Auto-save function
  const saveDescription = useCallback(async (text: string) => {
    if (text === community.description) return; // No changes
    try {
      setSavingField("description");
      await updateCommunity({ communityId: community._id as Id<"communities">, description: text });
    } catch {
      toast.error("Failed to save description");
    } finally {
      setSavingField(null);
    }
  }, [community._id, community.description, updateCommunity]);

  // Handle description change with debounce (left section)
  const handleDescriptionChange = useCallback((text: string) => {
    setDescription(text);
    
    // Clear existing timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new timer for 1.5s auto-save
    debounceRef.current = setTimeout(() => {
      saveDescription(text);
    }, 1500);
    
    // Adjust height after state update
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      }
    }, 0);
  }, [saveDescription]);

  // Handle blur - save immediately
  const handleDescriptionBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    saveDescription(description);
  }, [description, saveDescription]);

  // Handle tagline change (right section - ShortDescription)
  const handleTaglineChange = useCallback(async (tagline: string) => {
    try {
      setSavingField("tagline");
      await updateCommunity({ communityId: community._id as Id<"communities">, tagline });
    } catch {
      toast.error("Failed to save tagline");
    } finally {
      setSavingField(null);
    }
  }, [community._id, updateCommunity]);

  // Handle video change
  const handleVideoChange = useCallback(async (url: string) => {
    try {
      setSavingField("video");
      await updateCommunity({ communityId: community._id as Id<"communities">, videoUrl: url });
      toast.success("Video updated");
    } catch {
      toast.error("Failed to update video");
    } finally {
      setSavingField(null);
    }
  }, [community._id, updateCommunity]);

  // Handle thumbnail change
  const handleThumbnailChange = useCallback(async (thumbnailData: string) => {
    try {
      setSavingField("thumbnail");
      await updateCommunity({ communityId: community._id as Id<"communities">, logoUrl: thumbnailData });
      toast.success("Thumbnail updated");
    } catch {
      toast.error("Failed to update thumbnail");
    } finally {
      setSavingField(null);
    }
  }, [community._id, updateCommunity]);

  // Handle links change
  const handleLinksChange = useCallback(async (links: string[]) => {
    try {
      setSavingField("links");
      await updateCommunity({ communityId: community._id as Id<"communities">, links });
      toast.success("Links updated");
    } catch {
      toast.error("Failed to update links");
    } finally {
      setSavingField(null);
    }
  }, [community._id, updateCommunity]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left Column - Full Width */}
      <div className="flex-1">
        
        <Card className="space-y-2">
        {/* Video Embed */}
        <VideoEmbed 
          url={community.videoUrl} 
          isOwner={isOwner}
          onChange={handleVideoChange}
          modalOpen={videoModalOpen}
          onModalOpenChange={setVideoModalOpen}
        />

        {/* Owner Info + Stats */}
        <div>
          <CardContent className="pt-4">
            <div className="flex items-center gap-7 px-3">
              {/* Privet */}
              <div className="flex items-center gap-2">
                <Lock className="w-6 h-6 text-text-muted text-reglure" />
                <Text size="4" theme="secondary">Privet</Text>
              </div>

              {/* Members */}
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-text-muted text-reglure" />
                <Text size="4">{community.memberCount} members</Text>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2">
                <Ticket className="w-6 h-6 text-text-muted text-reglure" />
                <Text size="4">{formatPrice(community.pricingType, community.priceDzd)}</Text>
              </div>

              {/* Avatar + Name + Star */}
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-bg-elevated border border-border/50 flex items-center justify-center">
                  {community.ownerAvatar ? (
                    <img 
                      src={community.ownerAvatar}  
                      alt={community.ownerName || "Owner"}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[8px] font-medium text-text-primary text-reglure">
                      {community.ownerName ? getInitials(community.ownerName) : "?"}
                    </span>
                  )}
                </div>
                <Text size="4" className="font-medium text-reglure">{community.ownerName || "Unknown"}</Text>
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </div>
            </div>
          </CardContent>
        </div>

        {/* Description */}
        {isOwner ? (
          <CardContent className="pt-2">
            <textarea
              ref={textareaRef}
              className="w-full p-2 bg-bg-transparent hover:bg-bg-elevated focus:bg-bg-elevated rounded-lg text-text-primary resize-none focus:outline-none transition-colors text-sm overflow-hidden "
              placeholder="Write a description..."
              value={description}
              onChange={(e) => {
                handleDescriptionChange(e.target.value);
                adjustTextareaHeight();
              }}
              onBlur={handleDescriptionBlur}
              style={{ height: "auto" }}
            />
            {savingField === "description" && (
              <Text size="1" theme="muted" className="mt-1">Saving...</Text>
            )}
          </CardContent>
        ) : community.description ? (
          <CardContent className="pt-2">
            <Text size="2" className="whitespace-pre-wrap">{community.description}</Text>
          </CardContent>
        ) : null}

        
      </Card>

      </div>

      {/* Right Column - QuickInfoCard */}
      <div className="flex flex-col gap-4">
        <QuickInfoCard
          community={community}
          isOwner={isOwner}
          isMember={isMember}
          streak={communityStats?.streak || 0}
          onJoinClick={onJoinClick}
          onEditClick={() => setEditModalOpen(true)}
          onThumbnailChange={handleThumbnailChange}
          onTaglineChange={handleTaglineChange}
          onLinksChange={handleLinksChange}
        />
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

      {/* Edit Community Modal */}
      <EditCommunityModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        community={community}
      />
    </div>
  );
}
