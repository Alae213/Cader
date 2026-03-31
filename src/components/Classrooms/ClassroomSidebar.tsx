"use client";

import { useMemo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { ChevronLeft, ChevronDown, X, MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { getVideoThumbnail } from "@/lib/utils";

interface ModuleData {
  _id: string;
  title: string;
  order: number;
  pages: { _id: string; title: string; order: number; isViewed?: boolean; videoUrl?: string }[];
}

interface ClassroomSidebarProps {
  classroomContent: {
    modules?: ModuleData[];
    title?: string;
  } | null | undefined;
  modules: ModuleData[];
  selectedPageId: string | null;
  isOwner: boolean;
  isSidebarOpen: boolean;
  collapsedModules: Set<string>;
  onBack: () => void;
  onCloseSidebar: () => void;
  onToggleCollapse: (moduleId: string) => void;
  onSelectPage: (pageId: string) => void;
  onAddChapter: () => void;
  onAddLesson: (moduleId: string) => void;
  onChapterDragEnd: (event: DragEndEvent) => void;
  sensors: any;
  openChapterMenu: string | null;
  setOpenChapterMenu: (id: string | null) => void;
  editingChapterId: string | null;
  setEditingChapterId: (id: string | null) => void;
  editingChapterTitle: string;
  setEditingChapterTitle: (title: string) => void;
  handleChapterTitleBlur: (chapterId: string) => void;
  handleChapterTitleKeyDown: (e: React.KeyboardEvent, chapterId: string) => void;
  deleteConfirmChapter: { id: string; title: string; lessonCount: number } | null;
  setDeleteConfirmChapter: (data: { id: string; title: string; lessonCount: number } | null) => void;
  handleDeleteChapter: () => void;
  isPageCompleted: (pageId: string) => boolean;
}

// Sortable Chapter Wrapper
function SortableChapter({ 
  module, 
  children,
  isOwner 
}: { 
  module: ModuleData; 
  children: React.ReactNode;
  isOwner: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module._id, disabled: !isOwner });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...(isOwner ? attributes : {})} {...(isOwner ? listeners : {})}>
      {children}
    </div>
  );
}

