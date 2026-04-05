"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Text } from "@/components/ui/Text";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";
import { VideoEmbed } from "./VideoEmbed";
import { LessonDescription } from "./LessonDescription";
import { Menu, Check } from "lucide-react";

interface PageContent {
  _id: string;
  title: string;
  content: string;
  videoUrl?: string;
  description?: string;
  isViewed?: boolean;
  hasAccess: boolean;
}

interface ModuleData {
  _id: string;
  title: string;
  pages: { _id: string }[];
}

interface ClassroomContent {
  title?: string;
  modules?: ModuleData[];
}

interface LessonContentProps {
  classroomContent: ClassroomContent | null | undefined;
  pageContent: PageContent | null;
  selectedPageId: string | null;
  isOwner: boolean;
  isSidebarOpen: boolean;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  onOpenSidebar: () => void;
  onToggleComplete: (e?: React.MouseEvent | undefined) => void | Promise<void>;
  onVideoUpdate: (url: string) => void;
  onDescriptionUpdate: (description: string) => void;
  videoModalOpen?: boolean;
  onVideoModalOpenChange?: (open: boolean) => void;
  onSaveLessonTitle?: (title: string) => void;
}

export function LessonContent({
  classroomContent,
  pageContent,
  selectedPageId,
  isOwner,
  mainContentRef,
  onOpenSidebar,
  onToggleComplete,
  onVideoUpdate,
  onDescriptionUpdate,
  videoModalOpen,
  onVideoModalOpenChange,
  onSaveLessonTitle,
}: LessonContentProps) {
  // ── Inline title editing (delegates save to parent) ──
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [confirmedTitle, setConfirmedTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ── Optimistic completion state ──
  const [optimisticViewed, setOptimisticViewed] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Sync local state when pageContent changes (e.g. navigating lessons)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (pageContent) {
      setEditedTitle(pageContent.title);
      setConfirmedTitle(pageContent.title);
      setOptimisticViewed(!!pageContent.isViewed);
    }
  }, [pageContent?._id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Keep optimisticViewed in sync when server value changes (after toggle resolves)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (pageContent?.isViewed !== undefined && !isToggling) {
      setOptimisticViewed(pageContent.isViewed);
    }
  }, [pageContent?.isViewed, isToggling]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // ── Title save — delegates to parent's debounced callback ──
  const doSaveTitle = useCallback(
    (title: string, immediate = false) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      // Optimistic: update confirmed title immediately
      setConfirmedTitle(trimmed);
      if (immediate) {
        onSaveLessonTitle?.(trimmed);
      } else {
        // Parent handles debounce
        onSaveLessonTitle?.(trimmed);
      }
      setIsEditingTitle(false);
    },
    [onSaveLessonTitle]
  );

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSaveTitle(editedTitle, true);
      } else if (e.key === "Escape") {
        // Revert to last confirmed title
        setEditedTitle(confirmedTitle);
        setIsEditingTitle(false);
      }
    },
    [editedTitle, confirmedTitle, doSaveTitle]
  );

  const handleTitleBlur = useCallback(() => {
    doSaveTitle(editedTitle, true);
  }, [editedTitle, doSaveTitle]);

  // ── Checkbox toggle — optimistic UI ──
  const handleToggle = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const prevValue = optimisticViewed;
      setOptimisticViewed(!prevValue);
      setIsToggling(true);

      try {
        const result = onToggleComplete(e);
        if (result && typeof (result as Promise<void>).then === "function") {
          (result as Promise<void>)
            .catch(() => {
              setOptimisticViewed(prevValue);
            })
            .finally(() => {
              setIsToggling(false);
            });
        } else {
          setIsToggling(false);
        }
      } catch {
        setOptimisticViewed(prevValue);
        setIsToggling(false);
      }
    },
    [optimisticViewed, onToggleComplete]
  );

  // ── Resolve chapter name ──
  const getChapterName = useCallback(() => {
    if (!selectedPageId || !classroomContent?.modules) return "";
    for (const mod of classroomContent.modules) {
      if (mod.pages?.some((p) => p._id === selectedPageId)) {
        return mod.title;
      }
    }
    return "";
  }, [selectedPageId, classroomContent]);

  // ── Loading skeleton ──
  if (!pageContent) {
    return (
      <div
        ref={mainContentRef}
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        tabIndex={-1}
      >
        <div className="lg:hidden flex items-center gap-3 p-3 border-b border-border bg-bg-surface">
          <button
            onClick={onOpenSidebar}
            className="p-2 hover:bg-bg-elevated rounded-lg"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Text size="2" theme="secondary" className="truncate flex-1">
            {classroomContent?.title || "Loading..."}
          </Text>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-64 mt-2" />
          <Skeleton className="h-64 mt-4" />
        </div>
      </div>
    );
  }

  const chapterName = getChapterName();

  return (
    <div
      ref={mainContentRef}
      className="flex-1 flex flex-col min-w-0 overflow-hidden"
      tabIndex={-1}
    >
      {/* Mobile header */}
      <div className="lg:hidden flex items-center gap-3 p-3 border-b border-border bg-bg-surface">
        <button
          onClick={onOpenSidebar}
          className="p-2 hover:bg-bg-elevated rounded-lg"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Text size="2" theme="secondary" className="truncate flex-1">
          {classroomContent?.title || "Loading..."}
        </Text>
      </div>

      <div className="flex-1 overflow-y-auto p-0 md:p-0">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="space-y-4">
              {/* ── Header: chapter name, lesson title, checkbox ── */}
              <div className="flex items-center gap-3 px-2 pt-2">
                <div className="flex-1 min-w-0">
                  {chapterName && (
                    <Text size="1" theme="muted" className="mb-1">
                      {chapterName}
                    </Text>
                  )}

                  {isEditingTitle ? (
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      onBlur={handleTitleBlur}
                      maxLength={100}
                      className="p-1 pr-2 text-[20px] leading-[20px] font-bold bg-transparent hover:bg-bg-elevated focus-visible:bg-bg-elevated rounded-lg focus-visible:outline-none cursor-text transition-colors"
                      style={{ width: `${Math.max(editedTitle.length, 1)}ch` }}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className="cursor-pointer"
                        onClick={() => {
                          if (isOwner) {
                            setEditedTitle(confirmedTitle);
                            setIsEditingTitle(true);
                          }
                        }}
                      >
                        <Text size="5" fontWeight="bold">
                          {confirmedTitle}
                        </Text>
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Checkbox toggle (optimistic) ── */}
                <button
                  onClick={handleToggle}
                  className={`flex-shrink-0 w-8 h-8 cursor-pointer hover:bg-green-500/20  rounded-full shadow-input-shadow bg-black/80  flex items-center justify-center transition-colors ${
                    optimisticViewed
                      ? "bg-green-600"
                      : "border-border hover:border-accent"
                  }`}
                  aria-label={
                    optimisticViewed
                      ? "Mark as not complete"
                      : "Mark as complete"
                  }
                >
                  {optimisticViewed && <Check className="w-4 h-4 text-white" />}
                </button>
              </div>

              {/* ── Video Embed ── */}
              <VideoEmbed
                url={pageContent.videoUrl} 
                isOwner={isOwner}
                modalOpen={videoModalOpen}
                onModalOpenChange={onVideoModalOpenChange}
                onChange={onVideoUpdate}
              />

              {/* ── Lesson Description ── */}
              <div>
                <Text size="2" fontWeight="semibold" className="mb-2 px-2">
                  Description
                </Text>
                <LessonDescription
                  description={pageContent.description || ""}
                  isOwner={isOwner}
                  onSave={onDescriptionUpdate}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
