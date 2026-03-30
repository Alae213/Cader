"use client";

import { useAuth, SignInButton } from "@clerk/nextjs";
import { Edit3, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Text";
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

        {/* Title */}
        <Heading size="4" className="font-sans text-left">
          {community.name}
        </Heading>

        {/* Short Description */}
        <div>
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
              className="w-full"
              size="lg"
              onClick={onJoinClick}
            >
              {community.pricingType === "free" ? "Join Free" : "Join Now"}
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button
                className="w-full"
                size="lg"
                onClick={() => sessionStorage.setItem("joinCommunitySlug", community.slug)}
              >
                {community.pricingType === "free" ? "Join Free" : "Join Now"}
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

        {/* Invite Friend Button - show for members and owners */}
        {(isMember || isOwner) && onInviteClick && (
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
