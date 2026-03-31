"use client";

import { useState, useEffect } from "react";
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
  Loader2, Tags, GripVertical, Plus, X, Pencil
} from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communitySlug?: string;
  initialSection?: "admins" | "billing" | "danger" | "account" | "categories";
}

type Section = "admins" | "billing" | "danger" | "account" | "categories";

export function SettingsModal({ open, onOpenChange, communitySlug, initialSection = "admins" }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<Section>(initialSection);
  const { userId: clerkId, signOut } = useAuth();

  // Fetch current user
  const currentUser = useQuery(api.functions.users.getUserByClerkId, clerkId ? { clerkId } : "skip");

  // Fetch community if in community context
  const community = useQuery(
    api.functions.communities.getBySlug, 
    communitySlug ? { slug: communitySlug } : "skip"
  );

  // Fetch memberships for admin list
  const memberships = useQuery(
    api.functions.memberships.listMembers,
    community?._id ? { communityId: community._id } : "skip"
  );

  // Mutations
  const addAdmin = useMutation(api.functions.memberships.addAdmin);
  const removeAdmin = useMutation(api.functions.memberships.removeAdmin);
  const deleteCommunity = useMutation(api.functions.communities.deleteCommunity);
  
  // Category mutations
  const createCategory = useMutation(api.functions.categories.createCategory);
  const updateCategory = useMutation(api.functions.categories.updateCategory);
  const deleteCategory = useMutation(api.functions.categories.deleteCategory);

  // Fetch categories
  const categories = useQuery(
    api.functions.categories.listCategories,
    community?._id ? { communityId: community._id } : "skip"
  );

  // Local state for forms
  const [searchQuery, setSearchQuery] = useState("");
  const [adminToRemove, setAdminToRemove] = useState<string | null>(null);
  
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Category state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryColor, setEditCategoryColor] = useState("");

  // Set initial values when user loads

  // Check if user is owner/admin of current community
  const isOwner = community?.ownerId === currentUser?._id;
  const isAdmin = memberships?.some((m) => m && m.userId === currentUser?._id && m.role === "admin") ?? false;

  const handleAddAdmin = async (membershipId: string) => {
    try {
      await addAdmin({ membershipId: membershipId as never });
      toast.success("Admin added successfully");
    } catch (error) {
      toast.error("Failed to add admin");
    }
  };

  const handleRemoveAdmin = async (membershipId: string) => {
    try {
      await removeAdmin({ membershipId: membershipId as never });
      toast.success("Admin removed successfully");
    } catch (error) {
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
      window.location.href = "/";
    } catch (error) {
      toast.error("Failed to delete community");
    }
    setIsDeleting(false);
  };

  const handleSignOut = () => {
    signOut(() => {
      window.location.href = "/";
    });
  };

  // Category handlers
  const handleAddCategory = async () => {
    if (!community?._id || !newCategoryName.trim()) return;
    try {
      await createCategory({
        communityId: community._id,
        name: newCategoryName.trim(),
        color: newCategoryColor,
      });
      setNewCategoryName("");
      setNewCategoryColor("#3B82F6");
      setIsAddingCategory(false);
      toast.success("Category added");
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    try {
      await updateCategory({
        categoryId: categoryId as never,
        name: editCategoryName.trim() || undefined,
        color: editCategoryColor || undefined,
      });
      setEditingCategoryId(null);
      setEditCategoryName("");
      setEditCategoryColor("");
      toast.success("Category updated");
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory({ categoryId: categoryId as never });
      toast.success("Category deleted");
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  // Type-safe membership handling
  const adminMembers = (memberships || []).filter((m) => m && (m.role === "admin" || m.role === "owner"));
  const regularMembers = (memberships || []).filter((m) => m && m.role === "member");
  const filteredMembers = regularMembers.filter((m) => 
    m && m.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSection = () => {
    switch (activeSection) {
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
            <Text size="sm" theme="secondary" className="mb-4">
              Current Admins
            </Text>
            {adminMembers.map((member) => member && (
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
                    onClick={() => setAdminToRemove(member.membershipId)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            
            {/* Admin removal confirmation */}
            {adminToRemove && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <Text size="sm" className="mb-2">Are you sure you want to remove this admin?</Text>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setAdminToRemove(null)}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleRemoveAdmin(adminToRemove)}>
                    Confirm
                  </Button>
                </div>
              </div>
            )}

            {/* Add admin search */}
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
                    <Button variant="secondary" size="sm" onClick={() => handleAddAdmin(member.membershipId)}>
                      Add
                    </Button>
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

            {isAtLimit && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <Text size="sm">You&apos;ve reached the 50 member limit. Subscribe to add more members.</Text>
                <Button className="w-full mt-2">Subscribe Now</Button>
              </div>
            )}

            {community.platformTier === "subscribed" && (
              <Button variant="secondary" className="w-full">Cancel Subscription</Button>
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
        
        // Check for active paying members
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
                  <Button
                    variant="danger"
                    className="w-full"
                    disabled={deleteConfirm !== community.name || isDeleting}
                    onClick={handleDeleteCommunity}
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Delete Community
                  </Button>
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
              <Button variant="danger" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </Button>
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
        
        const categoryColors = [
          "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", 
          "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
        ];
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Text size="sm" theme="secondary">
                {categories?.length || 0} / 10 categories
              </Text>
              {(categories?.length || 0) < 10 && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setIsAddingCategory(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
            
            {/* Add category form */}
            {isAddingCategory && (
              <div className="p-4 rounded-lg bg-bg-elevated space-y-3">
                <Text size="sm" theme="secondary">New Category</Text>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  maxLength={30}
                />
                <div className="flex gap-2 flex-wrap">
                  {categoryColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        newCategoryColor === color ? "border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddCategory}>
                    Add
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName("");
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {/* Category list */}
            <div className="space-y-2">
              {(categories || []).map((cat) => cat && (
                <div 
                  key={cat._id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated"
                >
                  {editingCategoryId === cat._id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="flex-1"
                        maxLength={30}
                      />
                      <div className="flex gap-1">
                        {categoryColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditCategoryColor(color)}
                            className={`w-5 h-5 rounded-full border-2 ${
                              editCategoryColor === color ? "border-white" : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <Button size="sm" onClick={() => handleUpdateCategory(cat._id)}>
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingCategoryId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <Text size="sm">{cat.name}</Text>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingCategoryId(cat._id);
                            setEditCategoryName(cat.name);
                            setEditCategoryColor(cat.color);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteCategory(cat._id)}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            {(categories?.length || 0) >= 10 && (
              <Text size="sm" theme="muted" className="text-center">
                Maximum 10 categories reached
              </Text>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const sections: { id: Section; label: string; icon: React.ReactNode; requiresCommunity?: boolean }[] = [
    { id: "admins", label: "Admins", icon: <Shield className="h-4 w-4" />, requiresCommunity: true },
    { id: "categories", label: "Categories", icon: <Tags className="h-4 w-4" />, requiresCommunity: true },
    { id: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4" />, requiresCommunity: true },
    { id: "danger", label: "Danger Zone", icon: <AlertTriangle className="h-4 w-4" />, requiresCommunity: true },
    { id: "account", label: "Account", icon: <LogOut className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogTitle>Settings</DialogTitle>
        
        <div className="flex flex-1 overflow-hidden mt-4">
          {/* Sidebar - hidden on mobile, show as column on larger screens */}
          <div className="hidden md:flex w-48 flex-shrink-0 border-r border-border pr-4 space-y-1 flex-col">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === section.id
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:bg-bg-elevated"
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>

          {/* Mobile: section tabs */}
          <div className="md:hidden flex overflow-x-auto gap-2 mb-4 pb-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeSection === section.id
                    ? "bg-primary text-white"
                    : "text-text-secondary bg-bg-elevated"
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>

          {/* Content */}
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
