"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/shared/Avatar";
import {
  Shield, CreditCard, AlertTriangle, LogOut, Trash2,
  Loader2, Tags, Plus, X, Pencil, Bell, Mail, MessageSquare, AtSign, Users
} from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communitySlug?: string;
  initialSection?: "notifications" | "admins" | "billing" | "danger" | "account" | "categories";
}

type Section = "notifications" | "admins" | "billing" | "danger" | "account" | "categories";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

interface NotificationToggleProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function NotificationToggle({ icon, label, description, checked, onChange }: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-text-secondary">{icon}</div>
        <div>
          <Text size="sm">{label}</Text>
          {description && <Text size="0" theme="muted">{description}</Text>}
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-bg-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
      </label>
    </div>
  );
}

export function SettingsModal({ open, onOpenChange, communitySlug, initialSection }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<Section>(initialSection || "account");
  const { userId: clerkId, signOut } = useAuth();

  const currentUser = useQuery(api.functions.users.getUserByClerkId, clerkId ? { clerkId } : "skip");

  const community = useQuery(
    api.functions.communities.getBySlug,
    communitySlug ? { slug: communitySlug } : "skip"
  );

  const [nextBillingDate] = useState(() =>
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-DZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

  const memberships = useQuery(
    api.functions.memberships.listMembers,
    community?._id ? { communityId: community._id } : "skip"
  );

  const isOwner = community?.ownerId === currentUser?._id;
  const isAdmin = memberships?.some((m) => m && m.userId === currentUser?._id && m.role === "admin") ?? false;

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    } else if (!communitySlug) {
      setActiveSection("account");
    } else if (isOwner) {
      setActiveSection("admins");
    }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [communitySlug, isOwner, initialSection]);

  useEffect(() => {
    if (open && initialSection === "categories") {
      setActiveSection("categories");
      setTimeout(() => categoriesSectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [open, initialSection]);

  const addAdmin = useMutation(api.functions.memberships.addAdmin);
  const removeAdmin = useMutation(api.functions.memberships.removeAdmin);
  const deleteCommunity = useMutation(api.functions.communities.deleteCommunity);
  const deleteAccountMutation = useMutation(api.functions.users.deleteAccount);
  const createPlatformCheckout = useMutation(api.functions.payments.createPlatformSubscriptionCheckout);
  const cancelSubscription = useMutation(api.functions.payments.cancelPlatformSubscription);
  const createCategory = useMutation(api.functions.categories.createCategory);
  const updateCategory = useMutation(api.functions.categories.updateCategory);
  const deleteCategory = useMutation(api.functions.categories.deleteCategory);

  const categories = useQuery(
    api.functions.categories.listCategories,
    community?._id ? { communityId: community._id } : "skip"
  );

  const notificationPrefs = useQuery(api.functions.notifications.getNotificationPreferences);
  const updateNotificationPrefs = useMutation(api.functions.notifications.updateNotificationPreferences);

  const [searchQuery, setSearchQuery] = useState("");
  const [adminToRemove, setAdminToRemove] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const categoriesSectionRef = useRef<HTMLDivElement>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const handleAddAdmin = async (membershipId: string) => {
    try {
      await addAdmin({ membershipId: membershipId as never });
      toast.success("Admin added successfully");
    } catch {
      toast.error("Failed to add admin");
    }
  };

  const handleRemoveAdmin = async (membershipId: string) => {
    try {
      await removeAdmin({ membershipId: membershipId as never });
      toast.success("Admin removed successfully");
    } catch {
      toast.error("Failed to remove admin");
    }
    setAdminToRemove(null);
  };

  const handleDeleteCommunity = async () => {
    if (!community?._id || deleteConfirm !== community.name) return;
    setIsDeleting(true);
    try {
      await deleteCommunity({ communityId: community._id });
      toast.success("Community deleted");
      setDeleteConfirm("");
      window.location.href = "/";
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete community"));
      setDeleteConfirm("");
    }
    setIsDeleting(false);
  };

  const handleSignOut = () => {
    signOut(() => {
      window.location.href = "/";
    });
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccountMutation({});
      toast.success("Account deleted");
      signOut(() => {
        window.location.href = "/";
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete account"));
    }
    setIsDeletingAccount(false);
    setShowDeleteAccountConfirm(false);
  };

  const handleSubscribe = async () => {
    if (!community?._id || !currentUser?._id) return;
    try {
      const result = await createPlatformCheckout({
        communityId: community._id,
        userId: currentUser._id,
        successUrl: `${window.location.origin}/${community.slug}?subscribed=true`,
        cancelUrl: `${window.location.origin}/${community.slug}?subscription=cancelled`,
      });
      window.open(result.checkoutUrl, "_blank");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create checkout"));
    }
  };

  const handleCancelSubscription = async () => {
    if (!community?._id) return;
    try {
      await cancelSubscription({ communityId: community._id });
      toast.success("Subscription cancelled");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to cancel subscription"));
    }
  };

  const handleHoldStart = () => {
    if (deleteConfirm !== community?.name || isDeleting) return;
    setIsHolding(true);
    setHoldProgress(0);
    holdTimerRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          setIsHolding(false);
          handleDeleteCommunity();
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const handleHoldEnd = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  const handleAddCategory = async () => {
    if (!community?._id || !newCategoryName.trim()) return;
    try {
      await createCategory({
        communityId: community._id,
        name: newCategoryName.trim(),
      });
      setNewCategoryName("");
      setIsAddingCategory(false);
      toast.success("Category added");
    } catch {
      toast.error("Failed to add category");
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    try {
      await updateCategory({
        categoryId: categoryId as never,
        name: editCategoryName.trim() || undefined,
      });
      setEditingCategoryId(null);
      setEditCategoryName("");
      toast.success("Category updated");
    } catch {
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory({ categoryId: categoryId as never });
      toast.success("Category deleted");
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const adminMembers = (memberships || []).filter((m) => m && (m.role === "admin" || m.role === "owner"));
  const regularMembers = (memberships || []).filter((m) => m && m.role === "member");
  const filteredMembers = regularMembers.filter((m) =>
    m && m.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNotificationChange = async (key: string, value: boolean) => {
    try {
      await updateNotificationPrefs({ [key]: value });
    } catch {
      toast.error("Failed to update preferences");
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "notifications":
        return (
          <div className="space-y-6">
            <Text size="sm" theme="secondary" className="mb-2">
              Choose how you want to be notified about activity.
            </Text>

            <div className="space-y-4">
              <NotificationToggle
                icon={<Mail className="h-5 w-5" />}
                label="Email Notifications"
                description="Receive notifications via email"
                checked={notificationPrefs?.emailEnabled ?? true}
                onChange={(v) => handleNotificationChange("emailEnabled", v)}
              />
              <NotificationToggle
                icon={<Bell className="h-5 w-5" />}
                label="In-App Notifications"
                description="Show notifications within the app"
                checked={notificationPrefs?.inAppEnabled ?? true}
                onChange={(v) => handleNotificationChange("inAppEnabled", v)}
              />
            </div>

            <div className="pt-4 border-t border-white/[0.06]">
              <Text size="sm" theme="secondary" className="mb-4">Notification Types</Text>
              <div className="space-y-4">
                <NotificationToggle
                  icon={<MessageSquare className="h-5 w-5" />}
                  label="Comments on my posts"
                  checked={notificationPrefs?.commentOnPost ?? true}
                  onChange={(v) => handleNotificationChange("commentOnPost", v)}
                />
                <NotificationToggle
                  icon={<AtSign className="h-5 w-5" />}
                  label="@Mentions"
                  checked={notificationPrefs?.mention ?? true}
                  onChange={(v) => handleNotificationChange("mention", v)}
                />
                <NotificationToggle
                  icon={<Users className="h-5 w-5" />}
                  label="New members join my community"
                  checked={notificationPrefs?.newMember ?? true}
                  onChange={(v) => handleNotificationChange("newMember", v)}
                />
              </div>
            </div>
          </div>
        );

      case "admins":
        if (!isOwner && !isAdmin) {
          return (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <Text theme="secondary">You need to be an admin to manage this section</Text>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <Text size="sm" theme="secondary" className="mb-4">Current Admins</Text>
            {adminMembers.map((member) => {
              if (!member) return null;
              const isLastAdmin = member.role === "admin" && adminMembers.filter(m => m?.role === "admin").length === 1;
              return (
                <div key={member.membershipId} className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated">
                  <div className="flex items-center gap-3">
                    <Avatar src={member.avatarUrl} name={member.displayName} size="sm" />
                    <div>
                      <Text size="sm">{member.displayName}</Text>
                      <Text size="sm" theme="muted">{member.role}</Text>
                    </div>
                  </div>
                  {member.role === "admin" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLastAdmin}
                      title={isLastAdmin ? "You cannot remove the last admin. Add another admin first." : undefined}
                      onClick={() => setAdminToRemove(member.membershipId)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              );
            })}

            {adminToRemove && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <Text size="sm" className="mb-2">Are you sure you want to remove this admin?</Text>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setAdminToRemove(null)}>Cancel</Button>
                  <Button variant="danger" size="sm" onClick={() => handleRemoveAdmin(adminToRemove)}>Confirm</Button>
                </div>
              </div>
            )}

            <div className="mt-6">
              <Text size="sm" theme="secondary" className="mb-2">Add New Admin</Text>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="mb-2"
              />
              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredMembers.slice(0, 5).map((member) => member && (
                  <div key={member.membershipId} className="flex items-center justify-between p-2 rounded-lg bg-bg-elevated">
                    <div className="flex items-center gap-2">
                      <Avatar src={member.avatarUrl} name={member.displayName} size="sm" />
                      <Text size="sm">{member.displayName}</Text>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => handleAddAdmin(member.membershipId)}>Add</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "billing":
        if (!community) {
          return (
            <div className="text-center py-8">
              <Text theme="secondary">Select a community to view billing</Text>
            </div>
          );
        }
        if (!isOwner) {
          return (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <Text theme="secondary">You need to be the owner to manage billing</Text>
            </div>
          );
        }
        const memberCount = community.memberCount || 0;
        const isAtLimit = memberCount >= 50;

        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-bg-elevated">
              <Text size="sm" theme="secondary">Platform Tier</Text>
              <Heading size="h4" className="mt-1">
                {community.platformTier === "subscribed" ? "Subscribed" : "Free"}
              </Heading>
            </div>

            <div className="p-4 rounded-lg bg-bg-elevated">
              <Text size="sm" theme="secondary">Members Used</Text>
              <Heading size="h4" className="mt-1">
                {memberCount} / {community.platformTier === "subscribed" ? "Unlimited" : "50"}
              </Heading>
            </div>

            {community.platformTier === "subscribed" && (
              <div className="p-4 rounded-lg bg-bg-elevated">
                <Text size="sm" theme="secondary">Next Billing Date</Text>
                <Heading size="h4" className="mt-1">{nextBillingDate}</Heading>
                <Text size="0" theme="muted" className="mt-1">2,000 DZD/month</Text>
              </div>
            )}

            {/* Only show upgrade options when NOT in member view mode */}
            {isAtLimit && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <Text size="sm">You&apos;ve reached the 50 member limit. Subscribe to add more members.</Text>
                <Button className="w-full mt-2" onClick={handleSubscribe}>Subscribe Now</Button>
              </div>
            )}

            {!isAtLimit && community.platformTier !== "subscribed" && (
              <Button className="w-full" onClick={handleSubscribe}>
                Upgrade to Unlimited Members (2,000 DZD/mo)
              </Button>
            )}

            {community.platformTier === "subscribed" && (
              <Button variant="secondary" className="w-full" onClick={handleCancelSubscription}>Cancel Subscription</Button>
            )}
          </div>
        );

      case "danger":
        if (!community) {
          return (
            <div className="text-center py-8">
              <Text theme="secondary">Select a community to manage</Text>
            </div>
          );
        }
        if (!isOwner) {
          return (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <Text theme="secondary">Only the owner can delete this community</Text>
            </div>
          );
        }

        const activePayingMembers = (memberships || []).filter((m) =>
          m && m.subscriptionType && m.subscriptionType !== "free"
        ).length;

        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <Heading size="h4" className="text-red-400">Danger Zone</Heading>
              </div>
              <Text size="sm" theme="secondary" className="mb-4">
                Once you delete a community, there is no going back. All members will lose access.
              </Text>

              {activePayingMembers > 0 ? (
                <div className="p-3 rounded-lg bg-red-500/20">
                  <Text size="sm">
                    You have {activePayingMembers} active paying members. Please remove or refund them before deleting.
                  </Text>
                </div>
              ) : (
                <>
                  <Text size="sm" className="mb-2">Type the community name to confirm:</Text>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={community.name}
                    className="mb-2"
                  />
                  <div className="relative">
                    <div className="absolute inset-0 rounded-lg bg-red-500/20 overflow-hidden">
                      <div
                        className="h-full bg-red-500/40 transition-[width] duration-100 ease-linear"
                        style={{ width: `${holdProgress}%` }}
                      />
                    </div>
                    <Button
                      variant="danger"
                      className="w-full relative z-10"
                      disabled={deleteConfirm !== community.name || isDeleting}
                      onMouseDown={handleHoldStart}
                      onMouseUp={handleHoldEnd}
                      onMouseLeave={handleHoldEnd}
                      onTouchStart={handleHoldStart}
                      onTouchEnd={handleHoldEnd}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {isHolding ? `Hold... ${Math.round(holdProgress / 20)}s` : "Delete Community"}
                    </Button>
                  </div>
                  <Text size="0" theme="muted" className="text-center mt-1">Hold for 5 seconds to confirm</Text>
                </>
              )}
            </div>
          </div>
        );

      case "account":
        return (
          <div className="space-y-4">
            <Button variant="secondary" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>

            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <Heading size="h4" className="text-red-400">Delete Account</Heading>
              </div>
              <Text size="sm" theme="secondary" className="mb-4">
                This will permanently delete your account and remove you from all communities.
              </Text>

              {showDeleteAccountConfirm ? (
                <div className="space-y-3">
                  <Text size="sm" className="font-medium">Are you sure? This cannot be undone.</Text>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowDeleteAccountConfirm(false)} className="flex-1">Cancel</Button>
                    <Button variant="danger" size="sm" onClick={handleDeleteAccount} disabled={isDeletingAccount} className="flex-1">
                      {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="danger" className="w-full" onClick={() => setShowDeleteAccountConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete My Account
                </Button>
              )}
            </div>
          </div>
        );

      case "categories":
        if (!community) {
          return (
            <div className="text-center py-8">
              <Text theme="secondary">Select a community to manage categories</Text>
            </div>
          );
        }
        if (!isOwner && !isAdmin) {
          return (
            <div className="text-center py-8">
              <Tags className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <Text theme="secondary">You need to be an admin to manage categories</Text>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Text size="sm" theme="secondary">{categories?.length || 0} / 5 categories</Text>
              {(categories?.length || 0) < 5 && (
                <Button variant="secondary" size="sm" onClick={() => setIsAddingCategory(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>

            {isAddingCategory && (
              <div className="p-4 rounded-lg bg-bg-elevated space-y-3">
                <Text size="sm" theme="secondary">New Category</Text>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  maxLength={30}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddCategory}>Add</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setIsAddingCategory(false); setNewCategoryName(""); }}>Cancel</Button>
                </div>
              </div>
            )}

            <div ref={categoriesSectionRef} className="space-y-2">
              {(categories || []).map((cat) => cat && (
                <div key={cat._id} className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated">
                  {editingCategoryId === cat._id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="flex-1"
                        maxLength={30}
                      />
                      <Button size="sm" onClick={() => handleUpdateCategory(cat._id)}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingCategoryId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Text size="sm">{cat.name}</Text>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingCategoryId(cat._id); setEditCategoryName(cat.name); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCategoryToDelete(cat._id)}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {categoryToDelete && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <Text size="sm" className="mb-2">Are you sure you want to delete this category? Posts in this category will no longer have a category assigned.</Text>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setCategoryToDelete(null)}>Cancel</Button>
                  <Button variant="danger" size="sm" onClick={() => { handleDeleteCategory(categoryToDelete); setCategoryToDelete(null); }}>Delete</Button>
                </div>
              </div>
            )}

            {(categories?.length || 0) >= 5 && (
              <Text size="sm" theme="muted" className="text-center">Maximum 5 categories reached</Text>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const sections: { id: Section; label: string; icon: React.ReactNode; requiresCommunity?: boolean }[] = [
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { id: "admins", label: "Admins", icon: <Shield className="h-4 w-4" />, requiresCommunity: true },
    { id: "categories", label: "Categories", icon: <Tags className="h-4 w-4" />, requiresCommunity: true },
    { id: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4" />, requiresCommunity: true },
    { id: "danger", label: "Danger Zone", icon: <AlertTriangle className="h-4 w-4" />, requiresCommunity: true },
    { id: "account", label: "Account", icon: <LogOut className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogTitle>Settings</DialogTitle>

        <div className="flex flex-1 overflow-hidden mt-4">
          <div className="hidden md:flex w-48 flex-shrink-0 border-r border-border pr-4 space-y-1 flex-col">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === section.id ? "bg-primary text-white" : "text-text-secondary hover:bg-bg-elevated"
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>

          <div className="md:hidden flex overflow-x-auto gap-2 mb-4 pb-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeSection === section.id ? "bg-primary text-white" : "text-text-secondary bg-bg-elevated"
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pl-4">
            <Heading size="h4" className="mb-4">
              {sections.find(s => s.id === activeSection)?.label}
            </Heading>
            {renderSection()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
