"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/shared/Avatar";
import { MapPin, Calendar, Settings, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ProfileModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditProfile?: () => void;
}

export function ProfileModal({ userId, open, onOpenChange, onEditProfile }: ProfileModalProps) {
  const { userId: clerkId } = useAuth();
  const isOwnProfile = clerkId === userId;

  // Fetch user profile
  const profileData = useQuery(api.functions.users.getUserProfile, {
    userId: userId as unknown as never,
  });

  // Fetch user activity
  const activityData = useQuery(api.functions.users.getUserActivity, {
    userId: userId as unknown as never,
  });

  if (!profileData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { user, level, totalPoints, joinedCommunities, ownedCommunities } = profileData;

  // Generate activity grid data (past 52 weeks)
  const getActivityGrid = () => {
    const weeks: { date: string; count: number }[][] = [];
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Create a map of date -> count
    const activityMap = new Map<string, number>();
    activityData?.activity?.forEach((a) => {
      activityMap.set(a.date, a.count);
    });

    // Generate weeks starting from one year ago
    const currentDate = new Date(oneYearAgo);
    // Adjust to start from Sunday
    const dayOfWeek = currentDate.getDay();
    currentDate.setDate(currentDate.getDate() - dayOfWeek);

    while (currentDate <= today) {
      const week: { date: string; count: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split("T")[0];
        week.push({
          date: dateStr,
          count: activityMap.get(dateStr) || 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }

    return weeks;
  };

  const activityGrid = getActivityGrid();

  const getActivityColor = (count: number) => {
    if (count === 0) return "bg-bg-elevated";
    if (count <= 2) return "bg-green-300";
    if (count <= 5) return "bg-green-500";
    if (count <= 10) return "bg-green-700";
    return "bg-green-900";
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ar-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Avatar
            src={user.avatarUrl}
            name={user.displayName}
            size="xl"
            className="h-20 w-20 mb-4"
          />
          <Heading size="h3" className="mb-1">{user.displayName}</Heading>
          
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-green-500/20 text-green-400">
              Level {level}
            </Badge>
            <Text size="sm" theme="secondary">{totalPoints} points</Text>
          </div>

          <div className="flex items-center gap-1 text-text-secondary mt-1">
            <Calendar className="h-4 w-4" />
            <Text size="sm" theme="secondary">
              Joined {formatDate(user.createdAt)}
            </Text>
          </div>
        </div>

        {/* Activity Map */}
        <div className="mb-6">
          <Text size="sm" theme="secondary" className="mb-2">Activity</Text>
          <div className="flex gap-0.5 overflow-x-auto pb-2">
            {activityGrid.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-0.5">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`w-2.5 h-2.5 rounded-sm ${getActivityColor(day.count)}`}
                    title={`${day.date}: ${day.count} activities`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            <Text size="sm" theme="muted">Less</Text>
            <div className="flex gap-0.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-bg-elevated" />
              <div className="w-2.5 h-2.5 rounded-sm bg-green-300" />
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
              <div className="w-2.5 h-2.5 rounded-sm bg-green-700" />
              <div className="w-2.5 h-2.5 rounded-sm bg-green-900" />
            </div>
            <Text size="sm" theme="muted">More</Text>
          </div>
          <Text size="sm" theme="secondary" className="mt-1">
            {activityData?.postsCount || 0} posts, {activityData?.commentsCount || 0} comments in the past year
          </Text>
        </div>

        {/* Communities Joined */}
        <div className="mb-4">
          <Text size="sm" theme="secondary" className="mb-2">
            Communities ({joinedCommunities?.length || 0})
          </Text>
          {joinedCommunities && joinedCommunities.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {(joinedCommunities as Array<{ _id: string; name: string; slug: string; logoUrl?: string }>).map((community) => (
                <Link
                  key={community._id}
                  href={`/${community.slug}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-bg-elevated hover:bg-bg-muted transition-colors"
                >
                  <Avatar src={community.logoUrl} name={community.name} size="sm" />
                  <Text size="sm" className="truncate flex-1">{community.name}</Text>
                  <ExternalLink className="h-3 w-3 text-text-muted" />
                </Link>
              ))}
            </div>
          ) : (
            <Text size="sm" theme="muted" className="text-center py-4">
              No communities joined yet
            </Text>
          )}
        </div>

        {/* Communities Created */}
        {ownedCommunities && ownedCommunities.length > 0 && (
          <div className="mb-4">
            <Text size="sm" theme="secondary" className="mb-2">
              Created Communities ({ownedCommunities.length})
            </Text>
            <div className="grid grid-cols-2 gap-2">
              {ownedCommunities.map((community: { _id: string; name: string; slug: string; logoUrl?: string }) => (
                <Link
                  key={community._id}
                  href={`/${community.slug}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-bg-elevated hover:bg-bg-muted transition-colors"
                >
                  <Avatar src={community.logoUrl} name={community.name} size="sm" />
                  <Text size="sm" className="truncate flex-1">{community.name}</Text>
                  <ExternalLink className="h-3 w-3 text-text-muted" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Edit Profile Button */}
        {isOwnProfile && onEditProfile && (
          <Button
            variant="secondary"
            className="w-full mt-4"
            onClick={() => {
              onOpenChange(false);
              onEditProfile();
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
