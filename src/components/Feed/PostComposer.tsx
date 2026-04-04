"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { Image as ImageIcon, Video, X, ImagePlus, Type } from "lucide-react";
import type { ComposerUser, ComposerCategory, PostType, ComposerSubmitData } from "@/types/composer";
import {  Card } from "../ui/Card";
import { ToggleGroup, ToggleGroupItem } from "../ui/ToggleGroup";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const POST_TYPES: { value: PostType; icon: React.ReactNode; color: string }[] = [
  { value: "text", icon: <Type className="w-4 h-4" />, color: "text-blue-400" },
  { value: "image", icon: <ImageIcon className="w-4 h-4" />, color: "text-green-400" },
  { value: "video", icon: <Video className="w-4 h-4" />, color: "text-purple-400" },
];

function ComposerAvatar({ user }: { user?: ComposerUser }) {
  if (user?.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.imageUrl}
        alt="Your avatar"
        width={40}
        height={40}
        className="w-10 h-10 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
      <Text fontWeight="semibold" size="sm">
        {user?.firstName?.[0] || user?.username?.[0] || "?"}
      </Text>
    </div>
  );
}

function isValidVideoUrl(url: string): boolean {
  if (!url) return true;
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  return !!(youtubeMatch || vimeoMatch || driveMatch);
}

interface PostComposerProps {
  user?: ComposerUser;
  isMember: boolean;
  categories: ComposerCategory[];
  composerExpanded: boolean;
  onExpand: () => void;
  onClose: () => void;
  onSubmit: (data: ComposerSubmitData) => Promise<void>;
  isLoading: boolean;
  error: string;
  onErrorChange: (error: string) => void;
  imageUrls: string[];
  isUploadingImages: boolean;
  uploadProgress: { current: number; total: number };
  fadingImages: Set<number>;
  isDragOver: boolean;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveImage: (index: number) => void;
  uploadError?: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onPaste: (e: React.ClipboardEvent) => Promise<void>;
  postType: PostType;
  onPostTypeChange: (type: PostType) => void;
  content: string;
  onContentChange: (content: string) => void;
  composerCategoryId: string;
  onCategoryIdChange: (id: string) => void;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  prefersReducedMotion: boolean;
  onAddNewCategory?: () => void;
}

