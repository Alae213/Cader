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
  Save
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
  pages: { _id: string; title: string; order: number; isViewed?: boolean }[];
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
          <div className="p-4 border-b border-border">
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
                  
                  return (
                    <div key={module._id} className="group">
                      <div className={`flex items-center justify-between py-2 px-2 rounded-lg ${
                        isActive ? "bg-accent/10" : "hover:bg-bg-elevated"
                      }`}>
                        <button
                          onClick={() => toggleModuleCollapse(module._id)}
                          className="flex items-center gap-2 flex-1 text-left"
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
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => openCreatePageModal(module._id)}
                            className="p-1.5 text-text-muted hover:text-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Add lesson to ${module.title}`}
                            title="Add lesson"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      
                      {!isCollapsed && module.pages && module.pages.length > 0 && (
                        <div className="ml-4 space-y-1 mt-1">
                          {module.pages.map((page) => (
                            <button
                              key={page._id}
                              onClick={() => {
                                setSelectedPageId(page._id);
                                setIsSidebarOpen(false);
                                // Focus main content for accessibility
                                mainContentRef.current?.focus();
                              }}
                              aria-current={selectedPageId === page._id ? "page" : undefined}
                              className={`w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg text-sm ${
                                selectedPageId === page._id
                                  ? "bg-accent text-white font-medium"
                                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                              }`}
                            >
                              {/* Progress indicator */}
                              {page.isViewed ? (
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 flex-shrink-0" />
                              )}
                              <span className="truncate">{page.title}</span>
                            </button>
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
