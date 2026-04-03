import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Backfill usernames for existing users from email prefixes.
 * Run this ONCE to populate username field for users created before it was added.
 *
 * Usage: npx convex run functions/migrations:backfillUsernames
 */
export const backfillUsernames = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const users = await ctx.db.query("users").collect();
    const results: { userId: string; email: string; username: string }[] = [];

    for (const user of users) {
      // Skip if already has username
      if (user.username) continue;

      // Derive username from email prefix
      const emailPrefix = user.email.split("@")[0];
      if (!emailPrefix) continue;

      results.push({
        userId: user._id,
        email: user.email,
        username: emailPrefix,
      });

      if (!dryRun) {
        await ctx.db.patch(user._id, {
          username: emailPrefix,
          updatedAt: Date.now(),
        });
      }
    }

    return {
      dryRun,
      totalUsers: users.length,
      updated: results.length,
      details: results,
    };
  },
});

/**
 * Backfill activeMemberCount for all communities.
 * Run this ONCE to fix communities created before the activeMemberCount field was added.
 *
 * Usage: npx convex run functions/migrations:backfillMemberCounts
 */
export const backfillMemberCounts = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const communities = await ctx.db.query("communities").collect();
    const results: { communityId: string; name: string; before: number; after: number }[] = [];

    for (const community of communities) {
      const currentCount = community.activeMemberCount ?? 0;

      // Count actual active memberships
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_community_id", (q) => q.eq("communityId", community._id))
        .collect();

      const activeCount = memberships.filter((m) => m.status === "active").length;

      if (currentCount !== activeCount) {
        results.push({
          communityId: community._id,
          name: community.name,
          before: currentCount,
          after: activeCount,
        });

        if (!dryRun) {
          await ctx.db.patch(community._id, {
            activeMemberCount: activeCount,
            updatedAt: Date.now(),
          });
        }
      }
    }

    return {
      dryRun,
      totalCommunities: communities.length,
      updated: results.length,
      details: results,
    };
  },
});
