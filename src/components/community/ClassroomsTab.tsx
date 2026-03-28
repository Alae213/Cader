"use client";

import { useState } from "react";
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
import { ClassroomViewer } from "./ClassroomViewer";

// Classroom access type labels
const accessTypeLabels = {
  open: "Open",
  level: "Level Required",
  price: "Paid",
  level_and_price: "Level + Paid",
};

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
}

export function ClassroomsTab({ communityId, isOwner }: ClassroomsTabProps) {
  const { userId: clerkId } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [accessType, setAccessType] = useState<"open" | "level" | "price" | "level_and_price">("open");
  const [minLevel, setMinLevel] = useState<number | undefined>(undefined);
  const [priceDzd, setPriceDzd] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Get current user
  const currentUser = useQuery(api.functions.users.getUserByClerkId, clerkId ? { clerkId } : "skip");
  
  // Get classrooms
  const classrooms = useQuery(
    api.functions.classrooms.listClassrooms, 
    currentUser 
      ? { communityId: communityId as Id<"communities">, userId: currentUser._id as Id<"users"> }
      : { communityId: communityId as Id<"communities">, userId: undefined }
  );

  // Create classroom mutation
  const createClassroom = useMutation(api.functions.classrooms.createClassroom);
  const deleteClassroom = useMutation(api.functions.classrooms.deleteClassroom);

  const handleCreateClassroom = async () => {
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

    try {
      await createClassroom({
        communityId: communityId as Id<"communities">,
        title: title.trim(),
        accessType,
        minLevel,
        priceDzd: priceDzd ? parseInt(priceDzd) : undefined,
      });
      
      // Reset form and close modal
      setTitle("");
      setAccessType("open");
      setMinLevel(undefined);
      setPriceDzd("");
      setFormError(null);
      setShowCreateModal(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to create classroom");
    }
  };

  const handleDeleteClassroom = async (classroomId: string) => {
    if (confirm("Are you sure you want to delete this classroom? All content will be lost.")) {
      try {
        await deleteClassroom({ classroomId: classroomId as Id<"classrooms"> });
      } catch (error) {
        console.error("Failed to delete classroom:", error);
      }
    }
  };

  // If a classroom is selected, show the viewer
  if (selectedClassroomId) {
    return (
      <ClassroomViewer
        classroomId={selectedClassroomId}
        onBack={() => setSelectedClassroomId(null)}
        isOwner={isOwner}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Heading size="4" className="text-text-primary">Classrooms</Heading>
        {isOwner && (
          <Button onClick={() => setShowCreateModal(true)}>
            + Create Classroom
          </Button>
        )}
      </div>

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
          {classrooms.map((classroom: any) => (
            <ClassroomCard
              key={classroom._id}
              classroom={classroom}
              onClick={() => setSelectedClassroomId(classroom._id)}
              onDelete={isOwner ? () => handleDeleteClassroom(classroom._id) : undefined}
              isOwner={isOwner}
            />
          ))}
          
          {/* Add Classroom Card (owner only) */}
          {isOwner && (
            <div
              onClick={() => setShowCreateModal(true)}
              className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-bg-elevated/30 transition-colors min-h-[180px]"
            >
              <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mb-3">
                <span className="text-2xl text-text-secondary">+</span>
              </div>
              <Text size="2" theme="secondary">Add Classroom</Text>
            </div>
          )}
        </div>
      )}

      {/* Create Classroom Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Classroom</DialogTitle>
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

            {/* Access Type */}
            <div className="space-y-2">
              <Text size="2" theme="secondary" className="font-medium">Access Type</Text>
              <Select value={accessType} onValueChange={(value) => setAccessType(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open - Any member can access</SelectItem>
                  <SelectItem value="level">Level Required - Reach a level to unlock</SelectItem>
                  <SelectItem value="price">Paid - Purchase to access</SelectItem>
                  <SelectItem value="level_and_price">Level + Paid - Both required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Level requirement (if applicable) */}
            {(accessType === "level" || accessType === "level_and_price") && (
              <div className="space-y-2">
                <Text size="2" theme="secondary" className="font-medium">Minimum Level</Text>
                <Select value={minLevel?.toString() || ""} onValueChange={(value) => setMinLevel(value ? parseInt(value) : undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Select level...</SelectItem>
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
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateClassroom}>
              Create Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Classroom Card Component
interface ClassroomCardProps {
  classroom: {
    _id: string;
    title: string;
    thumbnailUrl?: string;
    accessType: string;
    minLevel?: number;
    priceDzd?: number;
    hasAccess: boolean;
    progress: number;
  };
  onClick: () => void;
  onDelete?: () => void;
  isOwner: boolean;
}

function ClassroomCard({ classroom, onClick, onDelete, isOwner }: ClassroomCardProps) {
  const accessLabel = accessTypeLabels[classroom.accessType as keyof typeof accessTypeLabels] || classroom.accessType;
  
  return (
    <Card 
      className={`cursor-pointer hover:ring-2 hover:ring-accent transition-all ${
        !classroom.hasAccess && !isOwner ? "opacity-70" : ""
      }`}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative h-32 bg-bg-elevated rounded-t-[22px] overflow-hidden">
        {classroom.thumbnailUrl ? (
          <img 
            src={classroom.thumbnailUrl} 
            alt={classroom.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">📚</span>
          </div>
        )}
        
        {/* Lock overlay for no access */}
        {!classroom.hasAccess && !isOwner && (
          <div className="absolute inset-0 bg-bg-canvas/80 flex items-center justify-center">
            <div className="bg-bg-surface rounded-full p-3">
              <span className="text-2xl">🔒</span>
            </div>
          </div>
        )}
        
        {/* Access badge */}
        {classroom.accessType !== "open" && (
            <Badge 
              variant="accent"
              className="absolute top-3 right-3"
            >
            {classroom.priceDzd ? `${classroom.priceDzd} DZD` : `Level ${classroom.minLevel}`}
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{classroom.title}</CardTitle>
          {isOwner && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-text-muted hover:text-error p-1"
            >
              <span className="text-sm">🗑️</span>
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Access type label */}
        <Text size="1" theme="muted" className="mb-3">
          {accessLabel}
        </Text>

        {/* Progress bar (if has access) */}
        {classroom.hasAccess && classroom.progress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <Text size="1" theme="muted">Progress</Text>
              <Text size="1" theme="secondary">{classroom.progress}%</Text>
            </div>
            <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${classroom.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* No access indicator */}
        {!classroom.hasAccess && !isOwner && (
          <div className="text-center py-2">
            <Text size="1" theme="muted">
              {classroom.accessType === "level" && `Reach Level ${classroom.minLevel} to unlock`}
              {classroom.accessType === "price" && `Purchase for ${classroom.priceDzd} DZD`}
              {classroom.accessType === "level_and_price" && `Reach Level ${classroom.minLevel} and purchase`}
            </Text>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
