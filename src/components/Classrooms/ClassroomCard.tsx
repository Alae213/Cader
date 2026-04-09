"use client";

import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Text } from "@/components/ui/Text";
import { ThumbnailUpload } from "../community/ThumbnailUpload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/Select";
import { MoreHorizontal, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type AccessType = "open" | "level" | "price" | "level_and_price";

export interface ClassroomCardData {
  _id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  accessType: AccessType;
  minLevel?: number;
  priceDzd?: number;
  hasAccess: boolean;
  progress: number;
}

interface ClassroomCardProps {
  classroom: ClassroomCardData;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onUpdateThumbnail: (thumbnailData: string) => void;
  isOwner: boolean;
  isDragging?: boolean;
}

export const ClassroomCard = memo(function ClassroomCard({
  classroom,
  onClick,
  onDelete,
  onEdit,
  onUpdateThumbnail,
  isOwner,
  isDragging,
}: ClassroomCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Sortable hooks (only active for owner)
  const sortableProps = useSortable({ id: classroom._id, disabled: !isOwner });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = sortableProps;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    zIndex: isSortableDragging ? 50 : "auto",
  };

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
      ref={setNodeRef}
      style={style}
      className={`relative cursor-pointer hover:ring-2 hover:ring-accent transition-all group flex flex-col ${isSortableDragging ? 'ring-2 ring-accent' : ''}`}
      onClick={onClick}
    >
      {/* Drag handle (owner only) - top-left corner */}
      {isOwner && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-20 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="w-8 h-8 rounded-full bg-bg-base/90 backdrop-blur-sm flex items-center justify-center hover:bg-bg-base shadow-lg">
            <GripVertical className="w-4 h-4 text-text-secondary" />
          </div>
        </div>
      )}
      
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
            <Select
              onValueChange={(value) => {
                if (value === "edit") {
                  onEdit();
                } else if (value === "delete") {
                  onDelete();
                }
              }}
            >
              <SelectTrigger
                className="w-8 h-8 rounded-full bg-bg-base/80 flex items-center justify-center p-0 border-0 hover:bg-bg-base/90 [&>span]:hidden [&>svg:last-child]:hidden"
                aria-label="Classroom options menu"
              >
                <MoreHorizontal className="w-4 h-4 text-text-primary" />
              </SelectTrigger>
              <SelectContent className="w-32">
                <SelectItem
                  value="edit"
                  hideCheck
                  className="text-text-primary hover:bg-bg-elevated"
                >
                  Edit
                </SelectItem>
                <SelectItem
                  value="delete"
                  hideCheck
                  className="text-error hover:bg-bg-elevated"
                >
                  Delete
                </SelectItem>
              </SelectContent>
            </Select>
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
                className="h-full bg-green-500 rounded-full transition-all shadow-[0_0px_4px_2px_rgba(5,222,106,0.2)]"
                style={{ width: `${classroom.progress}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
