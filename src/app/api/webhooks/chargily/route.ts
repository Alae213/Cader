import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { verifySignature } from "@chargily/chargily-pay";
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
      mode?: "test" | "live";
      priceAmount?: number;
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
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

function getClientIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0] || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

// ============================================================================
// TEST/LIVE MODE VERIFICATION (G-009)
// Reject test checkouts in production
// ============================================================================
function verifyMode(metadata: ChargilyWebhookPayload["data"]["metadata"]): { valid: boolean; reason?: string } {
  if (!metadata?.mode) {
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

// Create Convex HTTP client for server-side queries
function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

// Verify that the paid amount matches the expected price
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
  const { api } = await import("@/convex/_generated/api");
  const priceInfo = await convex.query(api.functions.payments.getExpectedPrice, {
    communityId: metadata.communityId as Id<"communities">,
    type: metadata.type,
    classroomId: metadata.classroomId as Id<"classrooms"> | undefined,
  });

  if (!priceInfo) {
    return { valid: false, reason: "Could not determine expected price" };
  }

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

        // SECURITY: Verify payment amount matches expected price
        const convex = getConvexClient();
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
          
          return NextResponse.json(
            { 
              received: true, 
              warning: "Amount mismatch - access not granted",
              reason: amountVerification.reason 
            },
            { status: 200 }
          );
        }

        // SECURITY C-1/C-2/C-3: Forward to Convex HTTP action
        // The HTTP action calls internal mutations that are NOT publicly accessible
        // This prevents any authenticated user from calling grantMembership directly
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        const httpResponse = await fetch(`${convexUrl}/api/handleChargilyWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: event.event,
            data: {
              id: event.data.id,
              amount: event.data.amount,
              currency: event.data.currency,
              metadata: {
                communityId: metadata.communityId,
                userId: metadata.userId,
                type: metadata.type,
                classroomId: metadata.classroomId,
              },
            },
          }),
        });

        if (!httpResponse.ok) {
          console.error("Convex HTTP action failed:", httpResponse.status);
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
