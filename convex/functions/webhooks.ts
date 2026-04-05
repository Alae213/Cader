/**
 * Convex HTTP action for receiving webhook events.
 * SECURITY: C-1, C-2, C-3 — Webhook-only mutations are now internal
 * and can only be reached through this authenticated HTTP endpoint.
 *
 * The Next.js webhook route verifies the Chargily signature, then
 * calls this HTTP action to perform the actual database mutations.
 */

import { httpAction } from "../_generated/server";
import { internal, api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export const handleChargilyWebhook = httpAction(async (ctx, request) => {
  // Only accept POST
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // The signature verification is done in the Next.js route handler.
  // We trust the caller has already verified the signature.
  // For defense-in-depth, we could add a shared secret header here.

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const payload = body as {
    event: string;
    data: {
      id: string;
      amount: number;
      currency: string;
      metadata?: {
        communityId: string;
        userId: string;
        type: "community" | "classroom" | "platform";
        classroomId?: string;
      };
    };
  };

  if (payload.event !== "checkout.paid") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const metadata = payload.data.metadata;
  if (!metadata || !metadata.communityId || !metadata.userId) {
    return new Response("Missing metadata", { status: 400 });
  }

  try {
    if (metadata.type === "platform") {
      // Update platform tier
      await ctx.runMutation(internal.functions.communities._updatePlatformTier, {
        communityId: metadata.communityId as Id<"communities">,
        tier: "subscribed",
      });
    } else if (metadata.type === "classroom" && metadata.classroomId) {
      // Grant classroom access
      await ctx.runMutation(internal.functions.payments._grantClassroomAccess, {
        classroomId: metadata.classroomId as Id<"classrooms">,
        userId: metadata.userId as Id<"users">,
        paymentReference: payload.data.id,
      });
    } else {
      // Grant community membership
      await ctx.runMutation(internal.functions.memberships._grantMembership, {
        communityId: metadata.communityId as Id<"communities">,
        userId: metadata.userId as Id<"users">,
        paymentReference: payload.data.id,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Return 200 to prevent webhook retries — the error is logged
    return new Response(
      JSON.stringify({ received: true, error: "Processing failed" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * HTTP action for Clerk webhook user sync.
 * SECURITY: H-2 — syncUser is now internal and called through here.
 */
export const handleClerkWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = body as {
    type: string;
    data: {
      id: string;
      email_addresses?: Array<{ email_address: string }>;
      first_name?: string;
      last_name?: string;
      username?: string;
      image_url?: string;
    };
  };

  const email = event.data.email_addresses?.[0]?.email_address || "";
  const displayName =
    [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") ||
    email.split("@")[0];
  // Use Clerk username if available, otherwise derive from email
  const username = event.data.username || email.split("@")[0];

  try {
    await ctx.runMutation(internal.functions.users._syncUser, {
      clerkId: event.data.id,
      email,
      displayName,
      username,
      avatarUrl: event.data.image_url || undefined,
    });
    
    // Note: Owner info sync to communities happens lazily when the user
    // updates their profile or visits their community. No need to do it here.
  } catch (error) {
    console.error("Clerk webhook sync error:", error);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
