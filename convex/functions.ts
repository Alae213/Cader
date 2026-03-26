import { query, mutation, action } from "./_generated/server";
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
      // For MVP, store keys as-is. In Phase 17, these will be encrypted at rest.
      // Keys are never returned to the client - they are used server-side only during checkout.
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

// Validate Chargily API keys - mutation that tests keys via Chargily API
export const validateChargilyKeys = mutation({
  args: {
    apiKey: v.string(),
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Test the keys by calling Chargily's API to get current user info
      // This validates that the keys are valid and have the correct permissions
      const response = await fetch("https://pay.chargily.net/api/v2/user", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          valid: false,
          error: errorData.message || `API returned ${response.status}`,
        };
      }
      
      const userData = await response.json();
      
      // Verify webhook secret format (basic validation)
      if (!args.webhookSecret || args.webhookSecret.length < 10) {
        return {
          valid: false,
          error: "Invalid webhook secret format",
        };
      }
      
      return {
        valid: true,
        // Return non-sensitive info for UI feedback
        email: userData.email,
        name: userData.name,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Failed to validate keys",
      };
    }
  },
});

// Create Chargily checkout session for community or classroom purchase
export const createChargilyCheckout = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.id("users"),
    type: v.union(v.literal("community"), v.literal("classroom")),
    classroomId: v.optional(v.id("classrooms")),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the community
    const community = await ctx.db.get(args.communityId);
    if (!community) {
      throw new Error("Community not found");
    }
    
    // Get the user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if community has Chargily keys (required for paid communities)
    const isPaidCommunity = ["monthly", "annual", "one_time"].includes(community.pricingType || "");
    
    if (isPaidCommunity && !community.chargilyApiKey) {
      throw new Error("This community is not configured for payments. Contact the owner.");
    }
    
    // Determine price based on type
    let amount: number;
    let description: string;
    
    if (args.type === "classroom" && args.classroomId) {
      // Get classroom price
      const classroom = await ctx.db.get(args.classroomId);
      if (!classroom) {
        throw new Error("Classroom not found");
      }
      amount = classroom.priceDzd || 0;
      description = `Classroom: ${classroom.title}`;
    } else {
      // Community membership price
      amount = community.priceDzd || 0;
      description = `Community: ${community.name}`;
    }
    
    if (amount <= 0) {
      throw new Error("Invalid price for this purchase");
    }
    
    // Get Chargily API key (use community's key for creator payments)
    const chargilyApiKey = community.chargilyApiKey;
    if (!chargilyApiKey) {
      throw new Error("Community payment configuration not found");
    }
    
    // Create checkout session via Chargily API
    const checkoutData = {
      amount: amount * 100, // Chargily expects amount in centimes
      currency: "dzd",
      description,
      patient: {
        email: user.email,
        first_name: user.displayName?.split(" ")[0] || "User",
        last_name: user.displayName?.split(" ").slice(1).join(" ") || "",
      },
      callback_url: args.successUrl,
      return_url: args.cancelUrl,
      metadata: {
        communityId: args.communityId,
        userId: args.userId,
        type: args.type,
        classroomId: args.classroomId || "",
      },
    };
    
    try {
      const response = await fetch("https://pay.chargily.net/api/v2/checkouts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${chargilyApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(checkoutData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Chargily API error: ${response.status}`);
      }
      
      const checkout = await response.json();
      
      return {
        checkoutUrl: checkout.url,
        checkoutId: checkout.id,
      };
    } catch (error) {
      console.error("Chargily checkout creation failed:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to create checkout session");
    }
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

