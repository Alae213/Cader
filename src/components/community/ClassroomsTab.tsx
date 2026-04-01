"use client";

import { useState, useCallback, memo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { Heading, Text } from "@/components/ui/Text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ClassroomViewer } from "../Classrooms/ClassroomViewer";
import { ThumbnailUpload } from "./ThumbnailUpload";

// Classroom access type labels
const accessTypeLabels = {
  open: "Open",
  level: "Level Required",
  price: "Paid",
  level_and_price: "Level + Paid",
};

// Access type options for select
const accessTypeOptions = [
  { value: "open", label: "Open - Any member can access" },
  { value: "level", label: "Level Required - Reach a level to unlock" },
  { value: "price", label: "Paid - Purchase to access" },
  { value: "level_and_price", label: "Level + Paid - Both required" },
];

// Level options (1-5)
const levelOptions = [
  { value: "1", label: "Level 1" },
  { value: "2", label: "Level 2" },
  { value: "3", label: "Level 3" },
  { value: "4", label: "Level 4" },
  { value: "5", label: "Level 5" },
];

interface ClassroomsTabProps {
  communityId: string;
  isOwner: boolean;
  currentUser?: {
    _id: Id<"users">;
  };
}

// Proper TypeScript interface for classroom data
interface ClassroomData {
  _id: Id<"classrooms">;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  accessType: "open" | "level" | "price" | "level_and_price";
  minLevel?: number;
  priceDzd?: number;
  hasAccess: boolean;
  progress: number;
}

export function ClassroomsTab({ communityId, isOwner, currentUser: providedUser }: ClassroomsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    classroomId: string;
  } | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState<"open" | "level" | "price" | "level_and_price">("open");
  const [minLevel, setMinLevel] = useState<number | undefined>(undefined);
  const [priceDzd, setPriceDzd] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  
  // Loading states for mutations
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Use provided user or skip query
  const userId = providedUser?._id;
  
  // Get classrooms
  const classrooms = useQuery(
    api.functions.classrooms.listClassrooms, 
    userId 
      ? { communityId: communityId as Id<"communities">, userId }
      : { communityId: communityId as Id<"communities">, userId: undefined }
  );

  // Create classroom mutation
  const createClassroom = useMutation(api.functions.classrooms.createClassroom);
  const updateClassroom = useMutation(api.functions.classrooms.updateClassroom);
  const deleteClassroom = useMutation(api.functions.classrooms.deleteClassroom);

  const handleCreateClassroom = useCallback(async () => {
    if (!title.trim()) {
      setFormError("Title is required");
      return;
    }

    if ((accessType === "price" || accessType === "level_and_price") && (!priceDzd || parseInt(priceDzd) <= 0)) {
      setFormError("Price is required for paid classrooms");
      return;
    }

    if ((accessType === "level" || accessType === "level_and_price") && !minLevel) {
      setFormError("Minimum level is required for level-gated classrooms");
      return;
    }

    setIsCreating(true);
    setFormError(null);
    
    try {
      if (editingClassroomId) {
        // Edit existing classroom
        await updateClassroom({
          classroomId: editingClassroomId as Id<"classrooms">,
          title: title.trim(),
          description: description.trim() || undefined,
          accessType,
          minLevel,
          priceDzd: priceDzd ? parseInt(priceDzd) : undefined,
        });
      } else {
        // Create new classroom
        await createClassroom({
          communityId: communityId as Id<"communities">,
          title: title.trim(),
          description: description.trim() || undefined,
          accessType,
          minLevel,
          priceDzd: priceDzd ? parseInt(priceDzd) : undefined,
        });
      }
      
      // Reset form and close modal
      setTitle("");
      setDescription("");
      setAccessType("open");
      setMinLevel(undefined);
      setPriceDzd("");
      setFormError(null);
      setShowCreateModal(false);
      setEditingClassroomId(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save classroom");
    } finally {
      setIsCreating(false);
    }
  }, [title, description, accessType, minLevel, priceDzd, createClassroom, updateClassroom, communityId, editingClassroomId]);

  const handleDeleteClassroom = useCallback(async () => {
    if (!confirmModal) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await deleteClassroom({ classroomId: confirmModal.classroomId as Id<"classrooms"> });
      setConfirmModal(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete classroom";
      setDeleteError(errorMessage);
      console.error("Failed to delete classroom:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [confirmModal, deleteClassroom]);

  // Wrapper to trigger delete confirmation
  const triggerDelete = useCallback((classroomId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Classroom",
      message: "Are you sure you want to delete this classroom? All content will be lost.",
      classroomId,
    });
  }, []);

  // Memoized handler for closing viewer
  const handleCloseViewer = useCallback(() => {
    setSelectedClassroomId(null);
  }, []);

  // If a classroom is selected, show the viewer
  if (selectedClassroomId) {
    return (
      <ErrorBoundary>
        <ClassroomViewer
          classroomId={selectedClassroomId}
          onBack={() => setSelectedClassroomId(null)}
          isOwner={isOwner}
          currentUser={providedUser}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        {/* Classroom Grid */}
      {classrooms === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : classrooms.length === 0 ? (
        <div className="text-center py-12">
          <Text size="3" theme="secondary" className="mb-2">No classrooms yet</Text>
          <Text size="2" theme="muted">
            {isOwner ? "Create your first classroom to get started" : "Check back later for courses"}
          </Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((classroom: ClassroomData) => (
            <ClassroomCard
              key={classroom._id}
              classroom={classroom}
              onClick={() => setSelectedClassroomId(classroom._id)}
              onDelete={() => triggerDelete(classroom._id)}
              onEdit={() => {
                setEditingClassroomId(classroom._id);
                setTitle(classroom.title);
                setDescription(classroom.description || "");
                setAccessType(classroom.accessType);
                setMinLevel(classroom.minLevel);
                setPriceDzd(classroom.priceDzd?.toString() || "");
                setShowCreateModal(true);
              }}
              onUpdateThumbnail={(thumbnailData) => updateClassroom({ classroomId: classroom._id, thumbnailUrl: thumbnailData })}
              isOwner={isOwner}
            />
          ))}
          
          {/* Add Classroom Card (owner only) */}
          {isOwner && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Add new classroom"
              onClick={() => setShowCreateModal(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowCreateModal(true);
                }
              }}
              className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-bg-elevated/30 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-canvas transition-colors min-h-[180px]"
            >
              <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mb-3">
                <span className="text-2xl text-text-secondary">+</span>
              </div>
              <Text size="2" theme="secondary">Add Classroom</Text>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Classroom Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          setEditingClassroomId(null);
          setTitle("");
          setDescription("");
          setAccessType("open");
          setMinLevel(undefined);
          setPriceDzd("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClassroomId ? "Edit Classroom" : "Create Classroom"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Text size="2" theme="secondary" className="font-medium">Title</Text>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Getting Started with Python"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Text size="2" theme="secondary" className="font-medium">Description (optional)</Text>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 80))}
                placeholder="Brief description..."
                maxLength={80}
                className="w-full min-h-[60px] px-3 py-2 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Text size="1" theme="muted">{description.length}/80</Text>
            </div>

            {/* Access Type */}
            <div className="space-y-2">
              <Text size="2" theme="secondary" className="font-medium">Access Type</Text>
              <Select value={accessType} onValueChange={(value) => {
                if (["open", "level", "price", "level_and_price"].includes(value)) {
                  setAccessType(value as "open" | "level" | "price" | "level_and_price");
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accessTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level requirement (if applicable) */}
            {(accessType === "level" || accessType === "level_and_price") && (
              <div className="space-y-2">
                <Text size="2" theme="secondary" className="font-medium">Minimum Level</Text>
                <Select value={minLevel?.toString() || "none"} onValueChange={(value) => setMinLevel(value === "none" ? undefined : parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select level...</SelectItem>
                    {levelOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Price (if applicable) */}
            {(accessType === "price" || accessType === "level_and_price") && (
              <div className="space-y-2">
                <Text size="2" theme="secondary" className="font-medium">Price (DZD)</Text>
                <Input
                  type="number"
                  value={priceDzd}
                  onChange={(e) => setPriceDzd(e.target.value)}
                  placeholder="e.g., 500"
                  min="100"
                />
                <Text size="1" theme="muted">Minimum 100 DZD</Text>
              </div>
            )}

            {/* Error */}
            {formError && (
              <Text size="2" theme="error">{formError}</Text>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setShowCreateModal(false);
              setEditingClassroomId(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateClassroom} disabled={isCreating}>
              {isCreating ? "Saving..." : (editingClassroomId ? "Save Changes" : "Create Classroom")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={!!confirmModal} onOpenChange={(open) => !open && setConfirmModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmModal?.title || "Confirm"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Text theme="secondary">{confirmModal?.message}</Text>
            {deleteError && (
              <Text size="2" theme="error" className="mt-3">{deleteError}</Text>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setConfirmModal(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="danger"
              onClick={handleDeleteClassroom}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  );
}

// Access type for classroom
type AccessType = "open" | "level" | "price" | "level_and_price";

// Classroom Card Component
interface ClassroomCardProps {
  classroom: {
    _id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    accessType: AccessType;
    minLevel?: number;
    priceDzd?: number;
    hasAccess: boolean;
    progress: number;
  };
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onUpdateThumbnail: (thumbnailData: string) => void;
  isOwner: boolean;
}

const ClassroomCard = memo(function ClassroomCard({ 
  classroom, 
  onClick, 
  onDelete, 
  onEdit,
  onUpdateThumbnail,
  isOwner 
}: ClassroomCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Show lock badge only if classroom is locked by level or price (for all users)
  const isLocked = classroom.accessType !== "open" && !classroom.hasAccess;
  
  // Get lock reason message
  const getLockMessage = () => {
    if (classroom.accessType === "level") return `Level ${classroom.minLevel} required`;
    if (classroom.accessType === "price") return `${classroom.priceDzd} DZD`;
    if (classroom.accessType === "level_and_price") return `Level ${classroom.minLevel} + ${classroom.priceDzd} DZD`;
    return "";
  };

  // Handle thumbnail click - for owner: upload, for non-owner: navigate
  const handleThumbnailClick = (e: React.MouseEvent) => {
    if (isOwner) {
      e.stopPropagation();
      // Let ThumbnailUpload handle the click
    }
    // Non-owner: let the click propagate to navigate
  };

  return (
    <Card 
      className="cursor-pointer hover:ring-2 hover:ring-accent transition-all group  flex flex-col"
      onClick={onClick}
    >
      {/* Thumbnail with upload */}
      <div 
        className="relative aspect-video bg-bg-elevated rounded-[16px] overflow-hidden"
        onClick={handleThumbnailClick}
      >
        {isOwner ? (
          <ThumbnailUpload
            currentUrl={classroom.thumbnailUrl}
            communityName={classroom.title}
            onSave={onUpdateThumbnail}
          />
        ) : classroom.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={classroom.thumbnailUrl} 
            alt={`${classroom.title} thumbnail`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-bg-elevated flex items-center justify-center" />
        )}
        
        {/* Lock badge - for owner OR locked classroom */}
        {isLocked && (
          <Badge 
            variant="secondary"
            className="absolute top-3 left-3 bg-bg-base/80"
            aria-label={`Locked: ${getLockMessage()}`}
          >
            🔒 <span className="sr-only">Locked:</span>{getLockMessage()}
          </Badge>
        )}
        
        {/* 3-dot menu (owner only) - always hidden, visible on hover */}
        {isOwner && (
          <div 
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          >
            <div 
              className="relative"
            >
              <button 
                className="w-8 h-8 rounded-full bg-bg-base/80 cursor-pointer flex items-center justify-center hover:bg-bg-base transition-colors"
                aria-label="Classroom options menu"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
              >
                <span className="text-lg" aria-hidden="true">⋮</span>
              </button>
              
              {/* Dropdown menu - opens on click */}
              {menuOpen && (
                <div 
                  className="absolute right-0 top-full mt-1 w-32 bg-bg-surface rounded-xl p-1 z-10"
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    role="menuitem"
                    onClick={() => {
                      onEdit();
                      setMenuOpen(false);
                    }}
                    className="w-full rounded-lg cursor-pointer px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-elevated transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      onDelete();
                      setMenuOpen(false);
                    }}
                    className="w-full rounded-lg cursor-pointer px-3 py-2 text-left text-sm text-error hover:bg-bg-elevated transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-3 pt-4 gap-2 flex flex-col">
        {/* Title - simple text display */}
        <Text size="4" fontWeight="semibold" className="line-clamp-1">
          {classroom.title}
        </Text>

        {/* Description - always show space, with line-clamp for overflow */}
        <Text size="3" theme="secondary" className="line-clamp-2 min-h-[2.5rem]">
          {classroom.description || " "}
        </Text>

        {/* Progress Bar - Always visible */}
        <div className="relative p-1 mt-auto">
          <span className="items-end justify-end flex pb-1 text-[10px] text-text-secondary">
            {classroom.progress}%
          </span>
          <div>
          <div 
            className="h-[8px] bg-black/80 rounded-full overflow-hidden"
            style={{ boxShadow: 'var(--input-shadow)' }}
          >
            <div 
              className="h-full bg-green-500 rounded-full transition-all shadow-(0 0px 4px rgba(5, 222, 106, 0.2))" 
              style={{ width: `${classroom.progress}%` }}
            />
          </div> 
          </div>
          
        </div>
      </CardContent>
    </Card>
  );
});
