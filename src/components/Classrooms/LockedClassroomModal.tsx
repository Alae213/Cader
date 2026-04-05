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
import { Loader2, AlertCircle, Lock, CreditCard, XCircle } from "lucide-react";

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

type PaymentStatus = "idle" | "pending" | "cancelled" | "expired" | "success";

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

  // Current level (default to 1 if not found)
  const currentLevel = userLevelData ?? 1;
  
  // Calculate points needed for next level
  const getPointsForNextLevel = () => {
    if (currentLevel >= LEVEL_THRESHOLDS.length) return null;
    const nextLevelThreshold = LEVEL_THRESHOLDS[currentLevel];
    
    // Get user's total points to calculate current progress
    // For simplicity, we'll show the threshold needed
    return nextLevelThreshold;
  };
  
  const pointsNeeded = classroom.minLevel 
    ? Math.max(0, LEVEL_THRESHOLDS[classroom.minLevel - 1] - (LEVEL_THRESHOLDS[currentLevel - 1] || 0))
    : null;

  // ============================================================================
  // PAYMENT STATUS CHECK
  // Check URL params for payment status when modal opens
  // ============================================================================
  useEffect(() => {
    if (open) {
      const status = searchParams.get("status");
      const classroomPaid = searchParams.get("classroomPaid");
      
      if (status === "cancelled") {
        setPaymentStatus("cancelled");
      } else if (status === "expired") {
        setPaymentStatus("expired");
      } else if (classroomPaid === "true") {
        setPaymentStatus("success");
        toast.success("Classroom unlocked!");
        onOpenChange(false);
        return;
      }
      
      // Clear URL params after reading
      if (status || classroomPaid) {
        const url = new URL(window.location.href);
        url.searchParams.delete("status");
        url.searchParams.delete("classroomPaid");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [open, searchParams, onOpenChange]);

  // ============================================================================
  // PURCHASE CLASSROOM CHECKOUT
  // ============================================================================
  const handlePurchase = async () => {
    if (!userId || !convexUser?._id) return;
    
    setIsLoading(true);
    setError("");
    setPaymentStatus("idle");
    
    try {
      const result = await createCheckout({
        communityId: community._id as Id<"communities">,
        userId: convexUser._id as Id<"users">,
        type: "classroom",
        classroomId: classroom._id as Id<"classrooms">,
        successUrl: `${window.location.origin}/${community.slug}?classroomPaid=true`,
        cancelUrl: `${window.location.origin}/${community.slug}?status=cancelled`,
      });
      
      if (result.checkoutUrl) {
        setIsRedirecting(true);
        setTimeout(() => {
          window.location.href = result.checkoutUrl;
        }, 1500);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("not configured")) {
        setError("This community is not configured for payments. Please contact the community owner.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to create checkout");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mutation
  const createCheckout = useMutation(api.functions.payments.createChargilyCheckout);

  // ============================================================================
  // RENDER CONTENT BASED ON ACCESS TYPE
  // ============================================================================
  const renderContent = () => {
    // Handle payment status messages
    if (paymentStatus === "cancelled") {
      return (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <Text size="sm" className="text-yellow-200">
              Payment was cancelled. You can try again when you're ready.
            </Text>
          </div>
        </div>
      );
    }
    
    if (paymentStatus === "expired") {
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <Text size="sm" className="text-red-200">
              Checkout expired. Please try again to complete your payment.
            </Text>
          </div>
        </div>
      );
    }

    // Level gating UI
    if (classroom.accessType === "level" || classroom.accessType === "level_and_price") {
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
    
    // Price gating UI (only price, not level_and_price)
    if (classroom.accessType === "price") {
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
              </>
            )}
          </Button>
          
          <Text size="1" theme="muted" className="text-center">
            Secure payment via Chargily
          </Text>
        </div>
      );
    }

    // Level + Price gating UI (level_and_price only - price was handled above)
    // Since we already handled "price" above, check for "open" to exclude, rest is level_and_price
    if (classroom.accessType !== "level" && classroom.accessType !== "price") {
      return (
        <div className="space-y-4">
          {/* Level requirement */}
          <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-xl border border-accent/20">
            <Lock className="w-4 h-4 text-accent" />
            <Text size="sm">Level {classroom.minLevel} required</Text>
          </div>
          
          {/* Price requirement */}
          <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-xl border border-accent/20">
            <CreditCard className="w-4 h-4 text-accent" />
            <Text size="sm">{classroom.priceDzd} DZD</Text>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <Text size="sm" className="text-red-400">{error}</Text>
            </div>
          )}
          
          {/* Purchase button */}
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
                Unlock Now
              </>
            )}
          </Button>
        </div>
      );
    }
    
    return null;
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
