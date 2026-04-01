"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { Heading, Text } from "@/components/ui/Text";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { LevelBadge } from "@/components/Feed/LevelBadge";
import { ProfilePanel } from "@/components/community/ProfilePanel";

interface LeaderboardTabProps {
  communityId: string;
}

type TimeFilter = "7d" | "30d" | "all";

export function LeaderboardTab({ communityId }: LeaderboardTabProps) {
  const { userId: clerkId } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [showMore, setShowMore] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // Get current user points
  const currentUserPoints = useQuery(
    api.functions.leaderboard.getUserPoints,
    { communityId: communityId as Id<"communities"> }
  );

  // Get current user's database ID for pinned row
  const currentUserId = currentUserPoints?.userId;

  // Get leaderboard — now returns { top, pinned }
  const leaderboardData = useQuery(
    api.functions.leaderboard.getLeaderboard,
    {
      communityId: communityId as Id<"communities">,
      timeFilter,
      limit: showMore ? 20 : 10,
      viewerUserId: currentUserId,
    }
  );

  const displayLeaderboard = leaderboardData?.top || [];
  const pinnedRow = leaderboardData?.pinned || null;

  if (!leaderboardData || !currentUserPoints) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Leaderboard list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Time filter */}
          <div className="flex items-center gap-2">
            <Button
              variant={timeFilter === "7d" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTimeFilter("7d")}
            >
              7 days
            </Button>
            <Button
              variant={timeFilter === "30d" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTimeFilter("30d")}
            >
              30 days
            </Button>
            <Button
              variant={timeFilter === "all" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTimeFilter("all")}
            >
              All time
            </Button>
          </div>

          {/* Leaderboard list */}
          <div className="space-y-2">
            {displayLeaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={`
                  flex items-center gap-3 p-3 rounded-lg
                  ${entry.role === "owner" || entry.role === "admin"
                    ? "bg-accent/10 border border-accent/30"
                    : "bg-bg-surface"
                  }
                `}
              >
                {/* Rank */}
                <div className="w-8 text-center">
                  {entry.rank <= 3 ? (
                    <span className="text-2xl">
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                    </span>
                  ) : (
                    <Text size="3" theme="muted" className="font-bold">
                      #{entry.rank}
                    </Text>
                  )}
                </div>

                {/* Avatar */}
                <button onClick={() => setProfileUserId(entry.clerkId)} className="cursor-pointer">
                  <Avatar
                    src={entry.avatarUrl}
                    name={entry.displayName}
                    fallback={entry.displayName.substring(0, 2).toUpperCase()}
                    className="w-10 h-10"
                  />
                </button>

                {/* Name and level */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Text size="2" className="font-medium text-text-primary truncate">
                      {entry.displayName}
                    </Text>
                    <LevelBadge level={entry.level} size="sm" />
                    {entry.role === "owner" && (
                      <Badge variant="accent" className="text-[10px]">
                        Owner
                      </Badge>
                    )}
                    {entry.role === "admin" && (
                      <Badge variant="secondary" className="text-[10px]">
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <Text size="3" className="font-bold text-accent">
                    {entry.totalPoints}
                  </Text>
                  <Text size="1" theme="muted">
                    pts
                  </Text>
                </div>
              </div>
            ))}
          </div>

          {/* Show more button */}
          {(displayLeaderboard.length >= 10 || pinnedRow) && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? "Show less" : "Show more"}
            </Button>
          )}

          {/* Pinned row — viewer's own row if not in top N */}
          {pinnedRow && (
            <div className="mt-4 pt-4 border-t border-border">
              <Text size="1" theme="muted" className="mb-2 block text-center">
                Your position
              </Text>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
                <div className="w-8 text-center">
                  <Text size="3" theme="muted" className="font-bold">
                    #{pinnedRow.rank}
                  </Text>
                </div>
                <button onClick={() => setProfileUserId(pinnedRow.clerkId)} className="cursor-pointer">
                  <Avatar
                    src={pinnedRow.avatarUrl}
                    name={pinnedRow.displayName}
                    fallback={pinnedRow.displayName.substring(0, 2).toUpperCase()}
                    className="w-10 h-10"
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Text size="2" className="font-medium text-text-primary truncate">
                      {pinnedRow.displayName}
                    </Text>
                    <LevelBadge level={pinnedRow.level} size="sm" />
                  </div>
                </div>
                <div className="text-right">
                  <Text size="3" className="font-bold text-accent">
                    {pinnedRow.totalPoints}
                  </Text>
                  <Text size="1" theme="muted">
                    pts
                  </Text>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: User's progress panel */}
        <div className="lg:col-span-1">
          <div className="bg-bg-surface rounded-lg border border-border p-4 sticky top-4">
            <Heading size="4" className="text-text-primary mb-4">
              Your Progress
            </Heading>

            {currentUserPoints.isOwnerOrAdmin ? (
              <div className="text-center py-4">
                <Text size="2" theme="muted">
                  Admins and owners don't earn points, but can view the leaderboard.
                </Text>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Level badge */}
                <div className="flex items-center justify-center">
                  <LevelBadge level={currentUserPoints.level} size="md" />
                </div>

                {/* Points */}
                <div className="text-center">
                  <Text size="5" className="font-bold text-text-primary">
                    {currentUserPoints.totalPoints}
                  </Text>
                  <Text size="2" theme="muted">
                    total points
                  </Text>
                </div>

                {/* Stepped progress bar across 5 levels */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((lvl) => {
                      const isCompleted = currentUserPoints.level > lvl;
                      const isCurrent = currentUserPoints.level === lvl;
                      return (
                        <div key={lvl} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full h-2 rounded-full overflow-hidden bg-bg-elevated">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCompleted
                                  ? "bg-accent"
                                  : isCurrent
                                  ? "bg-accent"
                                  : "bg-bg-elevated"
                              }`}
                              style={{
                                width: isCompleted
                                  ? "100%"
                                  : isCurrent
                                  ? `${Math.min(
                                      100,
                                      (currentUserPoints.totalPoints /
                                        (currentUserPoints.nextLevelPoints || 1)) *
                                        100
                                    )}%`
                                  : "0%",
                              }}
                            />
                          </div>
                          <Text
                            size="1"
                            className={`font-medium ${
                              isCompleted || isCurrent
                                ? "text-accent"
                                : "text-text-muted"
                            }`}
                          >
                            {lvl}
                          </Text>
                        </div>
                      );
                    })}
                  </div>
                  {currentUserPoints.level < 5 ? (
                    <Text size="1" theme="muted" className="text-center">
                      {currentUserPoints.pointsToNextLevel} points to Level{" "}
                      {currentUserPoints.level + 1}
                    </Text>
                  ) : (
                    <Text size="1" className="text-center text-accent font-medium">
                      Max level reached
                    </Text>
                  )}
                </div>

                {/* Required UX copy */}
                <div className="pt-3 border-t border-border space-y-1">
                  <Text size="1" theme="muted">
                    Level is based on all-time points.
                  </Text>
                  <Text size="1" theme="muted">
                    Leaderboard rank changes based on the selected time filter.
                  </Text>
                </div>

                {/* Current rank */}
                {(pinnedRow?.rank || displayLeaderboard.find(e => e.userId === currentUserId)?.rank) && (
                  <div className="pt-3 border-t border-border">
                    <Text size="2" theme="muted" className="text-center">
                      Your rank
                    </Text>
                    <Text size="4" className="font-bold text-center text-accent">
                      #{pinnedRow?.rank || displayLeaderboard.find(e => e.userId === currentUserId)?.rank}
                    </Text>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Panel */}
      <ProfilePanel
        userId={profileUserId || undefined}
        open={!!profileUserId}
        onOpenChange={(open) => { if (!open) setProfileUserId(null); }}
      />
    </div>
  );
}
