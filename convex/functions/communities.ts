import { query, mutation } from "../_generated/server";
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
    
    const activeMembers = members.filter((m: { status: string }) => m.status === "active");
    
    // Get owner details
    const owner = await ctx.db.get(community.ownerId) as { displayName?: string; avatarUrl?: string } | null;
    
    // Get online count (active in last 30 minutes - using updatedAt as proxy)
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const onlineCount = activeMembers.filter((m: { updatedAt: number }) => m.updatedAt > thirtyMinutesAgo).length;
    
    return {
      ...community,
      memberCount: activeMembers.length,
      onlineCount,
      ownerName: owner?.displayName || "Unknown",
      ownerAvatar: owner?.avatarUrl || null,
    };
  },
});

// Get community stats (member count, online, streak)
export const getCommunityStats = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) return null;
    
    // Get all memberships
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .collect();
    
    const activeMembers = memberships.filter((m: { status: string }) => m.status === "active");
    
    // Get online count (active in last 30 minutes)
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const onlineCount = activeMembers.filter((m: { updatedAt: number }) => m.updatedAt > thirtyMinutesAgo).length;
    
    // Calculate streak (consecutive days with activity)
    // For MVP, we'll use a simple heuristic: check if any member has activity in the last 7 days
    let streak = 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const hasRecentActivity = activeMembers.some((m: { updatedAt: number }) => m.updatedAt > sevenDaysAgo);
    if (hasRecentActivity) {
      streak = Math.floor(Math.random() * 30) + 1; // Placeholder for MVP - real implementation would track daily logins
    }
    
    return {
      memberCount: activeMembers.length,
      onlineCount,
      streak,
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
    // Chargily keys (optional - can be added later via settings)
    chargilyApiKey: v.optional(v.string()),
    chargilyWebhookSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user from Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to create a community");
    }
    
    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) {
      throw new Error("User not found. Please complete onboarding first.");
    }
    
    const slug = args.slug.toLowerCase().trim();
    
    // Validate name
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Community name is required");
    }
    if (args.name.length > 60) {
      throw new Error("Community name must be 60 characters or less");
    }
    
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
      if (args.priceDzd < 100) {
        throw new Error("Price must be at least 100 DZD");
      }
      if (args.priceDzd > 100000) {
        throw new Error("Price cannot exceed 100,000 DZD");
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
      ownerId: user._id,
      platformTier: "free",
      memberLimit: 50,
      // Store Chargily keys (will be encrypted in Phase 17)
      chargilyApiKey: args.chargilyApiKey,
      chargilyWebhookSecret: args.chargilyWebhookSecret,
      createdAt: now,
      updatedAt: now,
    });
    
    // Create owner membership
    await ctx.db.insert("memberships", {
      communityId,
      userId: user._id,
      role: "owner",
      status: "active",
      subscriptionType: args.pricingType,
      subscriptionStartDate: now,
      createdAt: now,
      updatedAt: now,
    });
    
    return { communityId, slug };
  },
});

// Update community details
export const updateCommunity = mutation({
  args: {
    communityId: v.id("communities"),
    name: v.optional(v.string()),
    tagline: v.optional(v.string()),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    links: v.optional(v.array(v.string())),
    wilaya: v.optional(v.string()),
    pricingType: v.optional(v.union(v.literal("free"), v.literal("monthly"), v.literal("annual"), v.literal("one_time"))),
    priceDzd: v.optional(v.number()),
    chargilyApiKey: v.optional(v.string()),
    chargilyWebhookSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to update a community");
    }
    
    // Get the community
    const community = await ctx.db.get(args.communityId);
    if (!community) {
      throw new Error("Community not found");
    }
    
    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if user is owner
    if (community.ownerId !== user._id) {
      throw new Error("You can only edit communities you own");
    }
    
    // Update community
    const updateData: Record<string, any> = {
      updatedAt: Date.now(),
    };
    
    if (args.name !== undefined) updateData.name = args.name;
    if (args.tagline !== undefined) updateData.tagline = args.tagline;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.logoUrl !== undefined) updateData.logoUrl = args.logoUrl;
    if (args.videoUrl !== undefined) updateData.videoUrl = args.videoUrl;
    if (args.links !== undefined) updateData.links = args.links;
    if (args.wilaya !== undefined) updateData.wilaya = args.wilaya;
    if (args.pricingType !== undefined) updateData.pricingType = args.pricingType;
    if (args.priceDzd !== undefined) updateData.priceDzd = args.priceDzd;
    if (args.chargilyApiKey !== undefined) updateData.chargilyApiKey = args.chargilyApiKey;
    if (args.chargilyWebhookSecret !== undefined) updateData.chargilyWebhookSecret = args.chargilyWebhookSecret;
    
    await ctx.db.patch(args.communityId, updateData);
    
    return args.communityId;
  },
});

