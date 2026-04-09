"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Loader2, AlertCircle, CreditCard, XCircle, ExternalLink, CheckCircle } from "lucide-react";

interface Community {
  _id: string;
  name: string;
  slug: string;
  pricingType: "free" | "monthly" | "annual" | "one_time";
  priceDzd?: number;
}

interface OnboardingModalProps {
  community: Community;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

type PaymentStatus = "idle" | "pending" | "verifying" | "verified" | "cancelled" | "failed";

// ============================================================================
// FUTURE: Custom Questions Feature
// ============================================================================
// TODO: After MVP, add support for community owner custom questions:
// - Add `customQuestions` field to Community schema
// - Each question has: type (text/choice), label, required, options[]
// - Store member answers in MembershipAnswers table
// - Render dynamic form based on community config
// ============================================================================

export function OnboardingModal({ community, open, onOpenChange, onComplete }: OnboardingModalProps) {
  const { userId } = useAuth();
  const { user: clerkUser } = useUser();
  const searchParams = useSearchParams();
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  
  // Check if user already has membership
  const membershipQuery = useQuery(
    api.functions.memberships.getMembershipBySlug,
    userId ? { slug: community.slug, clerkId: userId } : "skip"
  );

  // Check member limit for this community
  const memberLimitCheck = useQuery(
    api.functions.communities.checkMemberLimit,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    community._id ? { communityId: community._id as any } : "skip"
  );

  // Get Convex user ID from Clerk ID
  const convexUser = useQuery(
    api.functions.users.getUserByClerkId,
    userId ? { clerkId: userId } : "skip"
  );

  // Get expected price for verification
  const expectedPrice = useQuery(
    api.functions.payments.getExpectedPrice,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    community._id ? { communityId: community._id as any, type: "community" } : "skip"
  );

  // ============================================================================
  // CHECKOUT STATUS CHECK
  // Check URL params for payment status when modal opens
  // SofizPay uses return URL pattern (no webhooks)
  // ============================================================================
  
  // Sync user if they exist in Clerk but not in Convex (handles race condition with webhooks)
  useEffect(() => {
    if (open && userId && !convexUser) {
      // Try to sync user - this handles case where Clerk webhook hasn't fired yet
      const doSync = async () => {
        try {
          // Get user info from Clerk via the frontend
          const userResponse = await fetch(`/api/auth/user`).catch(() => null);
          if (userResponse?.ok) {
            const userData = await userResponse.json();
            if (userData?.user) {
              await syncUser({
                clerkId: userId,
                email: userData.user.email || "",
                displayName: userData.user.displayName || "",
                avatarUrl: userData.user.imageUrl || undefined,
              });
            }
          }
        } catch (e) {
          console.error("User sync error:", e);
        }
      };
      doSync();
    }
  }, [open, userId, convexUser]);

  useEffect(() => {
    if (open) {
      const status = searchParams.get("status");
      const joined = searchParams.get("joined");
      
      if (status === "cancelled") {
        setPaymentStatus("cancelled");
      } else if (status === "success" && joined === "true" && convexUser?._id && community._id) {
        // User returned from SofizPay - verify payment
        handleVerifyPayment();
      }
    }
  }, [open, searchParams, convexUser, community._id]);

  // Check for existing membership - if found, close modal and complete
  useEffect(() => {
    if (membershipQuery?.isMember && open) {
      onOpenChange(false);
      onComplete?.();
    }
  }, [membershipQuery, open, onOpenChange, onComplete]);

  // ============================================================================
  // VERIFY PAYMENT (SofizPay polling-based verification)
  // ============================================================================
  const handleVerifyPayment = async () => {
    if (!userId || !convexUser?._id || !community._id || !expectedPrice?.expectedAmount) {
      return;
    }

    setPaymentStatus("verifying");
    setIsLoading(true);
    setError("");

    try {
      // Build memo to search for
      const memo = `Community:${community.slug} - User:${convexUser.email || userId} - Type:community`;

      // Verify with Convex
      const verifyResult = await verifyPaymentStatus({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        communityId: community._id as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userId: convexUser._id as any,
        memo,
        expectedAmount: expectedPrice.expectedAmount,
        type: "community",
      });

      if (verifyResult.verified) {
        setPaymentStatus("verified");
        toast.success("Payment verified! Welcome to the community.");
        setTimeout(() => {
          onOpenChange(false);
          onComplete?.();
        }, 1500);
      } else {
        setPaymentStatus("failed");
        setError(verifyResult.error || "Payment verification failed. Please try again.");
      }
    } catch (err) {
      setPaymentStatus("failed");
      setError(err instanceof Error ? err.message : "Failed to verify payment");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // FREE COMMUNITY JOIN
  // ============================================================================
  const handleFreeJoin = async () => {
    if (!userId || !clerkUser?.emailAddresses?.[0]?.emailAddress) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      // Try to sync user first if they don't exist in Convex (handles race condition with Clerk webhooks)
      if (!convexUser) {
        try {
          await syncUser({
            clerkId: userId,
            email: clerkUser.emailAddresses[0].emailAddress,
            displayName: clerkUser.fullName || clerkUser.username || "User",
          });
        } catch (syncError) {
          // Continue anyway - the mutation might work if user was created by webhook
        }
      }
      
      await mutateFreeJoin({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        communityId: community._id as any,
      });
      
      toast.success("Welcome to the community!");
      onOpenChange(false);
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join community");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // PAID COMMUNITY CHECKOUT (SofizPay)
  // ============================================================================
  const handlePaidJoin = async () => {
    if (!userId || !clerkUser?.emailAddresses?.[0]?.emailAddress) return;
    
    setIsLoading(true);
    setError("");
    setPaymentStatus("idle");
    
    try {
      // Try to sync user first if they don't exist in Convex
      let userConvexId = convexUser?._id;
      if (!userConvexId) {
        try {
          await syncUser({
            clerkId: userId,
            email: clerkUser.emailAddresses[0].emailAddress,
            displayName: clerkUser.fullName || clerkUser.username || "User",
          });
          // Give Convex a moment to sync - the convexUser query should update
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (syncError) {
          // Continue anyway
        }
      }
      
      // Now try to get the convex user
      userConvexId = convexUser?._id;
      
      if (!userConvexId) {
        // Try one more time by forcing a re-render wait
        await new Promise(resolve => setTimeout(resolve, 1000));
        userConvexId = convexUser?._id;
      }
      
      if (!userConvexId) {
        setError("Unable to find your user profile. Please sign out and sign in again, then try joining.");
        setIsLoading(false);
        return;
      }
      
      console.log("Creating checkout for community:", community._id, "user:", userConvexId);
      
      try {
        // First get payment data from Convex
        const paymentResult = await createSofizpayCheckout({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          communityId: community._id as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          userId: userConvexId as any,
          type: "community",
          successUrl: `${window.location.origin}/${community.slug}?status=success&joined=true`,
          cancelUrl: `${window.location.origin}/${community.slug}?status=cancelled`,
        });
        console.log("Payment result:", paymentResult);
        
        // Now call the Next.js API to create the actual payment
        const apiResponse = await fetch('/api/sofizpay/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentResult.paymentData),
        });
        
        const apiData = await apiResponse.json();
        console.log("API response:", apiData);
        
        if (apiData.success && apiData.paymentUrl) {
          // Show redirecting state before navigating
          setIsRedirecting(true);
          setPaymentStatus("pending");
          setTimeout(() => {
            window.location.href = apiData.paymentUrl;
          }, 1500);
        } else {
          setError(apiData.error || "Failed to create payment");
        }
      } catch (err) {
        console.error("Checkout error:", err);
        if (err instanceof Error && err.message.includes("not configured")) {
          setError("This community is not yet configured for payments. Please contact the community owner.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to create payment");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mutations
  const mutateFreeJoin = useMutation(api.functions.memberships.joinFreeCommunity);
  const createSofizpayCheckout = useMutation(api.functions.payments.createSofizpayCheckout);
  const verifyPaymentStatus = useMutation(api.functions.payments.verifyPaymentStatus);
  const syncUser = useMutation(api.functions.users.syncUser);

  // Render payment status message
  const renderPaymentStatusMessage = () => {
    switch (paymentStatus) {
      case "verifying":
        return (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <Text size="sm" className="text-blue-800">
                Verifying your payment...
              </Text>
            </div>
          </div>
        );
      case "verified":
        return (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <Text size="sm" className="text-green-800">
                Payment verified! Setting up your access...
              </Text>
            </div>
          </div>
        );
      case "cancelled":
        return (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <Text size="sm" className="text-yellow-800">
                Payment was cancelled. You can try again or contact the community owner.
              </Text>
            </div>
          </div>
        );
      case "failed":
        return (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <Text size="sm" className="text-red-800">
                Payment verification failed. Please try again.
              </Text>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const isPaidCommunity = ["monthly", "annual", "one_time"].includes(community.pricingType || "");

  // ============================================================================
  // MEMBER LIMIT CHECK
  // ============================================================================
  if (memberLimitCheck?.atLimit && !memberLimitCheck.isSubscribed) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Community Full</DialogTitle>
          <div className="py-4">
            <Text>
              This community has reached its member limit of {memberLimitCheck.limit} members.
            </Text>
            <Text size="sm" theme="secondary" className="mt-2">
              The owner can upgrade to a paid plan to unlock unlimited members.
            </Text>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Join {community.name}</DialogTitle>
        
        {renderPaymentStatusMessage()}
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <Text size="sm" className="text-red-800">{error}</Text>
            </div>
          </div>
        )}

        {!isPaidCommunity ? (
          // Free Community
          <div className="py-4 space-y-4">
            <Text>Join this free community to access all content and connect with members.</Text>
            <Button 
              onClick={handleFreeJoin} 
              disabled={isLoading || !userId}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Community"
              )}
            </Button>
          </div>
        ) : (
          // Paid Community
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-card rounded-lg">
              <div>
                <Text theme="secondary" size="sm">Membership Type</Text>
                <Text className="font-medium">
                  {community.pricingType === "monthly" && "Monthly Subscription"}
                  {community.pricingType === "annual" && "Annual Subscription"}
                  {community.pricingType === "one_time" && "Lifetime Access"}
                </Text>
              </div>
              <div className="text-right">
                <Text theme="secondary" size="sm">Price</Text>
                <Text className="font-medium text-lg">
                  {community.priceDzd?.toLocaleString()} DZD
                  {community.pricingType === "monthly" && "/month"}
                  {community.pricingType === "annual" && "/year"}
                </Text>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
              <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
              <Text size="sm" className="text-blue-800">
                Secure payment powered by SofizPay. You'll be redirected to complete your payment.
              </Text>
            </div>

            {(paymentStatus === "idle" || paymentStatus === "cancelled") && (
              <Button 
                onClick={handlePaidJoin} 
                disabled={isLoading || !userId || isRedirecting}
                className="w-full"
              >
                {isLoading || isRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isRedirecting ? "Redirecting to payment..." : "Processing..."}
                  </>
                ) : (
                  <>
                    Pay {community.priceDzd?.toLocaleString()} DZD
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