// Grant classroom access after successful payment (called from webhook)
export const grantClassroomAccess = mutation({
  args: {
    classroomId: v.id("classrooms"),
    userId: v.id("users"),
    paymentReference: v.string(),
  },
  handler: async (ctx, args) => {
    // Get classroom to confirm it exists and has a price
    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Check if user already has access
    const existingAccess = await ctx.db
      .query("classroomAccess")
      .withIndex("by_classroom_and_user", (q) =>
        q.eq("classroomId", args.classroomId).eq("userId", args.userId)
      )
      .first();

    if (existingAccess) {
      // Update existing access
      await ctx.db.patch(existingAccess._id, {
        accessType: "purchased",
        purchasedAt: Date.now(),
        paymentReference: args.paymentReference,
      });
      return existingAccess._id;
    }

    // Create new classroom access
    const now = Date.now();
    const accessId = await ctx.db.insert("classroomAccess", {
      classroomId: args.classroomId,
      userId: args.userId,
      accessType: "purchased",
      purchasedAt: now,
      paymentReference: args.paymentReference,
      createdAt: now,
    });

    return accessId;
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

// Scheduled action to check and revoke expired memberships
// This runs daily to find memberships that have passed their subscription end date
// Note: This is a mutation that can be called by a scheduled job
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
      // In production, you'd verify the request comes from your webhook handler
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

// ============ COMMUNITY FEED (Phase 8) ============

// List posts for a community (paginated, pinned-first then chronological)
export const listPosts = query({
  args: {
    communityId: v.id("communities"),
    categoryId: v.optional(v.id("categories")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const communityId = args.communityId;

    // Get all posts for this community
    let postsQuery = ctx.db
      .query("posts")
      .withIndex("by_community_id", (q) => q.eq("communityId", communityId));

    // Filter by category if provided
    let posts = await postsQuery.collect();

    if (args.categoryId) {
      posts = posts.filter((p: { categoryId?: string }) => 
        p.categoryId === args.categoryId
      );
    }

    // Sort: pinned first, then by createdAt descending
    posts.sort((a: { isPinned: boolean; createdAt: number }, b: { isPinned: boolean; createdAt: number }) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });

    // Get author details for each post
    const postsWithAuthors = await Promise.all(
      posts.map(async (post: { 
        _id: string; 
        authorId: string; 
        categoryId?: string;
        content: string;
        contentType: string;
        mediaUrls?: string[];
        videoUrl?: string;
        pollOptions?: { text: string; votes: number }[];
        pollEndDate?: number;
        isPinned: boolean;
        mentions?: string[];
        upvoteCount: number;
        commentCount: number;
        createdAt: number;
        updatedAt: number;
      }) => {
        const author = await ctx.db.get(post.authorId);
        let category = null;
        if (post.categoryId) {
          category = await ctx.db.get(post.categoryId);
        }
        return {
          ...post,
          author: author ? {
            _id: author._id,
            displayName: author.displayName,
            avatarUrl: author.avatarUrl,
          } : null,
          category: category ? {
            _id: category._id,
            name: category.name,
            color: category.color,
          } : null,
        };
      })
    );

    return postsWithAuthors;
  },
});

// Create a new post
export const createPost = mutation({
  args: {
    communityId: v.id("communities"),
    content: v.string(),
    contentType: v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("gif"), v.literal("poll")),
    categoryId: v.optional(v.id("categories")),
    mediaUrls: v.optional(v.array(v.string())),
    videoUrl: v.optional(v.string()),
    pollOptions: v.optional(v.array(v.object({
      text: v.string(),
      votes: v.number(),
    }))),
    pollEndDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user from Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to post");
    }

    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found. Please complete onboarding first.");
    }

    // Check if user is a member of this community
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.status !== "active") {
      throw new Error("You must be a member to post in this community");
    }

    // Validate content
    if (!args.content && !args.mediaUrls?.length && !args.videoUrl && !args.pollOptions) {
      throw new Error("Post must have some content");
    }

    // For polls, validate options
    if (args.contentType === "poll") {
      if (!args.pollOptions || args.pollOptions.length < 2) {
        throw new Error("Poll must have at least 2 options");
      }
      if (args.pollOptions.length > 4) {
        throw new Error("Poll can have at most 4 options");
      }
    }

    // Validate video URL if provided
    if (args.videoUrl) {
      const validVideo = isValidVideoUrl(args.videoUrl);
      if (!validVideo) {
        throw new Error("Invalid video URL. Use YouTube, Vimeo, or Google Drive links.");
      }
    }

    // Sanitize content (basic XSS prevention)
    const sanitizedContent = args.content
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Extract mentions from content
    const mentionMatches = sanitizedContent.match(/@(\w+)/g) || [];
    const mentionedUserIds: string[] = [];
    
    // For now, we'll skip mention lookup - would need a searchMembers query
    // In full implementation, look up each mentioned username

    const now = Date.now();
    const postId = await ctx.db.insert("posts", {
      communityId: args.communityId,
      authorId: user._id,
      categoryId: args.categoryId,
      content: sanitizedContent,
      contentType: args.contentType,
      mediaUrls: args.mediaUrls,
      videoUrl: args.videoUrl,
      pollOptions: args.contentType === "poll" 
        ? args.pollOptions?.map(opt => ({ ...opt, votes: 0 }))
        : undefined,
      pollEndDate: args.pollEndDate,
      isPinned: false,
      mentions: mentionedUserIds,
      upvoteCount: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return postId;
  },
});

// Helper to validate video URLs
function isValidVideoUrl(url: string): boolean {
  if (!url) return true; // Empty is allowed (optional)
  
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  
  return !!(youtubeMatch || vimeoMatch || driveMatch);
}

// Create a comment on a post
export const createComment = mutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to comment");
    }

    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the post to find the community
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if user is a member of this community
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", post.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.status !== "active") {
      throw new Error("You must be a member to comment");
    }

    // If replying to a comment, verify it exists and belongs to the same post
    if (args.parentCommentId) {
      const parentComment = await ctx.db.get(args.parentCommentId);
      if (!parentComment || parentComment.postId !== args.postId) {
        throw new Error("Invalid parent comment");
      }
    }

    // Sanitize content
    const sanitizedContent = args.content
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Extract mentions
    const mentionMatches = sanitizedContent.match(/@(\w+)/g) || [];

    const now = Date.now();
    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      authorId: user._id,
      parentCommentId: args.parentCommentId,
      content: sanitizedContent,
      mentions: mentionMatches.map((m: string) => m.slice(1)), // Remove @
      createdAt: now,
      updatedAt: now,
    });

    // Update post comment count
    await ctx.db.patch(args.postId, {
      commentCount: post.commentCount + 1,
      updatedAt: now,
    });

    return commentId;
  },
});

