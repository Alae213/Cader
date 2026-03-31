"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Heading, Text } from "@/components/ui/Text";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";
import { VideoEmbed } from "./VideoEmbed";
import { LessonDescription } from "./LessonDescription";
import {
  Menu,
  Check,
  AlertCircle,
  Play,
} from "lucide-react";

interface PageContent {
  _id: string;
  title: string;
  content: string;
  videoUrl?: string;
  description?: string;
  isViewed?: boolean;
  hasAccess: boolean;
}

interface ClassroomContent {
  title?: string;
}

interface LessonContentProps {
  classroomContent: ClassroomContent | null;
  pageContent: PageContent | null;
  selectedPageId: string | null;
  isOwner: boolean;
  isSidebarOpen: boolean;
  editingPageId: string | null;
  editedTitle: string;
  editedContent: string;
  isSaving: boolean;
  error: string | null;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  onOpenSidebar: () => void;
  onToggleComplete: () => void;
  onStartEdit: () => void;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onVideoUpdate: (url: string) => void;
  onDescriptionUpdate: (description: string) => void;
}

export function LessonContent({
  classroomContent,
  pageContent,
  selectedPageId,
  isOwner,
  isSidebarOpen,
  editingPageId,
  editedTitle,
  editedContent,
  isSaving,
  error,
  mainContentRef,
  onOpenSidebar,
  onToggleComplete,
  onStartEdit,
  onTitleChange,
  onContentChange,
  onSaveEdit,
  onCancelEdit,
  onVideoUpdate,
  onDescriptionUpdate,
}: LessonContentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  if (!pageContent) {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {editingPageId === pageContent._id ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="text-3xl font-bold bg-bg-elevated border border-accent rounded px-2 py-1 w-full focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <Heading size="5" className="font-bold">
                    {pageContent.title}
                  </Heading>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isOwner && pageContent.hasAccess && (
                  <Button
                    variant={pageContent.isViewed ? "secondary" : "primary"}
                    size="sm"
                    onClick={() => onToggleComplete()}
                  >
                    {pageContent.isViewed ? (
                      <>
                        <Check className="w-4 h-4 mr-1" /> Completed
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" /> Mark Complete
                      </>
                    )}
                  </Button>
                )}
                {isOwner && editingPageId !== pageContent._id && (
                  <Button variant="secondary" size="sm" onClick={onStartEdit}>
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <Text size="2" theme="error" className="mt-2">
                {error}
              </Text>
            )}
          </div>

          {/* Video */}
          <div className="mb-6">
            <VideoEmbed
              url={pageContent.videoUrl}
              isOwner={isOwner}
              onChange={onVideoUpdate}
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <Text size="3" fontWeight="semibold" className="mb-2">
              Description
            </Text>
            <LessonDescription
              description={pageContent.description || ""}
              isOwner={isOwner}
              onSave={onDescriptionUpdate}
            />
          </div>

          {/* Content */}
          {pageContent.hasAccess ? (
            <div>
              <Text size="3" fontWeight="semibold" className="mb-2">
                Lesson Content
              </Text>
              {editingPageId === pageContent._id ? (
                <div className="space-y-3">
                  <textarea
                    ref={textareaRef}
                    value={editedContent}
                    onChange={(e) => {
                      onContentChange(e.target.value);
                      adjustTextareaHeight();
                    }}
                    onBlur={onSaveEdit}
                    className="w-full min-h-[200px] p-3 bg-bg-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    placeholder="Write your lesson content here..."
                  />
                  <div className="flex gap-2">
                    <Button onClick={onSaveEdit} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="ghost" onClick={onCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <Text size="2" className="whitespace-pre-wrap">
                      {pageContent.content || (
                        <Text theme="muted">No content yet.</Text>
                      )}
                    </Text>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-text-muted mb-3" />
                <Heading size="4" className="mb-2">
                  Content Locked
                </Heading>
                <Text theme="secondary">
                  You need to complete this lesson to view the content.
                </Text>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