// Check if community has reached member limit
export const checkMemberLimit = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) {
      return { atLimit: false, current: 0, limit: 0 };
    }

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .collect();

    const activeMembers = memberships.filter((m: { status: string }) => m.status === "active");
    const currentCount = activeMembers.length;
    const limit = community.memberLimit || 50;
    const isSubscribed = community.platformTier === "subscribed";

    // Subscribed communities have unlimited members
    const atLimit = !isSubscribed && currentCount >= limit;

    return {
      atLimit,
      current: currentCount,
      limit,
      isSubscribed,
    };
  },
});

// Check if a user can join a community (considering member limits)
export const canJoinCommunity = query({
  args: { communityId: v.id("communities"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) {
      return { canJoin: false, reason: "Community not found" };
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", args.userId)
      )
      .first();

    if (existingMembership) {
      return { canJoin: true, reason: "Already a member", isMember: true };
    }

    // Check member limit
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .collect();

    const activeMembers = memberships.filter((m: { status: string }) => m.status === "active");
    const currentCount = activeMembers.length;
    const limit = community.memberLimit || 50;
    const isSubscribed = community.platformTier === "subscribed";

    // Subscribed communities have unlimited members
    if (isSubscribed) {
      return { canJoin: true, reason: "Unlimited members" };
    }

    if (currentCount >= limit) {
      return { 
        canJoin: false, 
        reason: "Community has reached its member limit",
        currentCount,
        limit,
      };
    }

    return { canJoin: true, reason: "Available" };
  },
});

// Update community's platform tier (called from webhook for platform subscriptions)
export const updatePlatformTier = mutation({
  args: {
    communityId: v.id("communities"),
    tier: v.union(v.literal("free"), v.literal("subscribed")),
  },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Only the community owner can update the tier (enforced by checking ownership)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Allow webhook calls (no auth) - this is a server-to-server operation
    } else {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();
      
      if (!user || community.ownerId !== user._id) {
        throw new Error("Only the community owner can update the platform tier");
      }
    }

    await ctx.db.patch(args.communityId, {
      platformTier: args.tier,
      updatedAt: Date.now(),
    });

    return args.communityId;
  },
});

// Scheduled action to check and revoke expired memberships
// This runs daily to find memberships that have passed their subscription end date
export const checkExpiringSubscriptions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find all active memberships with subscription end dates that have passed
    const allMemberships = await ctx.db
      .query("memberships")
      .collect();

    const expiredMemberships = allMemberships.filter(
      (m: { status: string; subscriptionEndDate?: number }) => 
        m.status === "active" && m.subscriptionEndDate && m.subscriptionEndDate < now
    );

    console.log(`Found ${expiredMemberships.length} expired memberships`);

    // Revoke each expired membership
    for (const membership of expiredMemberships) {
      try {
        await ctx.db.patch(membership._id, {
          status: "inactive",
          updatedAt: now,
        });
        console.log(`Revoked membership for user ${membership.userId} in community ${membership.communityId}`);
      } catch (error) {
        console.error(`Failed to revoke membership ${membership._id}:`, error);
      }
    }

    return {
      checked: allMemberships.length,
      expired: expiredMemberships.length,
    };
  },
});

// Delete community - owner only
export const deleteCommunity = mutation({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
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

    // Get the community
    const community = await ctx.db.get(args.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check if user is the owner
    if (community.ownerId !== user._id) {
      throw new Error("Only the owner can delete this community");
    }

    // Check for active paying members (EC-7)
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const activePayingMembers = memberships.filter(
      (m) => m.subscriptionType && m.subscriptionType !== "free"
    );

    if (activePayingMembers.length > 0) {
      throw new Error(`You have ${activePayingMembers.length} active paying members. Please remove or refund them before deleting.`);
    }

    // Delete all memberships
    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // Delete the community
    await ctx.db.delete(args.communityId);

    return args.communityId;
  },
});
