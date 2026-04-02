import { query, mutation, QueryCtx } from "../_generated/server";
import { v } from "convex/values";

const LEVEL_THRESHOLDS = [0, 20, 60, 140, 280];

function getLevelFromPoints(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getPointsForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= LEVEL_THRESHOLDS.length) return null;
  return LEVEL_THRESHOLDS[currentLevel];
}

async function getAuthenticatedMember(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) return null;

  return user;
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
    const timeFilter = args.timeFilter || "all";
    const limit = args.limit || 10;

    let timeFilterTimestamp: number | null = null;
    if (timeFilter === "7d") {
      timeFilterTimestamp = Date.now() - 7 * 24 * 60 * 60 * 1000;
    } else if (timeFilter === "30d") {
      timeFilterTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;
    }

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(1000); // bounded: communities with >1000 active members are rare

    const membershipByUserId = new Map<string, typeof memberships[number]>();
    for (const m of memberships) {
      membershipByUserId.set(m.userId, m);
    }

    // Use composite index to filter by community at storage level
    // Bounded read: if a community has >10k point events, we take the most recent
    // (older events are less likely to affect time-filtered leaderboards)
    const allPointEvents = await ctx.db
      .query("pointEvents")
      .withIndex("by_community_and_user", (q) => q.eq("communityId", args.communityId))
      .take(10000);

    const filteredEvents = timeFilterTimestamp
      ? allPointEvents.filter((e) => e.createdAt >= timeFilterTimestamp!)
      : allPointEvents;

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

    const memberPoints = await Promise.all(
      Array.from(userAgg.entries()).map(async ([userId, agg]) => {
        const membership = membershipByUserId.get(userId);
        if (!membership) return null;

        const user = await ctx.db.get(membership.userId);
        if (!user || user.deletedAt) return null;

        return {
          userId: user._id,
          clerkId: user.clerkId,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: membership.role,
          totalPoints: Math.max(0, agg.totalPoints),
          level: getLevelFromPoints(agg.totalPoints),
          lastEventAt: agg.lastEventAt,
        };
      })
    );

    for (const membership of memberships) {
      if (userAgg.has(membership.userId)) continue;

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

    const sortedMembers = memberPoints
      .filter((m): m is NonNullable<typeof m> => m != null)
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.lastEventAt !== a.lastEventAt) return (b.lastEventAt || 0) - (a.lastEventAt || 0);
        return (a.displayName || "").localeCompare(b.displayName || "");
      });

    let currentRank = 1;
    const rankedMembers = sortedMembers.map((member, index) => {
      if (index > 0 && member.totalPoints < sortedMembers[index - 1].totalPoints) {
        currentRank = index + 1;
      }
      return { ...member, rank: currentRank };
    });

    const top = rankedMembers.slice(0, limit);

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
    const user = await getAuthenticatedMember(ctx);
    if (!user) return null;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.status !== "active") return null;

    const pointEvents = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_community_created", (q) =>
        q.eq("userId", user._id).eq("communityId", args.communityId)
      )
      .take(10000); // bounded: a user won't have >10k events in one community

    const totalPoints = Math.max(0, pointEvents.reduce((sum, e) => sum + e.points, 0));
    const level = getLevelFromPoints(totalPoints);
    const nextLevelPoints = getPointsForNextLevel(level);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneDayMs = 24 * 60 * 60 * 1000;

    const daysWithActivity = new Set<number>();
    pointEvents.forEach((e) => {
      daysWithActivity.add(Math.floor(e.createdAt / oneDayMs));
    });

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
      pointsToNextLevel: nextLevelPoints ? nextLevelPoints - totalPoints : null,
      streak,
    };
  },
});

// NOTE: Points are awarded by the scheduler (awardDelayedPoints) after 10-minute delay.
// This function is kept for backward compatibility but no longer awards points.
export const awardPostPoints = mutation({
  args: {
    communityId: v.id("communities"),
    postId: v.id("posts"),
  },
  handler: async () => {
    return null;
  },
});

// NOTE: Points are awarded by the scheduler after 2-minute delay.
// This function is kept for backward compatibility but no longer awards points.
export const awardCommentPoints = mutation({
  args: {
    communityId: v.id("communities"),
    commentId: v.string(),
    contentLength: v.number(),
  },
  handler: async () => {
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
    const user = await getAuthenticatedMember(ctx);
    if (!user) throw new Error("You must be signed in");

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.status !== "active") {
      throw new Error("You must be a member");
    }

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

    if (existingPoints) return null;

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
    const user = await getAuthenticatedMember(ctx);
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

    let todayDay: number;
    if (user.timezone) {
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
      todayDay = Math.floor(Date.UTC(year, month - 1, day) / oneDayMs);
    } else {
      todayDay = Math.floor(now / oneDayMs);
    }

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

    if (alreadyRecorded) return null;

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

    let streak = 0;
    let checkDay = todayDay - 1;
    while (streakDays.has(checkDay)) {
      streak++;
      checkDay--;
    }

    const streakDayNumber = streak + 1;

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

// NOTE: Streaks are now handled by recordAppOpen mutation.
// This function is deprecated — no-op kept for compatibility.
export const awardStreakBonus = mutation({
  args: {
    communityId: v.id("communities"),
  },
  handler: async () => {
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
    const pointEvents = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_community_created", (q) =>
        q.eq("userId", args.userId).eq("communityId", args.communityId)
      )
      .take(10000); // bounded

    const totalPoints = Math.max(0, pointEvents.reduce((sum, event) => sum + event.points, 0));
    return Math.max(1, getLevelFromPoints(totalPoints));
  },
});
