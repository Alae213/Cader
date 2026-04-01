import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Level thresholds - all-time points sum determines level
// 0 → L1, 20 → L2, 60 → L3, 140 → L4, 280 → L5
const LEVEL_THRESHOLDS = [0, 20, 60, 140, 280];

function getLevelFromPoints(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

function getPointsForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    return null; // Max level reached
  }
  return LEVEL_THRESHOLDS[currentLevel];
}

// Get leaderboard for a community
// Returns { top: MemberEntry[], pinned: MemberEntry | null }
// - top: Top N ranked members (excludes owner/admin)
// - pinned: viewer's own row if not already in top N
//
// Optimized: uses a single pointEvents query per community instead of O(N) queries.
export const getLeaderboard = query({
  args: {
    communityId: v.id("communities"),
    timeFilter: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("all"))),
    limit: v.optional(v.number()),
    viewerUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const communityId = args.communityId;
    const timeFilter = args.timeFilter || "all";
    const limit = args.limit || 10;

    // Get the time filter timestamp
    let timeFilterTimestamp: number | null = null;
    if (timeFilter === "7d") {
      timeFilterTimestamp = Date.now() - 7 * 24 * 60 * 60 * 1000;
    } else if (timeFilter === "30d") {
      timeFilterTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;
    }

    // OPTIMIZATION: Get all active memberships ONCE
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", communityId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Build lookup maps for O(1) access
    const membershipByUserId = new Map<string, typeof memberships[number]>();
    for (const m of memberships) {
      membershipByUserId.set(m.userId, m);
    }

    // OPTIMIZATION: Get ALL pointEvents for this community in ONE query
    // instead of O(N) queries (one per member)
    const allPointEvents = await ctx.db
      .query("pointEvents")
      .withIndex("by_community_id", (q) => q.eq("communityId", communityId))
      .collect();

    // Filter by time window if needed
    const filteredEvents = timeFilterTimestamp
      ? allPointEvents.filter((e) => e.createdAt >= timeFilterTimestamp!)
      : allPointEvents;

    // Aggregate points per user in a single pass
    interface UserAgg {
      totalPoints: number;
      lastEventAt: number;
    }
    const userAgg = new Map<string, UserAgg>();
    for (const event of filteredEvents) {
      const existing = userAgg.get(event.userId);
      if (existing) {
        existing.totalPoints += event.points;
        if (event.createdAt > existing.lastEventAt) {
          existing.lastEventAt = event.createdAt;
        }
      } else {
        userAgg.set(event.userId, {
          totalPoints: event.points,
          lastEventAt: event.createdAt,
        });
      }
    }

    // Build member entries — only for users who have point events
    const memberPoints = await Promise.all(
      Array.from(userAgg.entries()).map(async ([userId, agg]) => {
        const membership = membershipByUserId.get(userId);
        if (!membership) return null;

        const user = await ctx.db.get(membership.userId);
        if (!user || user.deletedAt) return null;

        // All members accumulate points equally
        const totalPoints = Math.max(0, agg.totalPoints);

        return {
          userId: user._id,
          clerkId: user.clerkId,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: membership.role,
          totalPoints,
          level: getLevelFromPoints(totalPoints),
          lastEventAt: agg.lastEventAt,
        };
      })
    );

    // Also include members with 0 points (active members with no events)
    // This ensures the leaderboard shows all members, not just those with points
    for (const membership of memberships) {
      if (userAgg.has(membership.userId)) continue; // Already processed

      const user = await ctx.db.get(membership.userId);
      if (!user || user.deletedAt) continue;

      memberPoints.push({
        userId: user._id,
        clerkId: user.clerkId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: membership.role,
        totalPoints: 0,
        level: 1,
        lastEventAt: 0,
      });
    }

    // Filter out nulls and sort by points (descending)
    const sortedMembers = memberPoints
      .filter((m): m is NonNullable<typeof m> => m != null)
      .sort((a, b) => {
        // Primary: points descending
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        // Tiebreaker 1: most recent point earned (higher createdAt = higher rank)
        if (b.lastEventAt !== a.lastEventAt) return (b.lastEventAt || 0) - (a.lastEventAt || 0);
        // Tiebreaker 2: alphabetical by display name
        return (a.displayName || "").localeCompare(b.displayName || "");
      });

    // Add rank (shared rank for same score)
    let currentRank = 1;
    const rankedMembers = sortedMembers.map((member, index) => {
      if (index > 0 && member.totalPoints < sortedMembers[index - 1].totalPoints) {
        currentRank = index + 1;
      }
      return {
        ...member,
        rank: currentRank,
      };
    });

    // Apply limit to top N
    const top = rankedMembers.slice(0, limit);

    // Find viewer's row — pin it below the list if not already in top N
    let pinned: NonNullable<typeof rankedMembers[number]> | null = null;
    if (args.viewerUserId) {
      const viewerInRanked = rankedMembers.find((m) => m.userId === args.viewerUserId);
      const viewerInTop = top.some((m) => m.userId === args.viewerUserId);
      if (viewerInRanked && !viewerInTop) {
        pinned = viewerInRanked;
      }
    }

    return { top, pinned };
  },
});

