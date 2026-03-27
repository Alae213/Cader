import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Get user's membership for a community by slug (uses Clerk ID)
export const getMembershipBySlug = query({
  args: { 
    slug: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the community by slug
    const community = await ctx.db
      .query("communities")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    if (!community) return null;
    
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    if (!user) return null;
    
    // Find membership
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", community._id).eq("userId", user._id)
      )
      .first();
    
    if (!membership) return null;
    
    // Return role for tab visibility
    return {
      role: membership.role,
      status: membership.status,
      isOwner: membership.role === "owner",
      isAdmin: membership.role === "admin" || membership.role === "owner",
      isMember: membership.status === "active",
    };
  },
});

// Get user's membership for a community
export const getMembership = query({
  args: { 
    communityId: v.id("communities"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", args.communityId).eq("userId", args.userId)
      )
      .first();
    
    return membership;
  },
});

// Get all memberships for a user
export const getUserMemberships = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    
    return memberships;
  },
});

// Get all memberships for a user by Clerk ID
export const listByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    if (!user) return [];
    
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    // Get community info for each membership
    const membershipsWithCommunity = await Promise.all(
      memberships.map(async (m) => {
        const community = await ctx.db.get(m.communityId);
        return {
          ...m,
          communityId: m.communityId,
          communityName: community?.name,
          communitySlug: community?.slug,
        };
      })
    );
    
    return membershipsWithCommunity;
  },
});

// List memberships by user (wrapper that uses clerkId)
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Find the user by Clerk ID (treating userId as clerkId)
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();
    
    if (!user) return [];
    
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    // Get community info for each membership
    const membershipsWithCommunity = await Promise.all(
      memberships.map(async (m) => {
        const community = await ctx.db.get(m.communityId);
        return {
          ...m,
          communityId: m.communityId,
          communityName: community?.name,
          communitySlug: community?.slug,
        };
      })
    );
    
    return membershipsWithCommunity;
  },
});

// Grant membership for free community (immediate, with additional details)
export const grantMembershipWithDetails = mutation({
  args: {
    communityId: v.id("communities"),
    displayName: v.string(),
    phone: v.optional(v.string()),
    wilaya: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user from Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to join a community");
    }

    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found. Please complete onboarding first.");
    }

    // Get community
    const community = await ctx.db.get(args.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check if community is free
    if (community.pricingType !== "free") {
      throw new Error("This community requires payment to join");
    }

    // Check if user already has membership
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", user._id)
      )
      .first();

    if (existingMembership) {
      // Already a member, just update status
      if (existingMembership.status !== "active") {
        await ctx.db.patch(existingMembership._id, {
          status: "active",
          updatedAt: Date.now(),
        });
      }
      return existingMembership._id;
    }

    // Create new membership
    const now = Date.now();
    const membershipId = await ctx.db.insert("memberships", {
      communityId: args.communityId,
      userId: user._id,
      role: "member",
      status: "active",
      subscriptionType: "free",
      subscriptionStartDate: now,
      createdAt: now,
      updatedAt: now,
    });

    // Update user profile with phone and wilaya if provided
    if (args.phone || args.wilaya) {
      const updateData: Record<string, any> = {
        updatedAt: now,
      };
      if (args.phone) updateData.phone = args.phone;
      if (args.wilaya) updateData.wilaya = args.wilaya;
      
      await ctx.db.patch(user._id, updateData);
    }

    return membershipId;
  },
});

// Grant membership after successful payment (called from webhook)
// Note: This is a public mutation because it's called from external webhook endpoint
// Security is provided by webhook signature verification
export const grantMembership = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.id("users"),
    paymentReference: v.string(),
  },
  handler: async (ctx, args) => {
    // Get community to determine pricing type
    const community = await ctx.db.get(args.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check if user already has membership
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", args.userId)
      )
      .first();

    if (existingMembership) {
      // Update existing membership
      await ctx.db.patch(existingMembership._id, {
        status: "active",
        subscriptionType: community.pricingType,
        subscriptionStartDate: Date.now(),
        subscriptionEndDate: community.pricingType === "monthly"
          ? Date.now() + 30 * 24 * 60 * 60 * 1000
          : community.pricingType === "annual"
          ? Date.now() + 365 * 24 * 60 * 60 * 1000
          : undefined,
        paymentReference: args.paymentReference,
        updatedAt: Date.now(),
      });
      return existingMembership._id;
    }

    // Create new membership
    const now = Date.now();
    const membershipId = await ctx.db.insert("memberships", {
      communityId: args.communityId,
      userId: args.userId,
      role: "member",
      status: "active",
      subscriptionType: community.pricingType,
      subscriptionStartDate: now,
      subscriptionEndDate: community.pricingType === "monthly"
        ? now + 30 * 24 * 60 * 60 * 1000
        : community.pricingType === "annual"
        ? now + 365 * 24 * 60 * 60 * 1000
        : undefined,
      paymentReference: args.paymentReference,
      createdAt: now,
      updatedAt: now,
    });

    return membershipId;
  },
});

