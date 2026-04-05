"use client";

import { useMemo, useEffect, useRef, memo, useCallback } from "react";
import * as React from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronDown, X, Trash2, Edit3, Play, Plus, GripVertical, MoreVertical } from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { getVideoThumbnail } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { SensorDescriptor } from "@dnd-kit/core";

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
  onLessonDragEnd: (moduleId: string, event: DragEndEvent) => void;
  sensors: SensorDescriptor<object>[];
  editingChapterId: string | null;
  setEditingChapterId: (id: string | null) => void;
  editingChapterTitle: string;
  setEditingChapterTitle: (title: string) => void;
  handleChapterTitleBlur: (chapterId: string) => void;
  handleChapterTitleKeyDown: (e: React.KeyboardEvent, chapterId: string) => void;
  setDeleteConfirmChapter: (data: { id: string; title: string; lessonCount: number } | null) => void;
  setDeleteConfirmLesson: (data: { id: string; title: string } | null) => void;
  isPageCompleted: (pageId: string) => boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optimisticLessonOrders: Record<string, any[]>;
  // Lesson title editing
  editingLessonId: string | null;
  setEditingLessonId: (id: string | null) => void;
  editingLessonTitle: string;
  setEditingLessonTitle: (title: string) => void;
  handleLessonTitleBlur: () => void;
  handleLessonTitleKeyDown: (e: React.KeyboardEvent) => void;
}

// Sortable Chapter Wrapper
const SortableChapter = memo(function SortableChapter({ 
  module, 
  children,
  isOwner 
}: { 
  module: ModuleData; 
  children: React.ReactNode;
  isOwner: boolean;
}) {
  const { 
    attributes: sortableAttributes,
    listeners: sortableListeners,
    setNodeRef,
    transform: sortableTransform,
    transition: sortableTransition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: module._id, disabled: !isOwner });

  const style = {
    transform: CSS.Transform.toString(sortableTransform),
    transition: sortableTransition,
    opacity: sortableIsDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {React.cloneElement(children as React.ReactElement<{ dragAttrs?: Record<string, unknown>; dragListeners?: Record<string, unknown> }>, {
        dragAttrs: isOwner ? { ...sortableAttributes } : undefined,
        dragListeners: isOwner ? { ...sortableListeners } : undefined,
      })}
    </div>
  );
});

// Sortable Lesson Wrapper
const SortableLesson = memo(function SortableLesson({ 
  page, 
  moduleId,
  children,
  isOwner 
}: { 
  page: { _id: string }; 
  moduleId: string;
  children: React.ReactNode;
  isOwner: boolean;
}) {
  const { 
    attributes: lessonAttributes,
    listeners: lessonListeners,
    setNodeRef,
    transform: lessonTransform,
    transition: lessonTransition,
    isDragging: lessonIsDragging,
  } = useSortable({ id: page._id, data: { moduleId }, disabled: !isOwner });

  const style = {
    transform: CSS.Transform.toString(lessonTransform),
    transition: lessonTransition,
    opacity: lessonIsDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {React.cloneElement(children as React.ReactElement<{ dragAttrs?: Record<string, unknown>; dragListeners?: Record<string, unknown> }>, {
        dragAttrs: isOwner ? { ...lessonAttributes } : undefined,
        dragListeners: isOwner ? { ...lessonListeners } : undefined,
      })}
    </div>
  );
});

