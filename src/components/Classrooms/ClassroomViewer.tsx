"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Heading, Text } from "@/components/ui/Text";
import { Skeleton } from "@/components/ui/Skeleton";
import { ClassroomSidebar } from "./ClassroomSidebar";
import { LessonContent } from "./LessonContent";
import { toast } from "sonner";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { ChevronLeft, Menu, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";

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
  pages: { 
    _id: string; 
    title: string; 
    order: number; 
    isViewed?: boolean; 
    videoUrl?: string;
    description?: string;
  }[];
}

export function ClassroomViewer({ classroomId, onBack, isOwner, currentUser: providedUser }: ClassroomViewerProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  
  // Video modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  
  // Collapsed modules state
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  
  // Mobile drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Ref for focus management after mobile sidebar selection
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // Optimistic state for reordering chapters
  const [optimisticChapters, setOptimisticChapters] = useState<ModuleData[] | null>(null);
  
  // Optimistic state for lesson completion
  const [optimisticCompletedPages, setOptimisticCompletedPages] = useState<Set<string>>(new Set());

  // Optimistic state for lesson reordering within a module
  const [optimisticLessonOrders, setOptimisticLessonOrders] = useState<Record<string, { _id: string; title: string; order: number; isViewed?: boolean; videoUrl?: string; description?: string }[]>>({});

  // Delete confirmation state
  const [deleteConfirmChapter, setDeleteConfirmChapter] = useState<{ id: string; title: string; lessonCount: number } | null>(null);
  const [deleteConfirmLesson, setDeleteConfirmLesson] = useState<{ id: string; title: string } | null>(null);
  
  // T-CL-FIX-160: Delete button loading states
  const [isDeletingChapter, setIsDeletingChapter] = useState(false);
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);
  
  // Optimistic state for chapter title updates
  const [optimisticChapterTitles, setOptimisticChapterTitles] = useState<Record<string, string>>({});

  // Inline editing state for chapter titles
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState("");
  const chapterDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Inline editing state for lesson titles (sidebar)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState("");
  const lessonTitleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // T-CL-FIX-170 & T-CL-FIX-173: Refs for modal focus management (no longer needed with Radix Dialog, kept for future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const chapterModalRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lessonModalRef = useRef<HTMLDivElement>(null);

  // T-CL-FIX-242: Cancel lesson title debounce when selected page changes
  // Prevents stale closure from saving old title to the wrong lesson
  useEffect(() => {
    if (lessonTitleDebounceRef.current) {
      clearTimeout(lessonTitleDebounceRef.current);
    }
  }, [selectedPageId]);

  // T-CL-FIX-150 & T-CL-FIX-151: Cleanup debounce refs on unmount
  // T-CL-FIX-144: Cleanup mobile sidebar state on unmount
  // T-CL-FIX-143: Ensure debounced saves complete before unmount
  useEffect(() => {
    return () => {
      // T-CL-FIX-143: Flush any pending chapter title save
      if (chapterDebounceRef.current) {
        clearTimeout(chapterDebounceRef.current);
      }
      // Flush any pending lesson title save
      if (lessonTitleDebounceRef.current) {
        clearTimeout(lessonTitleDebounceRef.current);
      }
      // T-CL-FIX-144: Close sidebar on unmount (reset state)
      setIsSidebarOpen(false);
    };
  }, []);

  // T-CL-FIX-172: Handle Escape key for modals (Radix Dialog handles this automatically,
  // but we keep this for any non-Dialog modals that may be added)

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
      ? { pageId: selectedPageId as Id<"pages"> }
      : "skip"
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const markPageViewed = useMutation(api.functions.classrooms.markPageViewed);
  const updatePageContent = useMutation(api.functions.classrooms.updatePageContent);
  const updateLessonTitle = useMutation(api.functions.classrooms.updateLessonTitle);
  const createModule = useMutation(api.functions.classrooms.createModule);
  const createPage = useMutation(api.functions.classrooms.createPage);
  const updateChapter = useMutation(api.functions.classrooms.updateChapter);
  const toggleLessonComplete = useMutation(api.functions.classrooms.toggleLessonComplete);
  const deleteModule = useMutation(api.functions.classrooms.deleteModule);
  const deletePage = useMutation(api.functions.classrooms.deletePage);
  const reorderChapters = useMutation(api.functions.classrooms.reorderChapters);
  const reorderLessons = useMutation(api.functions.classrooms.reorderLessons);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Track if this is the initial load
  const isInitialLoad = useRef(true);

  // T-CL-FIX-152: Reset isInitialLoad ref on classroomId change
  useEffect(() => {
    isInitialLoad.current = true;
  }, [classroomId]);

  // Get current modules (optimistic or real) with optimistic title overrides
  const modules = useMemo(() => {
    const base = optimisticChapters || classroomContent?.modules || [];
    if (Object.keys(optimisticChapterTitles).length === 0) return base;
    return base.map(m => 
      optimisticChapterTitles[m._id] 
        ? { ...m, title: optimisticChapterTitles[m._id] }
        : m
    );
  }, [optimisticChapters, classroomContent?.modules, optimisticChapterTitles]);

  useEffect(() => {
    // Clear optimistic chapters when data changes
    if (classroomContent?.modules) {
      setOptimisticChapters(null);
      setOptimisticLessonOrders({});
    }
  }, [classroomContent?.modules]);

  // T-CL-FIX-250: Auto-create Chapter 1 + Lesson 1 on first open for owners
  // Replaces the empty state — owners immediately see a usable classroom
  useEffect(() => {
    if (
      isInitialLoad.current &&
      isOwner &&
      classroomContent &&
      !classroomContent.modules?.length
    ) {
      isInitialLoad.current = false;
      const autoInit = async () => {
        try {
          const mod = await createModule({
            classroomId: classroomId as Id<"classrooms">,
            title: "Chapter",
          });
          if (mod) {
            await createPage({
              moduleId: mod as Id<"modules">,
              title: "Lesson",
            });
          }
        } catch {
          toast.error("Failed to initialize classroom");
        }
      };
      autoInit();
    }
  }, [classroomContent, isOwner, classroomId, createModule, createPage]);

  useEffect(() => {
    if (isInitialLoad.current && classroomContent?.modules?.length) {
      isInitialLoad.current = false;
      const firstModule = classroomContent.modules[0];
      if (firstModule.pages?.length) {
        setSelectedPageId(firstModule.pages[0]._id);
      }
    }
  }, [classroomContent]);

  // T-CL-FIX-243: Auto-recover when selected page is deleted
  // If the currently selected lesson disappears (deleted in another tab, etc.),
  // automatically select the first available lesson to avoid a blank panel.
  useEffect(() => {
    if (!selectedPageId) return;
    const stillExists = classroomContent?.modules?.some(m =>
      m.pages?.some(p => p._id === selectedPageId)
    );
    if (!stillExists) {
      const firstPage = classroomContent?.modules?.[0]?.pages?.[0]?._id ?? null;
      setSelectedPageId(firstPage);
    }
  }, [selectedPageId, classroomContent?.modules]);

  // Save lesson title from sidebar editing (debounced 1.5s)
  const saveLessonTitle = useCallback(async (lessonId: string, newTitle: string, immediate = false) => {
    if (!newTitle.trim()) return;
    
    // Max length validation
    if (newTitle.trim().length > 100) {
      toast.error("Lesson title cannot exceed 100 characters");
      return;
    }
    
    const doSave = async () => {
      try {
        await updateLessonTitle({
          lessonId: lessonId as Id<"pages">,
          title: newTitle.trim(),
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update lesson title");
      } finally {
        setEditingLessonId(null);
      }
    };

    if (immediate) {
      if (lessonTitleDebounceRef.current) {
        clearTimeout(lessonTitleDebounceRef.current);
      }
      doSave();
    } else {
      if (lessonTitleDebounceRef.current) {
        clearTimeout(lessonTitleDebounceRef.current);
      }
      lessonTitleDebounceRef.current = setTimeout(doSave, 1500);
    }
  }, [updateLessonTitle]);

  const handleLessonTitleBlur = useCallback(() => {
    if (editingLessonId && editingLessonTitle.trim()) {
      saveLessonTitle(editingLessonId, editingLessonTitle, true);
    }
  }, [saveLessonTitle, editingLessonId, editingLessonTitle]);

  const handleLessonTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (editingLessonId) {
        saveLessonTitle(editingLessonId, editingLessonTitle, true);
      }
    } else if (e.key === "Escape") {
      setEditingLessonId(null);
    }
  }, [saveLessonTitle, editingLessonId, editingLessonTitle]);

  // Add Chapter - auto-create with a default lesson inside
  const handleAddChapter = useCallback(async () => {
    const defaultTitle = "Chapter";
    try {
      const mod = await createModule({
        classroomId: classroomId as Id<"classrooms">,
        title: defaultTitle,
      });
      // Auto-create Lesson 1 inside the new chapter
      if (mod) {
        await createPage({
          moduleId: mod as Id<"modules">,
          title: "Lesson",
        });
      }
      toast.success("Chapter created");
      } catch {
        toast.error("Failed to create chapter");
      }
  }, [createModule, createPage, classroomId]);

  // Add Lesson - auto-create with default name
  const handleAddLesson = useCallback(async (moduleId: string) => {
    try {
      await createPage({
        moduleId: moduleId as Id<"modules">,
        title: "Lesson",
      });
      toast.success("Lesson created");
    } catch {
      toast.error("Failed to create lesson");
    }
  }, [createPage]);

  // Handle toggle lesson complete with optimistic update
  const handleToggleComplete = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedPageId || !pageContent) return;
    
    // T-CL-FIX-244: Capture pre-toggle state for proper revert on error
    const wasCompleted = optimisticCompletedPages.has(selectedPageId);
    
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
    } catch {
      // T-CL-FIX-244: Revert to pre-toggle state, not current server state
      const reverted = new Set(optimisticCompletedPages);
      if (wasCompleted) {
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
    
    // T-CL-FIX-132: URL validation for video updates
    if (url && url.trim()) {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
      const vimeoRegex = /^(https?:\/\/)?(www\.)?vimeo\.com\/.+$/;
      const driveRegex = /^(https?:\/\/)?(drive\.google\.com|docs\.google\.com)\/.+$/;
      
      if (!youtubeRegex.test(url) && !vimeoRegex.test(url) && !driveRegex.test(url)) {
        toast.error("Invalid video URL. Use YouTube, Vimeo, or Google Drive");
        return;
      }
    }
    
    try {
      await updatePageContent({
        pageId: selectedPageId as Id<"pages">,
        title: pageContent.title,
        content: pageContent.content,
        videoUrl: url,
        description: pageContent.description,
      });
      toast.success("Video updated");
    } catch {
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
    } catch {
      toast.error("Failed to save description");
    }
  }, [selectedPageId, pageContent, updatePageContent]);

  // Save chapter title with debounce + optimistic UI
  const saveChapterTitle = useCallback(async (chapterId: string, newTitle: string, immediate = false) => {
    if (!newTitle.trim()) return;
    
    // T-CL-FIX-130: Max length validation
    if (newTitle.trim().length > 100) {
      toast.error("Chapter title cannot exceed 100 characters");
      return;
    }

    const trimmed = newTitle.trim();
    
    // Optimistic update
    setOptimisticChapterTitles(prev => ({ ...prev, [chapterId]: trimmed }));

    const doSave = async () => {
      try {
        await updateChapter({
          chapterId: chapterId as Id<"modules">,
          title: trimmed,
        });
      } catch {
        // Revert optimistic update on error
        setOptimisticChapterTitles(prev => {
          const next = { ...prev };
          delete next[chapterId];
          return next;
        });
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
  }, [saveChapterTitle, editingChapterTitle]);

  const handleChapterTitleKeyDown = useCallback((e: React.KeyboardEvent, chapterId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveChapterTitle(chapterId, editingChapterTitle, true);
    } else if (e.key === "Escape") {
      setEditingChapterId(null);
    }
  }, [saveChapterTitle, editingChapterTitle]);

  // Delete chapter handler
  const handleDeleteChapter = useCallback(async () => {
    if (!deleteConfirmChapter) return;
    setIsDeletingChapter(true);
    try {
      await deleteModule({ moduleId: deleteConfirmChapter.id as Id<"modules"> });
      setDeleteConfirmChapter(null);
      toast.success("Chapter deleted");
    } catch {
      toast.error("Failed to delete chapter");
    } finally {
      setIsDeletingChapter(false);
    }
  }, [deleteConfirmChapter, deleteModule]);

  // Delete lesson handler
  const handleDeleteLesson = useCallback(async () => {
    if (!deleteConfirmLesson) return;
    setIsDeletingLesson(true);
    try {
      await deletePage({ pageId: deleteConfirmLesson.id as Id<"pages"> });
      setDeleteConfirmLesson(null);
      if (selectedPageId === deleteConfirmLesson.id) {
        setSelectedPageId(null);
      }
      toast.success("Lesson deleted");
    } catch {
      toast.error("Failed to delete lesson");
    } finally {
      setIsDeletingLesson(false);
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
      // T-CL-FIX-111: Store previous state before optimistic update for proper revert
      const previousChapters = [...modules];
      
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
        // T-CL-FIX-111: Revert to previous state instead of clearing
        setOptimisticChapters(previousChapters);
        toast.error(err instanceof Error ? err.message : "Failed to reorder");
      }
    }
  }, [modules, classroomId, reorderChapters]);

  // Handle lesson reordering within a module with optimistic update
  const handleLessonDragEnd = useCallback(async (moduleId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const modulePages = optimisticLessonOrders[moduleId] 
      ? optimisticLessonOrders[moduleId]
      : classroomContent?.modules?.find(m => m._id === moduleId)?.pages || [];
    
    const oldIndex = modulePages.findIndex(p => p._id === active.id);
    const newIndex = modulePages.findIndex(p => p._id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const previousLessons = [...modulePages];
      const reordered = arrayMove(modulePages as { _id: string; title: string; order: number; isViewed?: boolean; videoUrl?: string; description?: string }[], oldIndex, newIndex);
      
      // Optimistic update
      setOptimisticLessonOrders(prev => ({ ...prev, [moduleId]: reordered }));
      
      const lessonOrders = reordered.map((p, index) => ({
        lessonId: p._id as Id<"pages">,
        order: index,
      }));
      
      try {
        await reorderLessons({
          moduleId: moduleId as Id<"modules">,
          lessonOrders,
        });
      } catch (err) {
        setOptimisticLessonOrders(prev => ({ ...prev, [moduleId]: previousLessons }));
        toast.error(err instanceof Error ? err.message : "Failed to reorder lessons");
      }
    }
  }, [classroomContent?.modules, optimisticLessonOrders, reorderLessons]);

  // Check if page is completed (optimistic or real)
  const isPageCompleted = useCallback((pageId: string) => {
    if (optimisticCompletedPages.has(pageId)) return true;
    const mod = classroomContent?.modules?.find(m => m.pages?.some(p => p._id === pageId));
    // Check optimistic lesson order first
    for (const modPages of Object.values(optimisticLessonOrders)) {
      const page = modPages.find(p => p._id === pageId);
      if (page) return page.isViewed || false;
    }
    const page = mod?.pages?.find(p => p._id === pageId);
    return page?.isViewed || false;
  }, [optimisticCompletedPages, classroomContent?.modules, optimisticLessonOrders]);

  // T-CL-FIX-246: Memoize to prevent unnecessary LessonContent re-renders
  const pageContentWithOptimistic = useMemo(() => pageContent ? {
    ...pageContent,
    isViewed: isPageCompleted(pageContent._id)
  } : null, [pageContent, isPageCompleted]);

  // T-CL-FIX-140: Loading state - show skeleton while classroomContent loads
  if (!classroomContent) {
    return (
      <div className="flex h-full gap-4">
        {/* Sidebar skeleton */}
        <div className="w-80 bg-bg-surface rounded-lg p-4 space-y-4">
          <Skeleton className="h-8 w-24" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 bg-bg-surface rounded-lg p-6">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // T-CL-FIX-241: Access denied check BEFORE empty-state check
  // If a non-owner without access opens a classroom with no modules,
  // they must see "Access Denied" — not "No Chapters Yet" with an add button.
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

  // T-CL-FIX-250: Empty state removed — auto-creates Chapter 1 + Lesson 1 for owners
  // Non-owners with no modules see the loading skeleton until content appears
  if (classroomContent.modules?.length === 0 && !isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="w-24 h-24 rounded-full bg-bg-surface flex items-center justify-center mb-4">
          <Menu className="w-12 h-12 text-text-muted" />
        </div>
        <Heading size="4" className="text-text-primary mb-2">No Content Yet</Heading>
        <Text size="3" theme="secondary" className="text-center max-w-md">
          The owner hasn&apos;t added any chapters to this classroom yet.
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
        onLessonDragEnd={handleLessonDragEnd}
        sensors={sensors}
        editingChapterId={editingChapterId}
        setEditingChapterId={setEditingChapterId}
        editingChapterTitle={editingChapterTitle}
        setEditingChapterTitle={setEditingChapterTitle}
        handleChapterTitleBlur={handleChapterTitleBlur}
        handleChapterTitleKeyDown={handleChapterTitleKeyDown}
        setDeleteConfirmChapter={setDeleteConfirmChapter}
        setDeleteConfirmLesson={setDeleteConfirmLesson}
        isPageCompleted={isPageCompleted}
        optimisticLessonOrders={optimisticLessonOrders}
        editingLessonId={editingLessonId}
        setEditingLessonId={setEditingLessonId}
        editingLessonTitle={editingLessonTitle}
        setEditingLessonTitle={setEditingLessonTitle}
        handleLessonTitleBlur={handleLessonTitleBlur}
        handleLessonTitleKeyDown={handleLessonTitleKeyDown}
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
          mainContentRef={mainContentRef}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onToggleComplete={(e) => handleToggleComplete(e as React.MouseEvent)}
          onVideoUpdate={handleVideoUpdate}
          onDescriptionUpdate={handleDescriptionUpdate}
          videoModalOpen={videoModalOpen}
          onVideoModalOpenChange={setVideoModalOpen}
          onSaveLessonTitle={selectedPageId ? (title: string) => saveLessonTitle(selectedPageId, title, false) : undefined}
        />

        {/* T-CL-FIX-170, T-CL-FIX-171: Delete Chapter Confirmation Modal */}
        <Dialog open={!!deleteConfirmChapter} onOpenChange={(open) => !open && !isDeletingChapter && setDeleteConfirmChapter(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Chapter?</DialogTitle>
              <DialogDescription>
                This will permanently delete &quot;{deleteConfirmChapter?.title}&quot; and {deleteConfirmChapter?.lessonCount} lesson{deleteConfirmChapter?.lessonCount !== 1 ? 's' : ''}. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteConfirmChapter(null)} disabled={isDeletingChapter}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteChapter} disabled={isDeletingChapter}>
                {isDeletingChapter ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* T-CL-FIX-170, T-CL-FIX-171: Delete Lesson Confirmation Modal */}
        <Dialog open={!!deleteConfirmLesson} onOpenChange={(open) => !open && !isDeletingLesson && setDeleteConfirmLesson(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Lesson?</DialogTitle>
              <DialogDescription>
                This will permanently delete &quot;{deleteConfirmLesson?.title}&quot;. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteConfirmLesson(null)} disabled={isDeletingLesson}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteLesson} disabled={isDeletingLesson}>
                {isDeletingLesson ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}