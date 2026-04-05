"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { Text } from "@/components/ui/Text";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ClassroomViewer } from "./ClassroomViewer";
import { ClassroomCard } from "./ClassroomCard";
import { LockedClassroomModal } from "./LockedClassroomModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

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
  order: number;
  hasAccess: boolean;
  progress: number;
}

export function ClassroomsTab({ communityId, isOwner, currentUser: providedUser }: ClassroomsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  
  // Locked classroom modal state
  const [lockedClassroom, setLockedClassroom] = useState<ClassroomData | null>(null);
  
  // Get community info for locked modal
  const community = useQuery(
    api.functions.communities.getById,
    communityId ? { communityId: communityId as Id<"communities"> } : "skip"
  );
  
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

  // Pagination state
  const PAGE_SIZE = 9;
  const [page, setPage] = useState(0);

  // Use provided user or skip query
  const userId = providedUser?._id;
  
  // Owner gets all classrooms
  const allClassrooms = useQuery(
    api.functions.classrooms.listClassrooms, 
    userId 
      ? { communityId: communityId as Id<"communities">, userId }
      : { communityId: communityId as Id<"communities">, userId: undefined }
  );
  
  // Member pagination args (or skip for owners)
  const memberArgs = userId && !isOwner
    ? { communityId: communityId as Id<"communities">, userId, limit: PAGE_SIZE, offset: page * PAGE_SIZE }
    : undefined;

  const paginatedData = useQuery(
    api.functions.classrooms.listClassroomsPaginated,
    memberArgs ?? "skip"
  );

  // Choose data source based on ownership
  const classrooms = isOwner ? allClassrooms : paginatedData?.classrooms;
  const hasMore = !isOwner && paginatedData?.hasMore;

  // Create classroom mutation
  const createClassroom = useMutation(api.functions.classrooms.createClassroom);
  const updateClassroom = useMutation(api.functions.classrooms.updateClassroom);
  const deleteClassroom = useMutation(api.functions.classrooms.deleteClassroom);
  const reorderClassrooms = useMutation(api.functions.classrooms.reorderClassrooms);

  // Optimistic reordering state
  const [orderedClassrooms, setOrderedClassrooms] = useState<ClassroomData[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  // Sync orderedClassrooms when classrooms query returns
  useEffect(() => {
    if (classrooms && Array.isArray(classrooms) && classrooms.length > 0) {
      const sorted = [...classrooms].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      // Only update if not currently reordering
      if (!isReordering) {
        setOrderedClassrooms(sorted);
      }
    }
  }, [classrooms, isReordering]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedClassrooms.findIndex((c) => c._id === active.id);
    const newIndex = orderedClassrooms.findIndex((c) => c._id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistic update
    const newOrder = arrayMove(orderedClassrooms, oldIndex, newIndex);
    setOrderedClassrooms(newOrder);
    setIsReordering(true);
    setReorderError(null);

    try {
      // Update order values
      const classroomOrders = newOrder.map((classroom, index) => ({
        classroomId: classroom._id,
        order: index,
      }));

      await reorderClassrooms({
        communityId: communityId as Id<"communities">,
        classroomOrders,
      });
    } catch (error) {
      // Rollback on error
      setReorderError(error instanceof Error ? error.message : "Failed to reorder");
      const sortedClassrooms = classrooms 
        ? [...classrooms].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [];
      setOrderedClassrooms(sortedClassrooms);
    } finally {
      setIsReordering(false);
    }
  }, [orderedClassrooms, reorderClassrooms, communityId, classrooms]);

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedClassrooms.map((c) => c._id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orderedClassrooms.map((classroom: ClassroomData) => (
                <ClassroomCard
                  key={classroom._id}
                  classroom={classroom}
                  onClick={() => {
                    if (!classroom.hasAccess && !isOwner) {
                      setLockedClassroom(classroom);
                    } else {
                      setSelectedClassroomId(classroom._id);
                    }
                  }}
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
                  isDragging={isReordering}
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
                  className="hover:bg-accent-subtle rounded-[16px] bg-black/20 shadow-input-shadow border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-accent transition-colors min-h-[180px]"
                >
                  <Text size="2" theme="secondary" >+ Add Classroom</Text>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Load More Button (members only, when paginated) */}
      {!isOwner && hasMore && (
        <div className="flex justify-center mt-6">
          <Button 
            onClick={() => setPage((p) => p + 1)}
            variant="secondary"
            className="px-6 py-2"
          >
            Load More
          </Button>
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
                placeholder="Type Title..."
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
                className="w-full min-h-[60px] px-3 py-2 rounded-[14px] border-0 bg-black/60 shadow-input-shadow text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
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

      {/* Locked Classroom Modal */}
      {lockedClassroom && community && (
        <LockedClassroomModal
          classroom={{
            _id: lockedClassroom._id,
            title: lockedClassroom.title,
            accessType: lockedClassroom.accessType,
            minLevel: lockedClassroom.minLevel,
            priceDzd: lockedClassroom.priceDzd,
            hasAccess: lockedClassroom.hasAccess,
          }}
          community={{
            _id: community._id,
            name: community.name,
            slug: community.slug,
          }}
          open={!!lockedClassroom}
          onOpenChange={(open) => !open && setLockedClassroom(null)}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}

// Re-export ClassroomCard from the new component
export { ClassroomCard } from "./ClassroomCard";