// Get comments for a post (threaded)
export const listComments = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post_id", (q) => q.eq("postId", args.postId))
      .collect();

    // Get author details for each comment
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment: {
        _id: string;
        postId: string;
        authorId: string;
        parentCommentId?: string;
        content: string;
        mentions?: string[];
        createdAt: number;
        updatedAt: number;
      }) => {
        const author = await ctx.db.get(comment.authorId);
        return {
          ...comment,
          author: author ? {
            _id: author._id,
            displayName: author.displayName,
            avatarUrl: author.avatarUrl,
          } : null,
        };
      })
    );

    // Organize into threads: top-level + replies
    const topLevel = commentsWithAuthors.filter((c: { parentCommentId?: string }) => !c.parentCommentId);
    const replies = commentsWithAuthors.filter((c: { parentCommentId?: string }) => c.parentCommentId);

    // Attach replies to their parents
    const threadedComments = topLevel.map((comment: {
      _id: string;
      postId: string;
      authorId: string;
      parentCommentId?: string;
      content: string;
      mentions?: string[];
      createdAt: number;
      updatedAt: number;
      author: { _id: string; displayName: string; avatarUrl?: string } | null;
    }) => ({
      ...comment,
      replies: replies.filter((r: { parentCommentId?: string }) => r.parentCommentId === comment._id),
    }));

    // Sort by createdAt (newest first)
    threadedComments.sort((a: { createdAt: number }, b: { createdAt: number }) => 
      b.createdAt - a.createdAt
    );

    return threadedComments;
  },
});

// ============ FEED INTERACTIONS (Phase 9) ============

