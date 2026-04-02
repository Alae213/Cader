import { NextRequest, NextResponse } from "next/server";
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

    // SECURITY H-2: Forward to Convex HTTP action instead of calling public mutation
    // The HTTP action calls internal.functions.users._syncUser which is not publicly accessible
    const convex = getConvexClient();
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    await fetch(`${convexUrl}/api/handleClerkWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

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
