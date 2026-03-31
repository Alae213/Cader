"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { getVideoThumbnail } from "@/lib/utils";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableChapter } from "../community/SortableItems";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Check,
  Play,
} from "lucide-react";

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
  showModuleInput: boolean;
  moduleInputValue: string;
  isCreatingModule: boolean;
  isCreatingPage: boolean;
  onBack: () => void;
  onCloseSidebar: () => void;
  onToggleCollapse: (moduleId: string) => void;
  onSelectPage: (pageId: string) => void;
  onStartEditingChapter: (chapterId: string, title: string) => void;
  onSetEditingChapterTitle: (title: string) => void;
  onChapterTitleBlur: (chapterId: string) => void;
  onChapterTitleKeyDown: (e: React.KeyboardEvent, chapterId: string) => void;
  onSetOpenChapterMenu: (id: string | null) => void;
  onSetDeleteConfirmChapter: (id: string | null) => void;
  onDeleteChapter: (chapterId: string) => void;
  onStartEditingLesson: (lessonId: string, title: string) => void;
  onSetEditingLessonTitle: (title: string) => void;
  onLessonTitleBlur: (lessonId: string) => void;
  onLessonTitleKeyDown: (e: React.KeyboardEvent, lessonId: string) => void;
  onSetOpenLessonMenu: (id: string | null) => void;
  onSetDeleteConfirmLesson: (id: string | null) => void;
  onDeleteLesson: (lessonId: string) => void;
  onToggleLessonComplete: (args: { pageId: string }) => Promise<unknown>;
  onSetShowPageInput: (id: string | null) => void;
  onSetPageInputValue: (value: string) => void;
  onCreatePage: (moduleId: string, title: string) => Promise<void>;
  onPageInputCancel: () => void;
  onOpenCreatePageModal: (moduleId: string) => void;
  onOpenCreateModuleModal: () => void;
  onModuleInputSubmit: () => void;
  onModuleInputCancel: () => void;
  onModuleInputChange: (value: string) => void;
  onChapterDragEnd: (event: DragEndEvent) => void;
}

