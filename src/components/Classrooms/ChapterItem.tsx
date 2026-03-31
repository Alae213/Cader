"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Text } from "@/components/ui/Text";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { LessonItem } from "./LessonItem";

interface PageData {
  _id: string;
  title: string;
  order: number;
  videoUrl?: string;
  isViewed?: boolean;
}

interface ModuleData {
  _id: string;
  title: string;
  order: number;
  pages: PageData[];
}

interface ChapterItemProps {
  module: ModuleData;
  isCollapsed: boolean;
  isActive: boolean;
  isOwner: boolean;
  selectedPageId: string | null;
  chapterProgress: number;
  totalLessons: number;
  completedLessons: number;
  onToggleCollapse: (moduleId: string) => void;
  onSelectPage: (pageId: string) => void;
  onAddLesson: (moduleId: string) => void;
  onOpenChapterMenu: (moduleId: string) => void;
  openMenu?: boolean;
  setOpenMenu?: (open: boolean) => void;
  editingChapterId?: string | null;
  setEditingChapterId?: (id: string | null) => void;
  editingChapterTitle?: string;
  setEditingChapterTitle?: (title: string) => void;
  handleTitleBlur?: () => void;
  handleTitleKeyDown?: (e: React.KeyboardEvent) => void;
  setDeleteConfirm?: (data: { id: string; title: string; lessonCount: number } | null) => void;
  lessonsSortableId?: string;
  onLessonDragEnd?: (moduleId: string, event: { active: { id: string }; over: { id: string } | null }) => void;
}

export function ChapterItem({
  module,
  isCollapsed,
  isActive,
  isOwner,
  selectedPageId,
  chapterProgress,
  totalLessons,
  completedLessons,
  onToggleCollapse,
  onSelectPage,
  onAddLesson,
  onOpenChapterMenu,
  openMenu,
  setOpenMenu,
  editingChapterId,
  setEditingChapterId,
  editingChapterTitle,
  setEditingChapterTitle,
  handleTitleBlur,
  handleTitleKeyDown,
  setDeleteConfirm,
  lessonsSortableId,
  onLessonDragEnd,
}: ChapterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="group bg-bg-surface flex min-h-[44px] shrink-0 flex-col overflow-hidden rounded-lg"
    >
      {/* Chapter Header */}
      <div className="flex h-11 items-center gap-2 px-3">
        {/* Drag handle - owner only */}
        {isOwner && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex h-full cursor-grab items-center active:cursor-grabbing text-text-muted hover:text-text-primary"
            aria-label="Drag to reorder"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 11.75C6.19036 11.75 6.75 12.3096 6.75 13C6.75 13.6904 6.19036 14.25 5.5 14.25C4.80964 14.25 4.25 13.6904 4.25 13C4.25 12.3096 4.80964 11.75 5.5 11.75ZM10.5 11.75C11.1904 11.75 11.75 12.3096 11.75 13C11.75 13.6904 11.1904 14.25 10.5 14.25C9.80964 14.25 9.25 13.6904 9.25 13C9.25 12.3096 9.80964 11.75 10.5 11.75ZM5.5 6.75C6.19036 6.75 6.75 7.30964 6.75 8C6.75 8.69036 6.19036 9.25 5.5 9.25C4.80964 9.25 4.25 8.69036 4.25 8C4.25 7.30964 4.80964 6.75 5.5 6.75ZM10.5 6.75C11.1904 6.75 11.75 7.30964 11.75 8C11.75 8.69036 11.1904 9.25 10.5 9.25C9.80964 9.25 9.25 8.69036 9.25 8C9.25 7.30964 9.80964 6.75 10.5 6.75ZM5.5 1.75C6.19036 1.75 6.75 2.30964 6.75 3C6.75 3.69036 6.19036 4.25 5.5 4.25C4.80964 4.25 4.25 3.69036 4.25 3C4.25 2.30964 4.80964 1.75 5.5 1.75ZM10.5 1.75C11.1904 1.75 11.75 2.30964 11.75 3C11.75 3.69036 11.1904 4.25 10.5 4.25C9.80964 4.25 9.25 3.69036 9.25 3C9.25 2.30964 9.80964 1.75 10.5 1.75Z" fill="currentColor"/>
            </svg>
          </button>
        )}

        {/* Expand/collapse chevron */}
        {module.pages?.length ? (
          <button 
            type="button"
            onClick={() => !isOwner ? undefined : onToggleCollapse(module._id)}
            className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-bg-elevated text-text-muted"
            style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M3.40002 4.75L5.82325 7.17323C5.92088 7.27086 6.07917 7.27086 6.1768 7.17323L8.60003 4.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Chapter title */}
        <Text size="2" theme={isActive ? "default" : "secondary"} className="font-medium truncate flex-1">
          {module.title}
        </Text>

        {/* Progress */}
        {totalLessons > 0 && (
          <div className="flex items-center gap-1">
            <ProgressRing progress={chapterProgress} size={18} strokeWidth={2} />
            <Text size="0" theme="muted">{completedLessons}/{totalLessons}</Text>
          </div>
        )}

        {/* Add lesson button - owner only */}
        {isOwner && (
          <button
            type="button"
            onClick={() => onAddLesson(module._id)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-elevated text-text-muted hover:text-accent"
            aria-label="Add lesson"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.75V8M8 14.25V8M8 8H1.75M8 8H14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* 3-dot menu - owner only */}
        {isOwner && (
          <button
            type="button"
            onClick={() => onOpenChapterMenu(module._id)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-bg-elevated"
            aria-label="Chapter options"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.75 10.25C4.75 9.55964 5.30964 9 6 9C6.69036 9 7.25 9.55964 7.25 10.25C7.25 10.9404 6.69036 11.5 6 11.5C5.30964 11.5 4.75 10.9404 4.75 10.25ZM4.75 6C4.75 5.30964 5.30964 4.75 6 4.75C6.69036 4.75 7.25 5.30964 7.25 6C7.25 6.69036 6.69036 7.25 6 7.25C5.30964 7.25 4.75 6.69036 4.75 6ZM4.75 1.75C4.75 1.05964 5.30964 0.5 6 0.5C6.69036 0.5 7.25 1.05964 7.25 1.75C7.25 2.44036 6.69036 3 6 3C5.30964 3 4.75 2.44036 4.75 1.75Z" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>

      {/* Lessons container */}
      {!isCollapsed && module.pages && module.pages.length > 0 && (
        <div className="border-t border-mauve-4/30 bg-bg-base">
          <div className="flex flex-col">
            {module.pages.map((page) => (
              <LessonItem
                key={page._id}
                page={page}
                moduleId={module._id}
                isSelected={selectedPageId === page._id}
                isOwner={isOwner}
                onSelect={() => onSelectPage(page._id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}