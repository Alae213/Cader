import { query, mutation } from "../_generated/server";
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
