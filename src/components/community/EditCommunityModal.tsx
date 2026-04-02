"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";

interface Community {
  _id: string;
  name: string;
  slug: string;
  pricingType: string;
  priceDzd?: number;
  // Encrypted keys - we can't display them, so we'll show placeholder
  hasChargilyKeys?: boolean;
}

interface EditCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  community: Community;
}

const PRICING_TYPES = [
  { value: "free", label: "Free" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
  { value: "one_time", label: "One-time" },
];

type TabType = "basic" | "pricing";

export function EditCommunityModal({ open, onOpenChange, community }: EditCommunityModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [loading, setLoading] = useState(false);
  const [validatingKeys, setValidatingKeys] = useState(false);
  const [error, setError] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  
  // Basic tab fields
  const [name, setName] = useState(community.name);
  const [slug, setSlug] = useState(community.slug);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  
  // Pricing tab fields
  const [pricingType, setPricingType] = useState(community.pricingType);
  const [price, setPrice] = useState(community.priceDzd?.toString() || "");
  const [chargilyApiKey, setChargilyApiKey] = useState("");
  const [chargilyWebhookSecret, setChargilyWebhookSecret] = useState("");
  const [chargilyError, setChargilyError] = useState("");
  
  // Store original values for dirty check
  const originalValues = useRef({
    name: community.name,
    slug: community.slug,
    pricingType: community.pricingType,
    priceDzd: community.priceDzd,
  });

  // Reset form when modal opens with new community data
  useEffect(() => {
    if (open && community) {
      setName(community.name);
      setSlug(community.slug);
      setSlugAvailable(null);
      setPricingType(community.pricingType);
      setPrice(community.priceDzd?.toString() || "");
      setChargilyApiKey("");
      setChargilyWebhookSecret("");
      setChargilyError("");
      setError("");
      setIsDirty(false);
      setActiveTab("basic");
      originalValues.current = {
        name: community.name,
        slug: community.slug,
        pricingType: community.pricingType,
        priceDzd: community.priceDzd,
      };
    }
  }, [open, community]);

  // Check if form is dirty
  useEffect(() => {
    const dirty = 
      name !== originalValues.current.name ||
      slug !== originalValues.current.slug ||
      pricingType !== originalValues.current.pricingType ||
      price !== (originalValues.current.priceDzd?.toString() || "") ||
      chargilyApiKey !== "" ||
      chargilyWebhookSecret !== "";
    setIsDirty(dirty);
  }, [name, slug, pricingType, price, chargilyApiKey, chargilyWebhookSecret]);

  // Convex mutations
  const updateCommunity = useMutation(api.functions.communities.updateCommunity);
  const validateChargilyKeys = useMutation(api.functions.payments.validateChargilyKeys);
  
  // Slug availability check
  const slugExists = useQuery(
    api.functions.communities.slugExists,
    slug.length >= 3 && slug !== community.slug ? { slug } : { slug: "" }
  );

  // Update slug availability based on server response
  useEffect(() => {
    if (slug.length >= 3 && slug !== community.slug) {
      setSlugChecking(true);
      if (slugExists === true) {
        setSlugAvailable(false);
      } else if (slugExists === false) {
        setSlugAvailable(true);
      }
      setSlugChecking(false);
    } else if (slug === community.slug) {
      setSlugAvailable(true);
    } else {
      setSlugAvailable(null);
    }
  }, [slugExists, slug.length, community.slug, slug]);

  // Generate slug from name
  const generateSlug = useCallback((communityName: string) => {
    return communityName
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, []);

  // Handle name change
  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug if it matches the old name pattern
    const generatedSlug = generateSlug(value);
    if (!slug || slug === generateSlug(originalValues.current.name)) {
      setSlug(generatedSlug);
    }
  };

  // Handle slug change
  const handleSlugChange = (value: string) => {
    const newSlug = generateSlug(value);
    setSlug(newSlug);
  };

  // Handle Chargily keys validation on blur
  const handleChargilyBlur = useCallback(async () => {
    if (pricingType === "free" || !chargilyApiKey || !chargilyWebhookSecret) {
      setChargilyError("");
      return;
    }

    setValidatingKeys(true);
    setChargilyError("");
    
    try {
      const validation = await validateChargilyKeys({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        communityId: community._id as any,
        apiKey: chargilyApiKey,
        webhookSecret: chargilyWebhookSecret,
      });
      
      if (!validation.valid) {
        setChargilyError(validation.error || "Invalid Chargily keys");
      }
    } catch {
      setChargilyError("Failed to validate keys");
    } finally {
      setValidatingKeys(false);
    }
  }, [pricingType, chargilyApiKey, chargilyWebhookSecret, validateChargilyKeys]);

  // Validate form
  const isFormValid = useCallback(() => {
    if (!name.trim() || !slug.trim()) return false;
    if (slugAvailable === false) return false;
    if (pricingType !== "free" && (!price || parseFloat(price) <= 0)) return false;
    if (pricingType !== "free" && chargilyError) return false;
    if (pricingType !== "free" && (!chargilyApiKey.trim() || !chargilyWebhookSecret.trim())) return false;
    return true;
  }, [name, slug, slugAvailable, pricingType, price, chargilyError, chargilyApiKey, chargilyWebhookSecret]);

  // Handle close
  const handleClose = () => {
    if (isDirty && !loading) {
      toast.warning("You have unsaved changes");
    }
    onOpenChange(false);
  };

  // Handle save
  const handleSave = async () => {
    // Final slug re-check if changed
    if (slug !== community.slug && slugAvailable === null) {
      const check = await slugExists;
      if (check) {
        setSlugAvailable(false);
        toast.error("This URL is not available");
        return;
      }
    }

    if (!isFormValid()) {
      toast.error("Please fix the errors before saving");
      return;
    }

    setLoading(true);
    setError("");

    try {
       
      await updateCommunity({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        communityId: community._id as any,
        name: name.trim(),
        slug: slug.trim() !== community.slug ? slug.trim() : undefined,
        pricingType: pricingType as "free" | "monthly" | "annual" | "one_time",
        priceDzd: pricingType !== "free" && price ? parseInt(price) : undefined,
        chargilyApiKey: pricingType !== "free" && chargilyApiKey ? chargilyApiKey : undefined,
        chargilyWebhookSecret: pricingType !== "free" && chargilyWebhookSecret ? chargilyWebhookSecret : undefined,
      });

      toast.success("Community updated successfully!");
      
      // Refresh the page to show updated data
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update community";
      setError(errorMessage);
      
      // Clear sensitive fields on error
      setChargilyApiKey("");
      setChargilyWebhookSecret("");
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            
            <Text size="6" >This is what people
            <br />
            will see.</Text>
          </DialogTitle>
      
          
        </DialogHeader>

        <hr className="h-px w-full border-0 rounded-full "
                      style={{
                        background: "rgba(242, 242, 242, 0.20)",
                        boxShadow: "0 1px 0 0 rgba(0, 0, 0, 0.50)",
                      }}/>

        {/* Tabs */}
        <ToggleGroup
          value={activeTab}
          onValueChange={(value) => value && !loading && setActiveTab(value as TabType)}
        >
          <ToggleGroupItem value="basic" disabled={loading}>
            <Text size="2" theme="muted">Website</Text>
          </ToggleGroupItem>
          <ToggleGroupItem value="pricing" disabled={loading}>
            <Text size="2" theme="muted">Pricing</Text>
          </ToggleGroupItem>
        </ToggleGroup>

        <DialogBody className="space-y-4 py-3">
          
          {/* Basic Tab */}
          {activeTab === "basic" && (
            <div className="space-y-4"> 
              <div className="flex flex-col gap-[11px] p-[12px] rounded-[22px] bg-white/2 shadow-card-shadow overflow-visible">
                {/* Name row */}
                <div className="flex flex-row gap-4 items-center w-full pl-1">
                  <img src="/windw.svg" alt="Website" width={33} height={9} />
                  <div className="flex flex-row gap-1 items-center w-full">
                  
                  <Input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="type name..."
                    className="w-full bg-black/60 text-text-primary placeholder-text-muted transition-colors duration-300 ease-in-out focus:outline-none"
                    disabled={loading}
                  />
                  </div>
                </div>

                {/* URL row */}
                <div className="relative">
                  <Input
                    value={`cader.com/${slug}`}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const prefix = "cader.com/";
                      if (raw.startsWith(prefix)) {
                        handleSlugChange(raw.slice(prefix.length));
                      }
                    }}
                    onKeyDown={(e) => {
                      const input = e.target as HTMLInputElement;
                      const prefix = "cader.com/";
                      if (
                        (e.key === "Backspace" || e.key === "Delete") &&
                        input.selectionStart !== null &&
                        input.selectionStart !== undefined &&
                        input.selectionStart <= prefix.length
                      ) {
                        e.preventDefault();
                      }
                      if (
                        e.key === "ArrowLeft" &&
                        input.selectionStart !== null &&
                        input.selectionStart !== undefined &&
                        input.selectionStart <= prefix.length
                      ) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="cader.com/type-url..."
                    className="bg-black/60"                   
                    disabled={loading}
                  />
                  
                </div>
                {slugChecking && (
                  <Text size="2" theme="muted" className="mt-1">
                    Checking...
                  </Text>
                )}
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

          {/* Pricing Tab */}
          {activeTab === "pricing" && (
            <div className="space-y-4">
              {/* Pricing Type */}
              <div>
                <Select 
                  value={pricingType} 
                  onValueChange={setPricingType}
                  disabled={loading}
                >
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
                    disabled={loading}
                  />
                  <Text size="2" theme="secondary" className="mt-1">
                    {pricingType === "monthly" && "Members pay this amount monthly"}
                    {pricingType === "annual" && "Members pay this amount annually"}
                    {pricingType === "one_time" && "Members pay this one-time fee"}
                  </Text>
                </div>
              )}

              {/* Chargily Keys (if not free) */}
              {pricingType !== "free" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Chargily API Key
                    </label>
                    <Input
                      type="password"
                      value={chargilyApiKey}
                      onChange={(e) => setChargilyApiKey(e.target.value)}
                      onBlur={handleChargilyBlur}
                      placeholder={community.hasChargilyKeys ? "•••••••• (leave empty to keep)" : "type api key..."}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Chargily Webhook Secret
                    </label>
                    <Input
                      type="password"
                      value={chargilyWebhookSecret}
                      onChange={(e) => setChargilyWebhookSecret(e.target.value)}
                      onBlur={handleChargilyBlur}
                      placeholder={community.hasChargilyKeys ? "•••••••• (leave empty to keep)" : "type webhook secret..."}
                      disabled={loading}
                    />
                  </div>
                  {chargilyError && (
                    <Text size="2" theme="error">
                      {chargilyError}
                    </Text>
                  )}
                  {validatingKeys && (
                    <Text size="2" theme="muted">
                      Validating keys...
                    </Text>
                  )}
                </>
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
          <Button 
            variant="ghost" 
            size="md" 
            onClick={handleClose} 
            className="w-full"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isFormValid() || loading || validatingKeys}
            className="w-full"
            size="md"
          >
            {loading ? "Saving..." : validatingKeys ? "Validating..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
