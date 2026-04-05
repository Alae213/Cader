"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";

interface CreateCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRICING_TYPES = [
  { value: "free", label: "Free - No payment required" },
  { value: "monthly", label: "Monthly subscription" },
  { value: "annual", label: "Annual subscription" },
  { value: "one_time", label: "One-time payment" },
];

const MIN_PAID_PRICE = 1000; // SofizPay/CIB minimum

export function CreateCommunityModal({ open, onOpenChange }: CreateCommunityModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validatingKeys, setValidatingKeys] = useState(false);
  const [error, setError] = useState("");
  
  // Step 1: Basic info
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  
  // Step 2: Pricing
  const [pricingType, setPricingType] = useState("free");
  const [price, setPrice] = useState("");
  const [sofizpayPublicKey, setSofizpayPublicKey] = useState("");

  // Convex mutations and actions
  const createCommunity = useMutation(api.functions.communities.createCommunity);
  const validateSofizpayKeys = useMutation(api.functions.payments.validateSofizpayKeys);
  
  // Check slug availability (debounced) - only check when slug is valid length
  const slugExists = useQuery(
    api.functions.communities.slugExists,
    slug.length >= 3 ? { slug } : { slug: "" }
  );
  
  // Update slug availability based on server response
  useEffect(() => {
    if (slug.length >= 3) {
      if (slugExists === true) {
        setSlugAvailable(false);
      } else if (slugExists === false) {
        setSlugAvailable(true);
      }
    }
  }, [slugExists, slug.length]);

  // Generate slug from name
  const generateSlug = useCallback((communityName: string) => {
    return communityName
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, []);

  // Handle name change and auto-generate slug
  const handleNameChange = (value: string) => {
    setName(value);
    const generatedSlug = generateSlug(value);
    // Only auto-generate slug if user hasn't manually edited it
    if (!slug || slug === generatedSlug) {
      setSlug(generatedSlug);
    }
  };

  // Handle slug change with availability check (server-side validation)
  const handleSlugChange = (value: string) => {
    const newSlug = generateSlug(value);
    setSlug(newSlug);
  };

  // Validate step 1
  const isStep1Valid = name.trim().length > 0 && slug.trim().length > 0 && slugAvailable;

  // Validate step 2
  const isStep2Valid = () => {
    if (pricingType === "free") return true;
    if (!price || parseFloat(price) <= 0) return false;
    if (parseFloat(price) < MIN_PAID_PRICE) return false;
    if (pricingType !== "free" && !sofizpayPublicKey.trim()) {
      return false;
    }
    return true;
  };

  // Handle next step
  const handleNext = () => {
    if (isStep1Valid) {
      setStep(2);
      setError("");
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!isStep2Valid()) return;
    
    setLoading(true);
    setError("");
    
    try {
      // Validate SofizPay public key if provided (for paid communities)
      if (pricingType !== "free" && sofizpayPublicKey) {
        setValidatingKeys(true);
        const validation = await validateSofizpayKeys({
          publicKey: sofizpayPublicKey,
        });
        
        if (!validation.valid) {
          setError(validation.error || "Invalid SofizPay public key. Please check and try again.");
          setLoading(false);
          setValidatingKeys(false);
          return;
        }
        setValidatingKeys(false);
      }
      
      // Create the community
      const result = await createCommunity({
        name,
        slug,
        pricingType: pricingType as "free" | "monthly" | "annual" | "one_time",
        priceDzd: price ? parseInt(price) : undefined,
        sofizpayPublicKey: pricingType !== "free" ? sofizpayPublicKey || undefined : undefined,
      });
      
      toast.success("Community created successfully!");
      
      // Close modal and redirect to community
      onOpenChange(false);
      router.push(`/${result.slug}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create community. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setValidatingKeys(false);
    }
  };

  // Reset form when closing
  const handleClose = () => {
    setStep(1);
    setName("");
    setSlug("");
    setSlugAvailable(null);
    setPricingType("free");
    setPrice("");
    setSofizpayPublicKey("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Create Your Community" : "Configure Pricing"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Give your community a name and unique URL" 
              : "Set up payment settings for your community"
            }
          </DialogDescription>
        </DialogHeader>

        <hr
                      className="h-px w-full border-0"
                      style={{
                        background: "rgba(242, 242, 242, 0.25)",
                        boxShadow: "0 1px 0 0 rgba(0, 0, 0, 0.50)",
                      }}
                    />

        <DialogBody>
          {step === 1 && (
            <div className="space-y-4">
              {/* Community Name */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Community Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="type name..."
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Community URL
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary text-sm">cader.com/</span>
                  <Input
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="type url..."
                    className="flex-1"
                  />
                </div>
                {slugAvailable === false && (
                  <Text size="2" theme="error" className="mt-1">
                    This URL is not available
                  </Text>
                )}
                {slugAvailable === true && slug.length > 0 && (
                  <Text size="2" theme="success" className="mt-1">
                    This URL is available
                  </Text>
                )}
              </div>

              {error && (
                <Text size="2" theme="error">
                  {error}
                </Text>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Pricing Type */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Pricing Type
                </label>
                <Select value={pricingType} onValueChange={setPricingType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price (if not free) */}
              {pricingType !== "free" && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Price (DZD)
                  </label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="type price..."
                  />
                  <Text size="2" theme="secondary" className="mt-1">
                    {pricingType === "monthly" && "Members pay this amount monthly"}
                    {pricingType === "annual" && "Members pay this amount annually"}
                    {pricingType === "one_time" && "Members pay this one-time fee"}
                  </Text>
                  {price && parseFloat(price) < MIN_PAID_PRICE && (
                    <Text size="2" theme="error" className="mt-1">
                      Minimum price is {MIN_PAID_PRICE} DZD (SofizPay requirement)
                    </Text>
                  )}
                </div>
              )}

              {/* SofizPay Public Key (if not free) */}
              {pricingType !== "free" && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    SofizPay Public Key
                  </label>
                  <Input
                    type="text"
                    value={sofizpayPublicKey}
                    onChange={(e) => setSofizpayPublicKey(e.target.value)}
                    placeholder="GA..."
                  />
                  <Text size="2" theme="secondary" className="mt-1">
                    Your Stellar public key (starts with G)
                  </Text>
                </div>
              )}

              {error && (
                <Text size="2" theme="error">
                  {error}
                </Text>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="ghost" size="md" onClick={handleClose} className="w-full">
                Cancel
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!isStep1Valid}
                className="w-full"
                size="md"
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={() => setStep(1)} className="w-full">
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!isStep2Valid() || loading || validatingKeys}
                className="w-full"
                size="md"
                >
                {validatingKeys ? "Validating key..." : loading ? "Creating..." : pricingType === "free" ? "Create" : "Create"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
