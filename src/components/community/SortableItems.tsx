"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { 
  ChevronDown, 
  ChevronRight, 
  GripVertical,
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface ModuleData {
  _id: string;
  title: string;
  order: number;
  pages: { _id: string; title: string; order: number; isViewed?: boolean; videoUrl?: string }[];
}

interface SortableChapterProps {
  module: ModuleData;
  isCollapsed: boolean;
  isActive: boolean;
  chapterProgress: number;
  selectedPageId: string | null;
  isOwner: boolean;
  collapsedModules: Set<string>;
  editingChapterId: string | null;
  editingChapterTitle: string;
  openChapterMenu: string | null;
  deleteConfirmChapter: string | null;
  showPageInput: string | null;
  pageInputValue: string;
  editingLessonId: string | null;
  editingLessonTitle: string;
  openLessonMenu: string | null;
  deleteConfirmLesson: string | null;
  toggleModuleCollapse: (moduleId: string) => void;
  startEditingChapter: (chapterId: string, currentTitle: string) => void;
  setEditingChapterTitle: (title: string) => void;
  handleChapterTitleBlur: (chapterId: string) => void;
  handleChapterTitleKeyDown: (e: React.KeyboardEvent, chapterId: string) => void;
  setOpenChapterMenu: (chapterId: string | null) => void;
  setDeleteConfirmChapter: (chapterId: string | null) => void;
  handleDeleteChapter: (chapterId: string) => void;
  setSelectedPageId: (pageId: string) => void;
  startEditingLesson: (lessonId: string, currentTitle: string) => void;
  setEditingLessonTitle: (title: string) => void;
  handleLessonTitleBlur: (lessonId: string) => void;
  handleLessonTitleKeyDown: (e: React.KeyboardEvent, lessonId: string) => void;
  setOpenLessonMenu: (lessonId: string | null) => void;
  setDeleteConfirmLesson: (lessonId: string | null) => void;
  handleDeleteLesson: (lessonId: string) => void;
  toggleLessonComplete: (args: { pageId: Id<"pages"> }) => Promise<unknown>;
  setShowPageInput: (moduleId: string | null) => void;
  setPageInputValue: (value: string) => void;
  handleCreatePage: (moduleId: string, title: string) => Promise<void>;
  handlePageInputCancel: () => void;
  openCreatePageModal: (moduleId: string) => void;
}

