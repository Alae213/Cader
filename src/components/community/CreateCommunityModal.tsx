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
  DialogClose,
} from "@/components/ui/Dialog";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

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
  { value: "timimoun", label: "Timimoun" },
  { value: "bordj_baji_mokhtar", label: "Bordj Badji Mokhtar" },
  { value: "ouled_djellal", label: "Ouled Djellal" },
  { value: "beni_abbes", label: "Béni Abbès" },
  { value: "in_salah", label: "In Salah" },
  { value: "in_guzzem", label: "In Guzzem" },
  { value: "tilтемсі", label: "Til TEMCI" },
  { value: "el_meghaier", label: "El Meghaïer" },
  { value: "el_menia", label: "El Ménia" },
];

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
  const [chargilyApiKey, setChargilyApiKey] = useState("");
  const [chargilyWebhookSecret, setChargilyWebhookSecret] = useState("");
  const [wilaya, setWilaya] = useState("");

  // Convex mutations and actions
  const createCommunity = useMutation(api.functions.communities.createCommunity);
  const validateChargilyKeys = useMutation(api.functions.payments.validateChargilyKeys);
  
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
    // Server will validate, but we can do a quick client-side check for UX
    // The actual availability is determined by the server query
  };

  // Validate step 1
  const isStep1Valid = name.trim().length > 0 && slug.trim().length > 0 && slugAvailable;

  // Validate step 2
  const isStep2Valid = () => {
    if (pricingType === "free") return true;
    if (!price || parseFloat(price) <= 0) return false;
    if (pricingType !== "free" && (!chargilyApiKey.trim() || !chargilyWebhookSecret.trim())) {
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
      // Validate Chargily keys if provided (for paid communities)
      if (pricingType !== "free" && chargilyApiKey && chargilyWebhookSecret) {
        setValidatingKeys(true);
        const validation = await validateChargilyKeys({
          apiKey: chargilyApiKey,
          webhookSecret: chargilyWebhookSecret,
        });
        
        if (!validation.valid) {
          setError(validation.error || "Invalid Chargily keys. Please check and try again.");
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
        wilaya: wilaya || undefined,
        chargilyApiKey: pricingType !== "free" ? chargilyApiKey || undefined : undefined,
        chargilyWebhookSecret: pricingType !== "free" ? chargilyWebhookSecret || undefined : undefined,
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
    setChargilyApiKey("");
    setChargilyWebhookSecret("");
    setWilaya("");
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
                <Select
                  value={pricingType}
                  onChange={(value) => setPricingType(value)}
                  options={PRICING_TYPES}
                />
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
                      placeholder="type api key..."
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
                      placeholder="type webhook secret..."
                    />
                  </div>
                </>
              )}

              {/* Wilaya */}
              <div>
                <Select
                  value={wilaya}
                  onChange={(value) => setWilaya(value)}
                  options={[
                    { value: "", label: "Select your wilaya" },
                    ...WILAYAS
                  ]}
                />
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
                {validatingKeys ? "Validating keys..." : loading ? "Creating..." : pricingType === "free" ? "Create" : "Create"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
