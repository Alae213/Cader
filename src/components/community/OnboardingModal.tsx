"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Loader2, AlertCircle, CreditCard, XCircle, ExternalLink } from "lucide-react";

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

type PaymentStatus = "idle" | "pending" | "cancelled" | "expired";

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
    community._id ? { communityId: community._id as any } : "skip"
  );

  // Get Convex user ID from Clerk ID
  const convexUser = useQuery(
    api.functions.users.getUserByClerkId,
    userId ? { clerkId: userId } : "skip"
  );

  // ============================================================================
  // CHECKOUT STATUS CHECK
  // Check URL params for payment status when modal opens
  // ============================================================================
  useEffect(() => {
    if (open) {
      const status = searchParams.get("status");
      const joined = searchParams.get("joined");
      
      if (status === "cancelled") {
        setPaymentStatus("cancelled");
      } else if (status === "expired") {
        setPaymentStatus("expired");
      } else if (joined === "true") {
        // Payment successful - close modal and complete
        toast.success("Welcome to the community!");
        onOpenChange(false);
        onComplete?.();
        return;
      }
      
      // Clear URL params after reading
      if (status || joined) {
        const url = new URL(window.location.href);
        url.searchParams.delete("status");
        url.searchParams.delete("joined");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [open, searchParams, onOpenChange, onComplete]);

  // Check for existing membership - if found, close modal and complete
  useEffect(() => {
    if (membershipQuery?.isMember && open) {
      onOpenChange(false);
      onComplete?.();
    }
  }, [membershipQuery, open, onOpenChange, onComplete]);

  // ============================================================================
  // FREE COMMUNITY JOIN
  // ============================================================================
  const handleFreeJoin = async () => {
    if (!userId || !convexUser?._id) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      // Use grantMembership (no displayName/phone needed)
      await mutateFreeJoin({
        communityId: community._id as any,
        userId: convexUser._id as any,
        paymentReference: `free_${Date.now()}`,
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
  // PAID COMMUNITY CHECKOUT
  // ============================================================================
  const handlePaidJoin = async () => {
    if (!userId || !convexUser?._id) return;
    
    setIsLoading(true);
    setError("");
    setPaymentStatus("idle");
    
    try {
      const result = await createCheckout({
        communityId: community._id as any,
        userId: convexUser._id as any,
        type: "community",
        successUrl: `${window.location.origin}/${community.slug}?joined=true`,
        cancelUrl: `${window.location.origin}/${community.slug}?status=cancelled`,
      });
      
      if (result.checkoutUrl) {
        // Show redirecting state before navigating
        setIsRedirecting(true);
        setTimeout(() => {
          window.location.href = result.checkoutUrl;
        }, 1500);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("not configured")) {
        setError("This community is not yet configured for payments. Please contact the community owner.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to create checkout");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mutations
  const mutateFreeJoin = useMutation(api.functions.memberships.grantMembership);
  const createCheckout = useMutation(api.functions.payments.createChargilyCheckout);

  // Render payment status message
  const renderPaymentStatusMessage = () => {
    switch (paymentStatus) {
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
      case "expired":
        return (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <Text size="sm" className="text-red-800">
                Checkout expired. Please try again to complete your payment.
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
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <Heading size="h3" className="mb-2">Community at Capacity</Heading>
            <Text theme="muted">
              This community has reached its {memberLimitCheck.limit} member limit. 
              The creator needs to upgrade to a paid plan to accept more members.
            </Text>
          </div>
          <Button variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // ============================================================================
  // REDIRECTING STATE
  // Show loading screen while redirecting to payment
  // ============================================================================
  if (isRedirecting) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <Heading size="h3" className="mb-2">Redirecting to Payment</Heading>
            <Text theme="muted" className="mb-4">
              Please wait while we connect you to the secure payment page...
            </Text>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="w-4 h-4" />
              <span>Powered by Chargily</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <DialogTitle className="text-xl font-semibold">
            Join {community.name}
          </DialogTitle>
          <Text theme="muted" size="sm" className="mt-1">
            {isPaidCommunity ? "Complete payment to join" : "Join this community"}
          </Text>
        </div>

        <div className="space-y-4">
          {/* Payment Status Message (for returning users) */}
          {renderPaymentStatusMessage()}

          {/* Order Summary (Paid Communities) */}
          {isPaidCommunity && (
            <div className="p-4 bg-bg-elevated rounded-lg space-y-3">
              <div className="flex justify-between">
                <Text fontWeight="medium">Community Access</Text>
                <Text>{community.name}</Text>
              </div>
              <div className="flex justify-between">
                <Text fontWeight="medium">Billing Cycle</Text>
                <Text capitalize>
                  {community.pricingType === "monthly" && "Monthly"}
                  {community.pricingType === "annual" && "Annual"}
                  {community.pricingType === "one_time" && "One-time"}
                </Text>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <Text fontWeight="semibold">Total</Text>
                <Text fontWeight="semibold" size="lg">{community.priceDzd} DZD</Text>
              </div>
            </div>
          )}

          {/* Payment Info (Paid Communities) */}
          {isPaidCommunity && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <Text size="sm" theme="primary">Pay with your Algerian CIB or Edahabia card</Text>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <Text size="sm" theme="error">{error}</Text>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={isPaidCommunity ? handlePaidJoin : handleFreeJoin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPaidCommunity ? (
                <>Pay {community.priceDzd} DZD</>
              ) : (
                "Join Free"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
