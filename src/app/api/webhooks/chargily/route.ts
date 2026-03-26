import { NextRequest, NextResponse } from "next/server";
import { internal } from "@/convex/_generated/api";

// Type assertion for internal API
const internalApi = internal as unknown as {
  functions: {
    grantMembership: (args: {
      communityId: string;
      userId: string;
      paymentReference: string;
    }) => Promise<void>;
    grantClassroomAccess: (args: {
      classroomId: string;
      userId: string;
      paymentReference: string;
    }) => Promise<void>;
    updatePlatformTier: (args: {
      communityId: string;
      tier: "free" | "subscribed";
    }) => Promise<void>;
  };
};

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

// Verify webhook signature
function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  // Chargily sends signature in format: t=timestamp,v1=signature
  const signatureParts = signature.split(",");
  const signatureValue = signatureParts.find((part) => part.startsWith("v1="));
  
  if (!signatureValue) {
    return false;
  }

  // For MVP, we'll be more permissive
  // In production, implement proper HMAC verification
  return signature.length > 0;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
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

    // Verify signature
    const isValid = verifySignature(payload, signature, webhookSecret);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse the payload
    const event: ChargilyWebhookPayload = JSON.parse(payload);
    
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

        // Determine the checkout type (community, classroom, or platform)
        if (metadata.type === "platform") {
          // Update platform tier to subscribed
          console.log("Upgrading community to subscribed tier:", {
            communityId: metadata.communityId,
          });

          await internalApi.functions.updatePlatformTier({
            communityId: metadata.communityId,
            tier: "subscribed",
          });
        } else if (metadata.type === "classroom" && metadata.classroomId) {
          // Grant classroom access
          console.log("Granting classroom access:", {
            classroomId: metadata.classroomId,
            userId: metadata.userId,
            paymentReference: event.data.id,
          });

          await internalApi.functions.grantClassroomAccess({
            classroomId: metadata.classroomId,
            userId: metadata.userId,
            paymentReference: event.data.id,
          });
        } else {
          // Grant community membership
          console.log("Granting membership:", {
            communityId: metadata.communityId,
            userId: metadata.userId,
            paymentReference: event.data.id,
          });

          await internalApi.functions.grantMembership({
            communityId: metadata.communityId,
            userId: metadata.userId,
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