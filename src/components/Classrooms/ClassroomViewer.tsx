"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Heading, Text } from "@/components/ui/Text";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";
import { ClassroomSidebar } from "./ClassroomSidebar";
import { LessonContent } from "./LessonContent";
import { VideoEmbed } from "./VideoEmbed";
import { LessonDescription } from "./LessonDescription";
import { Menu, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
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
} from "@dnd-kit/sortable";

interface ClassroomViewerProps {
  classroomId: string;
  onBack: () => void;
  isOwner: boolean;
  currentUser?: {
    _id: Id<"users">;
  };
}

interface ModuleData {
  _id: string;
  title: string;
  order: number;
  pages: { _id: string; title: string; order: number; isViewed?: boolean; videoUrl?: string }[];
}

const STORAGE_KEY = "classroom_draft_";

export function ClassroomViewer({ classroomId, onBack, isOwner, currentUser: providedUser }: ClassroomViewerProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [editedTitle, setEditedTitle] = useState<string>("");
  
  // Video modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  
  // Collapsed modules state
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  
  // Mobile drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Ref for focus management after mobile sidebar selection
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  
  // Optimistic state for reordering chapters
  const [optimisticChapters, setOptimisticChapters] = useState<ModuleData[] | null>(null);
  
  // Optimistic state for lesson completion
  const [optimisticCompletedPages, setOptimisticCompletedPages] = useState<Set<string>>(new Set());

  // Delete confirmation state
  const [deleteConfirmChapter, setDeleteConfirmChapter] = useState<{ id: string; title: string; lessonCount: number } | null>(null);
  const [deleteConfirmLesson, setDeleteConfirmLesson] = useState<{ id: string; title: string } | null>(null);

  // Chapter menu state
  const [openChapterMenu, setOpenChapterMenu] = useState<string | null>(null);
  
  // Inline editing state for chapter titles
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState("");
  const chapterDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Lesson editing state (for LessonContent)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState("");
  const lessonDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Use provided user
  const userId = providedUser?._id;

  const classroomContent = useQuery(
    api.functions.classrooms.getClassroomContent,
    userId
      ? { classroomId: classroomId as Id<"classrooms">, userId }
      : { classroomId: classroomId as Id<"classrooms">, userId: undefined }
  );

  const pageContent = useQuery(
    api.functions.classrooms.getPageContent,
    selectedPageId && userId
      ? { pageId: selectedPageId as Id<"pages">, userId }
      : selectedPageId
      ? { pageId: selectedPageId as Id<"pages">, userId: undefined as unknown as Id<"users"> }
      : "skip"
  );

  const markPageViewed = useMutation(api.functions.classrooms.markPageViewed);
  const updatePageContent = useMutation(api.functions.classrooms.updatePageContent);
  const createModule = useMutation(api.functions.classrooms.createModule);
  const createPage = useMutation(api.functions.classrooms.createPage);
  const updateChapter = useMutation(api.functions.classrooms.updateChapter);
  const toggleLessonComplete = useMutation(api.functions.classrooms.toggleLessonComplete);
  const deleteModule = useMutation(api.functions.classrooms.deleteModule);
  const deletePage = useMutation(api.functions.classrooms.deletePage);
  const reorderChapters = useMutation(api.functions.classrooms.reorderChapters);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Track if this is the initial load
  const isInitialLoad = useRef(true);

  // Get current modules (optimistic or real)
  const modules = optimisticChapters || classroomContent?.modules || [];

  useEffect(() => {
    // Clear optimistic chapters when data changes
    if (classroomContent?.modules) {
      setOptimisticChapters(null);
    }
  }, [classroomContent?.modules]);

  useEffect(() => {
    if (isInitialLoad.current && classroomContent?.modules?.length) {
      isInitialLoad.current = false;
      const firstModule = classroomContent.modules[0];
      if (firstModule.pages?.length) {
        setSelectedPageId(firstModule.pages[0]._id);
      }
    }
  }, [classroomContent]);

  // LocalStorage draft preservation
  useEffect(() => {
    const storageKey = `${STORAGE_KEY}${editingPageId}`;
    if (editingPageId) {
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft && !pageContent) {
        const draft = JSON.parse(savedDraft);
        setEditedTitle(draft.title);
        setEditedContent(draft.content);
      }
    }
  }, [editingPageId, pageContent]);

  useEffect(() => {
    if (editingPageId) {
      const storageKey = `${STORAGE_KEY}${editingPageId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        title: editedTitle,
        content: editedContent,
        timestamp: Date.now()
      }));
    }
  }, [editingPageId, editedTitle, editedContent]);

  const clearDraft = useCallback((pageId: string) => {
    const storageKey = `${STORAGE_KEY}${pageId}`;
    localStorage.removeItem(storageKey);
  }, []);

  const handleStartEdit = useCallback(() => {
    if (pageContent) {
      setEditedTitle(pageContent.title);
      setEditedContent(pageContent.content);
      setEditingPageId(pageContent._id);
    }
  }, [pageContent]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingPageId) return;
    setIsSaving(true);
    try {
      await updatePageContent({
        pageId: editingPageId as Id<"pages">,
        title: editedTitle,
        content: editedContent,
      });
      clearDraft(editingPageId);
      setEditingPageId(null);
      toast.success("Lesson saved successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [editingPageId, editedTitle, editedContent, updatePageContent, clearDraft]);

  const handleCancelEdit = useCallback(() => {
    if (editingPageId) {
      clearDraft(editingPageId);
    }
    setEditingPageId(null);
    setEditedTitle("");
    setEditedContent("");
  }, [editingPageId, clearDraft]);

  // Add Chapter - auto-create with default name
  const handleAddChapter = useCallback(async () => {
    const chapterNumber = (classroomContent?.modules?.length || 0) + 1;
    const defaultTitle = `Chapter ${chapterNumber}`;
    try {
      await createModule({
        classroomId: classroomId as Id<"classrooms">,
        title: defaultTitle,
      });
      toast.success("Chapter created");
    } catch (err) {
      toast.error("Failed to create chapter");
    }
  }, [createModule, classroomId, classroomContent?.modules?.length]);

  // Add Lesson - auto-create with default name
  const handleAddLesson = useCallback(async (moduleId: string) => {
    try {
      await createPage({
        moduleId: moduleId as Id<"modules">,
        title: "New Lesson",
      });
      toast.success("Lesson created");
    } catch (err) {
      toast.error("Failed to create lesson");
    }
  }, [createPage]);

  // Handle toggle lesson complete with optimistic update
  const handleToggleComplete = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedPageId || !pageContent) return;
    
    // Optimistic update
    const newCompleted = new Set(optimisticCompletedPages);
    if (newCompleted.has(selectedPageId)) {
      newCompleted.delete(selectedPageId);
    } else {
      newCompleted.add(selectedPageId);
    }
    setOptimisticCompletedPages(newCompleted);
    
    try {
      await toggleLessonComplete({
        pageId: selectedPageId as Id<"pages">,
      });
    } catch (err) {
      // Revert on error
      const reverted = new Set(optimisticCompletedPages);
      if (pageContent.isViewed) {
        reverted.add(selectedPageId);
      } else {
        reverted.delete(selectedPageId);
      }
      setOptimisticCompletedPages(reverted);
      toast.error("Failed to update progress");
    }
  }, [selectedPageId, pageContent, toggleLessonComplete, optimisticCompletedPages]);

  const handleVideoUpdate = useCallback(async (url: string) => {
    if (!selectedPageId || !pageContent) return;
    try {
      await updatePageContent({
        pageId: selectedPageId as Id<"pages">,
        title: pageContent.title,
        content: pageContent.content,
        videoUrl: url,
        description: pageContent.description,
      });
      toast.success("Video updated");
    } catch (err) {
      toast.error("Failed to update video");
    }
  }, [selectedPageId, pageContent, updatePageContent]);

  const handleDescriptionUpdate = useCallback(async (description: string) => {
    if (!selectedPageId || !pageContent) return;
    try {
      await updatePageContent({
        pageId: selectedPageId as Id<"pages">,
        title: pageContent.title,
        content: pageContent.content,
        videoUrl: pageContent.videoUrl,
        description: description,
      });
    } catch (err) {
      toast.error("Failed to save description");
    }
  }, [selectedPageId, pageContent, updatePageContent]);

  // Save chapter title with debounce
  const saveChapterTitle = useCallback(async (chapterId: string, newTitle: string, immediate = false) => {
    if (!newTitle.trim()) return;
    
    const doSave = async () => {
      try {
        await updateChapter({
          chapterId: chapterId as Id<"modules">,
          title: newTitle.trim(),
        });
      } catch (err) {
        toast.error("Failed to update chapter title");
      } finally {
        setEditingChapterId(null);
      }
    };

    if (immediate) {
      if (chapterDebounceRef.current) {
        clearTimeout(chapterDebounceRef.current);
      }
      doSave();
    } else {
      if (chapterDebounceRef.current) {
        clearTimeout(chapterDebounceRef.current);
      }
      chapterDebounceRef.current = setTimeout(doSave, 1500);
    }
  }, [updateChapter]);

  const handleChapterTitleBlur = useCallback((chapterId: string) => {
    if (editingChapterTitle.trim()) {
      saveChapterTitle(chapterId, editingChapterTitle, true);
    }
  }, [editingChapterTitle, saveChapterTitle]);

  const handleChapterTitleKeyDown = useCallback((e: React.KeyboardEvent, chapterId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveChapterTitle(chapterId, editingChapterTitle, true);
    } else if (e.key === "Escape") {
      setEditingChapterId(null);
    }
  }, [editingChapterTitle, saveChapterTitle]);

  // Delete chapter handler
  const handleDeleteChapter = useCallback(async () => {
    if (!deleteConfirmChapter) return;
    try {
      await deleteModule({ moduleId: deleteConfirmChapter.id as Id<"modules"> });
      setDeleteConfirmChapter(null);
      setOpenChapterMenu(null);
      toast.success("Chapter deleted");
    } catch (err) {
      toast.error("Failed to delete chapter");
    }
  }, [deleteConfirmChapter, deleteModule]);

  // Delete lesson handler
  const handleDeleteLesson = useCallback(async () => {
    if (!deleteConfirmLesson) return;
    try {
      await deletePage({ pageId: deleteConfirmLesson.id as Id<"pages"> });
      setDeleteConfirmLesson(null);
      if (selectedPageId === deleteConfirmLesson.id) {
        setSelectedPageId(null);
      }
      toast.success("Lesson deleted");
    } catch (err) {
      toast.error("Failed to delete lesson");
    }
  }, [deleteConfirmLesson, deletePage, selectedPageId]);

  // Toggle module collapse
  const toggleModuleCollapse = useCallback((moduleId: string) => {
    setCollapsedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  }, []);

  // Handle chapter reordering with optimistic update
  const handleChapterDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = modules.findIndex(m => m._id === active.id);
    const newIndex = modules.findIndex(m => m._id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(modules as ModuleData[], oldIndex, newIndex);
      
      // Optimistic update
      setOptimisticChapters(reordered);
      
      const chapterOrders = reordered.map((m, index) => ({
        chapterId: m._id as Id<"modules">,
        order: index,
      }));
      
      try {
        await reorderChapters({ 
          classroomId: classroomId as Id<"classrooms">,
          chapterOrders 
        });
      } catch (err) {
        // Revert on error
        setOptimisticChapters(null);
        toast.error(err instanceof Error ? err.message : "Failed to reorder");
      }
    }
  }, [modules, classroomId, reorderChapters]);

  // Check if page is completed (optimistic or real)
  const isPageCompleted = useCallback((pageId: string) => {
    if (optimisticCompletedPages.has(pageId)) return true;
    const module = classroomContent?.modules?.find(m => m.pages?.some(p => p._id === pageId));
    const page = module?.pages?.find(p => p._id === pageId);
    return page?.isViewed || false;
  }, [optimisticCompletedPages, classroomContent?.modules]);

  // Get page content with optimistic completion status
  const pageContentWithOptimistic = pageContent ? {
    ...pageContent,
    isViewed: isPageCompleted(pageContent._id)
  } : null;

  if (classroomContent && !classroomContent.hasAccess && !isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="w-24 h-24 rounded-full bg-bg-surface flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-text-muted" />
        </div>
        <Heading size="4" className="text-text-primary">Access Denied</Heading>
        <Text size="3" theme="secondary" className="text-center max-w-md">
          You do not have access to this classroom. Contact the owner to request access.
        </Text>
        <Button onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      <ClassroomSidebar
        classroomContent={classroomContent}
        modules={modules}
        selectedPageId={selectedPageId}
        isOwner={isOwner}
        isSidebarOpen={isSidebarOpen}
        collapsedModules={collapsedModules}
        onBack={onBack}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        onToggleCollapse={toggleModuleCollapse}
        onSelectPage={(pageId) => {
          setSelectedPageId(pageId);
          setIsSidebarOpen(false);
          mainContentRef.current?.focus();
        }}
        onAddChapter={handleAddChapter}
        onAddLesson={handleAddLesson}
        onChapterDragEnd={handleChapterDragEnd}
        sensors={sensors}
        openChapterMenu={openChapterMenu}
        setOpenChapterMenu={setOpenChapterMenu}
        editingChapterId={editingChapterId}
        setEditingChapterId={setEditingChapterId}
        editingChapterTitle={editingChapterTitle}
        setEditingChapterTitle={setEditingChapterTitle}
        handleChapterTitleBlur={handleChapterTitleBlur}
        handleChapterTitleKeyDown={handleChapterTitleKeyDown}
        deleteConfirmChapter={deleteConfirmChapter}
        setDeleteConfirmChapter={setDeleteConfirmChapter}
        handleDeleteChapter={handleDeleteChapter}
        isPageCompleted={isPageCompleted}
      />

      {/* Main content - Right section */}
      <div 
        ref={mainContentRef}
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        tabIndex={-1}
      >
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 p-3 border-b border-mauve-4/30 bg-bg-surface">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-bg-elevated rounded-lg"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Text size="2" theme="secondary" className="truncate flex-1">
            {classroomContent?.title || "Loading..."}
          </Text>
        </div>

        <LessonContent
          classroomContent={classroomContent ?? null}
          pageContent={pageContentWithOptimistic}
          selectedPageId={selectedPageId}
          isOwner={isOwner}
          isSidebarOpen={isSidebarOpen}
          editingPageId={editingPageId}
          editedTitle={editedTitle}
          editedContent={editedContent}
          isSaving={isSaving}
          error={null}
          mainContentRef={mainContentRef}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onToggleComplete={(e) => handleToggleComplete(e as React.MouseEvent)}
          onStartEdit={handleStartEdit}
          onTitleChange={setEditedTitle}
          onContentChange={setEditedContent}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onVideoUpdate={handleVideoUpdate}
          onDescriptionUpdate={handleDescriptionUpdate}
          editingLessonId={editingLessonId}
          setEditingLessonId={setEditingLessonId}
          editingLessonTitle={editingLessonTitle}
          setEditingLessonTitle={setEditingLessonTitle}
          deleteConfirmLesson={deleteConfirmLesson}
          setDeleteConfirmLesson={setDeleteConfirmLesson}
          handleDeleteLesson={handleDeleteLesson}
        />

        {/* Delete Chapter Confirmation Modal */}
        {deleteConfirmChapter && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-surface p-6 rounded-lg max-w-sm w-full mx-4">
              <Heading size="4" className="mb-2">Delete Chapter?</Heading>
              <Text size="2" theme="secondary" className="mb-4">
                This will permanently delete "{deleteConfirmChapter.title}" and {deleteConfirmChapter.lessonCount} lesson{deleteConfirmChapter.lessonCount !== 1 ? 's' : ''}. This action cannot be undone.
              </Text>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setDeleteConfirmChapter(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteChapter}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Lesson Confirmation Modal */}
        {deleteConfirmLesson && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-surface p-6 rounded-lg max-w-sm w-full mx-4">
              <Heading size="4" className="mb-2">Delete Lesson?</Heading>
              <Text size="2" theme="secondary" className="mb-4">
                This will permanently delete "{deleteConfirmLesson.title}". This action cannot be undone.
              </Text>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setDeleteConfirmLesson(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteLesson}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Import ChevronLeft for the component
import { ChevronLeft } from "lucide-react";