export function ClassroomSidebar({
  classroomContent,
  modules,
  selectedPageId,
  isOwner,
  isSidebarOpen,
  collapsedModules,
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
  showModuleInput,
  moduleInputValue,
  isCreatingModule,
  onBack,
  onCloseSidebar,
  onToggleCollapse,
  onSelectPage,
  onStartEditingChapter,
  onSetEditingChapterTitle,
  onChapterTitleBlur,
  onChapterTitleKeyDown,
  onSetOpenChapterMenu,
  onSetDeleteConfirmChapter,
  onDeleteChapter,
  onStartEditingLesson,
  onSetEditingLessonTitle,
  onLessonTitleBlur,
  onLessonTitleKeyDown,
  onSetOpenLessonMenu,
  onSetDeleteConfirmLesson,
  onDeleteLesson,
  onToggleLessonComplete,
  onSetShowPageInput,
  onSetPageInputValue,
  onCreatePage,
  onPageInputCancel,
  onOpenCreatePageModal,
  onOpenCreateModuleModal,
  onModuleInputSubmit,
  onModuleInputCancel,
  onModuleInputChange,
  onChapterDragEnd,
}: ClassroomSidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Calculate overall progress
  const allPages = classroomContent?.modules?.flatMap(m => m.pages || []) || [];
  const totalLessons = allPages.length;
  const completedLessons = allPages.filter(p => p.isViewed).length;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onCloseSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Card with fixed width */}
      <div className={`
        fixed lg:relative z-50 lg:z-auto
        w-80 h-full
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        lg:w-72
      `}>
        <Card className="h-full">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-text-secondary hover:text-text-primary"
                aria-label="Back to classrooms"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <button
                className="lg:hidden p-2 hover:bg-bg-elevated rounded-lg"
                onClick={onCloseSidebar}
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar and expand/collapse all */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <Text size="1" theme="muted">
                {progress}%
              </Text>
              {isOwner && modules.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => {
                    if (collapsedModules.size === 0) {
                      modules.forEach(m => onToggleCollapse(m._id));
                    } else {
                      modules.forEach(m => {
                        if (collapsedModules.has(m._id)) {
                          onToggleCollapse(m._id);
                        }
                      });
                    }
                  }}
                >
                  {collapsedModules.size === 0 ? 'Collapse All' : 'Expand All'}
                </Button>
              )}
            </div>

            {/* Create module input */}
            {showModuleInput && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={moduleInputValue}
                  onChange={(e) => onModuleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onModuleInputSubmit();
                    if (e.key === "Escape") onModuleInputCancel();
                  }}
                  onBlur={onModuleInputSubmit}
                  placeholder="Chapter title..."
                  className="flex-1 bg-bg-elevated border border-accent rounded px-2 py-1 text-sm focus:outline-none"
                  autoFocus
                  disabled={isCreatingModule}
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!classroomContent ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-8">
                <Text size="2" theme="muted">No chapters yet</Text>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenCreateModuleModal}
                    className="mt-3 text-accent"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create First Chapter
                  </Button>
                )}
              </div>
            ) : isOwner && modules.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onChapterDragEnd}
              >
                <SortableContext
                  items={modules.map(m => m._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {modules.map((module: ModuleData) => (
                      <SortableChapter
                        key={module._id}
                        module={module}
                        isCollapsed={collapsedModules.has(module._id)}
                        isActive={!!module.pages?.some(p => p._id === selectedPageId)}
                        chapterProgress={(() => {
                          const total = module.pages?.length || 0;
                          const completed = module.pages?.filter(p => p.isViewed).length || 0;
                          return total > 0 ? Math.round((completed / total) * 100) : 0;
                        })()}
                        selectedPageId={selectedPageId}
                        isOwner={isOwner}
                        collapsedModules={collapsedModules}
                        editingChapterId={editingChapterId}
                        editingChapterTitle={editingChapterTitle}
                        openChapterMenu={openChapterMenu}
                        deleteConfirmChapter={deleteConfirmChapter}
                        showPageInput={showPageInput}
                        pageInputValue={pageInputValue}
                        editingLessonId={editingLessonId}
                        editingLessonTitle={editingLessonTitle}
                        openLessonMenu={openLessonMenu}
                        deleteConfirmLesson={deleteConfirmLesson}
                        toggleModuleCollapse={onToggleCollapse}
                        startEditingChapter={onStartEditingChapter}
                        setEditingChapterTitle={onSetEditingChapterTitle}
                        handleChapterTitleBlur={onChapterTitleBlur}
                        handleChapterTitleKeyDown={onChapterTitleKeyDown}
                        setOpenChapterMenu={onSetOpenChapterMenu}
                        setDeleteConfirmChapter={onSetDeleteConfirmChapter}
                        handleDeleteChapter={onDeleteChapter}
                        setSelectedPageId={onSelectPage}
                        startEditingLesson={onStartEditingLesson}
                        setEditingLessonTitle={onSetEditingLessonTitle}
                        handleLessonTitleBlur={onLessonTitleBlur}
                        handleLessonTitleKeyDown={onLessonTitleKeyDown}
                        setOpenLessonMenu={onSetOpenLessonMenu}
                        setDeleteConfirmLesson={onSetDeleteConfirmLesson}
                        handleDeleteLesson={onDeleteLesson}
                        toggleLessonComplete={onToggleLessonComplete}
                        setShowPageInput={onSetShowPageInput}
                        setPageInputValue={onSetPageInputValue}
                        handleCreatePage={onCreatePage}
                        handlePageInputCancel={onPageInputCancel}
                        openCreatePageModal={onOpenCreatePageModal}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="space-y-2">
                {modules.map((module: ModuleData) => {
                  const isCollapsed = collapsedModules.has(module._id);
                  const isActive = module.pages?.some(p => p._id === selectedPageId);
                  const totalLessons = module.pages?.length || 0;
                  const completedLessons = module.pages?.filter(p => p.isViewed).length || 0;
                  const chapterProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

                  return (
                    <div key={module._id} className="group">
                      <div className={`flex items-center justify-between py-2 px-2 rounded-lg ${
                        isActive ? "bg-accent/10" : "hover:bg-bg-elevated"
                      }`}>
                        <button
                          onClick={() => !isOwner || editingChapterId === module._id ? undefined : onToggleCollapse(module._id)}
                          className={`flex items-center gap-2 flex-1 text-left ${isOwner && editingChapterId !== module._id ? 'cursor-pointer' : ''}`}
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
                          <Text size="2" theme={isActive ? "default" : "secondary"} className="font-semibold truncate">
                            {module.title}
                          </Text>
                          <Text size="1" theme="muted">
                            ({module.pages?.length || 0})
                          </Text>
                          {totalLessons > 0 && (
                            <div className="ml-2 flex items-center gap-1" title={`${completedLessons}/${totalLessons} completed`}>
                              <ProgressRing progress={chapterProgress} size={20} strokeWidth={2.5} />
                              <Text size="1" theme="muted" className="text-[10px]">
                                {completedLessons}/{totalLessons}
                              </Text>
                            </div>
                          )}
                        </button>
                      </div>

                      {!isCollapsed && module.pages && module.pages.length > 0 && (
                        <div className="ml-4 space-y-1 mt-1">
                          {module.pages.map((page) => (
                            <button
                              key={page._id}
                              onClick={() => {
                                if (editingLessonId !== page._id) {
                                  onSelectPage(page._id);
                                }
                              }}
                              className={`w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg text-sm ${
                                selectedPageId === page._id
                                  ? "bg-accent text-white font-medium"
                                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                              }`}
                            >
                              {page.videoUrl ? (
                                <img
                                  src={getVideoThumbnail(page.videoUrl) || undefined}
                                  alt=""
                                  className="w-[55px] h-[30px] object-cover rounded flex-shrink-0"
                                />
                              ) : (
                                <div className="w-[55px] h-[30px] bg-black/20 rounded flex-shrink-0 flex items-center justify-center">
                                  <Play className="w-3 h-3 text-text-muted" />
                                </div>
                              )}
                              {page.isViewed ? (
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 flex-shrink-0" />
                              )}
                              <span className="truncate">{page.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
