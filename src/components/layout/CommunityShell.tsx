"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { TopBar } from "./TopBar";
import { TabNav } from "./TabNav";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";
import { Heading, Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";

interface Community {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  memberCount: number;
  isVerified: boolean;
}

interface CommunityShellProps {
  community: Community;
  children: React.ReactNode;
}

export function CommunityShell({ community, children }: CommunityShellProps) {
  const { user } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-canvas">
      {/* Top Bar */}
      <TopBar
        user={user ? { name: user.fullName, image: user.imageUrl } : null}
        onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Community Header */}
      <div className="border-b border-bg-elevated bg-bg-base">
        <div className="mx-auto max-w-[1200px] px-4 py-6">
          <div className="flex items-start gap-4">
            {/* Community Avatar */}
            <div className="relative">
              {community.imageUrl ? (
                <img
                  src={community.imageUrl}
                  alt={community.name}
                  className="h-16 w-16 rounded-[22px] object-cover sm:h-20 sm:w-20"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-accent sm:h-20 sm:w-20">
                  <span className="font-display text-2xl italic text-white sm:text-3xl">
                    {community.name[0]}
                  </span>
                </div>
              )}
              {community.isVerified && (
                <Badge variant="accent" className="absolute -bottom-1 -right-1">
                  ✓
                </Badge>
              )}
            </div>

            {/* Community Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Heading size="7">{community.name}</Heading>
              </div>
              {community.description && (
                <Text size="2" theme="secondary" className="mt-1 line-clamp-2">
                  {community.description}
                </Text>
              )}
              <Text size="1" theme="muted" className="mt-2">
                {community.memberCount.toLocaleString()} members
              </Text>
            </div>

            {/* Action Buttons */}
            <div className="hidden sm:flex gap-2">
              <Button variant="secondary" size="md">
                Join
              </Button>
              <Button variant="primary" size="md">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNav communitySlug={community.slug} />
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-[1200px] px-4 py-6">
        {children}
      </main>
    </div>
  );
}