export function PostComposer({
  user,
  isMember,
  categories,
  composerExpanded,
  onExpand,
  onClose,
  onSubmit,
  isLoading,
  error,
  onErrorChange,
  imageUrls,
  isUploadingImages,
  uploadProgress,
  fadingImages,
  isDragOver,
  imageInputRef,
  onImageSelect,
  onRemoveImage,
  onDragOver,
  onDragLeave,
  onDrop,
  onPaste,
  uploadError,
  postType,
  onPostTypeChange,
  content,
  onContentChange,
  composerCategoryId,
  onCategoryIdChange,
  videoUrl,
  onVideoUrlChange,
  prefersReducedMotion,
  onAddNewCategory,
}: PostComposerProps) {
  // Debounced URL validation — only show errors after user stops typing (300ms)
  const [showVideoError, setShowVideoError] = useState(false);
  const prevPostTypeRef = useRef(postType);
  // Local Select value state to handle the "__add_new__" special value
  const [selectValue, setSelectValue] = useState(composerCategoryId || "none");
  // Ref to track pending action when Select closes (Radix closes before onClick fires)
  const pendingActionRef = useRef<string | null>(null);

  useEffect(() => {
    setSelectValue(composerCategoryId || "none");
  }, [composerCategoryId]);

  useEffect(() => {
    if (prevPostTypeRef.current !== postType) {
      // Clear URL errors when switching post types
      setShowVideoError(false);
      prevPostTypeRef.current = postType;
    }
  }, [postType]);

  useEffect(() => {
    if (!videoUrl || isValidVideoUrl(videoUrl)) {
      setShowVideoError(false);
      return;
    }
    const timer = setTimeout(() => setShowVideoError(true), 300);
    return () => clearTimeout(timer);
  }, [videoUrl]);

  const handleValidateAndSubmit = async () => {
    onErrorChange("");

    if (postType === "text" && !content.trim()) {
      onErrorChange("Please enter some text");
      return;
    }

    if (postType === "image" && imageUrls.length === 0 && !content.trim()) {
      onErrorChange("Please add an image or caption");
      return;
    }

    if (postType === "video") {
      if (!videoUrl.trim()) {
        onErrorChange("Please enter a video URL");
        return;
      }
      if (!isValidVideoUrl(videoUrl)) {
        onErrorChange("Invalid video URL. Use YouTube, Vimeo, or Google Drive");
        return;
      }
    }

    const submitData: Parameters<typeof onSubmit>[0] = {
      postType,
      content: content.trim(),
      categoryId: composerCategoryId || undefined,
    };

    if (postType === "image" && imageUrls.length > 0) {
      submitData.imageUrls = imageUrls;
    }
    if (postType === "video" && videoUrl) {
      submitData.videoUrl = videoUrl;
    }

    await onSubmit(submitData);
  };

  // Compute whether the form is valid for the current post type (enables proactive submit button state)
  const isFormValid = (() => {
    if (postType === "text") return content.trim().length > 0;
    if (postType === "image") return imageUrls.length > 0 || content.trim().length > 0;
    if (postType === "video") return videoUrl.trim().length > 0 && isValidVideoUrl(videoUrl);
    return false;
  })();

  if (!isMember) return null;

  return (
    <Card className="shadow-none">
      {!composerExpanded ? (
        <button
          onClick={onExpand}
          className="w-full flex items-center gap-3 text-left p-2 cursor-text rounded-xl bg-none hover:bg-white/10 transition-colors"
        >
          <ComposerAvatar user={user} />
          <Text theme="muted" className="line-clamp-1">What&apos;s on your mind?</Text>
        </button>
      ) : (
        <div
          className="space-y-3 p-2 rounded-xl"
        >
          <div className="flex items-start justify-start gap-2 w-full flex-row">
          <ComposerAvatar user={user} />
          <div className="space-y-2 w-full ">
            {postType === "text" && (
              <div className="relative">
                <label htmlFor="post-text" className="sr-only">Post content</label>
                <TextArea
                  id="post-text"
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder="What's on your mind?"
                  className="min-h-[100px] pr-12"
                  autoFocus
                  maxLength={5000}
                />
                <span className="absolute bottom-2 right-2 text-xs text-text-muted">
                  {content.length}/5000
                </span>
              </div>
            )}

            {postType === "image" && (
              <div className="space-y-2">
                <div className="relative">
                  <TextArea
                    value={content}
                    onChange={(e) => onContentChange(e.target.value)}
                    onPaste={onPaste}
                    placeholder="Add a caption (optional)"
                    maxLength={5000}
                  />
                  {content.length > 0 && (
                    <span className="absolute bottom-2 right-2 text-xs text-text-muted">
                      {content.length}/5000
                    </span>
                  )}
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onImageSelect}
                  className="hidden"
                  aria-label="Choose image to upload"
                />

                {isUploadingImages ? (
                  <div className="rounded-lg p-6 text-center bg-bg-muted/50">
                    <div className="animate-spin w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full mb-2" />
                    <Text size="sm" theme="muted">
                      {uploadProgress.total > 1
                        ? `Processing image ${uploadProgress.current} of ${uploadProgress.total}...`
                        : "Compressing image..."}
                    </Text>
                  </div>
                ) : imageUrls.length === 0 ? (
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`rounded-lg p-0 text-center transition-all cursor-pointer ${
                      isDragOver
                        ? "bg-primary/10 ring-2 ring-primary ring-offset-2"
                        : uploadError
                          ? "bg-destructive/10 ring-2 ring-destructive"
                          : "bg-bg-muted/50 hover:bg-bg-muted"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      aria-label="Upload image"
                      className="w-full h-full p-6 hover:bg-accent-subtle rounded-[16px] bg-black/20 shadow-input-shadow border-2 border-dashed border-white/20   cursor-pointer hover:border-accent transition-colors "
                    >
                      <ImagePlus className={`w-8 h-8 mx-auto mb-2 ${uploadError ? "text-destructive" : "text-text-muted"}`} />
                      <Text size="sm" theme={uploadError ? "error" : "muted"}>
                        {uploadError || (isDragOver ? "Drop image here" : "Click to upload or drag & drop")}
                      </Text>
                      <Text size="2" theme="muted">Max 10MB</Text>
                    </button>
                  </div>
                ) : null}

                {imageUrls.length > 0 && (
                  <div className="relative group transition-all duration-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrls[0]}
                      alt="Image preview"
                      className="w-full max-h-80 object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveImage(0)}
                      aria-label="Remove image"
                      className="absolute top-2 right-2 bg-destructive text-white rounded-full w-8 h-8 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-sm hover:bg-destructive/90 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {postType === "video" && (
              <div className="space-y-2">
                <div className="relative">
                  <TextArea
                    value={content}
                    onChange={(e) => onContentChange(e.target.value)}
                    placeholder="Add a caption (optional)"
                    maxLength={5000}
                  />
                  {content.length > 0 && (
                    <span className="absolute bottom-2 right-2 text-xs text-text-muted">
                      {content.length}/5000
                    </span>
                  )}
                </div>
                <div>
                  <label htmlFor="video-url" className="block text-sm font-medium mb-1">Video URL</label>
                  <Input
                    id="video-url"
                    value={videoUrl}
                    onChange={(e) => onVideoUrlChange(e.target.value)}
                    placeholder="Paste YouTube, Vimeo, or Google Drive link"
                    className={videoUrl && !isValidVideoUrl(videoUrl) ? "border-destructive" : ""}
                    aria-describedby={showVideoError ? "video-url-error" : undefined}
                    aria-invalid={showVideoError ? true : undefined}
                  />
                  {showVideoError && (
                    <p id="video-url-error" className="mt-1 text-[14px] leading-[14px] text-error" role="alert">Invalid URL. Use YouTube, Vimeo, or Google Drive</p>
                  )}
                  {videoUrl && isValidVideoUrl(videoUrl) && (
                    <div className="mt-3 rounded-lg overflow-hidden bg-bg-muted aspect-video">
                      {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${
                            videoUrl.includes('youtu.be')
                              ? videoUrl.split('/').pop()?.split('?')[0]
                              : new URLSearchParams(new URL(videoUrl).search).get('v')
                          }`}
                          title="Video preview"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : videoUrl.includes('vimeo.com') ? (
                        <iframe
                          src={`https://player.vimeo.com/video/${videoUrl.match(/vimeo\.com\/(\d+)/)?.[1]}`}
                          title="Video preview"
                          className="w-full h-full"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Video className="w-8 h-8 text-text-muted" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            
          </div>
          
          </div>
          


          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md" role="alert">
              <Text size="sm" theme="error">{error}</Text>
            </div>
          )}
          <div className="px-2 my-1">
         <hr className="h-px w-full border-0 rounded-full "
                      style={{
                        background: "rgba(242, 242, 242, 0.1)",
                        boxShadow: "0 1px 0 0 rgba(0, 0, 0, 0.5)",
                      }}/></div>

          

          <div className="flex justify-between py-1">
            <div className="flex flex-row gap-2">
          <ToggleGroup 
            value={postType}
            onValueChange={(v) => onPostTypeChange(v as PostType)}
            className="gap-1 shadow-none w-fit"
          >
            {POST_TYPES.map((type) => (
              <ToggleGroupItem key={type.value} value={type.value} className={postType === type.value ? type.color : "text-text-muted"}>
                {type.icon}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>


              <Select
                value={selectValue}
                onValueChange={(v) => {
                  if (v === "__add_new__") {
                    // Store in ref so onOpenChange can read it after Select closes
                    pendingActionRef.current = "add_new";
                    setSelectValue(composerCategoryId || "none");
                  } else if (v === "none") {
                    onCategoryIdChange("");
                    setSelectValue("none");
                  } else {
                    onCategoryIdChange(v);
                    setSelectValue(v);
                  }
                }}
                onOpenChange={(open) => {
                  // When dropdown closes, check if we had a pending action
                  if (!open && pendingActionRef.current === "add_new") {
                    pendingActionRef.current = null;
                    onAddNewCategory?.();
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">No category</SelectItem>
                  </SelectGroup>
                  <div className="px-2 my-1">
         <hr className="h-px w-full border-0 rounded-full "
                      style={{
                        background: "rgba(242, 242, 242, 0.1)",
                        boxShadow: "0 1px 0 0 rgba(0, 0, 0, 0.5)",
                      }}/></div>

                  {categories.length > 0 && (
                    <SelectGroup>
                      {categories.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  <div className="px-2 my-1">
         <hr className="h-px w-full border-0 rounded-full "
                      style={{
                        background: "rgba(242, 242, 242, 0.1)",
                        boxShadow: "0 1px 0 0 rgba(0, 0, 0, 0.5)",
                      }}/></div>

                  <SelectItem value="__add_new__" className="hover:bg-accent-subtle hover:text-accent">
                    + Add new
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleValidateAndSubmit}
              disabled={isLoading || !isFormValid}
              aria-busy={isLoading}
              size="md"
            >
              {isLoading ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
