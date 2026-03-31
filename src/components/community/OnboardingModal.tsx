"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Loader2, CheckCircle, AlertCircle, CreditCard, XCircle } from "lucide-react";

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

type PaymentStatus = "idle" | "pending" | "success" | "cancelled" | "expired";

export function OnboardingModal({ community, open, onOpenChange, onComplete }: OnboardingModalProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | "pending">(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  
  // Form state
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Checkout state
  const [checkoutUrl, setCheckoutUrl] = useState("");
  
  // Check if user already has membership (for pending state)
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

  // =========================================================================
  // CHECKOUT STATUS CHECK (EC-19, EC-20)
  // Check URL params for payment status when modal opens
  // =========================================================================
  useEffect(() => {
    if (open) {
      const status = searchParams.get("status");
      const joined = searchParams.get("joined");
      
      if (status === "cancelled") {
        // EC-20: Handle cancel redirect
        setPaymentStatus("cancelled");
        setStep(2); // Go back to billing step
      } else if (status === "expired") {
        // EC-19: Handle checkout expiration
        setPaymentStatus("expired");
      } else if (joined === "true") {
        // Payment was successful
        setPaymentStatus("success");
      }
      
      // Clear URL params after reading
      if (status || joined) {
        const url = new URL(window.location.href);
        url.searchParams.delete("status");
        url.searchParams.delete("joined");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [open, searchParams]);

  // Initialize display name from Clerk user
  useEffect(() => {
    if (user?.fullName) {
      setDisplayName(user.fullName);
    }
  }, [user]);

  // Check for existing membership - if found, close modal and complete
  useEffect(() => {
    if (membershipQuery?.isMember && open) {
      onOpenChange(false);
      onComplete?.();
    }
  }, [membershipQuery, open, onOpenChange, onComplete]);

  // Handle free community join
  const handleFreeJoin = async () => {
    if (!userId || !displayName.trim()) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      // Call grantMembership directly for free communities
      await mutateFreeJoin({
        communityId: community._id as any,
        displayName: displayName.trim(),
        phone: phone.trim() || undefined,
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

  // Handle paid community checkout
  const handlePaidJoin = async () => {
    if (!userId || !displayName.trim() || !convexUser?._id) return;
    
    setIsLoading(true);
    setError("");
    setPaymentStatus("idle");
    
    try {
      // Create Chargily checkout
      const result = await createCheckout({
        communityId: community._id as any,
        userId: convexUser._id as any,
        type: "community",
        successUrl: `${window.location.origin}/${community.slug}?joined=true`,
        cancelUrl: `${window.location.origin}/${community.slug}?status=cancelled`,
      });
      
      if (result.checkoutUrl) {
        // Redirect to Chargily
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      // Handle missing Chargily keys gracefully (EC-4)
      if (err instanceof Error && err.message.includes("not configured")) {
        setError("This community is not yet configured for payments. Please contact the community owner.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to create checkout");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reset payment status when going back to step 1
  const handleBack = () => {
    setPaymentStatus("idle");
    setStep(1);
  };

  // Mutations
  const mutateFreeJoin = useMutation(api.functions.memberships.grantMembershipWithDetails);
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

  // Check member limit
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

  const isPaidCommunity = ["monthly", "annual", "one_time"].includes(community.pricingType || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <DialogTitle className="text-xl font-semibold">
            Join {community.name}
          </DialogTitle>
          <Text theme="muted" size="sm" className="mt-1">
            {isPaidCommunity ? "Complete your profile to continue" : "Enter your details to join"}
          </Text>
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Display Name */}
            <div className="space-y-2">
              <Text size="sm" fontWeight="medium">Full Name</Text>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your full name"
                maxLength={80}
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Text size="sm" fontWeight="medium">Phone Number</Text>
              <Input
                value={phone}
                onChange={(e) => {
                  // Only allow numeric input
                  const value = e.target.value.replace(/\D/g, "");
                  setPhone(value);
                }}
                placeholder="06XXXXXXXX"
                maxLength={10}
              />
              <Text size="2" theme="muted">
                For payment verification (Algerian numbers only)
              </Text>
            </div>

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
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={isPaidCommunity ? () => setStep(2) : handleFreeJoin}
                disabled={!displayName.trim() || isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPaidCommunity ? "Continue" : "Join Free"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Billing (Paid Communities) */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Payment Status Message */}
            {renderPaymentStatusMessage()}

            {/* Order Summary */}
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

            {/* Payment Info */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <Text size="sm" theme="primary">Pay with your Algerian CIB or Edahabia card</Text>
            </div>

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
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button 
                className="flex-1"
                onClick={handlePaidJoin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Pay {community.priceDzd} DZD</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Pending State */}
        {step === "pending" && (
          <div className="text-center py-6">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <Heading size="h3" className="mb-2">Confirming Payment</Heading>
            <Text theme="muted" className="mb-4">
              Please wait while we confirm your payment...
            </Text>
            <Text size="sm" theme="muted">
              This may take a few moments
            </Text>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}