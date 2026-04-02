import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { enforceRateLimit } from "../lib/rateLimit";

// Helper to validate video URLs
function isValidVideoUrl(url: string): boolean {
  if (!url) return true; // Empty is allowed (optional)
  
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  
  return !!(youtubeMatch || vimeoMatch || driveMatch);
}

// List posts for a community (paginated, pinned-first then by sort order)
export const listPosts = query({
  args: {
    communityId: v.id("communities"),
    categoryId: v.optional(v.id("categories")),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("most_liked"), v.literal("most_commented"))),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
      id: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const communityId = args.communityId;
    const sortBy = args.sortBy || "newest";

    // Use compound index for efficient storage-level filtering
    // The index [communityId, isPinned, createdAt] lets us read in pinned-first order
    const postsQuery = ctx.db
      .query("posts")
      .withIndex("by_community_and_pinned_and_created", (q) =>
        q.eq("communityId", communityId)
      )
      .order("desc");

    // Filter by category if provided
    let posts;
    if (args.categoryId) {
      // Use the category compound index for filtered queries
      posts = await ctx.db
        .query("posts")
        .withIndex("by_community_and_category_and_pinned_and_created", (q) =>
          q.eq("communityId", communityId).eq("categoryId", args.categoryId)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      posts = await postsQuery.paginate(args.paginationOpts);
    }

    // Sort: pinned first (isPinned=true sorts before false in desc order)
    // Then apply secondary sort (newest, most_liked, most_commented) for non-pinned
    const sortedPage = [...posts.page].sort((a, b) => {
      // Pinned posts always come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Both pinned or both non-pinned: apply secondary sort
      if (a.isPinned && b.isPinned) {
        return b.createdAt - a.createdAt; // pinned sorted by newest
      }

      // Non-pinned: apply selected sort
      switch (sortBy) {
        case "most_liked":
          return b.upvoteCount - a.upvoteCount || b.createdAt - a.createdAt;
        case "most_commented":
          return b.commentCount - a.commentCount || b.createdAt - a.createdAt;
        case "newest":
        default:
          return b.createdAt - a.createdAt;
      }
    });

    // Get author details for each post in the current page only
    const postsWithAuthors = await Promise.all(
      sortedPage.map(async (post) => {
        const author = await ctx.db.get(post.authorId) as Doc<"users"> | null;
        let category = null;
        if (post.categoryId) {
          category = await ctx.db.get(post.categoryId);
        }
        return {
          ...post,
          author: author ? {
            _id: author._id,
            clerkId: author.clerkId,
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

    return {
      page: postsWithAuthors,
      isDone: posts.isDone,
      continueCursor: posts.continueCursor,
    };
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

    // SECURITY C-5: Rate limit post creation
    await enforceRateLimit(ctx, identity.tokenIdentifier, "post_creation");

    // Extract mentions from content
    // Note: mentions are stored as string[] but schema expects Id<"users">[]
    // For MVP, we store empty array - full implementation would look up usernames
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
    mediaUrls: v.optional(v.array(v.string())),
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

    // SECURITY C-5: Rate limit comment creation
    await enforceRateLimit(ctx, identity.tokenIdentifier, "comment_creation");

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
      mediaUrls: args.mediaUrls || [],
      upvoteCount: 0,
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

// Get comments for a post (threaded, paginated, sorted by upvotes)
export const listComments = query({
  args: {
    postId: v.id("posts"),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
    sortBy: v.optional(v.union(v.literal("top"), v.literal("newest"))),
  },
  handler: async (ctx, args) => {
    const sortBy = args.sortBy || "top";

    // Get current user for upvote status
    const identity = await ctx.auth.getUserIdentity();
    let currentUserId: Id<"users"> | null = null;
    if (identity) {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();
      currentUserId = currentUser?._id ?? null;
    }

    // Get the post to find the community
    const post = await ctx.db.get(args.postId);

    // Paginate top-level comments only (reduces read set significantly)
    const topLevelQuery = ctx.db
      .query("comments")
      .withIndex("by_post_id", (q) => q.eq("postId", args.postId))
      .filter((q) => q.eq(q.field("parentCommentId"), undefined));

    // Apply sort order via filter — we sort in JS since Convex has no index on upvoteCount
    // but we now only read the paginated page, not all comments
    const topLevelPage = await topLevelQuery.paginate(args.paginationOpts);

    // Get author details and upvote status for each comment in the page
    const commentsWithAuthors = await Promise.all(
      topLevelPage.page.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);

        // Check if current user has upvoted this comment
        let hasUpvoted = false;
        if (currentUserId) {
          const upvote = await ctx.db
            .query("commentUpvotes")
            .withIndex("by_comment_and_user", (q) =>
              q.eq("commentId", comment._id).eq("userId", currentUserId)
            )
            .first();
          hasUpvoted = !!upvote;
        }

        // Check if author is owner or admin of this community
        let authorIsOwner = false;
        let authorIsAdmin = false;
        if (post?.communityId && author) {
          const authorMembership = await ctx.db
            .query("memberships")
            .withIndex("by_community_and_user", (q) =>
              q.eq("communityId", post.communityId).eq("userId", author._id)
            )
            .first();
          if (authorMembership) {
            authorIsOwner = authorMembership.role === "owner";
            authorIsAdmin = authorMembership.role === "admin" || authorMembership.role === "owner";
          }
        }

        return {
          ...comment,
          author: author ? {
            _id: author._id,
            displayName: author.displayName,
            avatarUrl: author.avatarUrl,
          } : null,
          hasUpvoted,
          authorIsOwner,
          authorIsAdmin,
        };
      })
    );

    // Sort the page by selected criteria
    if (sortBy === "top") {
      commentsWithAuthors.sort((a, b) => (b.upvoteCount ?? 0) - (a.upvoteCount ?? 0) || b.createdAt - a.createdAt);
    } else {
      commentsWithAuthors.sort((a, b) => b.createdAt - a.createdAt);
    }

    // Fetch replies for the comments on this page (bounded: only replies to visible top-level comments)
    const allReplies = await Promise.all(
      topLevelPage.page.map(async (parentComment) => {
        const replies = await ctx.db
          .query("comments")
          .withIndex("by_parent_comment_id", (q) => q.eq("parentCommentId", parentComment._id))
          .collect();

        return Promise.all(
          replies.map(async (reply) => {
            const author = await ctx.db.get(reply.authorId);
            let hasUpvoted = false;
            if (currentUserId) {
              const upvote = await ctx.db
                .query("commentUpvotes")
                .withIndex("by_comment_and_user", (q) =>
                  q.eq("commentId", reply._id).eq("userId", currentUserId)
                )
                .first();
              hasUpvoted = !!upvote;
            }
            let authorIsOwner = false;
            let authorIsAdmin = false;
            if (post?.communityId && author) {
              const authorMembership = await ctx.db
                .query("memberships")
                .withIndex("by_community_and_user", (q) =>
                  q.eq("communityId", post.communityId).eq("userId", author._id)
                )
                .first();
              if (authorMembership) {
                authorIsOwner = authorMembership.role === "owner";
                authorIsAdmin = authorMembership.role === "admin" || authorMembership.role === "owner";
              }
            }
            return {
              ...reply,
              author: author ? {
                _id: author._id,
                displayName: author.displayName,
                avatarUrl: author.avatarUrl,
              } : null,
              hasUpvoted,
              authorIsOwner,
              authorIsAdmin,
            };
          })
        );
      })
    );

    // Attach replies to their parents
    const threadedComments = commentsWithAuthors.map((comment, i) => ({
      ...comment,
      replies: allReplies[i],
    }));

    return {
      page: threadedComments,
      isDone: topLevelPage.isDone,
      continueCursor: topLevelPage.continueCursor,
    };
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

      // Write a -1 point event (reverse the upvote) — only if original award was valid
      // (not self-upvote)
      const isSelfUpvote = post.authorId === user._id;

      if (!isSelfUpvote) {
        await ctx.db.insert("pointEvents", {
          communityId: post.communityId,
          userId: post.authorId,
          actorUserId: user._id,
          eventType: "post_upvote_reversed",
          points: -1,
          sourceType: "post",
          sourceId: args.postId,
          createdAt: now,
        });
      }

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

      // Write a +1 point event to post author — only if not self-upvote
      const isSelfUpvote = post.authorId === user._id;

      if (!isSelfUpvote) {
        await ctx.db.insert("pointEvents", {
          communityId: post.communityId,
          userId: post.authorId,
          actorUserId: user._id,
          eventType: "post_upvote_received",
          points: 1,
          sourceType: "post",
          sourceId: args.postId,
          createdAt: now,
        });
      }

      return { upvoted: true, newCount: post.upvoteCount + 1 };
    }
  },
});

// Toggle upvote on a comment (idempotent)
export const toggleCommentUpvote = mutation({
  args: {
    commentId: v.id("comments"),
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

    // Get the comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Get the post to find the community
    const post = await ctx.db.get(comment.postId);
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

    // Check if user already upvoted this comment
    const existingUpvote = await ctx.db
      .query("commentUpvotes")
      .withIndex("by_comment_and_user", (q) =>
        q.eq("commentId", args.commentId).eq("userId", user._id)
      )
      .first();

    const now = Date.now();

    if (existingUpvote) {
      // Remove upvote (toggle off)
      await ctx.db.delete(existingUpvote._id);
      
      // Update comment upvote count
      await ctx.db.patch(args.commentId, {
        upvoteCount: Math.max(0, (comment.upvoteCount ?? 0) - 1),
        updatedAt: now,
      });

      // Write a -1 point event (reverse the upvote) — only if original award was valid
      const isSelfUpvote = comment.authorId === user._id;

      if (!isSelfUpvote) {
        await ctx.db.insert("pointEvents", {
          communityId: post.communityId,
          userId: comment.authorId,
          actorUserId: user._id,
          eventType: "comment_upvote_reversed",
          points: -1,
          sourceType: "comment",
          sourceId: args.commentId,
          createdAt: now,
        });
      }

      return { upvoted: false, newCount: Math.max(0, (comment.upvoteCount ?? 0) - 1) };
    } else {
      // Add upvote (toggle on)
      await ctx.db.insert("commentUpvotes", {
        commentId: args.commentId,
        userId: user._id,
        createdAt: now,
      });

      // Update comment upvote count
      await ctx.db.patch(args.commentId, {
        upvoteCount: (comment.upvoteCount ?? 0) + 1,
        updatedAt: now,
      });

      // Write a +1 point event to comment author — only if not self-upvote
      const isSelfUpvote = comment.authorId === user._id;

      if (!isSelfUpvote) {
        await ctx.db.insert("pointEvents", {
          communityId: post.communityId,
          userId: comment.authorId,
          actorUserId: user._id,
          eventType: "comment_upvote_received",
          points: 1,
          sourceType: "comment",
          sourceId: args.commentId,
          createdAt: now,
        });
      }

      return { upvoted: true, newCount: (comment.upvoteCount ?? 0) + 1 };
    }
  },
});

// Vote on a poll option
// SECURITY M-3: One vote per user per poll with dedup protection
export const votePoll = mutation({
  args: {
    postId: v.id("posts"),
    optionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to vote");
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

    if (post.contentType !== "poll") {
      throw new Error("This post is not a poll");
    }

    // Get current poll options
    const pollOptions = post.pollOptions || [];
    if (args.optionIndex < 0 || args.optionIndex >= pollOptions.length) {
      throw new Error("Invalid option");
    }

    // SECURITY M-3: Check if user already voted on this poll
    const existingVote = await ctx.db
      .query("pollVotes")
      .withIndex("by_post_and_user", (q) =>
        q.eq("postId", args.postId).eq("userId", user._id)
      )
      .first();

    if (existingVote) {
      // User already voted — don't allow double voting
      return { success: false, reason: "already_voted" };
    }

    // Record the vote for dedup tracking
    await ctx.db.insert("pollVotes", {
      postId: args.postId,
      userId: user._id,
      optionIndex: args.optionIndex,
      createdAt: Date.now(),
    });

    // Update the vote count for the selected option
    const updatedOptions = pollOptions.map((opt, i) => {
      if (i === args.optionIndex) {
        return { ...opt, votes: (opt.votes || 0) + 1 };
      }
      return opt;
    });

    await ctx.db.patch(args.postId, {
      pollOptions: updatedOptions,
    });

    return { success: true };
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

    const now = Date.now();

    // Delete all upvotes for this post and create reversal events for each
    const upvotes = await ctx.db
      .query("upvotes")
      .withIndex("by_post_id", (q) => q.eq("postId", args.postId))
      .collect();

    for (const upvote of upvotes) {
      // Check if this upvote originally awarded points (not self-upvote)
      const isSelfUpvote = post.authorId === upvote.userId;

      if (!isSelfUpvote) {
        await ctx.db.insert("pointEvents", {
          communityId: post.communityId,
          userId: post.authorId,
          actorUserId: upvote.userId,
          eventType: "post_upvote_reversed",
          points: -1,
          sourceType: "post",
          sourceId: args.postId,
          createdAt: now,
        });
      }

      await ctx.db.delete(upvote._id);
    }

    // Reverse the +2 post creation points
    await ctx.db.insert("pointEvents", {
      communityId: post.communityId,
      userId: post.authorId,
      eventType: "post_created_reversed",
      points: -2,
      sourceType: "post",
      sourceId: args.postId,
      createdAt: now,
    });

    // Delete all comments for this post and reverse their creation points
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post_id", (q) => q.eq("postId", args.postId))
      .collect();

    for (const comment of comments) {
      // Reverse the +1 comment creation points
      await ctx.db.insert("pointEvents", {
        communityId: post.communityId,
        userId: comment.authorId,
        eventType: "comment_created_reversed",
        points: -1,
        sourceType: "comment",
        sourceId: comment._id,
        createdAt: now,
      });

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

    // Reverse the +1 comment creation points
    await ctx.db.insert("pointEvents", {
      communityId: post.communityId,
      userId: comment.authorId,
      eventType: "comment_created_reversed",
      points: -1,
      sourceType: "comment",
      sourceId: args.commentId,
      createdAt: Date.now(),
    });

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
