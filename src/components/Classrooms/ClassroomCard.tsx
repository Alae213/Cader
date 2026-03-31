"use client";

import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Text } from "@/components/ui/Text";
import { ThumbnailUpload } from "../community/ThumbnailUpload";

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
}

export const ClassroomCard = memo(function ClassroomCard({
  classroom,
  onClick,
  onDelete,
  onEdit,
  onUpdateThumbnail,
  isOwner,
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
            <div className="relative">
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
