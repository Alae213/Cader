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

interface Community {
  _id: string;
  name: string;
  slug: string;
  wilaya?: string;
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
  { value: "free", label: "Free - No payment required" },
  { value: "monthly", label: "Monthly subscription" },
  { value: "annual", label: "Annual subscription" },
  { value: "one_time", label: "One-time payment" },
];

const WILAYAS = [
  { value: "adrar", label: "Adrar" },
  { value: "chlef", label: "Chlef" },
  { value: "laghouat", label: "Laghouat" },
  { value: "oum_el_bouaghi", label: "Oum El Bouaghi" },
  { value: "batna", label: "Batna" },
  { value: "bejaia", label: "Béjaïa" },
  { value: "biskra", label: "Biskra" },
  { value: "bechar", label: "Béchar" },
  { value: "blida", label: "Blida" },
  { value: "bouira", label: "Bouira" },
  { value: "tamanrasset", label: "Tamanrasset" },
  { value: "tebessa", label: "Tébessa" },
  { value: "tlemcen", label: "Tlemcen" },
  { value: "tiaret", label: "Tiaret" },
  { value: "tizi_ouzou", label: "Tizi Ouzou" },
  { value: "alger", label: "Alger" },
  { value: "djelfa", label: "Djelfa" },
  { value: "jijel", label: "Jijel" },
  { value: "setif", label: "Sétif" },
  { value: "saida", label: "Saïda" },
  { value: "skikda", label: "Skikda" },
  { value: "sidi_bel_abbes", label: "Sidi Bel Abbès" },
  { value: "annaba", label: "Annaba" },
  { value: "guelma", label: "Guelma" },
  { value: "constantine", label: "Constantine" },
  { value: "medea", label: "Médéa" },
  { value: "mostaganem", label: "Mostaganem" },
  { value: "msila", label: "M'Sila" },
  { value: "mascara", label: "Mascara" },
  { value: "ouargla", label: "Ouargla" },
  { value: "oran", label: "Oran" },
  { value: "el_bayadh", label: "El Bayadh" },
  { value: "illizi", label: "Illizi" },
  { value: "bordj_bouarreridj", label: "Bordj Bou Arréridj" },
  { value: "boumerdes", label: "Boumerdès" },
  { value: "el_tarf", label: "El Tarf" },
  { value: "tissemsilt", label: "Tissemsilt" },
  { value: "el_oued", label: "El Oued" },
  { value: "khenchela", label: "Khenchela" },
  { value: "souk_ahras", label: "Souk Ahras" },
  { value: "tipaza", label: "Tipaza" },
  { value: "mila", label: "Mila" },
  { value: "ain_defla", label: "Aïn Defla" },
  { value: "naama", label: "Naâma" },
  { value: "ain_temouchent", label: "Aïn Témouchent" },
  { value: "ghardaia", label: "Ghardaïa" },
  { value: "relizane", label: "Relizane" },
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
  const [wilaya, setWilaya] = useState(community.wilaya || "");
  const [chargilyError, setChargilyError] = useState("");
  
  // Store original values for dirty check
  const originalValues = useRef({
    name: community.name,
    slug: community.slug,
    pricingType: community.pricingType,
    priceDzd: community.priceDzd,
    wilaya: community.wilaya,
  });

  // Reset form when modal opens with new community data
  useEffect(() => {
    if (open && community) {
      setName(community.name);
      setSlug(community.slug);
      setSlugAvailable(null);
      setPricingType(community.pricingType);
      setPrice(community.priceDzd?.toString() || "");
      setWilaya(community.wilaya || "");
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
        wilaya: community.wilaya,
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
      wilaya !== (originalValues.current.wilaya || "") ||
      chargilyApiKey !== "" ||
      chargilyWebhookSecret !== "";
    setIsDirty(dirty);
  }, [name, slug, pricingType, price, wilaya, chargilyApiKey, chargilyWebhookSecret]);

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
  }, [slugExists, slug.length, community.slug]);

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
        apiKey: chargilyApiKey,
        webhookSecret: chargilyWebhookSecret,
      });
      
      if (!validation.valid) {
        setChargilyError(validation.error || "Invalid Chargily keys");
      }
    } catch (err) {
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
        communityId: community._id as any,
        name: name.trim(),
        slug: slug.trim() !== community.slug ? slug.trim() : undefined,
        wilaya: wilaya || undefined,
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
          <DialogTitle>Edit Community</DialogTitle>
          <DialogDescription>
            Update your community details
          </DialogDescription>
        </DialogHeader>

        <hr
          className="h-px w-full border-0"
          style={{
            background: "rgba(242, 242, 242, 0.25)",
            boxShadow: "0 1px 0 0 rgba(0, 0, 0, 0.50)",
          }}
        />

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => !loading && setActiveTab("basic")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === "basic"
                ? "text-accent border-b-2 border-accent"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Basic
          </button>
          <button
            onClick={() => !loading && setActiveTab("pricing")}
            disabled={loading}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === "pricing"
                ? "text-accent border-b-2 border-accent"
                : "text-text-muted hover:text-text-primary"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Pricing
          </button>
        </div>

        <DialogBody className="space-y-4">
          {/* Basic Tab */}
          {activeTab === "basic" && (
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
                  disabled={loading}
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
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Pricing Type
                </label>
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

              {/* Wilaya */}
              <div>
                <Select value={wilaya || "none"} onValueChange={(val) => setWilaya(val === "none" ? "" : val)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your wilaya" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select your wilaya</SelectItem>
                    {WILAYAS.map((wilaya) => (
                      <SelectItem key={wilaya.value} value={wilaya.value}>{wilaya.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