// Get current user's points and level in a community
export const getUserPoints = query({
  args: {
    communityId: v.id("communities"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // Get membership to check role
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.status !== "active") {
      return null;
    }

    // Get all point events for this user in this community
    const pointEvents = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("communityId"), args.communityId))
      .collect();

    // Calculate total points — clamped to minimum 0
    const totalPoints = Math.max(0, pointEvents.reduce((sum, e) => sum + e.points, 0));

    const level = getLevelFromPoints(totalPoints);
    const nextLevelPoints = getPointsForNextLevel(level);
    const pointsToNextLevel = nextLevelPoints
      ? nextLevelPoints - totalPoints
      : null;

    // Calculate streak (days with qualifying activity)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Get unique days with activity
    const daysWithActivity = new Set<number>();
    pointEvents.forEach((e) => {
      const day = Math.floor(e.createdAt / oneDayMs);
      daysWithActivity.add(day);
    });

    // Calculate current streak
    let streak = 0;
    let checkDate = today.getTime();
    while (daysWithActivity.has(Math.floor(checkDate / oneDayMs))) {
      streak++;
      checkDate -= oneDayMs;
    }

    return {
      userId: user._id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: membership.role,
      totalPoints,
      level,
      nextLevelPoints,
      pointsToNextLevel,
      streak,
    };
  },
});

// Award points for creating a post
// NOTE: Points are NOT awarded immediately. The scheduler (awardDelayedPoints)
// awards +2 points after the post survives 10 minutes of visibility.
// This function is kept for backward compatibility but no longer awards points.
export const awardPostPoints = mutation({
  args: {
    communityId: v.id("communities"),
    postId: v.id("posts"),
  },
  handler: async (/* eslint-disable @typescript-eslint/no-unused-vars */ ctx, /* eslint-disable @typescript-eslint/no-unused-vars */ args) => {
    // Points are now awarded by the scheduled function after 10-minute delay
    // This function is a no-op — keeping the API for backward compatibility
    return null;
  },
});

// Award points for creating a comment
// NOTE: Points are NOT awarded immediately. The scheduler (awardDelayedPoints)
// awards +1 points after the comment survives 2 minutes of visibility and has 20+ chars.
// This function is kept for backward compatibility but no longer awards points.
export const awardCommentPoints = mutation({
  args: {
    communityId: v.id("communities"),
    commentId: v.string(),
    contentLength: v.number(),
  },
  handler: async (/* eslint-disable @typescript-eslint/no-unused-vars */ ctx, /* eslint-disable @typescript-eslint/no-unused-vars */ args) => {
    // Points are now awarded by the scheduled function after 2-minute delay
    // This function is a no-op — keeping the API for backward compatibility
    return null;
  },
});

// Award points for completing a lesson (10 points)
// Once per (userId, pageId) ever - not per day, not per classroom
export const awardLessonPoints = mutation({
  args: {
    communityId: v.id("communities"),
    pageId: v.id("pages"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get membership to check role
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.status !== "active") {
      throw new Error("You must be a member");
    }

    // Check if points already awarded for this specific lesson EVER
    // Deduplicate by (userId, pageId) — once per user per lesson forever
    const existingPoints = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter(
        (q) =>
          q.eq(q.field("communityId"), args.communityId) &&
          q.eq(q.field("sourceId"), args.pageId) &&
          q.eq(q.field("eventType"), "lesson_completed_awarded")
      )
      .first();

    if (existingPoints) {
      return null; // Already awarded for this lesson — never award again
    }

    // Award 10 points for lesson completion
    await ctx.db.insert("pointEvents", {
      communityId: args.communityId,
      userId: user._id,
      actorUserId: user._id,
      eventType: "lesson_completed_awarded",
      points: 10,
      sourceType: "lesson",
      sourceId: args.pageId,
      createdAt: Date.now(),
    });

    return 10;
  },
});

