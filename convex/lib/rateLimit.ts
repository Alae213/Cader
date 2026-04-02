/**
 * Server-side rate limiting for Convex mutations.
 * SECURITY: C-5 — Prevents abuse of user-facing endpoints.
 *
 * Rate limits (per SECURITY.md):
 * - community_creation: 5 per hour
 * - post_creation: 20 per hour
 * - comment_creation: 60 per hour
 * - checkout_creation: 3 per hour per community
 */

import { MutationCtx, QueryCtx } from "../_generated/server";
import { ConvexError, v } from "convex/values";

type RateLimitAction =
  | "community_creation"
  | "post_creation"
  | "comment_creation"
  | "checkout_creation";

const RATE_LIMITS: Record<RateLimitAction, { requests: number; windowMs: number }> = {
  community_creation: { requests: 5, windowMs: 60 * 60 * 1000 },       // 5 per hour
  post_creation:      { requests: 20, windowMs: 60 * 60 * 1000 },      // 20 per hour
  comment_creation:   { requests: 60, windowMs: 60 * 60 * 1000 },      // 60 per hour
  checkout_creation:  { requests: 3, windowMs: 60 * 60 * 1000 },       // 3 per hour
};

/**
 * Check and enforce rate limit. Throws ConvexError if limit exceeded.
 * Records the request if allowed.
 *
 * Must be called from within a mutation (uses ctx.db).
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  userId: string,
  action: RateLimitAction
): Promise<void> {
  const limit = RATE_LIMITS[action];
  const now = Date.now();
  const windowStart = now - limit.windowMs;

  // Count requests in window
  const requests = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_and_action", (q) =>
      q.eq("userId", userId).eq("action", action)
    )
    .filter((q) => q.gt(q.field("timestamp"), windowStart))
    .collect();

  if (requests.length >= limit.requests) {
    const retryAfter = Math.ceil(
      (requests[0].timestamp + limit.windowMs - now) / 1000
    );
    throw new ConvexError(
      `Too many requests. Please wait ${retryAfter} seconds before trying again.`
    );
  }

  // Record this request
  await ctx.db.insert("rateLimits", {
    userId,
    action,
    timestamp: now,
  });
}
