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
    };
  };
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
