"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Loader2, AlertCircle, Lock, CreditCard, XCircle, ExternalLink } from "lucide-react";

// Level thresholds from leaderboard
const LEVEL_THRESHOLDS = [0, 20, 60, 140, 280];

interface Classroom {
  _id: string;
  title: string;
  accessType: "open" | "level" | "price" | "level_and_price";
  minLevel?: number;
  priceDzd?: number;
  hasAccess: boolean;
}

interface Community {
  _id: string;
  name: string;
  slug: string;
}

interface LockedClassroomModalProps {
  classroom: Classroom;
  community: Community;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentStatus = "idle" | "pending" | "verifying" | "verified" | "cancelled" | "failed" | "expired";

// States where purchase button should be shown
const showPurchaseButton = (status: PaymentStatus): boolean => {
  return status === "idle" || status === "cancelled" || status === "expired" || status === "failed";
};

export function LockedClassroomModal({ classroom, community, open, onOpenChange }: LockedClassroomModalProps) {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  
  // Get user's level in this community
  const userLevelData = useQuery(
    api.functions.leaderboard.getUserLevel,
    userId && community._id 
      ? { communityId: community._id as Id<"communities">, userId: userId as Id<"users"> }
      : "skip"
  );
  
  // Get Convex user ID from Clerk ID
  const convexUser = useQuery(
    api.functions.users.getUserByClerkId,
    userId ? { clerkId: userId } : "skip"
  );

  // Get expected price for verification
  const expectedPrice = useQuery(
    api.functions.payments.getExpectedPrice,
    community._id && classroom._id 
      ? { communityId: community._id as Id<"communities">, type: "classroom", classroomId: classroom._id as Id<"classrooms"> }
      : "skip"
  );

  // Current level (default to 1 if not found)
  const currentLevel = userLevelData ?? 1;

  // ============================================================================
  // PAYMENT STATUS CHECK (SofizPay return URL pattern)
  // ============================================================================
  useEffect(() => {
    if (open) {
      const status = searchParams.get("status");
      const classroomPaid = searchParams.get("classroomPaid");
      
      if (status === "cancelled") {
        setPaymentStatus("cancelled");
      } else if (status === "expired") {
        setPaymentStatus("expired");
      } else if (status === "success" && classroomPaid === "true" && convexUser?._id && classroom._id) {
        // User returned from SofizPay - verify payment
        handleVerifyPayment();
      }
      
      // Clear URL params after reading
      if (status || classroomPaid) {
        const url = new URL(window.location.href);
        url.searchParams.delete("status");
        url.searchParams.delete("classroomPaid");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [open, searchParams, convexUser, classroom._id]);

  // ============================================================================
  // VERIFY PAYMENT (SofizPay polling-based verification)
  // ============================================================================
  const handleVerifyPayment = async () => {
    if (!userId || !convexUser?._id || !community._id || !classroom._id || !expectedPrice?.expectedAmount) {
      return;
    }

    setPaymentStatus("verifying");
    setIsLoading(true);
    setError("");

    try {
      // Build memo to search for
      const memo = `Community:${community.slug} - User:${convexUser.email || userId} - Type:classroom`;

      // Verify with Convex
      const verifyResult = await verifyPaymentStatus({
        communityId: community._id as Id<"communities">,
        userId: convexUser._id as Id<"users">,
        memo,
        expectedAmount: expectedPrice.expectedAmount,
        type: "classroom",
        classroomId: classroom._id as Id<"classrooms">,
      });

      if (verifyResult.verified) {
        setPaymentStatus("verified");
        toast.success("Classroom unlocked!");
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      } else {
        setPaymentStatus("failed");
        setError(verifyResult.error || "Payment verification failed");
      }
    } catch (err) {
      setPaymentStatus("failed");
      setError(err instanceof Error ? err.message : "Failed to verify payment");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // PURCHASE CLASSROOM CHECKOUT (SofizPay)
  // ============================================================================
  const handlePurchase = async () => {
    if (!userId || !convexUser?._id) return;
    
    setIsLoading(true);
    setError("");
    setPaymentStatus("idle");
    
    try {
      // Step 1: Get payment data from Convex
      const paymentDataResult = await createSofizpayCheckout({
        communityId: community._id as Id<"communities">,
        userId: convexUser._id as Id<"users">,
        type: "classroom",
        classroomId: classroom._id as Id<"classrooms">,
        successUrl: `${window.location.origin}/${community.slug}?status=success&classroomPaid=true`,
        cancelUrl: `${window.location.origin}/${community.slug}?status=cancelled`,
      });
      
      // Step 2: Call Next.js API to create payment and get URL
      const apiResponse = await fetch("/api/sofizpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentDataResult.paymentData),
      });
      
      const apiResult = await apiResponse.json();
      
      if (apiResult.success && apiResult.paymentUrl) {
        setIsRedirecting(true);
        setPaymentStatus("pending");
        setTimeout(() => {
          window.location.href = apiResult.paymentUrl;
        }, 1500);
      } else {
        setError(apiResult.error || "Failed to create payment");
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("not configured")) {
        setError("This community is not configured for payments. Please contact the community owner.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to create payment");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mutations
  const createSofizpayCheckout = useMutation(api.functions.payments.createSofizpayCheckout);
  const verifyPaymentStatus = useMutation(api.functions.payments.verifyPaymentStatus);

  // ============================================================================
  // RENDER CONTENT BASED ON ACCESS TYPE
  // ============================================================================
  const renderContent = () => {
    // Handle payment status messages
    switch (paymentStatus) {
      case "verifying":
        return (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
              <Text size="sm" className="text-blue-200">
                Verifying your payment...
              </Text>
            </div>
          </div>
        );
      case "verified":
        return (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-green-500 flex-shrink-0" />
              <Text size="sm" className="text-green-200">
                Payment verified! Classroom unlocked.
              </Text>
            </div>
          </div>
        );
      case "cancelled":
        return (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <Text size="sm" className="text-yellow-200">
                Payment was cancelled. You can try again when you are ready.
              </Text>
            </div>
          </div>
        );
      case "failed":
        return (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <Text size="sm" className="text-red-200">
                Payment verification failed. Please try again.
              </Text>
            </div>
          </div>
        );
      case "expired":
        return (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <Text size="sm" className="text-yellow-200">
                Payment expired. You can try again when you are ready.
              </Text>
            </div>
          </div>
        );
      case "pending":
        return (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <Text size="sm" className="text-blue-200">
                Redirecting to payment...
              </Text>
            </div>
          </div>
        );
    }

    // Render content based on access type
    switch (classroom.accessType) {
      case "level": {
        const requiredLevel = classroom.minLevel || 1;
        const isLevelMet = currentLevel >= requiredLevel;
        
        return (
          <div className="space-y-4">
            {/* Level info */}
            <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-xl border border-accent/20">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <Text size="sm" theme="secondary">Level Required</Text>
                <Heading size="sm">Level {requiredLevel}</Heading>
              </div>
            </div>
            
            {/* Current level status */}
            {isLevelMet ? (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <Text size="sm" className="text-green-400">
                  You have access! Click anywhere on the card to enter.
                </Text>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Text size="sm" theme="secondary">Your current level</Text>
                  <Text size="sm" fontWeight="semibold">Level {currentLevel}</Text>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(currentLevel / 5) * 100}%` }}
                  />
                </div>
                <Text size="1" theme="muted">
                  Earn more points to unlock this classroom
                </Text>
              </div>
            )}
          </div>
        );
      }
      
      case "price": {
        return (
          <div className="space-y-4">
            {/* Price info */}
            <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-xl border border-accent/20">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-accent" />
              </div>
              <div>
                <Text size="sm" theme="secondary">One-time Purchase</Text>
                <Heading size="sm">{classroom.priceDzd} DZD</Heading>
              </div>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <Text size="sm" className="text-red-400">{error}</Text>
              </div>
            )}
            
            {/* Purchase button */}
            {showPurchaseButton(paymentStatus) && (
              <Button 
                onClick={handlePurchase}
                disabled={isLoading || isRedirecting}
                className="w-full"
              >
                {isLoading || isRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isRedirecting ? "Redirecting..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Buy Now
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
            
            <Text size="1" theme="muted" className="text-center">
              Secure payment via SofizPay
            </Text>
          </div>
        );
      }
      
      case "level_and_price": {
        const requiredLevel = classroom.minLevel || 1;
        const isLevelMet = currentLevel >= requiredLevel;
        
        return (
          <div className="space-y-4">
            {/* Level requirement */}
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-xl border border-accent/20">
              <Lock className="w-4 h-4 text-accent" />
              <Text size="sm">Level {requiredLevel} required</Text>
            </div>
            
            {/* Price requirement */}
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-xl border border-accent/20">
              <CreditCard className="w-4 h-4 text-accent" />
              <Text size="sm">{classroom.priceDzd} DZD</Text>
            </div>
            
            {/* Current level status */}
            {isLevelMet ? (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <Text size="sm" className="text-green-400">
                  Level requirement met! Purchase to unlock.
                </Text>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Text size="sm" theme="secondary">Your current level</Text>
                  <Text size="sm" fontWeight="semibold">Level {currentLevel}</Text>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(currentLevel / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <Text size="sm" className="text-red-400">{error}</Text>
              </div>
            )}
            
            {/* Purchase button */}
            {showPurchaseButton(paymentStatus) && (
              <Button 
                onClick={handlePurchase}
                disabled={isLoading || isRedirecting || !isLevelMet}
                className="w-full"
              >
                {isLoading || isRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isRedirecting ? "Redirecting..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Buy Now
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
            
            <Text size="1" theme="muted" className="text-center">
              Secure payment via SofizPay
            </Text>
          </div>
        );
      }
      
      default: {
        return (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <Text size="sm" className="text-yellow-200">
              This classroom should be accessible. Please contact support.
            </Text>
          </div>
        );
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Locked Classroom
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Classroom name */}
          <div className="text-center pb-2">
            <Text size="lg" fontWeight="semibold">{classroom.title}</Text>
          </div>
          
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
