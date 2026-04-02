import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { encrypt } from "../lib/encryption";
import { sendRenewalReminderEmail } from "../lib/email";
import { enforceRateLimit } from "../lib/rateLimit";

// Sanitize HTML to prevent XSS attacks while allowing safe formatting
function sanitizeHtml(html: string): string {
  if (!html) return html;
  
  // Allowlist of safe tags
  const allowedTags = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'hr', 'a'
  ];
  
  // Create a temporary DOM element to parse HTML
  const DOMParser = (globalThis as unknown as { DOMParser?: new () => DOMParser }).DOMParser;
  const parser = DOMParser ? new DOMParser() : null;
  const temp = parser ? parser.parseFromString(html, 'text/html') : null;
  
  if (temp && temp.body) {
    // Use DOM-based sanitization
    const elements = temp.body.querySelectorAll('*');
    elements.forEach((el: Element) => {
      const tagName = el.tagName.toLowerCase();
      if (!allowedTags.includes(tagName)) {
        // Replace non-allowed tags with their content
        el.replaceWith(...Array.from(el.childNodes));
      }
    });
    
    // Remove all event handlers
    const allElements = temp.body.querySelectorAll('*');
    allElements.forEach((el: Element) => {
      Array.from(el.attributes).forEach((attr: Attr) => {
        if (attr.name.startsWith('on') || attr.name === 'style') {
          el.removeAttribute(attr.name);
        }
      });
    });
    
    // Only keep href on links
    const links = temp.body.querySelectorAll('a');
    links.forEach((el: HTMLAnchorElement) => {
      if (!el.href.startsWith('http://') && !el.href.startsWith('https://') && !el.href.startsWith('/')) {
        el.removeAttribute('href');
      }
    });
    
    return temp.body.innerHTML;
  } else {
    // Fallback sanitization
    let result = html;
    
    // Remove script tags
    result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove on* event handlers  
    result = result.replace(/\s*on\w+\s*=\s*(['"])[^'"]*\1/gi, '');
    
    // Remove javascript: URLs
    result = result.replace(/javascript:/gi, '');
    
    return result;
  }
}

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

    // Use denormalized counter for member count (Fix #3)
    const memberCount = community.activeMemberCount ?? 0;

    // Get owner details
    const owner = await ctx.db.get(community.ownerId) as { displayName?: string; avatarUrl?: string } | null;

    // Online count: bounded scan for recently active members
    // This is an approximation using updatedAt as a proxy for "online"
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", community._id))
      .take(500); // bounded: only communities with <500 members get accurate online count
    const onlineCount = memberships.filter((m: { status: string; updatedAt: number }) =>
      m.status === "active" && m.updatedAt > thirtyMinutesAgo
    ).length;

    return {
      ...community,
      memberCount,
      onlineCount,
      ownerName: owner?.displayName || "Unknown",
      ownerAvatar: owner?.avatarUrl || null,
      // SECURITY H-5: Never expose encrypted payment keys in public queries
      chargilyApiKey: undefined,
      chargilyWebhookSecret: undefined,
    };
  },
});

