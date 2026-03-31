"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/shared/Avatar";
import { X, Loader2 } from "lucide-react";

interface ProfilePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfilePanel({ open, onOpenChange }: ProfilePanelProps) {
  const { userId: clerkId } = useAuth();
  const { user: clerkUser } = useUser();

  // Fetch current user
  const currentUser = useQuery(
    api.functions.users.getUserByClerkId,
    clerkId ? { clerkId } : "skip"
  );

  // Mutations
  const updateProfile = useMutation(api.functions.users.updateUserProfile);

  // Local state for forms
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Set initial values when user loads
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || "");
    }
  }, [currentUser]);

  // Reset form when panel opens/closes
  useEffect(() => {
    if (!open) {
      setIsSaving(false);
    }
  }, [open]);

  const handleSaveProfile = async () => {
    if (!currentUser?._id) return;
    setIsSaving(true);
    try {
      await updateProfile({
        userId: currentUser._id,
        displayName,
      });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    }
    setIsSaving(false);
  };

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => onOpenChange(false)}
      />

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-bg-base border-l border-white/[0.06] z-50 transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          boxShadow: open ? "-8px 0 32px rgba(0, 0, 0, 0.4)" : "none",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <Heading size="h4">Profile</Heading>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors"
            aria-label="Close profile panel"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-57px)] px-5 py-6">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center mb-8">
            <Avatar
              src={clerkUser?.imageUrl}
              name={displayName || "User"}
              size="xl"
              className="h-20 w-20 mb-3"
            />
            <Heading size="h4" className="mb-1">
              {displayName || "Your Profile"}
            </Heading>
            <Text size="sm" theme="muted">
              Avatar is managed by Clerk
            </Text>
          </div>

          {/* Edit Display Name */}
          <div className="space-y-4">
            <div>
              <Text size="sm" theme="secondary" className="mb-2">
                Display Name
              </Text>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
