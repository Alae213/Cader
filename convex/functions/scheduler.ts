import { mutation } from "../_generated/server";

// Scheduled function: runs every 5 minutes
// Awards points for posts that have survived the 10-minute visibility delay
// and comments that have survived the 2-minute visibility delay
//
// This replaces the immediate awarding in awardPostPoints/awardCommentPoints.
// Content that is deleted before the delay window expires never earns points.
export const awardDelayedPoints = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    const twoMinutesAgo = now - 2 * 60 * 1000;

    let awardedPosts = 0;
    let awardedComments = 0;

    // --- Award post creation points for posts older than 10 minutes ---
    const allPosts = await ctx.db
      .query("posts")
      .withIndex("by_created_at")
      .collect();

    for (const post of allPosts) {
      // Only process posts older than 10 minutes
      if (post.createdAt >= tenMinutesAgo) continue;

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

      if (existingAward) continue; // Already awarded

      // Check the author is not owner/admin
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_community_and_user", (q) =>
          q.eq("communityId", post.communityId).eq("userId", post.authorId)
        )
        .first();

      if (!membership || membership.role === "owner" || membership.role === "admin") {
        continue;
      }

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

    // --- Award comment creation points for comments older than 2 minutes ---
    const allComments = await ctx.db
      .query("comments")
      .withIndex("by_post_id")
      .collect();

    for (const comment of allComments) {
      // Only process comments older than 2 minutes
      if (comment.createdAt >= twoMinutesAgo) continue;

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

      if (existingAward) continue; // Already awarded

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

      if (!membership || membership.role === "owner" || membership.role === "admin") {
        continue;
      }

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

    return { awardedPosts, awardedComments };
  },
});
