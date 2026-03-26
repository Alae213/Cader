import { MutationContext, QueryContext } from "../_generated/server";
import { v } from "convex/values";

// Seed script to create sample community for Explore page
// Run with: npx convex run seed createSampleCommunity

interface SeedArgs {
  communityName: string;
  communitySlug: string;
  tagline: string;
  description: string;
}

// This would be a mutation that creates a sample community
// In production, you'd create this via the admin UI or a seed script

export const createSampleCommunity = async (ctx: MutationContext, args: SeedArgs) => {
  // Get admin user (first user in database)
  const users = await ctx.db.query("users").collect();
  if (users.length === 0) {
    throw new Error("No users found. Create a user first.");
  }
  
  const adminUser = users[0];
  
  // Check if slug already exists
  const existing = await ctx.db
    .query("communities")
    .withIndex("by_slug", (q) => q.eq("slug", args.communitySlug))
    .first();
  
  if (existing) {
    console.log("Community already exists:", args.communitySlug);
    return existing._id;
  }
  
  // Create community
  const communityId = await ctx.db.insert("communities", {
    slug: args.communitySlug,
    name: args.communityName,
    tagline: args.tagline,
    description: args.description,
    logoUrl: undefined,
    videoUrl: undefined,
    links: [],
    wilaya: "alger",
    ownerId: adminUser._id,
    pricingType: "free",
    priceDzd: undefined,
    platformTier: "free",
    memberLimit: 50,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  
  // Create membership for the owner
  await ctx.db.insert("memberships", {
    communityId,
    userId: adminUser._id,
    role: "owner",
    status: "active",
    subscriptionType: "free",
    subscriptionId: undefined,
    joinedAt: Date.now(),
  });
  
  console.log("Created sample community:", args.communityName);
  return communityId;
};

// Run seed from command line
export const runSeed = async (ctx: MutationContext) => {
  // Create sample communities for Explore
  const samples = [
    {
      communityName: "Algerian Developers",
      communitySlug: "algerian-devs",
      tagline: "Learn coding in Algeria",
      description: "A community for Algerian developers to learn, share, and grow together. Free resources, mentorship, and job opportunities.",
    },
    {
      communityName: "French Learning",
      communitySlug: "french-algeria",
      tagline: "Master French with locals",
      description: "Join thousands learning French through immersive conversations with native speakers from Algeria.",
    },
    {
      communityName: "Tech Startup Algeria",
      communitySlug: "tech-startup-dz",
      tagline: "Build the future",
      description: "Connect with entrepreneurs, investors, and innovators building Algeria's tech ecosystem.",
    },
  ];
  
  for (const sample of samples) {
    try {
      await createSampleCommunity(ctx, sample);
    } catch (e) {
      console.log("Skipping:", e);
    }
  }
  
  return "Seed completed";
};