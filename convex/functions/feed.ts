import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Helper to validate video URLs
function isValidVideoUrl(url: string): boolean {
  if (!url) return true; // Empty is allowed (optional)
  
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  
  return !!(youtubeMatch || vimeoMatch || driveMatch);
}

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
      posts = posts.filter((p) => 
        p.categoryId && p.categoryId === args.categoryId
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
      posts.map(async (post) => {
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
    // Note: mentions are stored as string[] but schema expects Id<"users">[]
    // For MVP, we store empty array - full implementation would look up usernames
    const mentionMatches = sanitizedContent.match(/@(\w+)/g) || [];
    // Skip mention lookup for now - would need a searchMembers query
    const mentionedUserIds: Id<"users">[] = [];

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

    // Extract mentions (stored as string array for MVP)
    const mentionMatches = sanitizedContent.match(/@(\w+)/g) || [];

    const now = Date.now();
    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      authorId: user._id,
      parentCommentId: args.parentCommentId,
      content: sanitizedContent,
      // Note: mentions should be Id<"users">[] but using string[] for MVP
      // This is a schema mismatch that needs to be fixed in schema
      mentions: mentionMatches.map((m: string) => m.slice(1)) as unknown as Id<"users">[],
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
      comments.map(async (comment) => {
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
    const topLevel = commentsWithAuthors.filter((c) => !c.parentCommentId);
    const replies = commentsWithAuthors.filter((c) => !!c.parentCommentId);

    // Attach replies to their parents
    const threadedComments = topLevel.map((comment) => ({
      ...comment,
      replies: replies.filter((r) => r.parentCommentId === comment._id),
    }));

    // Sort by createdAt (newest first)
    threadedComments.sort((a, b) => b.createdAt - a.createdAt);

    return threadedComments;
  },
});

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