// Chapter Header Component
function ChapterHeader({
  module,
  isCollapsed,
  isActive,
  isOwner,
  totalLessons,
  completedLessons,
  chapterProgress,
  onToggleCollapse,
  onAddLesson,
  openMenu,
  setOpenMenu,
  editingChapterId,
  setEditingChapterId,
  editingChapterTitle,
  setEditingChapterTitle,
  handleTitleBlur,
  handleTitleKeyDown,
  setDeleteConfirm,
}: {
  module: ModuleData;
  isCollapsed: boolean;
  isActive: boolean;
  isOwner: boolean;
  totalLessons: number;
  completedLessons: number;
  chapterProgress: number;
  onToggleCollapse: () => void;
  onAddLesson: () => void;
  openMenu: boolean;
  setOpenMenu: (open: boolean) => void;
  editingChapterId: string | null;
  setEditingChapterId: (id: string | null) => void;
  editingChapterTitle: string;
  setEditingChapterTitle: (title: string) => void;
  handleTitleBlur: () => void;
  handleTitleKeyDown: (e: React.KeyboardEvent) => void;
  setDeleteConfirm: () => void;
}) {
  const isEditing = editingChapterId === module._id;

  return (
    <div className="flex h-11 items-center gap-2 px-3">
      {/* Drag handle - owner only */}
      {isOwner && (
        <div className="flex h-full cursor-grab items-center active:cursor-grabbing text-text-muted">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.5 11.75C6.19036 11.75 6.75 12.3096 6.75 13C6.75 13.6904 6.19036 14.25 5.5 14.25C4.80964 14.25 4.25 13.6904 4.25 13C4.25 12.3096 4.80964 11.75 5.5 11.75ZM10.5 11.75C11.1904 11.75 11.75 12.3096 11.75 13C11.75 13.6904 11.1904 14.25 10.5 14.25C9.80964 14.25 9.25 13.6904 9.25 13C9.25 12.3096 9.80964 11.75 10.5 11.75ZM5.5 6.75C6.19036 6.75 6.75 7.30964 6.75 8C6.75 8.69036 6.19036 9.25 5.5 9.25C4.80964 9.25 4.25 8.69036 4.25 8C4.25 7.30964 4.80964 6.75 5.5 6.75ZM10.5 6.75C11.1904 6.75 11.75 7.30964 11.75 8C11.75 8.69036 11.1904 9.25 10.5 9.25C9.80964 9.25 9.25 8.69036 9.25 8C9.25 7.30964 9.80964 6.75 10.5 6.75ZM5.5 1.75C6.19036 1.75 6.75 2.30964 6.75 3C6.75 3.69036 6.19036 4.25 5.5 4.25C4.80964 4.25 4.25 3.69036 4.25 3C4.25 2.30964 4.80964 1.75 5.5 1.75ZM10.5 1.75C11.1904 1.75 11.75 2.30964 11.75 3C11.75 3.69036 11.1904 4.25 10.5 4.25C9.80964 4.25 9.25 3.69036 9.25 3C9.25 2.30964 9.80964 1.75 10.5 1.75Z" fill="currentColor"/>
          </svg>
        </div>
      )}

      {/* Expand/collapse chevron */}
      {module.pages?.length ? (
        <button 
          type="button"
          onClick={onToggleCollapse}
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
      {isEditing && isOwner ? (
        <input
          type="text"
          value={editingChapterTitle}
          onChange={(e) => setEditingChapterTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          className="flex-1 bg-bg-elevated border border-accent rounded px-2 py-1 text-sm font-medium focus:outline-none"
          autoFocus
        />
      ) : (
        <Text size="2" theme={isActive ? "default" : "secondary"} className="font-medium truncate flex-1">
          {module.title}
        </Text>
      )}

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
          onClick={onAddLesson}
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
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(!openMenu)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-bg-elevated"
            aria-label="Chapter options"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.75 10.25C4.75 9.55964 5.30964 9 6 9C6.69036 9 7.25 9.55964 7.25 10.25C7.25 10.9404 6.69036 11.5 6 11.5C5.30964 11.5 4.75 10.9404 4.75 10.25ZM4.75 6C4.75 5.30964 5.30964 4.75 6 4.75C6.69036 4.75 7.25 5.30964 7.25 6C7.25 6.69036 6.69036 7.25 6 7.25C5.30964 7.25 4.75 6.69036 4.75 6ZM4.75 1.75C4.75 1.05964 5.30964 0.5 6 0.5C6.69036 0.5 7.25 1.05964 7.25 1.75C7.25 2.44036 6.69036 3 6 3C5.30964 3 4.75 2.44036 4.75 1.75Z" fill="currentColor"/>
            </svg>
          </button>
          {openMenu && (
            <div className="absolute right-0 top-7 bg-bg-surface border border-mauve-4 rounded-lg shadow-lg py-1 min-w-[120px] z-20">
              <button 
                onClick={() => {
                  setEditingChapterId(module._id);
                  setEditingChapterTitle(module.title);
                  setOpenMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2 text-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Rename
              </button>
              <button 
                onClick={() => {
                  setDeleteConfirm();
                  setOpenMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2 text-sm text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Lesson Item Component
function LessonItem({
  page,
  isSelected,
  isOwner,
  isCompleted,
  onSelect,
}: {
  page: { _id: string; title: string; videoUrl?: string; isViewed?: boolean };
  isSelected: boolean;
  isOwner: boolean;
  isCompleted: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-1.5 w-full text-left transition-colors ${
        isSelected ? "bg-accent-subtle" : "hover:bg-bg-elevated"
      }`}
    >
      {/* Drag handle - owner only */}
      {isOwner && (
        <div className="flex h-full cursor-grab items-center active:cursor-grabbing text-text-muted">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M5.5 11.75C6.19036 11.75 6.75 12.3096 6.75 13C6.75 13.6904 6.19036 14.25 5.5 14.25C4.80964 14.25 4.25 13.6904 4.25 13C4.25 12.3096 4.80964 11.75 5.5 11.75ZM10.5 11.75C11.1904 11.75 11.75 12.3096 11.75 13C11.75 13.6904 11.1904 14.25 10.5 14.25C9.80964 14.25 9.25 13.6904 9.25 13C9.25 12.3096 9.80964 11.75 10.5 11.75ZM5.5 6.75C6.19036 6.75 6.75 7.30964 6.75 8C6.75 8.69036 6.19036 9.25 5.5 9.25C4.80964 9.25 4.25 8.69036 4.25 8C4.25 7.30964 4.80964 6.75 5.5 6.75ZM10.5 6.75C11.1904 6.75 11.75 7.30964 11.75 8C11.75 8.69036 11.1904 9.25 10.5 9.25C9.80964 9.25 9.25 8.69036 9.25 8C9.25 7.30964 9.80964 6.75 10.5 6.75ZM5.5 1.75C6.19036 1.75 6.75 2.30964 6.75 3C6.75 3.69036 6.19036 4.25 5.5 4.25C4.80964 4.25 4.25 3.69036 4.25 3C4.25 2.30964 4.80964 1.75 5.5 1.75ZM10.5 1.75C11.1904 1.75 11.75 2.30964 11.75 3C11.75 3.69036 11.1904 4.25 10.5 4.25C9.80964 4.25 9.25 3.69036 9.25 3C9.25 2.30964 9.80964 1.75 10.5 1.75Z" fill="currentColor"/>
          </svg>
        </div>
      )}

      {/* Thumbnail */}
      {page.videoUrl ? (
        <img
          src={getVideoThumbnail(page.videoUrl) || undefined}
          alt=""
          className="bg-bg-elevated flex h-8 w-16 shrink-0 items-center justify-center rounded"
        />
      ) : (
        <div className="bg-bg-elevated flex h-8 w-16 shrink-0 items-center justify-center rounded">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-text-muted">
            <path d="M8 1.75V8M8 14.25V8M8 8H1.75M8 8H14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Title and completion */}
      <div className="flex flex-1 items-center gap-1 min-w-0">
        <span className="truncate text-xs text-text-primary">{page.title}</span>
        {isCompleted && (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-success shrink-0">
            <path d="M13.3333 4L6.00001 11.3333L2.66667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </button>
  );
}

export function ClassroomSidebar({
  classroomContent,
  modules,
  selectedPageId,
  isOwner,
  isSidebarOpen,
  collapsedModules,
  onBack,
  onCloseSidebar,
  onToggleCollapse,
  onSelectPage,
  onAddChapter,
  onAddLesson,
  onChapterDragEnd,
  sensors,
  openChapterMenu,
  setOpenChapterMenu,
  editingChapterId,
  setEditingChapterId,
  editingChapterTitle,
  setEditingChapterTitle,
  handleChapterTitleBlur,
  handleChapterTitleKeyDown,
  deleteConfirmChapter,
  setDeleteConfirmChapter,
  handleDeleteChapter,
  isPageCompleted,
}: ClassroomSidebarProps) {
  // Calculate overall progress
  const progress = useMemo(() => {
    const allPages = classroomContent?.modules?.flatMap(m => m.pages || []) || [];
    const total = allPages.length;
    const completed = allPages.filter(p => p.isViewed).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [classroomContent]);

  const handleOverlayKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCloseSidebar();
    }
  };

  const getChapterProgress = (module: ModuleData) => {
    const total = module.pages?.length || 0;
    const completed = module.pages?.filter(p => p.isViewed).length || 0;
    return { total, completed, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const renderChapters = () => {
    if (!classroomContent) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      );
    }

    if (modules.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
          <ChevronDown className="w-8 h-8 text-text-muted" />
          <Text size="2" theme="muted">No chapters yet</Text>
          {isOwner && (
            <Button size="sm" onClick={onAddChapter}>
              Create First Chapter
            </Button>
          )}
        </div>
      );
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onChapterDragEnd}
      >
        <SortableContext
          items={modules.map(m => m._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {modules.map((module) => {
              const { total, completed, progress: chapterProgress } = getChapterProgress(module);
              const isCollapsed = collapsedModules.has(module._id);
              const isActive = module.pages?.some(p => p._id === selectedPageId);

              return (
                <SortableChapter key={module._id} module={module} isOwner={isOwner}>
                  <div className="bg-bg-surface rounded-lg overflow-hidden">
                    <ChapterHeader
                      module={module}
                      isCollapsed={isCollapsed}
                      isActive={isActive}
                      isOwner={isOwner}
                      totalLessons={total}
                      completedLessons={completed}
                      chapterProgress={chapterProgress}
                      onToggleCollapse={() => onToggleCollapse(module._id)}
                      onAddLesson={() => onAddLesson(module._id)}
                      openMenu={openChapterMenu === module._id}
                      setOpenMenu={(open) => setOpenChapterMenu(open ? module._id : null)}
                      editingChapterId={editingChapterId}
                      setEditingChapterId={setEditingChapterId}
                      editingChapterTitle={editingChapterTitle}
                      setEditingChapterTitle={setEditingChapterTitle}
                      handleTitleBlur={() => handleChapterTitleBlur(module._id)}
                      handleTitleKeyDown={(e) => handleChapterTitleKeyDown(e, module._id)}
                      setDeleteConfirm={() => setDeleteConfirmChapter({
                        id: module._id,
                        title: module.title,
                        lessonCount: module.pages?.length || 0
                      })}
                    />
                    {!isCollapsed && module.pages && module.pages.length > 0 && (
                      <div className="border-t border-mauve-4/30 bg-bg-base">
                        {module.pages.map((page) => (
                          <LessonItem
                            key={page._id}
                            page={page}
                            isSelected={selectedPageId === page._id}
                            isOwner={isOwner}
                            isCompleted={isPageCompleted(page._id)}
                            onSelect={() => onSelectPage(page._id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </SortableChapter>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    );
  };

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onCloseSidebar}
          onKeyDown={handleOverlayKeyDown}
          role="button"
          tabIndex={-1}
          aria-label="Close sidebar"
          aria-hidden="true"
        />
      )}

      <div className={`
        fixed lg:relative z-50 lg:z-auto
        w-72 h-full
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <Card className="h-full flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-mauve-4/30 space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-text-secondary hover:text-text-primary text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
              <button
                className="lg:hidden p-1.5 hover:bg-bg-elevated rounded-lg"
                onClick={onCloseSidebar}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <Text size="0" theme="muted">{progress}%</Text>
            </div>
          </div>

          {/* Chapters list */}
          <div className="flex-1 overflow-y-auto p-2">
            {renderChapters()}
          </div>

          {/* Add Chapter button - owner only */}
          {isOwner && modules.length > 0 && (
            <div className="p-2 border-t border-mauve-4/30">
              <button
                type="button"
                onClick={onAddChapter}
                className="flex h-10 w-full items-center gap-2 rounded-lg border border-dashed border-mauve-4 px-3 hover:border-mauve-6 hover:bg-bg-elevated transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-text-muted">
                  <path d="M8 1.75V8M8 14.25V8M8 8H1.75M8 8H14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-medium text-text-muted">Add Chapter</span>
              </button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}