export function SortableChapter({
  module,
  isCollapsed,
  isActive,
  chapterProgress,
  selectedPageId,
  isOwner,
  editingChapterId,
  editingChapterTitle,
  openChapterMenu,
  deleteConfirmChapter,
  showPageInput,
  pageInputValue,
  editingLessonId,
  editingLessonTitle,
  openLessonMenu,
  deleteConfirmLesson,
  toggleModuleCollapse,
  startEditingChapter,
  setEditingChapterTitle,
  handleChapterTitleBlur,
  handleChapterTitleKeyDown,
  setOpenChapterMenu,
  setDeleteConfirmChapter,
  handleDeleteChapter,
  setSelectedPageId,
  startEditingLesson,
  setEditingLessonTitle,
  handleLessonTitleBlur,
  handleLessonTitleKeyDown,
  setOpenLessonMenu,
  setDeleteConfirmLesson,
  handleDeleteLesson,
  toggleLessonComplete,
  setShowPageInput,
  setPageInputValue,
  handleCreatePage,
  handlePageInputCancel,
  openCreatePageModal,
}: SortableChapterProps) {
  const reorderLessons = useMutation(api.functions.classrooms.reorderLessons);
  
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

  const handleLessonDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const pages = module.pages || [];
    const oldIndex = pages.findIndex(p => p._id === active.id);
    const newIndex = pages.findIndex(p => p._id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(pages, oldIndex, newIndex);
      const lessonOrders = reordered.map((p, index) => ({
        lessonId: p._id as Id<"pages">,
        order: index,
      }));
      
      try {
        await reorderLessons({ 
          moduleId: module._id as Id<"modules">, 
          lessonOrders 
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to reorder lessons");
      }
    }
  }, [module._id, module.pages, reorderLessons]);

  const isEditingChapter = editingChapterId === module._id;
  const isChapterMenuOpen = openChapterMenu === module._id;
  const isChapterDeleteConfirm = deleteConfirmChapter === module._id;

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className={`flex items-center justify-between py-2 px-2 rounded-lg ${
        isActive ? "bg-accent/10" : "hover:bg-bg-elevated"
      }`}>
        {/* Drag handle */}
        {isOwner && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab text-text-muted hover:text-text-primary mr-1 touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        
        {/* Collapse toggle */}
        <button
          onClick={() => !isOwner || isEditingChapter ? undefined : toggleModuleCollapse(module._id)}
          className={`flex items-center gap-2 flex-1 text-left ${isOwner && !isEditingChapter ? 'cursor-pointer' : ''}`}
          aria-expanded={!isCollapsed}
          aria-controls={`module-${module._id}`}
        >
          {module.pages?.length ? (
            isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
            )
          ) : (
            <div className="w-4" />
          )}
          
          {/* Title */}
          {isOwner && isEditingChapter ? (
            <input
              type="text"
              value={editingChapterTitle}
              onChange={(e) => setEditingChapterTitle(e.target.value)}
              onBlur={() => handleChapterTitleBlur(module._id)}
              onKeyDown={(e) => handleChapterTitleKeyDown(e, module._id)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-bg-elevated border border-accent rounded px-2 py-0.5 text-sm font-semibold focus:outline-none"
              autoFocus
            />
          ) : isOwner ? (
            <span 
              className="font-semibold truncate cursor-text hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                startEditingChapter(module._id, module.title);
              }}
            >
              <Text size="2" theme={isActive ? "default" : "secondary"}>
                {module.title}
              </Text>
            </span>
          ) : (
            <Text size="2" theme={isActive ? "default" : "secondary"} className="font-semibold truncate">
              {module.title}
            </Text>
          )}
        </button>

        {/* Progress ring */}
        {chapterProgress > 0 && (
          <div className="flex items-center gap-1 mr-2">
            <Text size="1" theme="muted" className="text-[10px]">
              {module.pages?.filter(p => p.isViewed).length}/{module.pages?.length}
            </Text>
          </div>
        )}

        {/* Chapter menu - owner only */}
        {isOwner && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenChapterMenu(isChapterMenuOpen ? null : module._id);
              }}
              className="p-1 hover:bg-bg-elevated rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4 text-text-muted" />
            </button>
            
            {isChapterMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-bg-surface border border-border rounded-lg shadow-lg z-50 py-1">
                {isChapterDeleteConfirm ? (
                  <div className="px-3 py-2">
                    <Text size="1" theme="muted" className="mb-2">Delete "{module.title}"?</Text>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="danger"
                        className="flex-1 h-7 text-xs"
                        onClick={() => handleDeleteChapter(module._id)}
                      >
                        Delete
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="flex-1 h-7 text-xs"
                        onClick={() => setDeleteConfirmChapter(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingChapter(module._id, module.title);
                      setOpenChapterMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2 text-sm"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit title
                  </button>
                )}
                {!isChapterDeleteConfirm && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmChapter(module._id);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2 text-sm text-error"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete chapter
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pages/lessons list */}
      {!isCollapsed && module.pages && module.pages.length > 0 && (
        <DndContext
          sensors={useSensors(
            useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
            useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
          )}
          collisionDetection={closestCenter}
          onDragEnd={handleLessonDragEnd}
        >
          <SortableContext
            items={module.pages.map(p => p._id)}
            strategy={verticalListSortingStrategy}
          >
            <div id={`module-${module._id}`} className="ml-4 space-y-1 mt-1">
              {module.pages.map((page) => (
                <SortableLesson
                  key={page._id}
                  page={page}
                  moduleId={module._id}
                  isOwner={isOwner}
                  selectedPageId={selectedPageId}
                  editingLessonId={editingLessonId}
                  editingLessonTitle={editingLessonTitle}
                  openLessonMenu={openLessonMenu}
                  deleteConfirmLesson={deleteConfirmLesson}
                  showPageInput={showPageInput}
                  pageInputValue={pageInputValue}
                  setSelectedPageId={setSelectedPageId}
                  startEditingLesson={startEditingLesson}
                  setEditingLessonTitle={setEditingLessonTitle}
                  handleLessonTitleBlur={handleLessonTitleBlur}
                  handleLessonTitleKeyDown={handleLessonTitleKeyDown}
                  setOpenLessonMenu={setOpenLessonMenu}
                  setDeleteConfirmLesson={setDeleteConfirmLesson}
                  handleDeleteLesson={handleDeleteLesson}
                  toggleLessonComplete={toggleLessonComplete}
                  setShowPageInput={setShowPageInput}
                  setPageInputValue={setPageInputValue}
                  handleCreatePage={handleCreatePage}
                  handlePageInputCancel={handlePageInputCancel}
                  openCreatePageModal={openCreatePageModal}
                />
              ))}
              
              {/* Add lesson button/input */}
              {isOwner && (
                showPageInput === module._id ? (
                  <div className="flex gap-2 p-2">
                    <Input
                      value={pageInputValue}
                      onChange={(e) => setPageInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreatePage(module._id, pageInputValue);
                        if (e.key === "Escape") handlePageInputCancel();
                      }}
                      placeholder="Lesson title..."
                      autoFocus
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => handleCreatePage(module._id, pageInputValue)}>
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handlePageInputCancel}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => openCreatePageModal(module._id)}
                    className="w-full py-2 text-center text-xs text-text-muted hover:text-accent"
                  >
                    <Plus className="w-3 h-3 mx-auto mb-1" />
                    Add Lesson
                  </button>
                )
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

interface SortableLessonProps {
  page: { _id: string; title: string; isViewed?: boolean; videoUrl?: string };
  moduleId: string;
  isOwner: boolean;
  selectedPageId: string | null;
  editingLessonId: string | null;
  editingLessonTitle: string;
  openLessonMenu: string | null;
  deleteConfirmLesson: string | null;
  showPageInput: string | null;
  pageInputValue: string;
  setSelectedPageId: (pageId: string) => void;
  startEditingLesson: (lessonId: string, currentTitle: string) => void;
  setEditingLessonTitle: (title: string) => void;
  handleLessonTitleBlur: (lessonId: string) => void;
  handleLessonTitleKeyDown: (e: React.KeyboardEvent, lessonId: string) => void;
  setOpenLessonMenu: (lessonId: string | null) => void;
  setDeleteConfirmLesson: (lessonId: string | null) => void;
  handleDeleteLesson: (lessonId: string) => void;
  toggleLessonComplete: (args: { pageId: Id<"pages"> }) => Promise<unknown>;
  setShowPageInput: (moduleId: string | null) => void;
  setPageInputValue: (value: string) => void;
  handleCreatePage: (moduleId: string, title: string) => Promise<void>;
  handlePageInputCancel: () => void;
  openCreatePageModal: (moduleId: string) => void;
}

function SortableLesson({
  page,
  moduleId,
  isOwner,
  selectedPageId,
  editingLessonId,
  editingLessonTitle,
  openLessonMenu,
  deleteConfirmLesson,
  setSelectedPageId,
  startEditingLesson,
  setEditingLessonTitle,
  handleLessonTitleBlur,
  handleLessonTitleKeyDown,
  setOpenLessonMenu,
  setDeleteConfirmLesson,
  handleDeleteLesson,
  toggleLessonComplete,
}: SortableLessonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isEditingLesson = editingLessonId === page._id;
  const isLessonMenuOpen = openLessonMenu === page._id;
  const isLessonDeleteConfirm = deleteConfirmLesson === page._id;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      {/* Drag handle - owner only */}
      {isOwner && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab text-text-muted hover:text-text-primary mr-1 touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="w-3 h-3" />
        </button>
      )}
      
      <button
        onClick={() => {
          if (editingLessonId !== page._id) {
            setSelectedPageId(page._id);
          }
        }}
        aria-current={selectedPageId === page._id ? "true" : undefined}
        className={`flex-1 flex items-center gap-2 text-left px-3 py-2.5 rounded-lg text-sm ${
          selectedPageId === page._id
            ? "bg-accent text-white font-medium"
            : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        }`}
      >
        {/* Lesson thumbnail */}
        {page.videoUrl ? (
          <div className="w-16 h-9 bg-black/20 rounded flex-shrink-0 overflow-hidden">
            <img 
              src={page.videoUrl.includes("youtube") || page.videoUrl.includes("youtu.be") 
                ? `https://img.youtube.com/vi/${page.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}/mqdefault.jpg`
                : undefined}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-9 bg-black/20 rounded flex-shrink-0" />
        )}
        
        {/* Title */}
        {isOwner && isEditingLesson ? (
          <input
            type="text"
            value={editingLessonTitle}
            onChange={(e) => setEditingLessonTitle(e.target.value)}
            onBlur={() => handleLessonTitleBlur(page._id)}
            onKeyDown={(e) => handleLessonTitleKeyDown(e, page._id)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-bg-elevated border border-accent rounded px-2 py-0.5 text-sm focus:outline-none"
            autoFocus
          />
        ) : (
          <span className="truncate flex-1">{page.title}</span>
        )}
        
        {/* Completion indicator */}
        {page.isViewed && (
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </button>

      {/* Lesson menu - owner only */}
      {isOwner && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenLessonMenu(isLessonMenuOpen ? null : page._id);
            }}
            className="p-1 hover:bg-bg-elevated rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4 text-text-muted" />
          </button>
          
          {isLessonMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-bg-surface border border-border rounded-lg shadow-lg z-50 py-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  startEditingLesson(page._id, page.title);
                  setOpenLessonMenu(null);
                }}
                className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2 text-sm"
              >
                <Edit3 className="w-4 h-4" />
                Edit title
              </button>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await toggleLessonComplete({ pageId: page._id as Id<"pages"> });
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to update progress");
                  }
                  setOpenLessonMenu(null);
                }}
                className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2 text-sm"
              >
                {page.isViewed ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Mark incomplete
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Mark complete
                  </>
                )}
              </button>
              {isLessonDeleteConfirm ? (
                <div className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Text size="1" theme="muted" className="mb-2">Delete "{page.title}"?</Text>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="danger"
                      className="flex-1 h-7 text-xs"
                      onClick={() => handleDeleteLesson(page._id)}
                    >
                      Delete
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setDeleteConfirmLesson(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmLesson(page._id);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2 text-sm text-error"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete lesson
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