// Record an app open for streak tracking
// Awards streak points on first open of the day, tracks consecutive days
// Uses member's saved timezone for day boundaries, falls back to UTC
export const recordAppOpen = mutation({
  args: {
    communityId: v.id("communities"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null; // Not authenticated — no streak
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.status !== "active") return null;

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Use member's timezone if saved, otherwise use UTC
    // For day boundary calculation: convert now to the member's local day number
    let todayDay: number;
    if (user.timezone) {
      // Use Intl to get the current date in the user's timezone
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: user.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const parts = formatter.formatToParts(new Date(now));
      const year = parseInt(parts.find((p) => p.type === "year")?.value || "2026");
      const month = parseInt(parts.find((p) => p.type === "month")?.value || "1");
      const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");
      // Convert to day number (days since epoch) in UTC for consistent comparison
      todayDay = Math.floor(Date.UTC(year, month - 1, day) / oneDayMs);
    } else {
      // Fallback to UTC day boundaries
      todayDay = Math.floor(now / oneDayMs);
    }

    // Check if already recorded an app open today for this community
    const alreadyRecorded = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter(
        (q) =>
          q.eq(q.field("communityId"), args.communityId) &&
          q.eq(q.field("eventType"), "streak_day_awarded") &&
          q.gte(q.field("createdAt"), todayDay * oneDayMs) &&
          q.lt(q.field("createdAt"), (todayDay + 1) * oneDayMs)
      )
      .first();

    if (alreadyRecorded) {
      return null; // Already recorded today
    }

    // Calculate current streak by looking at consecutive days with streak_day_awarded events
    const streakEvents = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter(
        (q) =>
          q.eq(q.field("communityId"), args.communityId) &&
          q.eq(q.field("eventType"), "streak_day_awarded")
      )
      .collect();

    const streakDays = new Set<number>();
    streakEvents.forEach((e) => {
      streakDays.add(Math.floor(e.createdAt / oneDayMs));
    });

    // Count consecutive days backwards from today (exclusive — today isn't recorded yet)
    let streak = 0;
    let checkDay = todayDay - 1; // Start from yesterday
    while (streakDays.has(checkDay)) {
      streak++;
      checkDay--;
    }

    // New streak day number (1-based)
    const streakDayNumber = streak + 1;

    // Award points based on streak day
    // Days 1–3: +1, Days 4–6: +2, Day 7+: +3
    let points = 1;
    if (streakDayNumber >= 4 && streakDayNumber <= 6) {
      points = 2;
    } else if (streakDayNumber >= 7) {
      points = 3;
    }

    await ctx.db.insert("pointEvents", {
      communityId: args.communityId,
      userId: user._id,
      actorUserId: user._id,
      eventType: "streak_day_awarded",
      points,
      sourceType: "streak",
      sourceId: `streak_${todayDay}`,
      createdAt: now,
    });

    return { streakDay: streakDayNumber, points };
  },
});

// Award streak bonus points (called by scheduled function or manually)
// NOTE: This is a legacy function. The new recordAppOpen mutation handles streaks
// on first app open of the day. This function is deprecated but kept for compatibility.
export const awardStreakBonus = mutation({
  args: {
    communityId: v.id("communities"),
  },
  handler: async (/* eslint-disable @typescript-eslint/no-unused-vars */ ctx, /* eslint-disable @typescript-eslint/no-unused-vars */ args) => {
    // Streaks are now handled by recordAppOpen mutation
    // This function is deprecated — no-op
    return { processed: 0 };
  },
});

// Get a user's level in a community based on all-time points
export const getUserLevel = query({
  args: {
    communityId: v.id("communities"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all point events for this user in this community
    const pointEvents = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("communityId"), args.communityId))
      .collect();

    // Calculate total points — clamped to minimum 0
    const totalPoints = Math.max(0, pointEvents.reduce((sum, event) => sum + event.points, 0));
    
    // Return level (clamped to minimum 1)
    return Math.max(1, getLevelFromPoints(totalPoints));
  },
});
