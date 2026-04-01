"use client";

import { Play } from "lucide-react";
import { Text } from "@/components/ui/Text";
import { getVideoThumbnail } from "@/lib/utils";

interface LessonItemProps {
  page: {
    _id: string;
    title: string;
    videoUrl?: string;
    isViewed?: boolean;
  };
  isSelected: boolean;
  isOwner: boolean;
  onSelect: () => void;
  onOpenMenu?: () => void;
}

export function LessonItem({
  page,
  isSelected,
  isOwner,
  onSelect,
  onOpenMenu,
}: LessonItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        flex items-center gap-3 px-4 py-2 w-full text-left transition-colors
        ${isSelected 
          ? "bg-accent-subtle" 
          : "hover:bg-bg-elevated"
        }
      `}
      aria-current={isSelected ? "page" : undefined}
    >
      {/* Drag handle */}
      <div className="flex h-full cursor-grab items-center active:cursor-grabbing text-text-muted">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-text-muted" aria-hidden="true">
          <path d="M5.5 11.75C6.19036 11.75 6.75 12.3096 6.75 13C6.75 13.6904 6.19036 14.25 5.5 14.25C4.80964 14.25 4.25 13.6904 4.25 13C4.25 12.3096 4.80964 11.75 5.5 11.75ZM10.5 11.75C11.1904 11.75 11.75 12.3096 11.75 13C11.75 13.6904 11.1904 14.25 10.5 14.25C9.80964 14.25 9.25 13.6904 9.25 13C9.25 12.3096 9.80964 11.75 10.5 11.75ZM5.5 6.75C6.19036 6.75 6.75 7.30964 6.75 8C6.75 8.69036 6.19036 9.25 5.5 9.25C4.80964 9.25 4.25 8.69036 4.25 8C4.25 7.30964 4.80964 6.75 5.5 6.75ZM10.5 6.75C11.1904 6.75 11.75 7.30964 11.75 8C11.75 8.69036 11.1904 9.25 10.5 9.25C9.80964 9.25 9.25 8.69036 9.25 8C9.25 7.30964 9.80964 6.75 10.5 6.75ZM5.5 1.75C6.19036 1.75 6.75 2.30964 6.75 3C6.75 3.69036 6.19036 4.25 5.5 4.25C4.80964 4.25 4.25 3.69036 4.25 3C4.25 2.30964 4.80964 1.75 5.5 1.75ZM10.5 1.75C11.1904 1.75 11.75 2.30964 11.75 3C11.75 3.69036 11.1904 4.25 10.5 4.25C9.80964 4.25 9.25 3.69036 9.25 3C9.25 2.30964 9.80964 1.75 10.5 1.75Z" fill="currentColor"/>
        </svg>
      </div>

      {/* Thumbnail */}
      {page.videoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getVideoThumbnail(page.videoUrl) || undefined}
          alt=""
          className="bg-bg-elevated flex h-[60px] w-[110px] shrink-0 items-center justify-center self-stretch rounded-lg"
        />
      ) : (
        <div className="bg-bg-elevated flex h-[60px] w-[110px] shrink-0 items-center justify-center self-stretch rounded-lg">
          <Play className="w-4 h-4 text-text-muted" />
        </div>
      )}

      {/* Title and completion status */}
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="line-clamp-2 text-sm font-medium text-text-primary">
            {page.title}
          </span>
          {page.isViewed && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-success shrink-0" aria-label="Completed">
              <path d="M13.3333 4L6.00001 11.3333L2.66667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <Text size="1" theme="muted">
          {page.videoUrl ? 'Video' : 'Lesson'}
        </Text>
      </div>

      {/* More options button - owner only */}
      {isOwner && onOpenMenu && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu();
          }}
          className="mt-1 -mr-2.5 self-start rounded-full p-1.5 text-text-muted hover:bg-bg-elevated"
          aria-label="Lesson options"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.75 10.25C4.75 9.55964 5.30964 9 6 9C6.69036 9 7.25 9.55964 7.25 10.25C7.25 10.9404 6.69036 11.5 6 11.5C5.30964 11.5 4.75 10.9404 4.75 10.25ZM4.75 6C4.75 5.30964 5.30964 4.75 6 4.75C6.69036 4.75 7.25 5.30964 7.25 6C7.25 6.69036 6.69036 7.25 6 7.25C5.30964 7.25 4.75 6.69036 4.75 6ZM4.75 1.75C4.75 1.05964 5.30964 0.5 6 0.5C6.69036 0.5 7.25 1.05964 7.25 1.75C7.25 2.44036 6.69036 3 6 3C5.30964 3 4.75 2.44036 4.75 1.75Z" fill="currentColor"/>
          </svg>
        </button>
      )}
    </button>
  );
}