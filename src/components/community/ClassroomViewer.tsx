"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
import { Heading, Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

interface ClassroomViewerProps {
  classroomId: string;
  onBack: () => void;
  isOwner: boolean;
}

interface ModuleData {
  _id: string;
  title: string;
  order: number;
  pages: { _id: string; title: string; order: number }[];
}

export function ClassroomViewer({ classroomId, onBack, isOwner }: ClassroomViewerProps) {
  const { userId: clerkId } = useAuth();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [editedTitle, setEditedTitle] = useState<string>("");

  const currentUser = useQuery(api.functions.users.getUserByClerkId, clerkId ? { clerkId } : "skip");

  const classroomContent = useQuery(
    api.functions.classrooms.getClassroomContent,
    currentUser
      ? { classroomId: classroomId as Id<"classrooms">, userId: currentUser._id as Id<"users"> }
      : { classroomId: classroomId as Id<"classrooms">, userId: undefined }
  );

  const pageContent = useQuery(
    api.functions.classrooms.getPageContent,
    selectedPageId && currentUser
      ? { pageId: selectedPageId as Id<"pages">, userId: currentUser._id as Id<"users"> }
      : selectedPageId
      ? { pageId: selectedPageId as Id<"pages">, userId: undefined as unknown as Id<"users"> }
      : "skip"
  );

  const markPageViewed = useMutation(api.functions.classrooms.markPageViewed);
  const updatePageContent = useMutation(api.functions.classrooms.updatePageContent);
  const createModule = useMutation(api.functions.classrooms.createModule);
  const createPage = useMutation(api.functions.classrooms.createPage);

  useEffect(() => {
    if (classroomContent && classroomContent.modules && classroomContent.modules.length > 0) {
      const firstModule = classroomContent.modules[0];
      if (firstModule.pages && firstModule.pages.length > 0) {
        const firstPage = firstModule.pages[0];
        setSelectedPageId(firstPage._id);
      }
    }
  }, [classroomContent]);

  useEffect(() => {
    if (selectedPageId && pageContent && pageContent.hasAccess && !pageContent.isViewed && !isOwner) {
      markPageViewed({ pageId: selectedPageId as Id<"pages"> });
    }
  }, [selectedPageId, pageContent, isOwner, markPageViewed]);

  const handleStartEdit = useCallback(() => {
    if (pageContent) {
      setEditedTitle(pageContent.title);
      setEditedContent(pageContent.content);
      setEditingPageId(pageContent._id);
    }
  }, [pageContent]);

  const handleSaveEdit = async () => {
    if (!editingPageId) return;
    try {
      await updatePageContent({
        pageId: editingPageId as Id<"pages">,
        title: editedTitle,
        content: editedContent,
      });
      setEditingPageId(null);
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const handleCreateModule = async () => {
    const title = prompt("Enter module title:");
    if (!title) return;
    try {
      await createModule({
        classroomId: classroomId as Id<"classrooms">,
        title,
      });
    } catch (error) {
      console.error("Failed to create module:", error);
    }
  };

  const handleCreatePage = async (moduleId: string) => {
    const title = prompt("Enter page title:");
    if (!title) return;
    try {
      await createPage({
        moduleId: moduleId as Id<"modules">,
        title,
      });
    } catch (error) {
      console.error("Failed to create page:", error);
    }
  };

  const getNextPage = useCallback(() => {
    if (!classroomContent || !classroomContent.modules) return null;
    let foundCurrent = false;
    for (const mod of classroomContent.modules) {
      if (!mod.pages) continue;
      for (const page of mod.pages) {
        if (foundCurrent) return page._id;
        if (page._id === selectedPageId) foundCurrent = true;
      }
    }
    return null;
  }, [classroomContent, selectedPageId]);

  const nextPageId = getNextPage();

  if (classroomContent && !classroomContent.hasAccess && !isOwner) {
    return (
      <div className="p-6 text-center">
        <Heading size="4" className="text-text-primary mb-4">Access Denied</Heading>
        <Text size="3" theme="secondary" className="mb-4">
          You do not have access to this classroom.
        </Text>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const modules = classroomContent?.modules || [];

  return (
    <div className="flex h-full">
      <div className="w-72 bg-bg-surface border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
            Back to Classrooms
          </Button>
          <Heading size="4" className="text-text-primary">
            {classroomContent?.title || "Loading..."}
          </Heading>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!classroomContent ? (
            <div className="space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-8">
              <Text size="2" theme="muted">No modules yet</Text>
              {isOwner && (
                <Button variant="ghost" size="sm" onClick={handleCreateModule} className="mt-2">
                  + Create First Module
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((module: ModuleData) => (
                <div key={module._id}>
                  <div className="flex items-center justify-between py-2">
                    <Text size="2" theme="secondary" className="font-semibold">
                      {module.title}
                    </Text>
                    {isOwner && (
                      <button
                        onClick={() => handleCreatePage(module._id)}
                        className="text-text-muted hover:text-accent text-sm"
                      >
                        +
                      </button>
                    )}
                  </div>
                  <div className="ml-2 space-y-1">
                    {module.pages?.map((page) => (
                      <button
                        key={page._id}
                        onClick={() => setSelectedPageId(page._id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedPageId === page._id
                            ? "bg-accent text-white"
                            : "text-text-secondary hover:bg-bg-elevated"
                        }`}
                      >
                        {page.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {isOwner && (
                <button
                  onClick={handleCreateModule}
                  className="w-full py-2 text-center text-sm text-text-muted hover:text-accent border border-dashed border-border rounded-lg"
                >
                  + Add Module
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!pageContent ? (
          <div className="p-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Text size="1" theme="muted">{pageContent.moduleTitle}</Text>
                {editingPageId === pageContent._id ? (
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-2xl font-bold mt-1"
                  />
                ) : (
                  <Heading size="3" className="text-text-primary mt-1">
                    {pageContent.title}
                  </Heading>
                )}
              </div>
              {isOwner && !editingPageId && (
                <Button variant="ghost" onClick={handleStartEdit}>Edit</Button>
              )}
              {isOwner && editingPageId === pageContent._id && (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditingPageId(null)}>Cancel</Button>
                  <Button onClick={handleSaveEdit}>Save</Button>
                </div>
              )}
            </div>

            <div className="prose prose-invert max-w-none">
              {editingPageId === pageContent._id ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full min-h-[400px] bg-bg-surface border border-border rounded-lg p-4 text-text-primary"
                  placeholder="Enter lesson content (JSON blocks or plain text)..."
                />
              ) : (
                <div className="text-text-secondary whitespace-pre-wrap">
                  {(() => {
                    if (pageContent.content && pageContent.content !== "[]") {
                      return parseContent(pageContent.content);
                    }
                    return <Text theme="muted">No content yet. Click Edit to add content.</Text>;
                  })()}
                </div>
              )}
            </div>

            {pageContent.hasAccess && (
              <div className="flex justify-between mt-8 pt-6 border-t border-border">
                <div />
                {nextPageId && (
                  <Button onClick={() => setSelectedPageId(nextPageId)}>Next Lesson</Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function parseContent(content: string): React.ReactNode {
  try {
    const blocks = JSON.parse(content);
    if (Array.isArray(blocks)) {
      return blocks.map((block: any, i: number) => {
        switch (block.type) {
          case "heading":
            return <Heading key={i} size="4" className="mt-6 mb-3">{block.content}</Heading>;
          case "text":
            return <p key={i} className="mb-4">{block.content}</p>;
          case "bullet":
            return <li key={i} className="ml-4 mb-1">{block.content}</li>;
          case "numbered":
            return <li key={i} className="ml-4 mb-1">{block.content}</li>;
          case "video":
            return <VideoEmbed key={i} url={block.url} />;
          case "callout":
            return <div key={i} className="bg-accent-subtle p-4 rounded-lg my-4">{block.content}</div>;
          case "divider":
            return <hr key={i} className="my-6 border-border" />;
          case "image":
            return <img key={i} src={block.url} alt={block.alt} className="max-w-full rounded-lg my-4" />;
          case "file":
            return <a key={i} href={block.url} download className="block p-4 bg-bg-surface rounded-lg my-4">{block.filename}</a>;
          default:
            return <p key={i} className="mb-2">{block.content || JSON.stringify(block)}</p>;
        }
      });
    }
  } catch {
    // Not JSON, return as plain text
  }
  return content;
}

function VideoEmbed({ url }: { url?: string }) {
  if (!url) return null;
  
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) {
    return (
      <div className="aspect-video my-4">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          className="w-full h-full rounded-lg"
          allowFullScreen
        />
      </div>
    );
  }
  
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return (
      <div className="aspect-video my-4">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          className="w-full h-full rounded-lg"
          allowFullScreen
        />
      </div>
    );
  }
  
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 bg-bg-surface rounded-lg my-4"
      >
        View on Google Drive
      </a>
    );
  }
  
  return <a href={url} className="text-accent hover:underline">View Video</a>;
}
