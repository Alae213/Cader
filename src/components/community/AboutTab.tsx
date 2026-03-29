"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, Edit3, Play } from "lucide-react";
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

  return null;
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

  // Handle video change
  const handleVideoChange = async (url: string) => {
    try {
      await updateCommunity({
        communityId: community._id as any,
        videoUrl: url,
      });
      toast.success("Video updated");
    } catch {
      toast.error("Failed to update video");
    }
  };

  // Handle thumbnail change
  const handleThumbnailChange = async (thumbnailData: string) => {
    try {
      await updateCommunity({
        communityId: community._id as any,
        logoUrl: thumbnailData,
      });
      toast.success("Thumbnail updated");
    } catch {
      toast.error("Failed to update thumbnail");
    }
  };

  // Handle description change
  const handleDescriptionChange = async (description: string) => {
    try {
      await updateCommunity({
        communityId: community._id as any,
        tagline: description,
      });
      toast.success("Description updated");
    } catch {
      toast.error("Failed to update description");
    }
  };

  // Handle links change
  const handleLinksChange = async (links: string[]) => {
    try {
      await updateCommunity({
        communityId: community._id as any,
        links: links,
      });
      toast.success("Links updated");
    } catch {
      toast.error("Failed to update links");
    }
  };

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
            <div className="flex items-center gap-3">
              {/* Owner Avatar */}
              <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                {community.ownerAvatar ? (
                  <img 
                    src={community.ownerAvatar} 
                    alt={community.ownerName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="font-medium text-white">
                    {community.ownerName ? getInitials(community.ownerName) : "?"}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <Text size="3" className="font-medium">{community.ownerName || "Unknown"}</Text>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">
                    <Users className="w-3 h-3 mr-1" />
                    {community.memberCount} members
                  </Badge>
                  <Badge variant="secondary">
                    {formatPrice(community.pricingType, community.priceDzd)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </div>

        {/* Description */}
        <div>
          <CardContent className="pt-4">
            {community.description ? (
              <div className="prose prose-invert max-w-none">
                <Text>{community.description}</Text>
              </div>
            ) : isOwner ? (
              <Text theme="muted" className="italic">
                Click to add a description...
              </Text>
            ) : (
              <Text theme="muted">No description yet.</Text>
            )}
          </CardContent>
        </div>
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
          onDescriptionChange={handleDescriptionChange}
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