// Chapter Header Component
const ChapterHeader = memo(function ChapterHeader({
  module,
  isCollapsed,
  isActive,
  isOwner,
  totalLessons,
  completedLessons,
  chapterProgress,
  onToggleCollapse,
  onAddLesson,
  editingChapterId,
  setEditingChapterId,
  editingChapterTitle,
  setEditingChapterTitle,
  handleTitleBlur,
  handleTitleKeyDown,
  setDeleteConfirm,
  onRenameSelect,
  onDeleteSelect,
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
  editingChapterId: string | null;
  setEditingChapterId: (id: string | null) => void;
  editingChapterTitle: string;
  setEditingChapterTitle: (title: string) => void;
  handleTitleBlur: () => void;
  handleTitleKeyDown: (e: React.KeyboardEvent) => void;
  setDeleteConfirm: () => void;
  onRenameSelect: () => void;
  onDeleteSelect: () => void;
}) {
  const isEditing = editingChapterId === module._id;
  return (
    <div className="relative flex h-11 items-center gap-2 px-3 group/chapter ">
      {/* Drag handle - absolutely positioned, visible on hover for owner */}
      {isOwner && (
        <div
          className="absolute -left-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded cursor-grab active:cursor-grabbing text-text-muted opacity-0 group-hover/chapter:opacity-100 transition-opacity hover:bg-bg-elevated/20 hover:text-text-primary"
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}

      {/* Expand/collapse chevron */}
      {module.pages?.length ? (
        <button 
          type="button"
          onClick={onToggleCollapse}
          className="flex h-8 w-6 items-center cursor-pointer justify-center rounded-full hover:bg-white/10 text-text-muted"
          aria-label={isCollapsed ? "Expand" : "Collapse"}
        > 
          <svg
          width="10"
          height="10"
          viewBox="0 0 12 20"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0.702509 13.2926C1.09284 12.8995 1.72829 12.8984 2.12 13.2901L4.58579 15.7559C5.36684 16.5369 6.63316 16.5369 7.41421 15.7559L9.88 13.2901C10.2717 12.8984 10.9072 12.8995 11.2975 13.2926C11.6859 13.6837 11.6848 14.3153 11.295 14.7051L7.41421 18.5859C6.63317 19.3669 5.36684 19.3669 4.58579 18.5859L0.705005 14.7051C0.315239 14.3153 0.314123 13.6837 0.702509 13.2926Z" fill="currentColor" />
          <path d="M11.2975 7.28749C10.9072 7.68059 10.2717 7.68171 9.88 7.28999L7.41421 4.82421C6.63316 4.04316 5.36684 4.04316 4.58579 4.82421L2.12 7.28999C1.72829 7.68171 1.09284 7.68059 0.702509 7.28749C0.314123 6.89635 0.315239 6.26476 0.705005 5.87499L4.58579 1.99421C5.36683 1.21316 6.63316 1.21316 7.41421 1.99421L11.295 5.87499C11.6848 6.26476 11.6859 6.89635 11.2975 7.28749Z" fill="currentColor" />
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
          maxLength={100}
          className="flex-1 bg-white/10 rounded px-2 py-1 focus:outline-none w-fit"
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
          {!isOwner && <Text size="0" theme="muted">{completedLessons}/{totalLessons}</Text>}
        </div>
      )}

      {/* Add lesson button - owner only */}
      {isOwner && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onAddLesson}
          className="h-6 w-8 p-0 rounded-full hover:bg-white/60"
          aria-label="Add lesson"
        >
          <Plus className="w-4 h-4 stroke-3" />
        </Button>
      )}

      {/* 3-dot menu - owner only, using Select */}
      {isOwner && (
        <Select onValueChange={(value) => {
          if (value === "rename") {
            onRenameSelect();
          } else if (value === "delete") {
            onDeleteSelect();
          }
        }}>
          <SelectTrigger 
          className="w-8 h-8 rounded-full bg-white/0 hover:bg-white/40 flex items-center justify-center p-0 border-0 hover:bg-bg-base/90 [&>span]:hidden [&>svg:last-child]:hidden"
          aria-label="Chapter options menu">
            <MoreVertical className="w-4 h-4" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rename">
              <div className="flex items-center gap-2">
                <Edit3 className="w-3 h-3" />
                Rename
              </div>
            </SelectItem>
            <SelectItem value="delete" className="text-red-500 hover:text-red-500">
              <div className="flex items-center gap-2">
                <Trash2 className="w-3 h-3" />
                Delete
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
});

// Lesson Item Component
const LessonItem = memo(function LessonItem({
  page,
  moduleId,
  isSelected,
  isOwner,
  isCompleted,
  onSelect,
  onDelete,
  editingLessonId,
  setEditingLessonId,
  editingLessonTitle,
  setEditingLessonTitle,
  handleLessonTitleBlur,
  handleLessonTitleKeyDown,
  onRenameSelect,
  onDeleteSelect,
  dragAttrs,
  dragListeners,
}: {
  page: { _id: string; title: string; videoUrl?: string; isViewed?: boolean };
  moduleId: string;
  isSelected: boolean;
  isOwner: boolean;
  isCompleted: boolean;
  onSelect: () => void;
  onDelete: () => void;
  editingLessonId: string | null;
  setEditingLessonId: (id: string | null) => void;
  editingLessonTitle: string;
  setEditingLessonTitle: (title: string) => void;
  handleLessonTitleBlur: () => void;
  handleLessonTitleKeyDown: (e: React.KeyboardEvent) => void;
  onRenameSelect: () => void;
  onDeleteSelect: () => void;
  dragAttrs?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}) {
  const isEditing = editingLessonId === page._id;

  return (
    <div className="relative flex items-center group/lesson">
      {/* Drag handle - absolutely positioned, visible on hover for owner */}
      {isOwner && (
        <div
          {...dragAttrs}
          {...dragListeners}
          className="absolute left-0.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded cursor-grab active:cursor-grabbing text-text-muted opacity-0 group-hover/lesson:opacity-100 transition-opacity z-10"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M5.5 11.75C6.19036 11.75 6.75 12.3096 6.75 13C6.75 13.6904 6.19036 14.25 5.5 14.25C4.80964 14.25 4.25 13.6904 4.25 13C4.25 12.3096 4.80964 11.75 5.5 11.75ZM10.5 11.75C11.1904 11.75 11.75 12.3096 11.75 13C11.75 13.6904 11.1904 14.25 10.5 14.25C9.80964 14.25 9.25 13.6904 9.25 13C9.25 12.3096 9.80964 11.75 10.5 11.75ZM5.5 6.75C6.19036 6.75 6.75 7.30964 6.75 8C6.75 8.69036 6.19036 9.25 5.5 9.25C4.80964 9.25 4.25 8.69036 4.25 8C4.25 7.30964 4.80964 6.75 5.5 6.75ZM10.5 6.75C11.1904 6.75 11.75 7.30964 11.75 8C11.75 8.69036 11.1904 9.25 10.5 9.25C9.80964 9.25 9.25 8.69036 9.25 8C9.25 7.30964 9.80964 6.75 10.5 6.75ZM5.5 1.75C6.19036 1.75 6.75 2.30964 6.75 3C6.75 3.69036 6.19036 4.25 5.5 4.25C4.80964 4.25 4.25 3.69036 4.25 3C4.25 2.30964 4.80964 1.75 5.5 1.75ZM10.5 1.75C11.1904 1.75 11.75 2.30964 11.75 3C11.75 3.69036 11.1904 4.25 10.5 4.25C9.80964 4.25 9.25 3.69036 9.25 3C9.25 2.30964 9.80964 1.75 10.5 1.75Z" fill="currentColor"/>
          </svg>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
        className={`flex items-center gap-2 px-3 py-1.5 w-full hover:bg-accent-muted text-left transition-colors cursor-pointer ${
          isSelected ? "bg-accent-subtle" : ""
        }`}
      >
        {/* Thumbnail */}
        {page.videoUrl ? (
          <Image
            src={getVideoThumbnail(page.videoUrl) || "/placeholder.png"}
            alt=""
            width={64}
            height={32}
            className="bg-bg-elevated flex h-8 w-16 shrink-0 items-center justify-center rounded object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = "/placeholder.png";
            }}
          />
        ) : (
          <div className="bg-bg-elevated flex h-8 w-16 shrink-0 items-center justify-center rounded">
            <Play className="w-3 h-3 text-text-muted" />
          </div>
        )}

        {/* Title and completion */}
        <div className="flex flex-1 items-center gap-1 min-w-0 justify-between">
          {isEditing && isOwner ? (
            <span style={{ display: 'inline-grid' }}>
              <span style={{ gridArea: '1/1', visibility: 'hidden', whiteSpace: 'pre', fontSize: '0.75rem', fontWeight: 500 }}>{editingLessonTitle || ' '}</span>
              <input
                type="text"
                value={editingLessonTitle}
                onChange={(e) => setEditingLessonTitle(e.target.value)}
                onBlur={(e) => {
                  e.stopPropagation();
                  handleLessonTitleBlur();
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  handleLessonTitleKeyDown(e);
                }}
                onClick={(e) => e.stopPropagation()}
                maxLength={100}
                style={{ gridArea: '1/1', width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '0.25rem', padding: '0.125rem 0.25rem', fontSize: '0.75rem', fontWeight: 500, outline: 'none' }}
                autoFocus
              />
            </span>
          ) : (
            <>
              <span className="truncate text-xs text-text-primary">{page.title}</span>
              {isCompleted && (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-success shrink-0">
                  <path d="M13.3333 4L6.00001 11.3333L2.66667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </>
          )}
        </div>

        {/* 3-dot menu - owner only */}
        {isOwner && !isEditing && (
          <Select onValueChange={(value) => {
            if (value === "rename") {
              onRenameSelect();
            } else if (value === "delete") {
              onDeleteSelect();
            }
          }}>
            <SelectTrigger 
          className="w-8 h-8 rounded-full bg-white/0 hover:bg-white/40 flex items-center justify-center p-0 border-0 hover:bg-bg-base/90 [&>span]:hidden [&>svg:last-child]:hidden"
              aria-label="Lesson options menu"
            >
              <MoreVertical className="w-3 h-3" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rename">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-3 h-3" />
                  Rename
                </div>
              </SelectItem>
              <SelectItem value="delete" className="text-red-500">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-3 h-3" />
                  Delete
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
});

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
  onLessonDragEnd,
  sensors,
  editingChapterId,
  setEditingChapterId,
  editingChapterTitle,
  setEditingChapterTitle,
  handleChapterTitleBlur,
  handleChapterTitleKeyDown,
  setDeleteConfirmChapter,
  setDeleteConfirmLesson,
  isPageCompleted,
  optimisticLessonOrders,
  editingLessonId,
  setEditingLessonId,
  editingLessonTitle,
  setEditingLessonTitle,
  handleLessonTitleBlur,
  handleLessonTitleKeyDown,
}: ClassroomSidebarProps) {
  // Calculate overall progress
  const progress = useMemo(() => {
    const allPages = classroomContent?.modules?.flatMap(m => m.pages || []) || [];
    const total = allPages.length;
    const completed = allPages.filter(p => p.isViewed).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [classroomContent?.modules]);

  const handleOverlayKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCloseSidebar();
    }
  }, [onCloseSidebar]);

  const getChapterProgress = (module: ModuleData) => {
    const total = module.pages?.length || 0;
    const completed = module.pages?.filter(p => p.isViewed).length || 0;
    return { total, completed, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  // Close menus when clicking outside
  const sidebarRef = useRef<HTMLDivElement>(null);

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
            <Button size="md" onClick={onAddChapter}>
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
          <div className="flex flex-col gap-2 overflow-hidden">
            {modules.map((module) => {
              const { total, completed, progress: chapterProgress } = getChapterProgress(module);
              const isCollapsed = collapsedModules.has(module._id);
              const isActive = module.pages?.some(p => p._id === selectedPageId);

              // Get pages for this module (use optimistic order if available)
              const modulePages = optimisticLessonOrders[module._id] || module.pages || [];

              return (
                <SortableChapter key={module._id} module={module} isOwner={isOwner}>
                  <div className="border border-mauve-4/30 bg-black/80 rounded-xl overflow-hidden ">
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
                      onRenameSelect={() => {
                        setEditingChapterId(module._id);
                        setEditingChapterTitle(module.title);
                      }}
                      onDeleteSelect={() => setDeleteConfirmChapter({
                        id: module._id,
                        title: module.title,
                        lessonCount: module.pages?.length || 0
                      })}
                    />
                    {!isCollapsed && modulePages.length > 0 && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => onLessonDragEnd(module._id, event)}
                      >
                        <SortableContext
                          items={modulePages.map(p => p._id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="border-t border-mauve-4/30 bg-bg-base">
                            {modulePages.map((page) => (
                              <SortableLesson
                                key={page._id}
                                page={page}
                                moduleId={module._id}
                                isOwner={isOwner}
                              >
                                <LessonItem
                                  page={page}
                                  moduleId={module._id}
                                  isSelected={selectedPageId === page._id}
                                  isOwner={isOwner}
                                  isCompleted={isPageCompleted(page._id)}
                                  onSelect={() => onSelectPage(page._id)}
                                  onDelete={() => setDeleteConfirmLesson({
                                    id: page._id,
                                    title: page.title,
                                  })}
                                  editingLessonId={editingLessonId}
                                  setEditingLessonId={setEditingLessonId}
                                  editingLessonTitle={editingLessonTitle}
                                  setEditingLessonTitle={setEditingLessonTitle}
                                  handleLessonTitleBlur={handleLessonTitleBlur}
                                  handleLessonTitleKeyDown={handleLessonTitleKeyDown}
                                  onRenameSelect={() => {
                                    setEditingLessonId(page._id);
                                    setEditingLessonTitle(page.title);
                                  }}
                                  onDeleteSelect={() => setDeleteConfirmLesson({
                                    id: page._id,
                                    title: page.title,
                                  })}
                                />
                              </SortableLesson>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
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

      <div
        ref={sidebarRef}
        className={`
          fixed lg:relative z-50 lg:z-auto
          w-72 h-full
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="pb-3 space-y-3">
            <Card className="flex flex-row w-full items-center justify-between">
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-text-secondary hover:bg-white/10 hover:text-text-primary text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 my-2" />
              </Button>
              
              {/* Progress bar */}
            <div className="relative p-1 justify-center items-center h-fit w-full">
              <div 
              className="h-[8px] bg-black rounded-full "
              style={{ boxShadow: 'var(--input-shadow)' }}
                >
                <div 
                className="h-full bg-green-500 rounded-full transition-all shadow-[0_0px_4px_2px_rgba(5,222,106,0.2)]"
                style={{ width: `${progress}%` }} />
              </div>
              
            </div>
            <span className="items-end justify-end flex p-1 text-[10px] text-text-secondary">{progress}%</span>
           </Card>

            
          </div>

          {/* Chapters list */}
          <div className="flex-1 overflow-y-auto p-0">
            {renderChapters()}
          </div>

          {/* Add Chapter button - owner only */}
          {isOwner && modules.length > 0 && (
            <div className="p-6 ">
              <Button
                variant="ghost"
                size="md" 
                onClick={onAddChapter}
                className="w-full gap-2 text-text-secondary hover:text-accent  border-2 border-dashed border-mauve-6 hover:border-accent hover:bg-accent-subtle transition-colors"
              >
                <Plus width="14" height="14" />
                Add New Chapter
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
