import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// Scheduled entry point: runs every 5 minutes via cron
// Kicks off batched point awarding for posts and comments
export const awardDelayedPoints = mutation({
  handler: async (ctx) => {
    // Kick off post point awards
    await ctx.scheduler.runAfter(0, internal.functions.scheduler._awardPostPointsBatch, {
      cursor: undefined,
    });
    // Kick off comment point awards
    await ctx.scheduler.runAfter(0, internal.functions.scheduler._awardCommentPointsBatch, {
      cursor: undefined,
    });

    return { started: true };
  },
});

// Batched post point awards — self-scheduling
export const _awardPostPointsBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    const BATCH_SIZE = 20;

    // Scan posts ordered by createdAt (oldest first)
    const result = await ctx.db
      .query("posts")
      .withIndex("by_created_at")
      .paginate({ cursor: args.cursor ?? null, numItems: BATCH_SIZE });

    let awardedPosts = 0;

    for (const post of result.page) {
      // Posts are ordered oldest-first; once we hit posts newer than 10 min,
      // all remaining posts in this batch and future batches are also too new.
      if (post.createdAt >= tenMinutesAgo) {
        // Since posts are ordered by createdAt ascending, we can stop entirely
        return { awardedPosts, done: true };
      }

      // Check if points already awarded
      const existingAward = await ctx.db
        .query("pointEvents")
        .withIndex("by_user_event_source", (q) =>
          q
            .eq("userId", post.authorId)
            .eq("eventType", "post_created_awarded")
            .eq("sourceId", post._id)
        )
        .first();

      if (existingAward) continue;

      // Check the author is not owner/admin
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_community_and_user", (q) =>
          q.eq("communityId", post.communityId).eq("userId", post.authorId)
        )
        .first();

      if (!membership) continue;

      await ctx.db.insert("pointEvents", {
        communityId: post.communityId,
        userId: post.authorId,
        actorUserId: post.authorId,
        eventType: "post_created_awarded",
        points: 2,
        sourceType: "post",
        sourceId: post._id,
        createdAt: now,
      });
      awardedPosts++;
    }

    if (!result.isDone) {
      // Schedule next batch
      await ctx.scheduler.runAfter(0, internal.functions.scheduler._awardPostPointsBatch, {
        cursor: result.continueCursor,
      });
    }

    return { awardedPosts, done: result.isDone };
  },
});

// Batched comment point awards — self-scheduling
export const _awardCommentPointsBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const twoMinutesAgo = now - 2 * 60 * 1000;
    const BATCH_SIZE = 20;

    // Scan comments ordered by _creationTime (oldest first)
    const result = await ctx.db
      .query("comments")
      .paginate({ cursor: args.cursor ?? null, numItems: BATCH_SIZE });

    let awardedComments = 0;

    for (const comment of result.page) {
      // Comments are ordered oldest-first; once we hit comments newer than 2 min, stop
      if (comment.createdAt >= twoMinutesAgo) {
        return { awardedComments, done: true };
      }

      // Check if points already awarded
      const existingAward = await ctx.db
        .query("pointEvents")
        .withIndex("by_user_event_source", (q) =>
          q
            .eq("userId", comment.authorId)
            .eq("eventType", "comment_created_awarded")
            .eq("sourceId", comment._id)
        )
        .first();

      if (existingAward) continue;

      // Check content length (20+ non-whitespace characters)
      const contentLength = comment.content.trim().length;
      if (contentLength < 20) continue;

      // Get the post to find community
      const post = await ctx.db.get(comment.postId);
      if (!post) continue; // Post was deleted — don't award

      // Check if author is not owner/admin
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_community_and_user", (q) =>
          q.eq("communityId", post.communityId).eq("userId", comment.authorId)
        )
        .first();

      if (!membership) continue;

      await ctx.db.insert("pointEvents", {
        communityId: post.communityId,
        userId: comment.authorId,
        actorUserId: comment.authorId,
        eventType: "comment_created_awarded",
        points: 1,
        sourceType: "comment",
        sourceId: comment._id,
        createdAt: now,
      });
      awardedComments++;
    }

    if (!result.isDone) {
      // Schedule next batch
      await ctx.scheduler.runAfter(0, internal.functions.scheduler._awardCommentPointsBatch, {
        cursor: result.continueCursor,
      });
    }

    return { awardedComments, done: result.isDone };
  },
});