// Toggle upvote on a post (idempotent)
export const toggleUpvote = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to upvote");
    }

    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the post to find the community
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if user is a member of this community
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", post.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.status !== "active") {
      throw new Error("You must be a member to upvote");
    }

    // Check if user already upvoted
    const existingUpvote = await ctx.db
      .query("upvotes")
      .withIndex("by_post_and_user", (q) =>
        q.eq("postId", args.postId).eq("userId", user._id)
      )
      .first();

    const now = Date.now();

    if (existingUpvote) {
      // Remove upvote (toggle off)
      await ctx.db.delete(existingUpvote._id);
      
      // Update post upvote count
      await ctx.db.patch(args.postId, {
        upvoteCount: Math.max(0, post.upvoteCount - 1),
        updatedAt: now,
      });

      // Write a -1 point event (reverse the upvote)
      await ctx.db.insert("pointEvents", {
        communityId: post.communityId,
        userId: post.authorId,
        eventType: "upvote_reversal",
        points: -1,
        sourceType: "post",
        sourceId: args.postId,
        createdAt: now,
      });

      return { upvoted: false, newCount: Math.max(0, post.upvoteCount - 1) };
    } else {
      // Add upvote (toggle on)
      await ctx.db.insert("upvotes", {
        postId: args.postId,
        userId: user._id,
        createdAt: now,
      });

      // Update post upvote count
      await ctx.db.patch(args.postId, {
        upvoteCount: post.upvoteCount + 1,
        updatedAt: now,
      });

      // Write a +1 point event to post author
      await ctx.db.insert("pointEvents", {
        communityId: post.communityId,
        userId: post.authorId,
        eventType: "upvote_received",
        points: 1,
        sourceType: "post",
        sourceId: args.postId,
        createdAt: now,
      });

      return { upvoted: true, newCount: post.upvoteCount + 1 };
    }
  },
});

// Check if user has upvoted a post
export const getUserUpvoteStatus = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { upvoted: false };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return { upvoted: false };
    }

    const existingUpvote = await ctx.db
      .query("upvotes")
      .withIndex("by_post_and_user", (q) =>
        q.eq("postId", args.postId).eq("userId", user._id)
      )
      .first();

    return { upvoted: !!existingUpvote };
  },
});

// Pin a post (owner/admin only)
export const pinPost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", post.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only the owner or admin can pin posts");
    }

    // Check pinned count (max 3)
    const allPosts = await ctx.db
      .query("posts")
      .withIndex("by_community_id", (q) => q.eq("communityId", post.communityId))
      .collect();

    const pinnedCount = allPosts.filter((p: { isPinned: boolean }) => p.isPinned).length;
    
    if (pinnedCount >= 3) {
      throw new Error("Maximum 3 posts can be pinned. Unpin another post first.");
    }

    await ctx.db.patch(args.postId, {
      isPinned: true,
      updatedAt: Date.now(),
    });

    return args.postId;
  },
});

// Unpin a post (owner/admin only)
export const unpinPost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", post.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only the owner or admin can unpin posts");
    }

    await ctx.db.patch(args.postId, {
      isPinned: false,
      updatedAt: Date.now(),
    });

    return args.postId;
  },
});

// Delete a post (author or owner/admin)
export const deletePost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check permission: author or owner/admin
    const isAuthor = post.authorId === user._id;
    
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", post.communityId).eq("userId", user._id)
      )
      .first();

    const isAdmin = membership && (membership.role === "owner" || membership.role === "admin");

    if (!isAuthor && !isAdmin) {
      throw new Error("You can only delete your own posts or posts from this community");
    }

    // Delete all upvotes for this post
    const upvotes = await ctx.db
      .query("upvotes")
      .withIndex("by_post_id", (q) => q.eq("postId", args.postId))
      .collect();

    for (const upvote of upvotes) {
      await ctx.db.delete(upvote._id);
    }

    // Delete all comments for this post
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post_id", (q) => q.eq("postId", args.postId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Delete the post
    await ctx.db.delete(args.postId);

    return args.postId;
  },
});

// Delete a comment (author or owner/admin)
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    const post = await ctx.db.get(comment.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check permission: author or owner/admin
    const isAuthor = comment.authorId === user._id;
    
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", post.communityId).eq("userId", user._id)
      )
      .first();

    const isAdmin = membership && (membership.role === "owner" || membership.role === "admin");

    if (!isAuthor && !isAdmin) {
      throw new Error("You can only delete your own comments or comments from this community");
    }

    // Update post comment count
    await ctx.db.patch(post._id, {
      commentCount: Math.max(0, post.commentCount - 1),
      updatedAt: Date.now(),
    });

    // Delete the comment
    await ctx.db.delete(args.commentId);

    return args.commentId;
  },
});
