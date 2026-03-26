"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Loader2, CheckCircle, AlertCircle, CreditCard } from "lucide-react";

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

// Algerian wilayas for the dropdown
const WILAYAS = [
  "Adrar", "Aïn Défla", "Aïn Témouchent", "Alger", "Annaba", "Bachar", "Béjaïa", "Biskra",
  "Blida", "Bordj Bou Arréridj", "Bouira", "Boumerdès", "Chlef", "Constantine", "Djelfa",
  "El Bayadh", "El Oued", "El Tarf", "Ghardaïa", "Guelma", "Illizi", "Jijel", "Khenchela",
  "Laghouat", "L盘", "Médéa", "Mila", "Mostaganem", "M'Sila", "Naâma", "Oran", "Ouargla",
  "Oum El Bouaghi", "Relizane", "Saïda", "Sétif", "Sidi Bel Abbès", "Skikda", "Souk Ahras",
  "Tamanghasset", "Tébessa", "Tiaret", "Tindouf", "Tipaza", "Tissemsilt", "Tizi Ouzou",
  "Tlemcen", "Hodh El Gharbi", "Hodh El Charqui", "Trarki", "Dakhla Oued Ed Dahab", "Laâyoune",
  "Smara", "Akjoujt", "Atar", "Boutilimit", "Fderîck", "Kiffa", "Nouakchott", "Nouadhibou",
  "Rosso", "Sélibabi", "Zouerate", "Gorgol", "Guidimaka", "Brakna", "Trarza"
];

export function OnboardingModal({ community, open, onOpenChange, onComplete }: OnboardingModalProps) {
  const { userId, user } = useAuth();
  const [step, setStep] = useState<1 | 2 | "pending">(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Form state
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");
  
  // Checkout state
  const [checkoutUrl, setCheckoutUrl] = useState("");
  
  // Check if user already has membership (for pending state)
  const membershipQuery = useQuery(
    api.functions.getMembershipBySlug,
    userId ? { slug: community.slug, clerkId: userId } : null
  );

  // Check member limit for this community
  const memberLimitCheck = useQuery(
    api.functions.checkMemberLimit,
    community._id ? { communityId: community._id } : null
  );

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
        communityId: community._id,
        displayName: displayName.trim(),
        phone: phone.trim() || undefined,
        wilaya: wilaya || undefined,
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
    if (!userId || !displayName.trim()) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      // Create Chargily checkout
      const result = await createCheckout({
        communityId: community._id,
        type: "community",
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

  // Mutations
  const mutateFreeJoin = useMutation(api.functions.grantMembershipWithDetails);
  const createCheckout = useMutation(api.functions.createChargilyCheckout);

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

            {/* Wilaya (optional) */}
            <div className="space-y-2">
              <Text size="sm" fontWeight="medium">Wilaya (Optional)</Text>
              <select
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-base text-text-primary"
                value={wilaya}
                onChange={(e) => setWilaya(e.target.value)}
              >
                <option value="">Select your wilaya</option>
                {WILAYAS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
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
                onClick={() => setStep(1)}
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