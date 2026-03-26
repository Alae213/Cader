"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Text, Heading } from "@/components/ui/Text";
import { Avatar } from "@/components/shared/Avatar";
import { Search, Users, Lock, ArrowRight } from "lucide-react";

interface ExploreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExploreModal({ open, onOpenChange }: ExploreModalProps) {
  const { userId } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch discoverable communities (no search filter applied client-side first)
  const allCommunities = useQuery(
    api.functions.explore.listDiscoverableCommunities,
    { search: searchQuery, limit: 50 }
  ) || [];

  // Fetch current user's memberships to determine which communities they've joined
  const userMemberships = useQuery(
    api.functions.memberships.listByUser,
    userId ? { userId } : "skip"
  );

  // Create a set of community IDs the user has joined
  const joinedCommunityIds = new Set(
    (userMemberships || [])
      .filter((m) => m.status === "active")
      .map((m) => m.communityId)
  );

  const handleViewCommunity = (slug: string) => {
    onOpenChange(false);
    router.push(`/${slug}`);
  };

  const formatPrice = (pricingType: string, priceDzd?: number) => {
    if (pricingType === "free") return "Free";
    if (!priceDzd) return "Paid";
    return `${priceDzd} DZD`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogTitle>Explore Communities</DialogTitle>
        
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search communities..."
            className="pl-10"
          />
        </div>

        {/* Community Grid */}
        <div className="flex-1 overflow-y-auto">
          {allCommunities.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <Heading size="h4" className="mb-2">No communities found</Heading>
              <Text theme="muted">
                {searchQuery 
                  ? `No results for "${searchQuery}"`
                  : "No communities available yet"}
              </Text>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allCommunities.map((community) => {
                const isJoined = joinedCommunityIds.has(community._id);
                
                return (
                  <Card 
                    key={community._id} 
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
                      community.isLocked && !isJoined ? "opacity-60" : ""
                    }`}
                    onClick={() => !community.isLocked || isJoined ? handleViewCommunity(community.slug) : undefined}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <Avatar 
                        src={community.logoUrl} 
                        name={community.name} 
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Text fontWeight="semibold" className="truncate">
                            {community.name}
                          </Text>
                          {isJoined && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                              Joined
                            </span>
                          )}
                          {community.isLocked && !isJoined && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Locked
                            </span>
                          )}
                        </div>
                        {community.tagline && (
                          <Text size="sm" theme="secondary" className="truncate mb-2">
                            {community.tagline}
                          </Text>
                        )}
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {community.memberCount}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-bg-elevated">
                            {formatPrice(community.pricingType, community.priceDzd)}
                          </span>
                        </div>
                      </div>
                      {!community.isLocked || isJoined ? (
                        <ArrowRight className="h-4 w-4 text-text-muted shrink-0" />
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}