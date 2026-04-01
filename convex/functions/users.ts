import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Sync user from Clerk webhook
export const syncUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email: args.email,
        displayName: args.displayName,
        avatarUrl: args.avatarUrl,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    
    // Create new user
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      createdAt: now,
      updatedAt: now,
    });
    
    return userId;
  },
});

// Get user by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    return user;
  },
});

// Get user by ID (for webhook verification)
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user;
  },
});

// Get user profile with communities and level
export const getUserProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get communities the user has joined (as member/admin/owner, not blocked)
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "pending")
        )
      ))
      .collect();

    // Get community details for joined communities
    const joinedCommunities = await Promise.all(
      memberships.map(async (m) => {
        const community = await ctx.db.get(m.communityId);
        if (!community) return null;
        return {
          _id: community._id,
          name: community.name,
          slug: community.slug,
          logoUrl: community.logoUrl,
          role: m.role,
          joinedAt: m.createdAt,
        };
      })
    );

    // Get communities the user owns
    const ownedCommunities = await ctx.db
      .query("communities")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.userId))
      .collect();

    // Get total points for level calculation
    const pointEvents = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    const totalPoints = pointEvents.reduce((sum, event) => {
      // Only count positive points (exclude reversals)
      if (event.points > 0) {
        return sum + event.points;
      }
      return sum;
    }, 0);

    // Calculate level from points
    const level = getLevelFromPoints(totalPoints);

    return {
      user: {
        _id: user._id,
        clerkId: user.clerkId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
      },
      level,
      totalPoints,
      joinedCommunities: joinedCommunities.filter(Boolean),
      ownedCommunities: ownedCommunities.map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
        logoUrl: c.logoUrl,
        memberCount: c.memberLimit,
        joinedAt: c.createdAt,
      })),
    };
  },
});

// Get user activity for the past year (platform-wide: all signals)
export const getUserActivity = query({
  args: { 
    userId: v.id("users"),
    communityId: v.optional(v.id("communities")),
  },
  handler: async (ctx, args) => {
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    
    // Get posts by user
    let postsQuery = ctx.db
      .query("posts")
      .withIndex("by_author_id", (q) => q.eq("authorId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), oneYearAgo));

    if (args.communityId) {
      postsQuery = postsQuery.filter((q) => q.eq(q.field("communityId"), args.communityId!));
    }

    const posts = await postsQuery.collect();

    // Get comments by user
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_author_id", (q) => q.eq("authorId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), oneYearAgo))
      .collect();

    // Get upvotes given by user
    const upvotes = await ctx.db
      .query("upvotes")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), oneYearAgo))
      .collect();

    // Get lesson completions
    const lessonCompletions = await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("completedAt"), oneYearAgo))
      .collect();

    // Get streak days from pointEvents
    const streakEvents = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), oneYearAgo))
      .collect();

    const streakDays = streakEvents.filter(e => 
      e.eventType === "streak_day_awarded" || 
      e.eventType === "streak_bonus" ||
      e.eventType === "streak_reversal"
    );

    // Combine all signals into daily activity
    const activityByDate: Record<string, number> = {};

    const addActivity = (timestamp: number) => {
      const date = new Date(timestamp).toISOString().split("T")[0];
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    };

    posts.forEach((post) => addActivity(post.createdAt));
    comments.forEach((comment) => addActivity(comment.createdAt));
    upvotes.forEach((upvote) => addActivity(upvote.createdAt));
    lessonCompletions.forEach((lesson) => addActivity(lesson.completedAt));
    streakDays.forEach((event) => addActivity(event.createdAt));

    // Convert to array format for the heat map
    const activity = Object.entries(activityByDate).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      postsCount: posts.length,
      commentsCount: comments.length,
      upvotesCount: upvotes.length,
      lessonsCount: lessonCompletions.length,
      streakDaysCount: streakDays.length,
      activity,
    };
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    wilaya: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to update your profile");
    }

    // Get the current user from our database
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Verify the caller owns this profile
    if (currentUser._id !== args.userId) {
      throw new Error("You can only update your own profile");
    }

    // Validate displayName if provided
    if (args.displayName !== undefined) {
      const trimmed = args.displayName.trim();
      if (trimmed.length === 0) {
        throw new Error("Display name cannot be empty");
      }
      if (trimmed.length > 100) {
        throw new Error("Display name must be 100 characters or less");
      }
      args.displayName = trimmed;
    }

    // Validate bio if provided
    if (args.bio !== undefined) {
      if (args.bio.length > 160) {
        throw new Error("Bio must be 160 characters or less");
      }
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.wilaya !== undefined) updates.wilaya = args.wilaya;

    await ctx.db.patch(args.userId, updates);
    return true;
  },
});

// Helper function to derive level from points
function getLevelFromPoints(points: number): number {
  if (points >= 280) return 5;
  if (points >= 140) return 4;
  if (points >= 60) return 3;
  if (points >= 20) return 2;
  return 1;
}

// Delete user account - remove from all communities, clear personal data, delete user record
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to delete your account");
    }

    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // 1. Remove from all memberships (set status to deleted)
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    for (const membership of memberships) {
      await ctx.db.patch(membership._id, {
        status: "deleted" as never,
        updatedAt: Date.now(),
      });
    }

    // 2. Delete notification records where user is recipient
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_id", (q) => q.eq("recipientId", user._id))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    // 3. Delete point events for this user
    const pointEvents = await ctx.db
      .query("pointEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    for (const event of pointEvents) {
      await ctx.db.delete(event._id);
    }

    // 4. Delete lesson progress for this user
    const lessonProgress = await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    for (const progress of lessonProgress) {
      await ctx.db.delete(progress._id);
    }

    // 5. Delete classroom access for this user
    const classroomAccess = await ctx.db
      .query("classroomAccess")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    for (const access of classroomAccess) {
      await ctx.db.delete(access._id);
    }

    // 6. Delete the user record
    // Note: Posts and comments remain with dangling authorId references.
    // Frontend handles this by checking if author exists and showing "Deleted User"
    await ctx.db.delete(user._id);

    return true;
  },
});