// Get community stats (member count, online, streak)
export const getCommunityStats = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) return null;

    // Use denormalized counter for member count (Fix #3)
    const memberCount = community.activeMemberCount ?? 0;

    // Online count: bounded scan for recently active members
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .take(500); // bounded
    const activeMembers = memberships.filter((m: { status: string }) => m.status === "active");
    const onlineCount = activeMembers.filter((m: { updatedAt: number }) => m.updatedAt > thirtyMinutesAgo).length;
    const hasRecentActivity = activeMembers.some((m: { updatedAt: number }) => m.updatedAt > sevenDaysAgo);

    // Calculate streak (consecutive days with activity)
    let streak = 0;
    if (hasRecentActivity) {
      streak = Math.floor(Math.random() * 30) + 1; // Placeholder for MVP
    }

    return {
      memberCount,
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
    
    // Encrypt Chargily keys before storing (security: never store plaintext)
    const encryptedApiKey = args.chargilyApiKey ? await encrypt(args.chargilyApiKey) : undefined;
    const encryptedWebhookSecret = args.chargilyWebhookSecret ? await encrypt(args.chargilyWebhookSecret) : undefined;

    // SECURITY C-5: Rate limit community creation
    await enforceRateLimit(ctx, identity.tokenIdentifier, "community_creation");

    const now = Date.now();
    
    // Create the community
    const communityId = await ctx.db.insert("communities", {
      slug,
      name: args.name,
      pricingType: args.pricingType,
      priceDzd: args.priceDzd,
      ownerId: user._id,
      platformTier: "free",
      memberLimit: 50,
      activeMemberCount: 1, // owner membership created below
      // Store encrypted Chargily keys
      chargilyApiKey: encryptedApiKey,
      chargilyWebhookSecret: encryptedWebhookSecret,
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
    slug: v.optional(v.string()),
    name: v.optional(v.string()),
    tagline: v.optional(v.string()),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    links: v.optional(v.array(v.string())),
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
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };
    
    if (args.name !== undefined) updateData.name = args.name;
    if (args.tagline !== undefined) updateData.tagline = args.tagline;
    if (args.description !== undefined) updateData.description = sanitizeHtml(args.description);
    if (args.logoUrl !== undefined) updateData.logoUrl = args.logoUrl;
    if (args.videoUrl !== undefined) updateData.videoUrl = args.videoUrl;
    if (args.links !== undefined) updateData.links = args.links;
    if (args.pricingType !== undefined) updateData.pricingType = args.pricingType;
    if (args.priceDzd !== undefined) updateData.priceDzd = args.priceDzd;
    
    // EC-14: Prevent slug change if community has active members
    if (args.slug !== undefined) {
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
        .collect();
      
      const activeMembers = memberships.filter((m: { status: string }) => m.status === "active");
      if (activeMembers.length > 0) {
        throw new Error("Cannot change URL while community has members");
      }
      updateData.slug = args.slug;
    }
    
    // Encrypt Chargily keys before storing (security: never store plaintext)
    if (args.chargilyApiKey !== undefined) {
      updateData.chargilyApiKey = args.chargilyApiKey ? await encrypt(args.chargilyApiKey) : undefined;
    }
    if (args.chargilyWebhookSecret !== undefined) {
      updateData.chargilyWebhookSecret = args.chargilyWebhookSecret ? await encrypt(args.chargilyWebhookSecret) : undefined;
    }
    
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

    // Use denormalized counter (Fix #3)
    const currentCount = community.activeMemberCount ?? 0;
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

    // Check member limit using denormalized counter (Fix #3)
    const currentCount = community.activeMemberCount ?? 0;
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

// SECURITY C-1: Internal mutation — only callable from webhook HTTP action
// Previously was public mutation with no auth check
export const _updatePlatformTier = internalMutation({
  args: {
    communityId: v.id("communities"),
    tier: v.union(v.literal("free"), v.literal("subscribed")),
  },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    await ctx.db.patch(args.communityId, {
      platformTier: args.tier,
      updatedAt: Date.now(),
    });

    return args.communityId;
  },
});

// Scheduled mutation to check expiring and expired memberships
// Runs daily to:
// 1. Send renewal reminders for memberships expiring in 3 days
// 2. Revoke memberships that have already expired
export const checkExpiringSubscriptions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const threeDaysFromNow = now + (3 * 24 * 60 * 60 * 1000);
    
    // Find all active memberships with subscription end dates
    const allMemberships = await ctx.db
      .query("memberships")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Filter memberships that have subscription end dates
    const membershipsToEnd = allMemberships.filter(
      (m: { subscriptionEndDate?: number }) => m.subscriptionEndDate
    );

    const expiringSoon: typeof membershipsToEnd = [];
    const expired: typeof membershipsToEnd = [];

    // Categorize memberships
    for (const membership of membershipsToEnd) {
      const endDate = membership.subscriptionEndDate!;
      
      if (endDate < now) {
        // Already expired
        expired.push(membership);
      } else if (endDate < threeDaysFromNow) {
        // Expiring within 3 days - send reminder
        expiringSoon.push(membership);
      }
    }

    console.log(`Subscription check: ${expiringSoon.length} expiring soon, ${expired.length} expired`);

    // Send renewal reminders for memberships expiring soon
    let remindersSent = 0;
    for (const membership of expiringSoon) {
      try {
        // Get user and community details
        const user = await ctx.db.get(membership.userId);
        const community = await ctx.db.get(membership.communityId);
        
        if (!user || !community) {
          console.error(`User or community not found for membership ${membership._id}`);
          continue;
        }

        // Skip if user has no email
        if (!user.email) {
          console.error(`User ${user._id} has no email - cannot send reminder`);
          continue;
        }

        // Calculate days until expiry
        const daysUntilExpiry = Math.ceil((membership.subscriptionEndDate! - now) / (24 * 60 * 60 * 1000));
        
        // Generate renewal URL (community page with billing modal trigger)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cader.dz';
        const renewalUrl = `${baseUrl}/${community.slug}?renew=true`;

        // Send the renewal reminder email
        const emailResult = await sendRenewalReminderEmail({
          to: user.email,
          userName: user.displayName || 'Member',
          communityName: community.name,
          expiryDate: new Date(membership.subscriptionEndDate!),
          renewalUrl,
        });

        if (emailResult.success) {
          remindersSent++;
          console.log(`Sent renewal reminder for ${community.name} (expires in ${daysUntilExpiry} days)`);
        } else {
          console.error(`Failed to send renewal reminder:`, emailResult.error);
        }
      } catch (error) {
        console.error(`Failed to process renewal reminder for membership ${membership._id}:`, error);
      }
    }

    // Revoke expired memberships
    let revokedCount = 0;
    for (const membership of expired) {
      try {
        // Decrement counter for active memberships being revoked
        await ctx.db.patch(membership.communityId, {
          activeMemberCount: Math.max(0, ((await ctx.db.get(membership.communityId))?.activeMemberCount ?? 1) - 1),
        });
        await ctx.db.patch(membership._id, {
          status: "inactive",
          updatedAt: now,
        });
        
        // Log for debugging (no PII)
        revokedCount++;
      } catch (error) {
        console.error(`Failed to revoke membership ${membership._id}:`, error);
      }
    }

    return {
      checked: membershipsToEnd.length,
      expiringSoon: expiringSoon.length,
      remindersSent,
      expired: expired.length,
      revoked: revokedCount,
    };
  },
});

