import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed script to create sample community for Explore page
// Run with: npx convex run seed:createSampleCommunity

interface SeedArgs {
  communityName: string;
  communitySlug: string;
  tagline: string;
  description: string;
}

export const createSampleCommunity = mutation({
  args: {
    communityName: v.string(),
    communitySlug: v.string(),
    tagline: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // Get admin user (first user in database)
    const users = await ctx.db.query("users").collect();
    if (users.length === 0) {
      throw new Error("No users found. Create a user first.");
    }

    const adminUser = users[0];

    // Check if community already exists
    const existing = await ctx.db
      .query("communities")
      .withIndex("by_slug", (q) => q.eq("slug", args.communitySlug))
      .first();

    if (existing) {
      return { communityId: existing._id, message: "Community already exists" };
    }

    const now = Date.now();

    // Create the community
    const communityId = await ctx.db.insert("communities", {
      slug: args.communitySlug,
      name: args.communityName,
      tagline: args.tagline,
      description: args.description,
      pricingType: "free",
      ownerId: adminUser._id,
      platformTier: "free",
      memberLimit: 50,
      createdAt: now,
      updatedAt: now,
    });

    // Create owner membership
    await ctx.db.insert("memberships", {
      communityId,
      userId: adminUser._id,
      role: "owner",
      status: "active",
      subscriptionType: "free",
      createdAt: now,
      updatedAt: now,
    });

    return { communityId, message: "Community created successfully" };
  },
});
