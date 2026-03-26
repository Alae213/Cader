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
export const getLeaderboard = query({
  args: {
    communityId: v.id("communities"),
    timeFilter: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("all"))),
    limit: v.optional(v.number()),
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

    // Get all active memberships for this community
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", communityId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Calculate points for each member
    const memberPoints = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        if (!user) return null;

        // Get point events for this user in this community
        let pointEventsQuery = ctx.db
          .query("pointEvents")
          .withIndex("by_user_id", (q) => q.eq("userId", membership.userId))
          .filter((q) => q.eq(q.field("communityId"), communityId));

        let pointEvents = await pointEventsQuery.collect();

        // Filter by time if needed
        if (timeFilterTimestamp) {
          pointEvents = pointEvents.filter(
            (e) => e.createdAt >= timeFilterTimestamp!
          );
        }

        // Calculate total points (owner/admin don't accumulate points)
        const totalPoints =
          membership.role === "owner" || membership.role === "admin"
            ? 0
            : pointEvents.reduce((sum, e) => sum + e.points, 0);

        return {
          userId: user._id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: membership.role,
          totalPoints,
          level: getLevelFromPoints(totalPoints),
        };
      })
    );

    // Filter out nulls and sort by points (descending)
    const sortedMembers = memberPoints
      .filter((m): m is NonNullable<typeof m> => m != null)
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // Add rank
    return sortedMembers.map((member, index) => ({
      ...member,
      rank: index + 1,
    }));
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

    // Calculate total points (owner/admin don't accumulate points)
    const totalPoints =
      membership.role === "owner" || membership.role === "admin"
        ? 0
        : pointEvents.reduce((sum, e) => sum + e.points, 0);

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
      isOwnerOrAdmin: membership.role === "owner" || membership.role === "admin",
    };
  },
});

// Award points for creating a post
export const awardPostPoints = mutation({
  args: {
    communityId: v.id("communities"),
    postId: v.id("posts"),
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

    // Owner/admin don't earn points
    if (membership.role === "owner" || membership.role === "admin") {
      return null;
    }

    // Check if points already awarded for this post (prevent duplicates)
    const existingPoints = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter(
        (q) =>
          q.eq(q.field("communityId"), args.communityId) &&
          q.eq(q.field("sourceId"), args.postId) &&
          q.eq(q.field("eventType"), "post")
      )
      .first();

    if (existingPoints) {
      return null; // Already awarded
    }

    // Award 2 points for post
    await ctx.db.insert("pointEvents", {
      communityId: args.communityId,
      userId: user._id,
      eventType: "post",
      points: 2,
      sourceType: "post",
      sourceId: args.postId,
      createdAt: Date.now(),
    });

    return 2;
  },
});

// Award points for creating a comment (1 point if 20+ chars)
export const awardCommentPoints = mutation({
  args: {
    communityId: v.id("communities"),
    commentId: v.string(), // Changed from v.id("comments") - we'll handle conversion
    contentLength: v.number(),
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

    // Owner/admin don't earn points
    if (membership.role === "owner" || membership.role === "admin") {
      return null;
    }

    // Only award points if comment is 20+ characters
    if (args.contentLength < 20) {
      return 0;
    }

    // Check if points already awarded for this comment
    const existingPoints = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter(
        (q) =>
          q.eq(q.field("communityId"), args.communityId) &&
          q.eq(q.field("sourceId"), args.commentId) &&
          q.eq(q.field("eventType"), "comment")
      )
      .first();

    if (existingPoints) {
      return null;
    }

    // Award 1 point for comment
    await ctx.db.insert("pointEvents", {
      communityId: args.communityId,
      userId: user._id,
      eventType: "comment",
      points: 1,
      sourceType: "comment",
      sourceId: args.commentId,
      createdAt: Date.now(),
    });

    return 1;
  },
});

// Award points for completing a lesson (10 points)
export const awardLessonPoints = mutation({
  args: {
    communityId: v.id("communities"),
    classroomId: v.string(), // Changed from v.id("classrooms") - we'll handle conversion
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

    // Owner/admin don't earn points
    if (membership.role === "owner" || membership.role === "admin") {
      return null;
    }

    // Check if points already awarded for this classroom today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = today.getTime() + 24 * 60 * 60 * 1000;

    const existingPoints = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter(
        (q) =>
          q.eq(q.field("communityId"), args.communityId) &&
          q.eq(q.field("sourceId"), args.classroomId) &&
          q.eq(q.field("eventType"), "lesson_completed") &&
          q.gte(q.field("createdAt"), today.getTime()) &&
          q.lt(q.field("createdAt"), tomorrow)
      )
      .first();

    if (existingPoints) {
      return null; // Already awarded today
    }

    // Award 10 points for lesson completion
    await ctx.db.insert("pointEvents", {
      communityId: args.communityId,
      userId: user._id,
      eventType: "lesson_completed",
      points: 10,
      createdAt: Date.now(),
    });

    return 10;
  },
});

// Award streak bonus points (called by scheduled function or manually)
export const awardStreakBonus = mutation({
  args: {
    communityId: v.id("communities"),
  },
  handler: async (ctx, args) => {
    // Get all active members
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const oneDayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = today.getTime() - oneDayMs;

    // For each member, check if they had activity yesterday but not today (broken streak)
    // or had activity today (continuing streak)
    for (const membership of memberships) {
      // Skip owner/admin
      if (membership.role === "owner" || membership.role === "admin") {
        continue;
      }

      // Get point events for this user
      const pointEvents = await ctx.db
        .query("pointEvents")
        .withIndex("by_user_id", (q) => q.eq("userId", membership.userId))
        .filter((q) => q.eq(q.field("communityId"), args.communityId))
        .collect();

      // Get unique days with activity
      const daysWithActivity = new Set<number>();
      pointEvents.forEach((e) => {
        const day = Math.floor(e.createdAt / oneDayMs);
        daysWithActivity.add(day);
      });

      const todayDay = Math.floor(today.getTime() / oneDayMs);
      const yesterdayDay = Math.floor(yesterday / oneDayMs);

      // Calculate current streak
      let streak = 0;
      let checkDate = today.getTime();
      while (daysWithActivity.has(Math.floor(checkDate / oneDayMs))) {
        streak++;
        checkDate -= oneDayMs;
      }

      // Award streak bonus if they have activity
      if (daysWithActivity.has(todayDay)) {
        // Award bonus points based on streak
        // Day 1: +1, Day 2: +2, Day 3+: +3
        const bonusPoints = streak >= 3 ? 3 : streak;
        
        await ctx.db.insert("pointEvents", {
          communityId: args.communityId,
          userId: membership.userId,
          eventType: "streak_bonus",
          points: bonusPoints,
          createdAt: Date.now(),
        });
      }
    }

    return { processed: memberships.length };
  },
});
