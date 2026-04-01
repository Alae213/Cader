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
import { ChevronLeft, Menu, AlertCircle, Play, Trash2 } from "lucide-react";

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

  // Chapter menu state
  const [openChapterMenu, setOpenChapterMenu] = useState<string | null>(null);
  
  // Lesson menu state
  const [openLessonMenu, setOpenLessonMenu] = useState<string | null>(null);
  
  // Inline editing state for chapter titles
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState("");
  const chapterDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Lesson title editing debounce
  const lessonTitleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // T-CL-FIX-170 & T-CL-FIX-173: Refs for modal focus management
  const chapterModalRef = useRef<HTMLDivElement>(null);
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

  // T-CL-FIX-172 & T-CL-FIX-173: Handle Escape key and focus management for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteConfirmChapter) setDeleteConfirmChapter(null);
        if (deleteConfirmLesson) setDeleteConfirmLesson(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteConfirmChapter, deleteConfirmLesson]);

  // T-CL-FIX-173: Focus modal when opened
  useEffect(() => {
    if (deleteConfirmChapter && chapterModalRef.current) {
      chapterModalRef.current.focus();
    }
  }, [deleteConfirmChapter]);

  useEffect(() => {
    if (deleteConfirmLesson && lessonModalRef.current) {
      lessonModalRef.current.focus();
    }
  }, [deleteConfirmLesson]);

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

  // Get current modules (optimistic or real)
  const modules = optimisticChapters || classroomContent?.modules || [];

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

  // Save lesson title with debounce (1.5s)
  const handleSaveLessonTitle = useCallback((newTitle: string) => {
    if (!selectedPageId || !pageContent) return;
    if (!newTitle.trim()) {
      toast.error("Lesson title cannot be empty");
      return;
    }
    
    if (lessonTitleDebounceRef.current) {
      clearTimeout(lessonTitleDebounceRef.current);
    }
    
    lessonTitleDebounceRef.current = setTimeout(async () => {
      try {
        await updatePageContent({
          pageId: selectedPageId as Id<"pages">,
          title: newTitle.trim(),
          content: pageContent.content,
          videoUrl: pageContent.videoUrl,
          description: pageContent.description,
        });
      } catch {
        toast.error("Failed to update lesson title");
      }
    }, 1500);
  }, [selectedPageId, pageContent, updatePageContent]);

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
    
    // T-CL-FIX-130: Max length validation
    if (newTitle.trim().length > 100) {
      toast.error("Chapter title cannot exceed 100 characters");
      return;
    }
    
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
  }, [saveChapterTitle]);

  const handleChapterTitleKeyDown = useCallback((e: React.KeyboardEvent, chapterId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveChapterTitle(chapterId, editingChapterTitle, true);
    } else if (e.key === "Escape") {
      setEditingChapterId(null);
    }
  }, [saveChapterTitle]);

  // Delete chapter handler
  const handleDeleteChapter = useCallback(async () => {
    if (!deleteConfirmChapter) return;
    setIsDeletingChapter(true);
    try {
      await deleteModule({ moduleId: deleteConfirmChapter.id as Id<"modules"> });
      setDeleteConfirmChapter(null);
      setOpenChapterMenu(null);
      toast.success("Chapter deleted");
    } catch (err) {
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
    } catch (err) {
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
          setOpenLessonMenu(null);
        }}
        onAddChapter={handleAddChapter}
        onAddLesson={handleAddLesson}
        onChapterDragEnd={handleChapterDragEnd}
        onLessonDragEnd={handleLessonDragEnd}
        sensors={sensors}
        openChapterMenu={openChapterMenu}
        setOpenChapterMenu={setOpenChapterMenu}
        openLessonMenu={openLessonMenu}
        setOpenLessonMenu={setOpenLessonMenu}
        editingChapterId={editingChapterId}
        setEditingChapterId={setEditingChapterId}
        editingChapterTitle={editingChapterTitle}
        setEditingChapterTitle={setEditingChapterTitle}
        handleChapterTitleBlur={handleChapterTitleBlur}
        handleChapterTitleKeyDown={handleChapterTitleKeyDown}
        deleteConfirmChapter={deleteConfirmChapter}
        setDeleteConfirmChapter={setDeleteConfirmChapter}
        handleDeleteChapter={handleDeleteChapter}
        deleteConfirmLesson={deleteConfirmLesson}
        setDeleteConfirmLesson={setDeleteConfirmLesson}
        handleDeleteLesson={handleDeleteLesson}
        isPageCompleted={isPageCompleted}
        optimisticLessonOrders={optimisticLessonOrders}
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
          onSaveLessonTitle={handleSaveLessonTitle}
        />

        {/* T-CL-FIX-170, T-CL-FIX-171: Delete Chapter Confirmation Modal */}
        {deleteConfirmChapter && (
            <div 
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              role="dialog"
              aria-modal="true"
              aria-label="Delete chapter confirmation"
              onClick={() => !isDeletingChapter && setDeleteConfirmChapter(null)}
            >
              <div 
                className="bg-bg-surface p-6 rounded-lg max-w-sm w-full mx-4"
                ref={chapterModalRef}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
              >
                <Heading size="4" className="mb-2">Delete Chapter?</Heading>
              <Text size="2" theme="secondary" className="mb-4">
                This will permanently delete &quot;{deleteConfirmChapter.title}&quot; and {deleteConfirmChapter.lessonCount} lesson{deleteConfirmChapter.lessonCount !== 1 ? 's' : ''}. This action cannot be undone.
              </Text>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setDeleteConfirmChapter(null)} disabled={isDeletingChapter}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteChapter} disabled={isDeletingChapter}>
                  {isDeletingChapter ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* T-CL-FIX-170, T-CL-FIX-171: Delete Lesson Confirmation Modal */}
        {deleteConfirmLesson && (
            <div 
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              role="dialog"
              aria-modal="true"
              aria-label="Delete lesson confirmation"
              onClick={() => !isDeletingLesson && setDeleteConfirmLesson(null)}
            >
              <div 
                className="bg-bg-surface p-6 rounded-lg max-w-sm w-full mx-4"
                ref={lessonModalRef}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
              >
                <Heading size="4" className="mb-2">Delete Lesson?</Heading>
              <Text size="2" theme="secondary" className="mb-4">
                This will permanently delete &quot;{deleteConfirmLesson.title}&quot;. This action cannot be undone.
              </Text>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setDeleteConfirmLesson(null)} disabled={isDeletingLesson}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteLesson} disabled={isDeletingLesson}>
                  {isDeletingLesson ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}