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

interface LeaderboardTabProps {
  communityId: string;
}

type TimeFilter = "7d" | "30d" | "all";

export function LeaderboardTab({ communityId }: LeaderboardTabProps) {
  const { userId: clerkId } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [showMore, setShowMore] = useState(false);

  // Get current user points
  const currentUserPoints = useQuery(
    api.functions.leaderboard.getUserPoints,
    { communityId: communityId as Id<"communities"> }
  );

  // Get leaderboard
  const leaderboard = useQuery(
    api.functions.leaderboard.getLeaderboard,
    {
      communityId: communityId as Id<"communities">,
      timeFilter,
      limit: showMore ? 20 : 10,
    }
  );

  // Determine user's rank if they're on the leaderboard
  const userRank = leaderboard?.find(
    (entry) => entry.userId === currentUserPoints?.userId
  )?.rank;

  const displayLeaderboard = leaderboard?.slice(0, showMore ? 20 : 10) || [];

  if (!leaderboard || !currentUserPoints) {
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
                <Avatar
                  src={entry.avatarUrl}
                  name={entry.displayName}
                  fallback={entry.displayName.substring(0, 2).toUpperCase()}
                  className="w-10 h-10"
                />

                {/* Name and level */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Text size="2" className="font-medium text-text-primary truncate">
                      {entry.displayName}
                    </Text>
                    <Badge variant="secondary" className="text-[10px]">
                      L{entry.level}
                    </Badge>
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
          {leaderboard.length > 10 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? "Show less" : `Show more (${leaderboard.length - 10} more)`}
            </Button>
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
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        L{currentUserPoints.level}
                      </span>
                    </div>
                    {currentUserPoints.level < 5 && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-bg-surface rounded-full flex items-center justify-center border-2 border-accent">
                        <Text size="1" className="font-bold text-accent">
                          🔥
                        </Text>
                      </div>
                    )}
                  </div>
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

                {/* Streak */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">🔥</span>
                  <Text size="2" className="font-medium">
                    {currentUserPoints.streak} day streak
                  </Text>
                </div>

                {/* Next level progress */}
                {currentUserPoints.nextLevelPoints && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Text size="1" theme="muted">
                        Next level
                      </Text>
                      <Text size="1" className="font-medium">
                        {currentUserPoints.nextLevelPoints} pts
                      </Text>
                    </div>
                    <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (currentUserPoints.totalPoints /
                              currentUserPoints.nextLevelPoints) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <Text size="1" theme="muted" className="text-center">
                      {currentUserPoints.pointsToNextLevel} points to next level
                    </Text>
                  </div>
                )}

                {/* Current rank */}
                {userRank && (
                  <div className="pt-4 border-t border-border">
                    <Text size="2" theme="muted" className="text-center">
                      Your rank
                    </Text>
                    <Text size="4" className="font-bold text-center text-accent">
                      #{userRank}
                    </Text>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
