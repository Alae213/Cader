import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { verifySignature } from "@chargily/chargily-pay";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "@/convex/_generated/dataModel";

// Chargily webhook events we care about
type ChargilyEventType = 
  | "checkout.paid" 
  | "checkout.failed" 
  | "checkout.canceled";

interface ChargilyWebhookPayload {
  event: ChargilyEventType;
  data: {
    id: string;
    amount: number;
    currency: string;
    description: string;
    status: string;
    patient?: {
      email: string;
      first_name: string;
      last_name: string;
    };
    metadata?: {
      communityId: string;
      userId: string;
      type: "community" | "classroom" | "platform";
      classroomId?: string;
      mode?: "test" | "live"; // G-009: Test/live mode verification
      priceAmount?: number; // EC-18: Store price at checkout creation
    };
  };
}

// ============================================================================
// RATE LIMITING (G-002)
// Simple in-memory rate limiter - for production, use Redis (Upstash)
// ============================================================================
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = ip;
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    // First request or window expired - reset
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    // Rate limit exceeded
    return false;
  }

  // Increment count
  record.count++;
  return true;
}

function getClientIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0] || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

// ============================================================================
// USER EXISTENCE CHECK (G-003)
// Verify user exists before granting access
// ============================================================================
async function verifyUserExists(convex: ConvexHttpClient, userId: string): Promise<boolean> {
  try {
    const user = await convex.query(api.functions.users.getUserById, {
      userId: userId as Id<"users">,
    });
    return !!user;
  } catch {
    return false;
  }
}

// ============================================================================
// PLATFORM TIER VERIFICATION (G-006)
// Verify community exists and has correct tier before processing platform subscription
// ============================================================================
async function verifyPlatformTier(
  convex: ConvexHttpClient, 
  communityId: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const community = await convex.query(api.functions.communities.getById, {
      communityId: communityId as Id<"communities">,
    });

    if (!community) {
      return { valid: false, reason: "Community not found" };
    }

    // If already subscribed, still allow (for renewal)
    if (community.platformTier === "subscribed") {
      console.log("Community already subscribed, allowing renewal:", communityId);
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Failed to verify community" };
  }
}

// ============================================================================
// TEST/LIVE MODE VERIFICATION (G-009)
// Reject test checkouts in production
// ============================================================================
function verifyMode(metadata: ChargilyWebhookPayload["data"]["metadata"]): { valid: boolean; reason?: string } {
  if (!metadata?.mode) {
    // No mode specified - allow for backward compatibility
    return { valid: true };
  }

  const isProduction = process.env.NODE_ENV === "production";
  const isTestMode = metadata.mode === "test";

  if (isProduction && isTestMode) {
    return { valid: false, reason: "Test mode checkout rejected in production" };
  }

  if (!isProduction && !isTestMode) {
    return { valid: false, reason: "Live mode checkout rejected in development" };
  }

  return { valid: true };
}

// Create Convex HTTP client for server-side mutations
function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

// Verify that the paid amount matches the expected price
// This prevents price manipulation attacks where an attacker changes the price
async function verifyPaymentAmount(
  convex: ConvexHttpClient,
  metadata: ChargilyWebhookPayload["data"]["metadata"],
  paidAmount: number
): Promise<{ valid: boolean; expectedAmount?: number; reason?: string }> {
  if (!metadata) {
    return { valid: false, reason: "Missing metadata" };
  }

  // Platform subscription has fixed price
  if (metadata.type === "platform") {
    const expectedAmount = 2000 * 100; // 2000 DZD in centimes
    if (paidAmount !== expectedAmount) {
      return { 
        valid: false, 
        expectedAmount,
        reason: `Platform subscription price mismatch: expected ${expectedAmount}, got ${paidAmount}` 
      };
    }
    return { valid: true };
  }

  // Get expected price from database
  const priceInfo = await convex.query(api.functions.payments.getExpectedPrice, {
    communityId: metadata.communityId as Id<"communities">,
    type: metadata.type,
    classroomId: metadata.classroomId as Id<"classrooms"> | undefined,
  });

  if (!priceInfo) {
    return { valid: false, reason: "Could not determine expected price" };
  }

  // Verify amount matches (with 0 tolerance - exact match required)
  if (paidAmount !== priceInfo.expectedAmount) {
    return { 
      valid: false, 
      expectedAmount: priceInfo.expectedAmount,
      reason: `Price mismatch: expected ${priceInfo.expectedAmount} centimes, got ${paidAmount} centimes` 
    };
  }

  return { valid: true };
}