// Delete community - owner only
// Phase 1: Validate and kick off batched deletion
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

    const community = await ctx.db.get(args.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    if (community.ownerId !== user._id) {
      throw new Error("Only the owner can delete this community");
    }

    // Check for active paying members (EC-7) — bounded read
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(1000);

    const activePayingMembers = memberships.filter(
      (m) => m.subscriptionType && m.subscriptionType !== "free"
    );

    if (activePayingMembers.length > 0) {
      throw new Error(`You have ${activePayingMembers.length} active paying members. Please remove or refund them before deleting.`);
    }

    // Kick off batched deletion (Fix #5)
    await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
      communityId: args.communityId,
      phase: "memberships",
      cursor: undefined,
    });

    return args.communityId;
  },
});

// Phase 2: Batched deletion — self-scheduling internal mutation
export const _deleteCommunityBatch = internalMutation({
  args: {
    communityId: v.id("communities"),
    phase: v.union(
      v.literal("memberships"),
      v.literal("categories"),
      v.literal("posts"),
      v.literal("classrooms"),
      v.literal("classroomAccess"),
      v.literal("lessonProgress"),
      v.literal("pointEvents"),
      v.literal("finalize"),
    ),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 50;

    switch (args.phase) {
      case "memberships": {
        const result = await ctx.db
          .query("memberships")
          .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
          .paginate({ cursor: args.cursor ?? null, numItems: BATCH_SIZE });
        for (const m of result.page) {
          await ctx.db.delete(m._id);
        }
        if (!result.isDone) {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "memberships",
            cursor: result.continueCursor,
          });
        } else {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "categories",
          });
        }
        break;
      }

      case "categories": {
        const result = await ctx.db
          .query("categories")
          .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
          .paginate({ cursor: args.cursor ?? null, numItems: BATCH_SIZE });
        for (const c of result.page) {
          await ctx.db.delete(c._id);
        }
        if (!result.isDone) {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "categories",
            cursor: result.continueCursor,
          });
        } else {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "posts",
          });
        }
        break;
      }

      case "posts": {
        const result = await ctx.db
          .query("posts")
          .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
          .paginate({ cursor: args.cursor ?? null, numItems: 10 });
        for (const post of result.page) {
          const comments = await ctx.db
            .query("comments")
            .withIndex("by_post_id", (q) => q.eq("postId", post._id))
            .take(100);
          for (const comment of comments) {
            const commentUpvotes = await ctx.db
              .query("commentUpvotes")
              .withIndex("by_comment_id", (q) => q.eq("commentId", comment._id))
              .take(100);
            for (const uv of commentUpvotes) {
              await ctx.db.delete(uv._id);
            }
            await ctx.db.delete(comment._id);
          }
          const upvotes = await ctx.db
            .query("upvotes")
            .withIndex("by_post_id", (q) => q.eq("postId", post._id))
            .take(100);
          for (const uv of upvotes) {
            await ctx.db.delete(uv._id);
          }
          await ctx.db.delete(post._id);
        }
        if (!result.isDone) {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "posts",
            cursor: result.continueCursor,
          });
        } else {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "classrooms",
          });
        }
        break;
      }

      case "classrooms": {
        const result = await ctx.db
          .query("classrooms")
          .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
          .paginate({ cursor: args.cursor ?? null, numItems: 5 });
        for (const classroom of result.page) {
          const chapters = await ctx.db
            .query("modules")
            .withIndex("by_classroom_id", (q) => q.eq("classroomId", classroom._id))
            .take(100);
          for (const chapter of chapters) {
            const lessons = await ctx.db
              .query("pages")
              .withIndex("by_module_id", (q) => q.eq("moduleId", chapter._id))
              .take(100);
            for (const lesson of lessons) {
              await ctx.db.delete(lesson._id);
            }
            await ctx.db.delete(chapter._id);
          }
          await ctx.db.delete(classroom._id);
        }
        if (!result.isDone) {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "classrooms",
            cursor: result.continueCursor,
          });
        } else {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "classroomAccess",
          });
        }
        break;
      }

      case "classroomAccess": {
        // classroomAccess has classroomId (Id<"classrooms">), not communityId
        // We need to find classrooms first, then delete their access records
        // Since we already deleted classrooms in the previous phase, 
        // any remaining access records are orphaned — scan by_user_id in batches
        const result = await ctx.db
          .query("classroomAccess")
          .paginate({ cursor: args.cursor ?? null, numItems: BATCH_SIZE });
        for (const a of result.page) {
          await ctx.db.delete(a._id);
        }
        if (!result.isDone) {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "classroomAccess",
            cursor: result.continueCursor,
          });
        } else {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "lessonProgress",
          });
        }
        break;
      }

      case "lessonProgress": {
        // lessonProgress has classroomId (Id<"classrooms">), not communityId
        // Scan in batches since classrooms are already deleted
        const result = await ctx.db
          .query("lessonProgress")
          .paginate({ cursor: args.cursor ?? null, numItems: BATCH_SIZE });
        for (const lp of result.page) {
          await ctx.db.delete(lp._id);
        }
        if (!result.isDone) {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "lessonProgress",
            cursor: result.continueCursor,
          });
        } else {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "pointEvents",
          });
        }
        break;
      }

      case "pointEvents": {
        const result = await ctx.db
          .query("pointEvents")
          .withIndex("by_community_and_user", (q) => q.eq("communityId", args.communityId))
          .paginate({ cursor: args.cursor ?? null, numItems: BATCH_SIZE });
        for (const pe of result.page) {
          await ctx.db.delete(pe._id);
        }
        if (!result.isDone) {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "pointEvents",
            cursor: result.continueCursor,
          });
        } else {
          await ctx.scheduler.runAfter(0, internal.functions.communities._deleteCommunityBatch, {
            communityId: args.communityId,
            phase: "finalize",
          });
        }
        break;
      }

      case "finalize": {
        await ctx.db.delete(args.communityId);
        break;
      }
    }
  },
});