// Revoke membership for expired subscriptions
export const revokeMembership = mutation({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    await ctx.db.patch(args.membershipId, {
      status: "inactive",
      updatedAt: Date.now(),
    });

    return args.membershipId;
  },
});

// List members for a community (with user data including wilaya)
export const listMembers = query({
  args: {
    communityId: v.id("communities"),
  },
  handler: async (ctx, args) => {
    // Get all active memberships for the community
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get user data for each membership
    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        if (!user) return null;

        // Get total points for level calculation
        const pointEvents = await ctx.db
          .query("pointEvents")
          .withIndex("by_user_id", (q) => q.eq("userId", membership.userId))
          .filter((q) => q.eq(q.field("communityId"), args.communityId))
          .collect();

        const totalPoints = pointEvents.reduce((sum, e) => sum + e.points, 0);
        const level = getLevelFromPoints(totalPoints);

        return {
          membershipId: membership._id,
          userId: user._id,
          clerkId: user.clerkId,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          wilaya: user.wilaya,
          role: membership.role,
          subscriptionType: membership.subscriptionType,
          createdAt: membership.createdAt,
          totalPoints,
          level,
        };
      })
    );

    // Filter out nulls and sort by join date (newest first)
    return members.filter(Boolean).sort((a, b) => b!.createdAt - a!.createdAt);
  },
});

// Get member count by wilaya for a community
export const getMemberCountByWilaya = query({
  args: {
    communityId: v.id("communities"),
  },
  handler: async (ctx, args) => {
    // Get all active memberships for the community
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Count members by wilaya
    const wilayaCounts: Record<string, number> = {};
    
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      if (!user) continue;
      
      const wilaya = user.wilaya || "Unspecified";
      wilayaCounts[wilaya] = (wilayaCounts[wilaya] || 0) + 1;
    }

    return wilayaCounts;
  },
});

// Block a member (admin only)
export const blockMember = mutation({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    // Get the current user's record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the membership to block
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    // Get the community
    const community = await ctx.db.get(membership.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check if current user is admin or owner of this community
    const currentMembership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", community._id).eq("userId", user._id)
      )
      .first();

    if (!currentMembership || !["admin", "owner"].includes(currentMembership.role)) {
      throw new Error("Only admins can block members");
    }

    // Cannot block the owner
    if (membership.role === "owner") {
      throw new Error("Cannot block the community owner");
    }

    // Update membership status to blocked
    await ctx.db.patch(args.membershipId, {
      status: "blocked",
      updatedAt: Date.now(),
    });

    return args.membershipId;
  },
});

// Add admin - promoted from member
export const addAdmin = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the membership to promote
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    // Get the community
    const community = await ctx.db.get(membership.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check if current user is owner of this community
    if (community.ownerId !== user._id) {
      throw new Error("Only the owner can add admins");
    }

    // Cannot add owner as admin
    if (membership.role === "owner") {
      throw new Error("Cannot add owner as admin");
    }

    // Update role to admin
    await ctx.db.patch(args.membershipId, {
      role: "admin",
      updatedAt: Date.now(),
    });

    return args.membershipId;
  },
});

// Remove admin - demoted to member
export const removeAdmin = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the membership to demote
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    // Get the community
    const community = await ctx.db.get(membership.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check if current user is owner of this community
    if (community.ownerId !== user._id) {
      throw new Error("Only the owner can remove admins");
    }

    // Get all admins to check if this is the last admin
    const allMemberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", community._id))
      .filter((q) => q.eq(q.field("role"), "admin"))
      .collect();

    // If this is the last admin, prevent removal (EC-8)
    if (allMemberships.length === 1) {
      throw new Error("Cannot remove the last admin. Add another admin first.");
    }

    // Update role to member
    await ctx.db.patch(args.membershipId, {
      role: "member",
      updatedAt: Date.now(),
    });

    return args.membershipId;
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
