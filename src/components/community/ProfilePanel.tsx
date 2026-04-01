"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { UserProfile } from "@clerk/nextjs";
import { toast } from "sonner";
import { Heading, Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/shared/Avatar";
import { X, Loader2, Calendar, Camera, ChevronLeft, ChevronRight } from "lucide-react";

interface ProfilePanelProps {
  /** Clerk user ID of the profile to show. If omitted or equals current user, shows self profile. */
  userId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfilePanel({ userId, open, onOpenChange }: ProfilePanelProps) {
  const { userId: clerkId } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user: clerkUser } = useUser();
  const [showClerkProfile, setShowClerkProfile] = useState(false);

  // Resolve target user ID
  const targetClerkId = userId || clerkId || "";
  const isOwnProfile = targetClerkId === clerkId;

  // Fetch target user from Convex
  const targetUser = useQuery(
    api.functions.users.getUserByClerkId,
    targetClerkId ? { clerkId: targetClerkId } : "skip"
  );

  // Fetch activity
  const activityData = useQuery(
    api.functions.users.getUserActivity,
    targetUser?._id ? { userId: targetUser._id } : "skip"
  );

  // Fetch profile data (communities, level, etc.)
  const profileData = useQuery(
    api.functions.users.getUserProfile,
    targetUser?._id ? { userId: targetUser._id } : "skip"
  );

  // Mutations
  const updateProfile = useMutation(api.functions.users.updateUserProfile);

  // Local state for inline editing
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Activity month navigation
  const [activityMonthOffset, setActivityMonthOffset] = useState(0); // 0 = current month, -1 = last month, etc.

  // Auto-save timer ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize form values when user data loads
  useEffect(() => {
    if (targetUser) {
      setDisplayName(targetUser.displayName || "");
      setHasChanges(false);
    }
  }, [targetUser?._id, targetUser?.displayName]);

  // Reset state when panel closes
  useEffect(() => {
    if (!open) {
      setIsSaving(false);
      setHasChanges(false);
      setActivityMonthOffset(0);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    }
  }, [open]);

  // Debounced auto-save
  const triggerAutoSave = useCallback(() => {
    if (!isOwnProfile || !targetUser?._id) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!hasChanges) return;
      await doSave();
    }, 1500);
  }, [isOwnProfile, targetUser?._id, displayName, hasChanges]);

  const doSave = async () => {
    if (!targetUser?._id) return;
    setIsSaving(true);
    try {
      const trimmed = displayName.trim();
      if (!trimmed) throw new Error("Display name cannot be empty");
      if (trimmed.length > 100) throw new Error("Display name must be 100 characters or less");

      await updateProfile({
        userId: targetUser._id,
        displayName: trimmed,
      });
      setHasChanges(false);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    }
    setIsSaving(false);
  };

  // Handle input changes with auto-save trigger
  const handleInputChange = (field: "displayName", value: string) => {
    if (field === "displayName") setDisplayName(value);
    setHasChanges(true);
    triggerAutoSave();
  };

  // Handle Enter key to save immediately
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && hasChanges && isOwnProfile) {
      e.preventDefault();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      doSave();
    }
  };

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, hasChanges]);

  const handleClose = () => {
    if (hasChanges && isOwnProfile) {
      if (confirm("You have unsaved changes. Close anyway?")) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const panel = document.querySelector("[data-profile-panel]") as HTMLElement;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handler);
    setTimeout(() => first?.focus(), 100);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Activity grid generation — shows 6 months at a time with navigation
  const getActivityGrid = () => {
    const activityMap = new Map<string, number>();
    activityData?.activity?.forEach((a) => activityMap.set(a.date, a.count));

    // Calculate the start date: 6 months ago from the current month, shifted by offset
    const today = new Date();
    const startMonth = new Date(today.getFullYear(), today.getMonth() - 5 + activityMonthOffset, 1);
    // Adjust to start from the Sunday before the 1st
    const current = new Date(startMonth);
    current.setDate(current.getDate() - current.getDay());

    const endDate = new Date(today.getFullYear(), today.getMonth() + 1 + activityMonthOffset, 0);

    const weeks: { date: string; count: number }[][] = [];
    while (current <= endDate) {
      const week: { date: string; count: number }[] = [];
      for (let i = 0; i < 7; i++) {
        week.push({ date: current.toISOString().split("T")[0], count: activityMap.get(current.toISOString().split("T")[0]) || 0 });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  };

  const activityGrid = getActivityGrid();

  // Get month labels for the visible range
  const getMonthLabels = () => {
    const today = new Date();
    const labels: string[] = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - 5 + activityMonthOffset + i, 1);
      labels.push(date.toLocaleDateString("en-US", { month: "short", year: "numeric" }));
    }
    return labels;
  };

  const monthLabels = getMonthLabels();

  const getActivityColor = (count: number) => {
    if (count === 0) return "bg-bg-elevated";
    if (count <= 2) return "bg-green-300";
    if (count <= 5) return "bg-green-500";
    if (count <= 10) return "bg-green-700";
    return "bg-green-900";
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const handleCommunityClick = (slug: string) => {
    window.open(`/${slug}`, "_blank");
    onOpenChange(false);
  };

  // Loading state
  if (!targetUser && open) {
    return (
      <>
        <div className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={handleClose} />
        <div data-profile-panel role="dialog" aria-modal="true" aria-label="Profile panel"
          className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-bg-base border-l border-white/[0.06] z-50 transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
          style={{ boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.4)" : "none", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] pt-[max(1rem,env(safe-area-inset-top))]">
            <Heading size="h4">Profile</Heading>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-bg-elevated" aria-label="Close"><X className="h-5 w-5 text-text-secondary" /></button>
          </div>
          <div className="px-5 py-6 space-y-6 animate-pulse">
            <div className="flex flex-col items-center"><div className="h-20 w-20 rounded-full bg-bg-elevated mb-3" /><div className="h-5 w-32 rounded bg-bg-elevated mb-1" /><div className="h-3 w-24 rounded bg-bg-elevated" /></div>
            <div className="space-y-3"><div className="h-3 w-20 rounded bg-bg-elevated" /><div className="h-10 rounded-lg bg-bg-elevated" /></div>
          </div>
        </div>
      </>
    );
  }

  // Deleted user state
  if (!targetUser) {
    return (
      <>
        <div className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={handleClose} />
        <div data-profile-panel role="dialog" aria-modal="true" aria-label="Profile panel"
          className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-bg-base border-l border-white/[0.06] z-50 transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
          style={{ boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.4)" : "none" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <Heading size="h4">Profile</Heading>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-bg-elevated" aria-label="Close"><X className="h-5 w-5 text-text-secondary" /></button>
          </div>
          <div className="flex flex-col items-center justify-center h-64">
            <div className="h-20 w-20 rounded-full bg-bg-elevated mb-4 flex items-center justify-center">
              <X className="h-8 w-8 text-text-muted" />
            </div>
            <Text theme="muted">Deleted User</Text>
          </div>
        </div>
      </>
    );
  }

  const user = profileData?.user || targetUser;
  const level = profileData?.level || 1;
  const totalPoints = profileData?.totalPoints || 0;
  const joinedCommunities = profileData?.joinedCommunities || [];
  const ownedCommunities = profileData?.ownedCommunities || [];

  return (
    <>
      {/* Backdrop */}
      <div className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={handleClose} />

      {/* Panel */}
      <div data-profile-panel role="dialog" aria-modal="true" aria-label="Profile panel"
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-bg-base border-l border-white/[0.06] z-50 transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.4)" : "none", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] pt-[max(1rem,env(safe-area-inset-top))]">
          <Heading size="h4">{isOwnProfile ? "Your Profile" : user.displayName}</Heading>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-bg-elevated" aria-label="Close"><X className="h-5 w-5 text-text-secondary" /></button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-57px)] px-5 py-6 space-y-6">
          
          {/* Avatar & Basic Info */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <Avatar src={user.avatarUrl} name={displayName || user.displayName} size="xl" className="h-20 w-20" />
              {isOwnProfile && (
                <button onClick={() => setShowClerkProfile(true)}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-bg-elevated hover:bg-bg-muted transition-colors"
                  aria-label="Change profile image">
                  <Camera className="h-3.5 w-3.5 text-text-secondary" />
                </button>
              )}
            </div>
            <Heading size="h4" className="mb-1">{displayName || user.displayName}</Heading>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">Level {level}</Badge>
              <Text size="sm" theme="secondary">{totalPoints} points</Text>
            </div>
            <div className="flex items-center gap-1 text-text-secondary">
              <Calendar className="h-3.5 w-3.5" />
              <Text size="sm" theme="secondary">Joined {formatDate(user.createdAt)}</Text>
            </div>
          </div>

          {/* Inline Editing (self only) */}
          {isOwnProfile && (
            <div className="space-y-3" onKeyDown={handleKeyDown}>
              <div>
                <Text size="sm" theme="secondary" className="mb-1">Display Name</Text>
                <Input value={displayName} onChange={(e) => handleInputChange("displayName", e.target.value)} maxLength={100} />
              </div>
              {isSaving && <div className="flex items-center gap-2 text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /><Text size="sm">Saving...</Text></div>}
            </div>
          )}

          {/* Activity Map */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Text size="sm" theme="secondary">Activity</Text>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActivityMonthOffset((prev) => Math.min(prev + 1, 0))}
                  disabled={activityMonthOffset >= 0}
                  className="p-1 rounded hover:bg-bg-elevated disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Show more recent activity"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActivityMonthOffset((prev) => prev - 1)}
                  className="p-1 rounded hover:bg-bg-elevated"
                  aria-label="Show older activity"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Month labels */}
            <div className="flex justify-between mb-1 px-0.5">
              {monthLabels.map((label, i) => (
                <Text key={i} size="0" theme="muted" className="flex-1 text-center">{label}</Text>
              ))}
            </div>

            <div className="flex gap-0.5 overflow-x-auto pb-2">
              {activityGrid.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.map((day, di) => (
                    <div key={di} className={`w-2.5 h-2.5 rounded-sm ${getActivityColor(day.count)}`} title={`${day.date}: ${day.count} activities`} />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-1 mt-1">
              <Text size="sm" theme="muted">Less</Text>
              <div className="flex gap-0.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-bg-elevated" />
                <div className="w-2.5 h-2.5 rounded-sm bg-green-300" />
                <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                <div className="w-2.5 h-2.5 rounded-sm bg-green-700" />
                <div className="w-2.5 h-2.5 rounded-sm bg-green-900" />
              </div>
              <Text size="sm" theme="muted">More</Text>
            </div>
            <Text size="sm" theme="secondary" className="mt-1">
              {activityData?.postsCount || 0} posts, {activityData?.commentsCount || 0} comments
            </Text>
          </div>

          {/* Communities Joined */}
          <div>
            <Text size="sm" theme="secondary" className="mb-2">Communities Joined ({joinedCommunities.length})</Text>
            {joinedCommunities.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {(joinedCommunities as Array<{ _id: string; name: string; slug: string; logoUrl?: string }>).map((c) => (
                  <button key={c._id} onClick={() => handleCommunityClick(c.slug)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-bg-elevated hover:bg-bg-muted transition-colors text-left w-full">
                    <Avatar src={c.logoUrl} name={c.name} size="sm" />
                    <Text size="sm" className="truncate flex-1">{c.name}</Text>
                  </button>
                ))}
              </div>
            ) : (
              <Text size="sm" theme="muted" className="text-center py-4">No communities joined yet</Text>
            )}
          </div>

          {/* Communities Created */}
          {ownedCommunities.length > 0 && (
            <div>
              <Text size="sm" theme="secondary" className="mb-2">Communities Created ({ownedCommunities.length})</Text>
              <div className="grid grid-cols-2 gap-2">
                {ownedCommunities.map((c: { _id: string; name: string; slug: string; logoUrl?: string }) => (
                  <button key={c._id} onClick={() => handleCommunityClick(c.slug)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-bg-elevated hover:bg-bg-muted transition-colors text-left w-full">
                    <Avatar src={c.logoUrl} name={c.name} size="sm" />
                    <Text size="sm" className="truncate flex-1">{c.name}</Text>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clerk UserProfile Modal */}
      {showClerkProfile && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowClerkProfile(false)}>
          <div className="bg-bg-base rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <Heading size="h4">Update Profile Image</Heading>
              <button onClick={() => setShowClerkProfile(false)} className="p-1.5 rounded-lg hover:bg-bg-elevated"><X className="h-5 w-5 text-text-secondary" /></button>
            </div>
            <div className="p-4">
              <UserProfile routing="hash" appearance={{ elements: { rootBox: "w-full" } }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