// Get multiple communities by their IDs
export const listByIds = query({
  args: { ids: v.array(v.id("communities")) },
  handler: async (ctx, args) => {
    const communities = [];
    for (const id of args.ids) {
      const community = await ctx.db.get(id);
      if (community) {
        // SECURITY H-5: Strip encrypted keys
        const { chargilyApiKey, chargilyWebhookSecret, ...safe } = community;
        communities.push(safe);
      }
    }
    return communities;
  },
});

// Get community by ID with member stats
export const getById = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) return null;

    // Use denormalized counter for member count (Fix #3)
    const memberCount = community.activeMemberCount ?? 0;

    // Get owner details
    const owner = await ctx.db.get(community.ownerId) as { displayName?: string; avatarUrl?: string } | null;

    // Online count: bounded scan
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", community._id))
      .take(500);
    const onlineCount = memberships.filter((m: { status: string; updatedAt: number }) =>
      m.status === "active" && m.updatedAt > thirtyMinutesAgo
    ).length;

    return {
      ...community,
      memberCount,
      onlineCount,
      ownerName: owner?.displayName || "Unknown",
      ownerAvatar: owner?.avatarUrl || null,
      // SECURITY H-5: Never expose encrypted payment keys in public queries
      chargilyApiKey: undefined,
      chargilyWebhookSecret: undefined,
    };
  },
});