export async function POST(req: NextRequest) {
  try {
    // =========================================================================
    // RATE LIMITING CHECK (G-002)
    // =========================================================================
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      console.error("Rate limit exceeded for IP:", clientIP);
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const payloadText = await req.text();
    const payloadBuffer = Buffer.from(payloadText);
    const signature = req.headers.get("x-chargily-signature");
    
    // Get webhook secret from environment
    const webhookSecret = process.env.CHARGILY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("CHARGILY_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    // Verify signature using official SDK
    const isValid = verifySignature(payloadBuffer, signature || "", webhookSecret);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse the payload
    const event: ChargilyWebhookPayload = JSON.parse(payloadText);
    
    console.log("Chargily webhook received:", event.event, event.data.id);

    // Get Convex client for mutations
    const convex = getConvexClient();

    // Handle based on event type
    switch (event.event) {
      case "checkout.paid": {
        const metadata = event.data.metadata;
        
        if (!metadata || !metadata.communityId || !metadata.userId) {
          console.error("Missing metadata in webhook payload");
          return NextResponse.json(
            { error: "Missing required metadata" },
            { status: 400 }
          );
        }

        // =========================================================================
        // TEST/LIVE MODE VERIFICATION (G-009)
        // =========================================================================
        const modeCheck = verifyMode(metadata);
        if (!modeCheck.valid) {
          console.error("Mode verification failed:", modeCheck.reason);
          return NextResponse.json(
            { received: true, warning: modeCheck.reason },
            { status: 200 }
          );
        }

        // =========================================================================
        // USER EXISTENCE CHECK (G-003)
        // =========================================================================
        const userExists = await verifyUserExists(convex, metadata.userId);
        if (!userExists) {
          console.error("User not found:", metadata.userId);
          // Return 200 to prevent retry, but don't grant access
          return NextResponse.json(
            { received: true, warning: "User not found - access not granted" },
            { status: 200 }
          );
        }

        // =========================================================================
        // PLATFORM TIER VERIFICATION (G-006) - for platform subscriptions
        // =========================================================================
        if (metadata.type === "platform") {
          const tierCheck = await verifyPlatformTier(convex, metadata.communityId);
          if (!tierCheck.valid) {
            console.error("Platform tier verification failed:", tierCheck.reason);
            return NextResponse.json(
              { received: true, warning: tierCheck.reason },
              { status: 200 }
            );
          }
        }

        // SECURITY: Verify payment amount matches expected price
        const amountVerification = await verifyPaymentAmount(
          convex,
          metadata,
          event.data.amount
        );

        if (!amountVerification.valid) {
          console.error("Payment amount verification failed:", {
            checkoutId: event.data.id,
            paidAmount: event.data.amount,
            expectedAmount: amountVerification.expectedAmount,
            reason: amountVerification.reason,
            metadata,
          });
          
          // Log the suspicious activity but still return 200 to Chargily
          // to prevent webhook retries. The access is simply not granted.
          return NextResponse.json(
            { 
              received: true, 
              warning: "Amount mismatch - access not granted",
              reason: amountVerification.reason 
            },
            { status: 200 }
          );
        }

        // Amount verified - proceed with granting access
        if (metadata.type === "platform") {
          // Update platform tier to subscribed
          console.log("Upgrading community to subscribed tier:", {
            communityId: metadata.communityId,
            verifiedAmount: event.data.amount,
          });

          await convex.mutation(api.functions.communities.updatePlatformTier, {
            communityId: metadata.communityId as Id<"communities">,
            tier: "subscribed",
          });
        } else if (metadata.type === "classroom" && metadata.classroomId) {
          // Grant classroom access
          console.log("Granting classroom access:", {
            classroomId: metadata.classroomId,
            userId: metadata.userId,
            paymentReference: event.data.id,
            verifiedAmount: event.data.amount,
          });

          await convex.mutation(api.functions.payments.grantClassroomAccess, {
            classroomId: metadata.classroomId as Id<"classrooms">,
            userId: metadata.userId as Id<"users">,
            paymentReference: event.data.id,
          });
        } else {
          // Grant community membership
          console.log("Granting membership:", {
            communityId: metadata.communityId,
            userId: metadata.userId,
            paymentReference: event.data.id,
            verifiedAmount: event.data.amount,
          });

          await convex.mutation(api.functions.memberships.grantMembership, {
            communityId: metadata.communityId as Id<"communities">,
            userId: metadata.userId as Id<"users">,
            paymentReference: event.data.id,
          });
        }
        
        break;
      }

      case "checkout.failed": {
        console.log("Checkout failed:", event.data.id);
        break;
      }

      case "checkout.canceled": {
        console.log("Checkout canceled:", event.data.id);
        break;
      }

      default:
        console.log("Unhandled event type:", event.event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ 
    status: "Chargily webhook endpoint",
    methods: ["POST"]
  });
}
