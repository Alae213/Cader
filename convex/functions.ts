import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Reserved slugs that cannot be used
const RESERVED_SLUGS = [
  "explore", "help", "api", "settings", "create", 
  "sign-in", "sign-up", "signout", "about", "terms", 
  "privacy", "admin", "www", "mail", "ftp", "localhost"
];

// Check if a slug is available
export const slugExists = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = args.slug.toLowerCase().trim();
    
    // Check reserved slugs
    if (RESERVED_SLUGS.includes(slug)) {
      return true; // Reserved, so "exists"
    }
    
    // Check database
    const existing = await ctx.db
      .query("communities")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    
    return !!existing;
  },
});

// Get community by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const community = await ctx.db
      .query("communities")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    if (!community) return null;
    
    // Get member count
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", community._id))
      .collect();
    
    return {
      ...community,
      memberCount: members.filter((m: { status: string }) => m.status === "active").length,
    };
  },
});

// Create a new community
export const createCommunity = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    pricingType: v.union(v.literal("free"), v.literal("monthly"), v.literal("annual"), v.literal("one_time")),
    priceDzd: v.optional(v.number()),
    wilaya: v.optional(v.string()),
    ownerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const slug = args.slug.toLowerCase().trim();
    
    // Validate slug format
    if (slug.length < 3 || slug.length > 50) {
      throw new Error("Slug must be between 3 and 50 characters");
    }
    
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error("Slug can only contain lowercase letters, numbers, and hyphens");
    }
    
    // Check reserved slugs
    if (RESERVED_SLUGS.includes(slug)) {
      throw new Error("This URL is reserved and cannot be used");
    }
    
    // Check if slug already exists
    const existing = await ctx.db
      .query("communities")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    
    if (existing) {
      throw new Error("This URL is already taken");
    }
    
    // Validate paid community has price
    if (["monthly", "annual", "one_time"].includes(args.pricingType)) {
      if (!args.priceDzd || args.priceDzd <= 0) {
        throw new Error("Price is required for paid communities");
      }
    }
    
    const now = Date.now();
    
    // Create the community
    const communityId = await ctx.db.insert("communities", {
      slug,
      name: args.name,
      wilaya: args.wilaya,
      pricingType: args.pricingType,
      priceDzd: args.priceDzd,
      ownerId: args.ownerId,
      platformTier: "free",
      memberLimit: 50,
      createdAt: now,
      updatedAt: now,
    });
    
    // Create owner membership
    await ctx.db.insert("memberships", {
      communityId,
      userId: args.ownerId,
      role: "owner",
      status: "active",
      subscriptionType: args.pricingType,
      subscriptionStartDate: now,
      createdAt: now,
      updatedAt: now,
    });
    
    return communityId;
  },
});

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
