"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, Edit3, Play, Lock, Star, Ticket } from "lucide-react";
import { QuickInfoCard } from "./QuickInfoCard";
import { EditCommunityModal } from "./EditCommunityModal";

// Video embed component
function VideoEmbed({ 
  url, 
  onChange,
  isOwner 
}: { 
  url?: string; 
  onChange?: (url: string) => void;
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(url || "");
  const [error, setError] = useState("");

  // Validate and convert URL to embed format
  const getEmbedUrl = (videoUrl: string): string | null => {
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
    
    // Google Drive (direct embed)
    const driveMatch = videoUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    
    return null;
  };

  const embedUrl = url ? getEmbedUrl(url) : null;

  const handleSave = () => {
    if (!inputValue) {
      if (onChange) {
        onChange("");
      }
      setEditing(false);
      return;
    }

    const valid = getEmbedUrl(inputValue);
    if (!valid) {
      setError("Invalid video URL. Use YouTube, Vimeo, or Google Drive links.");
      return;
    }
    
    setError("");
    if (onChange) {
      onChange(inputValue);
    }
    setEditing(false);
  };

  if (isOwner && editing) {
    return (
      <div className="space-y-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Paste YouTube, Vimeo, or Google Drive link"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        {error && <Text size="2" theme="error">{error}</Text>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (embedUrl) {
    return (
      <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-elevated">
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
            onClick={() => setEditing(true)}
          >
            <Edit3 className="w-4 h-4 mr-1" /> Edit
          </Button>
        )}
      </div>
    );
  }

  // Placeholder when no video
  if (isOwner) {
    return (
      <div 
        className="aspect-video rounded-lg bg-bg-elevated border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent transition-colors"
        onClick={() => setEditing(true)}
      >
        <div className="text-center">
          <Play className="w-12 h-12 mx-auto text-text-muted mb-2" />
          <Text theme="secondary">Add a video to introduce your community</Text>
        </div>
      </div>
    );
  }

  // Non-owner empty state
  return (
    <div className="aspect-video rounded-lg bg-bg-elevated flex items-center justify-center">
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Left Column - Video + Description */}
      <Card className="lg:col-span-2 space-y-2">
        {/* Video Embed */}
        <VideoEmbed 
          url={community.videoUrl} 
          isOwner={isOwner}
          onChange={handleVideoChange}
        />

        {/* Owner Info + Stats */}
        <div>
          <CardContent className="pt-4">
            <div className="flex items-center gap-6">
              {/* Privet */}
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-text-muted" />
                <Text size="2" theme="secondary">Privet</Text>
              </div>

              {/* Members */}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-text-muted" />
                <Text size="2">{community.memberCount} members</Text>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-text-muted" />
                <Text size="2">{formatPrice(community.pricingType, community.priceDzd)}</Text>
              </div>

              {/* Avatar + Name + Star */}
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-bg-elevated border border-border flex items-center justify-center">
                  {community.ownerAvatar ? (
                    <img 
                      src={community.ownerAvatar} 
                      alt={community.ownerName || "Owner"}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[8px] font-medium text-text-primary">
                      {community.ownerName ? getInitials(community.ownerName) : "?"}
                    </span>
                  )}
                </div>
                <Text size="2" className="font-medium">{community.ownerName || "Unknown"}</Text>
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              </div>
            </div>
          </CardContent>
        </div>

        {/* Description */}
        {isOwner ? (
          <CardContent className="pt-2">
            <textarea
              ref={textareaRef}
              className="w-full p-3 text-sm bg-bg-subtle hover:bg-bg-elevated focus:bg-bg-elevated rounded-lg resize-none focus:outline-none transition-colors"
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

      {/* Right Column - QuickInfoCard */}
      <div className="space-y-4">
        <QuickInfoCard
          community={community}
          isOwner={isOwner}
          isMember={isMember}
          onJoinClick={onJoinClick}
          onEditClick={() => setEditModalOpen(true)}
          onThumbnailChange={handleThumbnailChange}
          onTaglineChange={handleTaglineChange}
          onLinksChange={handleLinksChange}
        />
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
