"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Heading, Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { getVideoThumbnail } from "@/lib/utils";
import { 
  ChevronLeft, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Menu,
  X,
  AlertCircle,
  Check,
  Play,
  Edit3,
  Save,
  GripVertical,
  MoreHorizontal,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

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

// Video URL validation and embed conversion
function getEmbedUrl(videoUrl: string): string | null {
  if (!videoUrl) return null;
  
  const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  const driveMatch = videoUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  
  return null;
}

function getVideoPlatform(videoUrl: string): string | null {
  if (!videoUrl) return null;
  if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) return "YouTube";
  if (videoUrl.includes("vimeo.com")) return "Vimeo";
  if (videoUrl.includes("drive.google.com")) return "Google Drive";
  return null;
}

// Video Modal Component
function VideoModal({
  open,
  onOpenChange,
  url,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string;
  onSave: (url: string) => void;
}) {
  const [inputValue, setInputValue] = useState(url || "");
  const [error, setError] = useState("");
  
  useEffect(() => {
    if (open) {
      setInputValue(url || "");
      setError("");
    }
  }, [open, url]);

  const embedUrl = getEmbedUrl(inputValue);
  const platform = getVideoPlatform(inputValue);
  const isValid = inputValue === "" || embedUrl !== null;

  const handleSave = () => {
    if (!inputValue.trim()) {
      onSave("");
      onOpenChange(false);
      return;
    }
    
    if (!embedUrl) {
      setError("Invalid URL. Use YouTube, Vimeo, or Google Drive links.");
      return;
    }
    
    onSave(inputValue);
    onOpenChange(false);
    toast.success("Video updated");
  };

  const handleRemove = () => {
    onSave("");
    onOpenChange(false);
    toast.success("Video removed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Add Video</DialogTitle>
        
        <div className="space-y-4">
          <div>
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError("");
              }}
              placeholder="Paste YouTube, Vimeo, or Google Drive link"
              className={!isValid ? "border-red-500" : ""}
            />
            {error && <Text size="2" theme="error" className="mt-1">{error}</Text>}
          </div>

          {embedUrl && (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-elevated">
              <iframe
                title="Video preview"
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {inputValue && platform && embedUrl && (
            <Text size="2" theme="secondary">
              Platform: {platform}
            </Text>
          )}

          {inputValue && !embedUrl && (
            <Text size="2" theme="error">
              Invalid video URL
            </Text>
          )}
        </div>

        <div className="flex justify-between mt-4">
          {url && (
            <Button variant="ghost" onClick={handleRemove}>
              <X className="w-4 h-4 mr-1" /> Remove
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="w-4 h-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Video Embed Component
function VideoEmbed({ 
  url, 
  onChange,
  isOwner,
  modalOpen,
  onModalOpenChange,
}: { 
  url?: string; 
  onChange?: (url: string) => void;
  isOwner: boolean;
  modalOpen?: boolean;
  onModalOpenChange?: (open: boolean) => void;
}) {
  const embedUrl = url ? getEmbedUrl(url) : null;

  if (embedUrl) {
    return (
      <>
        <div className="relative aspect-video rounded-[16px] overflow-hidden bg-bg-elevated">
          <iframe
            title="Lesson video"
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {isOwner && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={() => onModalOpenChange?.(true)}
            >
              <Edit3 className="w-4 h-4 mr-1" /> Edit
            </Button>
          )}
        </div>
        {isOwner && modalOpen !== undefined && (
          <VideoModal
            open={modalOpen}
            onOpenChange={onModalOpenChange!}
            url={url}
            onSave={onChange!}
          />
        )}
      </>
    );
  }

  if (isOwner) {
    return (
      <>
        <div 
          className="aspect-video rounded-[16px] bg-bg-elevated border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent"
          onClick={() => onModalOpenChange?.(true)}
        >
          <div className="text-center">
            <Play className="w-12 h-12 mx-auto text-text-muted mb-2" />
            <Text theme="secondary">Add a video for this lesson</Text>
          </div>
        </div>
        {modalOpen !== undefined && (
          <VideoModal
            open={modalOpen}
            onOpenChange={onModalOpenChange!}
            url={url}
            onSave={onChange!}
          />
        )}
      </>
    );
  }

  return (
    <div className="aspect-video rounded-[16px] bg-bg-elevated flex items-center justify-center">
      <Text theme="muted">No video for this lesson.</Text>
    </div>
  );
}

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
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Inline input state for creating module/page
  const [showModuleInput, setShowModuleInput] = useState(false);
  const [moduleInputValue, setModuleInputValue] = useState("");
  const [showPageInput, setShowPageInput] = useState<string | null>(null);
  const [pageInputValue, setPageInputValue] = useState("");
  
  // Inline editing state for chapter titles
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState("");
  const [editingChapterSaving, setEditingChapterSaving] = useState(false);
  const chapterDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Inline editing state for lesson titles
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState("");
  const [editingLessonSaving, setEditingLessonSaving] = useState(false);
  const lessonDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Menu state for chapters and lessons
  const [openChapterMenu, setOpenChapterMenu] = useState<string | null>(null);
  const [openLessonMenu, setOpenLessonMenu] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirmChapter, setDeleteConfirmChapter] = useState<string | null>(null);
  const [deleteConfirmLesson, setDeleteConfirmLesson] = useState<string | null>(null);

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

  // Track if this is the initial load
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialLoad.current && classroomContent?.modules?.length) {
      isInitialLoad.current = false;
      const firstModule = classroomContent.modules[0];
      if (firstModule.pages?.length) {
        setSelectedPageId(firstModule.pages[0]._id);
      }
    }
  }, [classroomContent]);

  // Track if page has been marked as viewed
  const hasMarkedViewed = useRef(false);

  useEffect(() => {
    if (selectedPageId && 
        pageContent?.hasAccess && 
        !pageContent.isViewed && 
        !isOwner && 
        !hasMarkedViewed.current) {
      hasMarkedViewed.current = true;
      markPageViewed({ pageId: selectedPageId as Id<"pages"> });
    }
  }, [selectedPageId, pageContent, isOwner, markPageViewed]);

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

  // Save draft to localStorage
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

  // Clear draft on save
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
    setError(null);
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
      setError(errorMessage);
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

  // Handle create module
  const handleCreateModule = useCallback(async (title: string) => {
    if (!title.trim()) return;
    setIsCreatingModule(true);
    setError(null);
    try {
      await createModule({
        classroomId: classroomId as Id<"classrooms">,
        title: title.trim(),
      });
      toast.success("Chapter created successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create chapter";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreatingModule(false);
    }
  }, [createModule, classroomId]);

  // Handle create page
  const handleCreatePage = useCallback(async (moduleId: string, title: string) => {
    if (!title.trim()) return;
    setIsCreatingPage(true);
    setError(null);
    try {
      await createPage({
        moduleId: moduleId as Id<"modules">,
        title,
      });
      toast.success("Lesson created successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create lesson";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreatingPage(false);
    }
  }, [createPage]);

  // Handle toggle lesson complete
  const handleToggleComplete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedPageId) return;
    try {
      await toggleLessonComplete({
        pageId: selectedPageId as Id<"pages">,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update progress";
      toast.error(errorMessage);
    }
  }, [selectedPageId, toggleLessonComplete]);

  // Handle video update
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

  // Handle description update
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

  // Open input modal for creating module
  const openCreateModuleModal = useCallback(() => {
    setError(null);
    setShowModuleInput(true);
    setModuleInputValue("");
  }, []);

  // Handle module input submit
  const handleModuleInputSubmit = useCallback(() => {
    if (moduleInputValue.trim()) {
      handleCreateModule(moduleInputValue.trim());
      setShowModuleInput(false);
      setModuleInputValue("");
    }
  }, [moduleInputValue, handleCreateModule]);

  // Handle module input cancel
  const handleModuleInputCancel = useCallback(() => {
    setShowModuleInput(false);
    setModuleInputValue("");
  }, []);

  // Start editing chapter title
  const startEditingChapter = useCallback((chapterId: string, currentTitle: string) => {
    setEditingChapterId(chapterId);
    setEditingChapterTitle(currentTitle);
  }, []);

  // Save chapter title (with debounce)
  const saveChapterTitle = useCallback(async (chapterId: string, newTitle: string, immediate = false) => {
    if (!newTitle.trim()) return;
    
    const doSave = async () => {
      setEditingChapterSaving(true);
      try {
        await updateChapter({
          chapterId: chapterId as Id<"modules">,
          title: newTitle.trim(),
        });
      } catch (err) {
        toast.error("Failed to update chapter title");
      } finally {
        setEditingChapterSaving(false);
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

  // Handle chapter title blur (save)
  const handleChapterTitleBlur = useCallback((chapterId: string) => {
    if (editingChapterTitle.trim()) {
      saveChapterTitle(chapterId, editingChapterTitle);
    }
  }, [editingChapterTitle, saveChapterTitle]);

  // Handle chapter title key down
  const handleChapterTitleKeyDown = useCallback((e: React.KeyboardEvent, chapterId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveChapterTitle(chapterId, editingChapterTitle, true);
    } else if (e.key === "Escape") {
      setEditingChapterId(null);
    }
  }, [editingChapterTitle, saveChapterTitle]);

  // Start editing lesson title
  const startEditingLesson = useCallback((lessonId: string, currentTitle: string) => {
    setEditingLessonId(lessonId);
    setEditingLessonTitle(currentTitle);
  }, []);

  // Save lesson title (with debounce)
  const saveLessonTitle = useCallback(async (lessonId: string, newTitle: string, immediate = false) => {
    if (!newTitle.trim()) return;
    
    const doSave = async () => {
      setEditingLessonSaving(true);
      try {
        await updatePageContent({
          pageId: lessonId as Id<"pages">,
          title: newTitle.trim(),
        });
      } catch (err) {
        toast.error("Failed to update lesson title");
      } finally {
        setEditingLessonSaving(false);
        setEditingLessonId(null);
      }
    };

    if (immediate) {
      if (lessonDebounceRef.current) {
        clearTimeout(lessonDebounceRef.current);
      }
      doSave();
    } else {
      if (lessonDebounceRef.current) {
        clearTimeout(lessonDebounceRef.current);
      }
      lessonDebounceRef.current = setTimeout(doSave, 1500);
    }
  }, [updatePageContent]);

  // Handle lesson title blur (save)
  const handleLessonTitleBlur = useCallback((lessonId: string) => {
    if (editingLessonTitle.trim()) {
      saveLessonTitle(lessonId, editingLessonTitle, true);
    }
  }, [editingLessonTitle, saveLessonTitle]);

  // Handle lesson title key down
  const handleLessonTitleKeyDown = useCallback((e: React.KeyboardEvent, lessonId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveLessonTitle(lessonId, editingLessonTitle, true);
    } else if (e.key === "Escape") {
      setEditingLessonId(null);
    }
  }, [editingLessonTitle, saveLessonTitle]);

  // Delete chapter handler
  const handleDeleteChapter = useCallback(async (chapterId: string) => {
    try {
      await deleteModule({ moduleId: chapterId as Id<"modules"> });
      setDeleteConfirmChapter(null);
      setOpenChapterMenu(null);
      toast.success("Chapter deleted");
    } catch (err) {
      toast.error("Failed to delete chapter");
    }
  }, [deleteModule]);

  // Delete lesson handler
  const handleDeleteLesson = useCallback(async (lessonId: string) => {
    try {
      await deletePage({ pageId: lessonId as Id<"pages"> });
      setDeleteConfirmLesson(null);
      setOpenLessonMenu(null);
      // Clear selected page if it was deleted
      if (selectedPageId === lessonId) {
        setSelectedPageId(null);
      }
      toast.success("Lesson deleted");
    } catch (err) {
      toast.error("Failed to delete lesson");
    }
  }, [deletePage, selectedPageId]);

  // Open input modal for creating page
  const openCreatePageModal = useCallback((moduleId: string) => {
    setError(null);
    setShowPageInput(moduleId);
    setPageInputValue("");
  }, []);

  // Handle page input submit
  const handlePageInputSubmit = useCallback((moduleId: string) => {
    if (pageInputValue.trim()) {
      handleCreatePage(moduleId, pageInputValue.trim());
      setShowPageInput(null);
      setPageInputValue("");
    }
  }, [pageInputValue, handleCreatePage]);

  // Handle page input cancel
  const handlePageInputCancel = useCallback(() => {
    setShowPageInput(null);
    setPageInputValue("");
  }, []);

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

  // Calculate total lessons
  const totalLessons = useMemo(() => {
    if (!classroomContent?.modules) return 0;
    let total = 0;
    for (const mod of classroomContent.modules) {
      total += mod.pages?.length || 0;
    }
    return total;
  }, [classroomContent]);

  // Find current module for header
  const currentModule = useMemo(() => {
    if (!classroomContent?.modules || !selectedPageId) return null;
    for (const mod of classroomContent.modules) {
      if (mod.pages?.some(p => p._id === selectedPageId)) {
        return mod;
      }
    }
    return null;
  }, [classroomContent, selectedPageId]);

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

  const modules = classroomContent?.modules || [];

  return (
    <div className="flex h-full gap-4">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
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
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Progress bar and expand/collapse all */}
            {/* Calculate overall progress */}
            {(() => {
              const allPages = classroomContent?.modules?.flatMap(m => m.pages || []) || [];
              const totalLessons = allPages.length;
              const completedLessons = allPages.filter(p => p.isViewed).length;
              const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
              return (
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
                          // Collapse all
                          modules.forEach(m => setCollapsedModules(prev => new Set([...prev, m._id])));
                        } else {
                          // Expand all
                          setCollapsedModules(new Set());
                        }
                      }}
                    >
                      {collapsedModules.size === 0 ? 'Collapse All' : 'Expand All'}
                    </Button>
                  )}
                </div>
              );
            })()}
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
                    onClick={() => openCreateModuleModal()} 
                    className="mt-3 text-accent"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create First Chapter
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {modules.map((module: ModuleData) => {
                  const isCollapsed = collapsedModules.has(module._id);
                  const isActive = module.pages?.some(p => p._id === selectedPageId);
                  
                  // Calculate chapter progress
                  const totalLessons = module.pages?.length || 0;
                  const completedLessons = module.pages?.filter(p => p.isViewed).length || 0;
                  const chapterProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                  
                  return (
                    <div key={module._id} className="group">
                      <div className={`flex items-center justify-between py-2 px-2 rounded-lg ${
                        isActive ? "bg-accent/10" : "hover:bg-bg-elevated"
                      }`}>
                        {/* Drag handle - owner only */}
                        {isOwner && (
                          <div className="p-1 cursor-grab text-text-muted hover:text-text-primary mr-1" title="Drag to reorder">
                            <GripVertical className="w-4 h-4" />
                          </div>
                        )}
                        <button
                          onClick={() => !isOwner || editingChapterId === module._id ? undefined : toggleModuleCollapse(module._id)}
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
                          {isOwner && editingChapterId === module._id ? (
                            <input
                              type="text"
                              value={editingChapterTitle}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingChapterTitle(e.target.value)}
                              onBlur={() => handleChapterTitleBlur(module._id)}
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleChapterTitleKeyDown(e, module._id)}
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              className="flex-1 bg-bg-elevated border border-accent rounded px-2 py-0.5 text-sm font-semibold focus:outline-none"
                              autoFocus
                            />
                          ) : isOwner ? (
                            <span 
                              className="font-semibold truncate cursor-text hover:underline"
                              onClick={(e: React.MouseEvent) => {
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
                          <Text size="1" theme="muted">
                            ({module.pages?.length || 0})
                          </Text>
                          {/* Progress ring */}
                          {totalLessons > 0 && (
                            <div className="ml-2 flex items-center gap-1" title={`${completedLessons}/${totalLessons} completed`}>
                              <ProgressRing progress={chapterProgress} size={20} strokeWidth={2.5} />
                              <Text size="1" theme="muted" className="text-[10px]">
                                {completedLessons}/{totalLessons}
                              </Text>
                            </div>
                          )}
                        </button>
                        {isOwner && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openCreatePageModal(module._id)}
                              className="p-1.5 text-text-muted hover:text-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label={`Add lesson to ${module.title}`}
                              title="Add lesson"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            {/* 3-dot menu for chapter */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenChapterMenu(openChapterMenu === module._id ? null : module._id);
                                }}
                                className="p-1.5 text-text-muted hover:text-text-primary rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Chapter options"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                              {openChapterMenu === module._id && (
                                <div className="absolute right-0 top-8 bg-bg-base border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-20">
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
                                  {deleteConfirmChapter === module._id ? (
                                    <div className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
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
                                        setDeleteConfirmChapter(module._id);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2 text-sm text-red-500"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {!isCollapsed && module.pages && module.pages.length > 0 && (
                        <div className="ml-4 space-y-1 mt-1">
                          {module.pages.map((page) => (
                            <div key={page._id} className="flex items-center">
                              {/* Drag handle - owner only */}
                              {isOwner && (
                                <div className="p-1 cursor-grab text-text-muted hover:text-text-primary mr-1" title="Drag to reorder">
                                  <GripVertical className="w-3 h-3" />
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  if (editingLessonId !== page._id) {
                                    setSelectedPageId(page._id);
                                    setIsSidebarOpen(false);
                                    // Focus main content for accessibility
                                    mainContentRef.current?.focus();
                                  }
                                }}
                                aria-current={selectedPageId === page._id ? "page" : undefined}
                                className={`flex-1 flex items-center gap-2 text-left px-3 py-2.5 rounded-lg text-sm ${
                                  selectedPageId === page._id
                                    ? "bg-accent text-white font-medium"
                                    : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                                }`}
                              >
                                {/* Lesson thumbnail */}
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
                                {/* Progress indicator */}
                                {page.isViewed ? (
                                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <div className="w-4 h-4 flex-shrink-0" />
                                )}
                                {isOwner && editingLessonId === page._id ? (
                                  <input
                                    type="text"
                                    value={editingLessonTitle}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingLessonTitle(e.target.value)}
                                    onBlur={() => handleLessonTitleBlur(page._id)}
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleLessonTitleKeyDown(e, page._id)}
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    className="flex-1 bg-bg-elevated border border-accent rounded px-2 py-0.5 text-sm focus:outline-none min-w-0"
                                    autoFocus
                                  />
                                ) : isOwner ? (
                                  <span 
                                    className="truncate cursor-text hover:underline"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      startEditingLesson(page._id, page.title);
                                    }}
                                  >
                                    {page.title}
                                  </span>
                                ) : (
                                  <span className="truncate">{page.title}</span>
                                )}
                              </button>
                              {/* 3-dot menu for lesson */}
                              {isOwner && (
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenLessonMenu(openLessonMenu === page._id ? null : page._id);
                                    }}
                                    className="p-1 text-text-muted hover:text-text-primary rounded opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                    aria-label="Lesson options"
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                  {openLessonMenu === page._id && (
                                    <div className="absolute right-0 top-8 bg-bg-base border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-20">
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleLessonComplete({ pageId: page._id as Id<"pages"> });
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
                                      {deleteConfirmLesson === page._id ? (
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
                                          className="w-full px-3 py-2 text-left hover:bg-bg-elevated flex items-center gap-2 text-sm text-red-500"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          {/* Inline input for adding lesson */}
                          {showPageInput === module._id && (
                            <div className="flex gap-1 ml-2">
                              <Input
                                value={pageInputValue}
                                onChange={(e) => setPageInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handlePageInputSubmit(module._id);
                                  if (e.key === "Escape") handlePageInputCancel();
                                }}
                                placeholder="Lesson title..."
                                autoFocus
                                className="flex-1 h-8 text-sm"
                              />
                              <Button size="sm" className="h-8 px-2" onClick={() => handlePageInputSubmit(module._id)}>
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 px-1" onClick={handlePageInputCancel}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isOwner && (
                  showModuleInput ? (
                    <div className="flex gap-2 p-2">
                      <Input
                        value={moduleInputValue}
                        onChange={(e) => setModuleInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleModuleInputSubmit();
                          if (e.key === "Escape") handleModuleInputCancel();
                        }}
                        placeholder="Chapter title..."
                        autoFocus
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleModuleInputSubmit}>
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleModuleInputCancel}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={openCreateModuleModal}
                      className="w-full py-3 text-center text-sm text-text-muted hover:text-accent border border-dashed border-border hover:border-accent rounded-lg"
                    >
                      <Plus className="w-4 h-4 mx-auto mb-1" />
                      Add Chapter
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main content - Right section */}
      <div 
        ref={mainContentRef}
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        tabIndex={-1}
      >
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 p-3 border-b border-border bg-bg-surface">
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

        <div className="flex-1 overflow-y-auto">
          {!pageContent ? (
            <div className="p-8">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-64" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-4 lg:p-6 space-y-4">
                {/* Header: Chapter Name / Lesson Name */}
                <div className="flex items-center justify-between">
                  <Text size="4" className="text-text-primary font-semibold">
                    {currentModule?.title || "Chapter"} / {pageContent.title || "Lesson"}
                  </Text>
                  
                  {/* Progress checkbox - green circle toggle */}
                  {(userId || isOwner) && pageContent && (
                    <button
                      type="button"
                      onClick={handleToggleComplete}
                      style={{
                        width: 28,
                        height: 28,
                        minWidth: 28,
                        borderRadius: '50%',
                        border: pageContent.isViewed ? '2px solid #22c55e' : '2px solid #9ca3af',
                        backgroundColor: pageContent.isViewed ? '#22c55e' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                        zIndex: 10,
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (!pageContent.isViewed) {
                          e.currentTarget.style.borderColor = '#22c55e';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!pageContent.isViewed) {
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }
                      }}
                      title={pageContent.isViewed ? "Mark as incomplete" : "Mark as complete"}
                    >
                      {pageContent.isViewed && <Check style={{ width: 16, height: 16, color: 'white' }} />}
                    </button>
                  )}
                </div>

                {/* Video Embed */}
                <div>
                  <VideoEmbed 
                    url={pageContent.videoUrl}
                    isOwner={isOwner}
                    onChange={handleVideoUpdate}
                    modalOpen={videoModalOpen}
                    onModalOpenChange={setVideoModalOpen}
                  />
                </div>

                {/* Description */}
                <div>
                  {isOwner || pageContent.description ? (
                    <LessonDescription
                      description={pageContent.description || ""}
                      isOwner={isOwner}
                      onSave={handleDescriptionUpdate}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <Text theme="muted">No description yet.</Text>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Lesson Description Component (inline editable)
function LessonDescription({
  description,
  isOwner,
  onSave,
}: {
  description: string;
  isOwner: boolean;
  onSave: (description: string) => void;
}) {
  const [text, setText] = useState(description);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(description);
  }, [description]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  };

  const handleChange = useCallback((newText: string) => {
    setText(newText);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      setSaving(true);
      onSave(newText);
      setSaving(false);
    }, 1500);
    
    setTimeout(adjustTextareaHeight, 0);
  }, [onSave]);

  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setSaving(true);
    onSave(text);
    setSaving(false);
  }, [text, onSave]);

  useEffect(() => {
    setTimeout(adjustTextareaHeight, 0);
  }, []);

  if (isOwner) {
    return (
      <div>
        <textarea
          ref={textareaRef}
          className="w-full p-3 text-sm bg-bg-subtle hover:bg-bg-elevated focus:bg-bg-elevated rounded-lg resize-none focus:outline-none"
          placeholder="Write a description..."
          value={text}
          onChange={(e) => {
            handleChange(e.target.value);
            adjustTextareaHeight();
          }}
          onBlur={handleBlur}
          style={{ height: "auto" }}
        />
        {saving && (
          <Text size="1" theme="muted" className="mt-1">Saving...</Text>
        )}
      </div>
    );
  }

  return (
    <Text size="2" className="text-text-secondary whitespace-pre-wrap">
      {description || <Text theme="muted">No description yet.</Text>}
    </Text>
  );
}
