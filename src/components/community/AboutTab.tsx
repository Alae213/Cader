"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { User, Users, Flame, ExternalLink, Edit3, Play } from "lucide-react";

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

// Stats matrix component
function StatsMatrix({ 
  memberCount, 
  onlineCount, 
  streak 
}: { 
  memberCount: number; 
  onlineCount: number; 
  streak: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-center p-2 bg-bg-elevated rounded-lg">
        <Users className="w-4 h-4 mx-auto text-accent mb-1" />
        <Text size="2" className="font-semibold">{memberCount}</Text>
        <Text size="1" theme="muted">Members</Text>
      </div>
      <div className="text-center p-2 bg-bg-elevated rounded-lg">
        <div className="w-2 h-2 mx-auto bg-success rounded-full mb-2 animate-pulse" />
        <Text size="2" className="font-semibold">{onlineCount}</Text>
        <Text size="1" theme="muted">Online</Text>
      </div>
      <div className="text-center p-2 bg-bg-elevated rounded-lg">
        <Flame className="w-4 h-4 mx-auto text-orange-500 mb-1" />
        <Text size="2" className="font-semibold">{streak}</Text>
        <Text size="1" theme="muted">Day streak</Text>
      </div>
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
  onEditClick: () => void;
  onVideoChange?: (url: string) => void;
}

export function AboutTab({ 
  community, 
  isOwner, 
  isMember,
  onJoinClick,
  onEditClick,
  onVideoChange 
}: AboutTabProps) {
  const [description, setDescription] = useState(community.description || "");
  const [descriptionEditing, setDescriptionEditing] = useState(false);

  // Calculate streak (placeholder - would come from server in real implementation)
  const streak = Math.floor(Math.random() * 30) + 1;
  
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Video + Description */}
      <div className="lg:col-span-2 space-y-4">
        {/* Video Embed */}
        <VideoEmbed 
          url={community.videoUrl} 
          isOwner={isOwner}
          onChange={onVideoChange}
        />

        {/* Owner Info + Stats */}
        <Card>
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
        </Card>

        {/* Description */}
        <Card>
          <CardContent className="pt-4">
            {isOwner && descriptionEditing ? (
              <div className="space-y-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your community..."
                  className="w-full h-40 p-3 bg-bg-elevated border border-border rounded-lg text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    // Save description (would call mutation in real implementation)
                    setDescriptionEditing(false);
                    toast.success("Description saved");
                  }}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDescriptionEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className={isOwner ? "cursor-pointer hover:bg-bg-elevated -m-2 p-2 rounded-lg transition-colors" : ""}
                onClick={() => isOwner && setDescriptionEditing(true)}
              >
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Info + Actions */}
      <div className="space-y-4">
        {/* Community Info Card */}
        <Card>
          <CardContent className="pt-4">
            {/* Logo / Thumbnail */}
            <div className="mb-4">
              {community.logoUrl ? (
                <img 
                  src={community.logoUrl} 
                  alt={community.name}
                  className="w-20 h-20 rounded-[22px] object-cover mx-auto"
                />
              ) : (
                <div className="w-20 h-20 rounded-[22px] bg-accent flex items-center justify-center mx-auto">
                  <span className="text-2xl font-serif text-white">
                    {community.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Title */}
            <Heading size="4" className="text-center mb-2">
              {community.name}
            </Heading>

            {/* Tagline */}
            {community.tagline && (
              <Text size="3" theme="secondary" className="text-center mb-4">
                {community.tagline}
              </Text>
            )}

            {/* Links */}
            {community.links && community.links.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {community.links.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Link
                  </a>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="mb-4">
              <StatsMatrix 
                memberCount={community.memberCount}
                onlineCount={community.onlineCount || 0}
                streak={streak}
              />
            </div>

            {/* Join Button - only for non-members/non-owners */}
            {!isMember && !isOwner && (
              <Button 
                className="w-full" 
                size="lg"
                onClick={onJoinClick}
              >
                {community.pricingType === "free" ? "Join Free" : "Join Now"}
              </Button>
            )}

            {/* Edit Button - only for owner */}
            {isOwner && (
              <Button 
                className="w-full" 
                variant="secondary"
                onClick={onEditClick}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Community
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
