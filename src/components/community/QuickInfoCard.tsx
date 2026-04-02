"use client";

import { useAuth, SignInButton } from "@clerk/nextjs";
import { Edit3, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { ThumbnailUpload } from "./ThumbnailUpload";
import { ShortDescription } from "./ShortDescription";
import { LinkInputs } from "./LinkInputs";
import { StatsMatrix } from "./StatsMatrix";

interface Community {
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
  [key: string]: unknown; // Allow extra fields from Convex queries
}

interface QuickInfoCardProps {
  community: Community;
  isOwner: boolean;
  isMember: boolean;
  streak?: number;
  onJoinClick: () => void;
  onEditClick: () => void;
  onInviteClick?: () => void;
  onThumbnailChange?: (thumbnailData: string) => void;
  onTaglineChange?: (tagline: string) => void;
  onLinksChange?: (links: string[]) => void;
}

export function QuickInfoCard({
  community,
  isOwner,
  isMember,
  streak = 0,
  onJoinClick,
  onEditClick,
  onInviteClick,
  onThumbnailChange,
  onTaglineChange,
  onLinksChange,
}: QuickInfoCardProps) {
  const { userId } = useAuth();

  // Build the join button label and detect if it's long
  const joinLabel =
    community.pricingType === "free"
      ? "Join Free"
      : `Buy ${community.priceDzd ?? 0} DZD${community.pricingType !== "one-time" ? "/month" : ""}`;
  const isJoinLabelLong = joinLabel.length > 16;

  return (
    <Card className="max-w-[260px]">
      <CardContent className="p-0 flex flex-col gap-2">
        {/* Thumbnail */}
        <div>
          <ThumbnailUpload
            currentUrl={community.logoUrl}
            communityName={community.name}
            onSave={(data) => {
              onThumbnailChange?.(data);
            }}
          />
        </div>

        

        
        <div>
          {/* Title */}
          {isOwner ? (
            <div 
              className="p-1 rounded-lg w-fit hover:bg-bg-elevated cursor-pointer"
              onClick={onEditClick}
            >
              <Text size="4" className="font-sans text-left">
                {community.name}
              </Text>
            </div>
          ) : (
            <Text size="4" className="font-sans text-left p-1">
              {community.name}
            </Text>
          )}
          {/* Short Description */}
          <ShortDescription
            value={community.tagline}
            isOwner={isOwner}
            onSave={(value) => {
              onTaglineChange?.(value);
            }}
          />
        </div>

        {/* Links */}
        <div>
          <LinkInputs
            links={community.links}
            isOwner={isOwner}
            onSave={(links) => {
              onLinksChange?.(links);
            }}
          />
        </div>

        {/* Stats */}
        <StatsMatrix
          memberCount={community.memberCount}
          onlineCount={community.onlineCount || 0}
          streak={streak}
        />

        {/* Join Button - only for non-members/non-owners */}
        {!isMember && !isOwner && (
          userId ? (
            <Button
              className={cn("w-full", isJoinLabelLong && "text-sm")}
              size="md"
              onClick={onJoinClick}
            >
              {joinLabel}
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button
                className={cn("w-full", isJoinLabelLong && "text-sm")}
                size="md"
                onClick={() => sessionStorage.setItem("joinCommunitySlug", community.slug)}
              >
                {joinLabel}
              </Button>
            </SignInButton>
          )
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

        {/* Invite Friend Button - show for members only */}
        {isMember && !isOwner && onInviteClick && (
          <Button
            className="w-full"
            variant="secondary"
            onClick={onInviteClick}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Invite Friends
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
