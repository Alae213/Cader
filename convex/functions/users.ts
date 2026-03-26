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
        wilaya: user.wilaya,
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

// Get user activity for the past year
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
    let commentsQuery = ctx.db
      .query("comments")
      .withIndex("by_author_id", (q) => q.eq("authorId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), oneYearAgo));

    const comments = await commentsQuery.collect();

    // Combine posts and comments into daily activity
    const activityByDate: Record<string, number> = {};

    posts.forEach((post) => {
      const date = new Date(post.createdAt).toISOString().split("T")[0];
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    });

    comments.forEach((comment) => {
      const date = new Date(comment.createdAt).toISOString().split("T")[0];
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    });

    // Convert to array format for the heat map
    const activity = Object.entries(activityByDate).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      postsCount: posts.length,
      commentsCount: comments.length,
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
    wilaya: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;
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
