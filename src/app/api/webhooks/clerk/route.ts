import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import crypto from "crypto";

// Create Convex HTTP client for server-side mutations
function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const timestamp = signature.split("t=")[1]?.split(",")[0] || "";
  const sig = signature.split("v1=")[1] || signature;
  
  // Build the signed payload: timestamp + "." + payload
  const signedPayload = timestamp + "." + payload;
  
  // Compute expected signature
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  
  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const headers = req.headers;
    const signature = headers.get("x-clerk-signature") || "";
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    // Clerk webhook signatures look like: t=1234567890,v1=abc123...
    if (signature) {
      try {
        const timestamp = signature.split("t=")[1]?.split(",")[0] || "";
        const sig = signature.split("v1=")[1] || signature;
        
        const signedPayload = timestamp + "." + payload;
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(signedPayload)
          .digest("hex");
        
        const sigBuffer = Buffer.from(sig);
        const expectedBuffer = Buffer.from(expectedSignature);
        
        if (sigBuffer.length !== expectedBuffer.length || 
            !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
          console.error("Invalid Clerk webhook signature");
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
          );
        }
      } catch (err) {
        console.error("Signature verification error:", err);
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else {
      console.error("Missing Clerk webhook signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const event = JSON.parse(payload);
    
    console.log("Clerk webhook received:", event.type);

    // Get Convex client for mutations
    const convex = getConvexClient();

    // Handle Clerk events
    switch (event.type) {
      case "user.created": {
        const { id: clerkId, email_addresses, first_name, last_name, image_url } = event.data;
        
        // Get primary email
        const email = email_addresses?.[0]?.email_address || "";
        
        // Build display name from first + last name
        const displayName = [first_name, last_name].filter(Boolean).join(" ") || email.split("@")[0];
        
        // Create user in Convex
        console.log("Syncing new user:", { clerkId, email, displayName });
        
        await convex.mutation(api.functions.users.syncUser, {
          clerkId,
          email,
          displayName,
          avatarUrl: image_url || undefined,
        });
        
        break;
      }

      case "user.updated": {
        const { id: clerkId, email_addresses, first_name, last_name, image_url } = event.data;
        
        const email = email_addresses?.[0]?.email_address || "";
        const displayName = [first_name, last_name].filter(Boolean).join(" ") || email.split("@")[0];
        
        // Update user in Convex
        console.log("Updating user:", { clerkId, email, displayName });
        
        await convex.mutation(api.functions.users.syncUser, {
          clerkId,
          email,
          displayName,
          avatarUrl: image_url || undefined,
        });
        
        break;
      }

      case "user.deleted": {
        const { id: clerkId } = event.data;
        
        // For soft-delete, we could update a deleted flag
        // For now, just log it - full implementation would depend on requirements
        console.log("User deleted in Clerk:", clerkId);
        
        // TODO: Implement soft-delete in Convex user table
        // Could add a deletedAt field and filter out deleted users in queries
        
        break;
      }

      default:
        console.log("Unhandled Clerk event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Clerk webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ 
    status: "Clerk webhook endpoint",
    methods: ["POST"]
  });
}
