import { mutation } from "../_generated/server";
import { v } from "convex/values";

const DEFAULT_CATEGORIES = [
  "📢 Announcements",
  "🙋 Ask For Advice",
  "🤣 Fun",
];

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

/**
 * Migration: Clear all existing categories and seed 3 default categories per community.
 * Run once via: npx convex run functions/migrations:seedDefaultCategories
 */
export const seedDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const communities = await ctx.db.query("communities").collect();

    let communitiesProcessed = 0;
    let categoriesDeleted = 0;
    let categoriesCreated = 0;

    for (const community of communities) {
      // Delete all existing categories for this community
      const existingCategories = await ctx.db
        .query("categories")
        .withIndex("by_community_id", (q) => q.eq("communityId", community._id))
        .collect();

      for (const cat of existingCategories) {
        // Remove category from all posts
        const posts = await ctx.db
          .query("posts")
          .withIndex("by_category_id", (q) => q.eq("categoryId", cat._id))
          .collect();

        for (const post of posts) {
          await ctx.db.patch(post._id, { categoryId: undefined, updatedAt: Date.now() });
        }

        await ctx.db.delete(cat._id);
        categoriesDeleted++;
      }

      // Create 3 default categories
      const now = Date.now();
      for (const name of DEFAULT_CATEGORIES) {
        await ctx.db.insert("categories", {
          communityId: community._id,
          name,
          createdAt: now,
          updatedAt: now,
        });
        categoriesCreated++;
      }

      communitiesProcessed++;
    }

    return {
      communitiesProcessed,
      categoriesDeleted,
      categoriesCreated,
      message: `Processed ${communitiesProcessed} communities. Deleted ${categoriesDeleted} old categories. Created ${categoriesCreated} default categories.`,
    };
  },
});

/**
 * Migration: Backfill `order` field for existing classrooms.
 * Run this ONCE to fix classrooms created before the order field was added.
 *
 * Usage: npx convex run functions/migrations:backfillClassroomOrder
 */
export const backfillClassroomOrder = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const communities = await ctx.db.query("communities").collect();
    const results: { communityId: string; name: string; updated: number }[] = [];

    for (const community of communities) {
      // Get all classrooms for this community, ordered by creation time
      const classrooms = await ctx.db
        .query("classrooms")
        .withIndex("by_community_id", (q) => q.eq("communityId", community._id))
        .collect();

      // Filter to only classrooms missing order field
      const classroomsMissingOrder = classrooms.filter((c) => c.order === undefined);

      if (classroomsMissingOrder.length === 0) continue;

      // Find the max existing order value (from classrooms that already have order)
      const classroomsWithOrder = classrooms.filter((c) => c.order !== undefined);
      const maxExistingOrder = classroomsWithOrder.length > 0
        ? Math.max(...classroomsWithOrder.map((c) => c.order!))
        : -1;

      // Assign sequential order starting from maxExistingOrder + 1
      // based on creation time (oldest first)
      classroomsMissingOrder.sort((a, b) => a._creationTime - b._creationTime);

      let updated = 0;
      for (let i = 0; i < classroomsMissingOrder.length; i++) {
        const classroom = classroomsMissingOrder[i];
        const newOrder = maxExistingOrder + 1 + i;

        if (!dryRun) {
          await ctx.db.patch(classroom._id, { order: newOrder, updatedAt: Date.now() });
        }
        updated++;
      }

      results.push({
        communityId: community._id,
        name: community.name,
        updated,
      });
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);

    return {
      dryRun,
      totalClassrooms: results.reduce((sum, r) => sum + r.updated, 0),
      communitiesAffected: results.length,
      details: results,
      message: dryRun
        ? `DRY RUN: ${totalUpdated} classrooms across ${results.length} communities need order backfill`
        : `Updated ${totalUpdated} classrooms across ${results.length} communities`,
    };
  },
});
