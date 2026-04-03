"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { Image as ImageIcon, Video, Gift, BarChart3, X, Plus, ImagePlus } from "lucide-react";
import type { ComposerUser, ComposerCategory, PostType, ComposerSubmitData } from "@/types/composer";
import {  Card } from "../ui/Card";

const POST_TYPES: { value: PostType; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "Text", icon: null },
  { value: "image", label: "Image", icon: <ImageIcon className="w-4 h-4" /> },
  { value: "video", label: "Video", icon: <Video className="w-4 h-4" /> },
  { value: "gif", label: "GIF", icon: <Gift className="w-4 h-4" /> },
  { value: "poll", label: "Poll", icon: <BarChart3 className="w-4 h-4" /> },
];

// Pre-compute poll min date (1 hour from now) at module load
function getPollMinDate(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

function isValidGifUrl(url: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
  } catch {
    return false;
  }
  const urlWithoutQuery = url.split('?')[0].toLowerCase();
  if (urlWithoutQuery.endsWith('.gif')) return true;
  const gifHosts = ['giphy.com', 'tenor.com', 'gfycat.com', 'imgur.com'];
  return gifHosts.some(host => url.includes(host));
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
  gifUrl: string;
  onGifUrlChange: (url: string) => void;
  pollQuestion: string;
  onPollQuestionChange: (q: string) => void;
  pollOptions: string[];
  onPollOptionsChange: (options: string[]) => void;
  pollEndDate: string;
  onPollEndDateChange: (date: string) => void;
  prefersReducedMotion: boolean;
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
  postType,
  onPostTypeChange,
  content,
  onContentChange,
  composerCategoryId,
  onCategoryIdChange,
  videoUrl,
  onVideoUrlChange,
  gifUrl,
  onGifUrlChange,
  pollQuestion,
  onPollQuestionChange,
  pollOptions,
  onPollOptionsChange,
  pollEndDate,
  onPollEndDateChange,
  prefersReducedMotion,
}: PostComposerProps) {
  // Debounced URL validation — only show errors after user stops typing (300ms)
  const [showVideoError, setShowVideoError] = useState(false);
  const [showGifError, setShowGifError] = useState(false);
  const prevPostTypeRef = useRef(postType);
  const postTypeBarRef = useRef<HTMLDivElement>(null);

  // Scroll affordance detection for post type bar
  useEffect(() => {
    const el = postTypeBarRef.current;
    if (!el) return;

    const checkOverflow = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth;
      el.classList.toggle('has-overflow', hasOverflow);
    };

    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    el.addEventListener('scroll', checkOverflow, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', checkOverflow);
    };
  }, []);

  useEffect(() => {
    if (prevPostTypeRef.current !== postType) {
      // Clear URL errors when switching post types
      setShowVideoError(false);
      setShowGifError(false);
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

  useEffect(() => {
    if (!gifUrl || isValidGifUrl(gifUrl)) {
      setShowGifError(false);
      return;
    }
    const timer = setTimeout(() => setShowGifError(true), 300);
    return () => clearTimeout(timer);
  }, [gifUrl]);

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

    if (postType === "gif") {
      if (!gifUrl.trim()) {
        onErrorChange("Please enter a GIF URL");
        return;
      }
      if (!isValidGifUrl(gifUrl)) {
        onErrorChange("Invalid GIF URL");
        return;
      }
    }

    if (postType === "poll") {
      if (!pollQuestion.trim()) {
        onErrorChange("Please enter a poll question");
        return;
      }
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        onErrorChange("Please add at least 2 options");
        return;
      }
      const uniqueOptions = new Set(validOptions.map(o => o.trim().toLowerCase()));
      if (uniqueOptions.size < validOptions.length) {
        onErrorChange("Poll options must be unique");
        return;
      }
      if (pollEndDate) {
        const endDate = new Date(pollEndDate);
        if (endDate.getTime() <= Date.now()) {
          onErrorChange("Poll end date must be in the future");
          return;
        }
      }
    }

    const submitData: Parameters<typeof onSubmit>[0] = {
      postType,
      content: postType === "poll" ? pollQuestion.trim() : content.trim(),
      categoryId: composerCategoryId || undefined,
    };

    if (postType === "image" && imageUrls.length > 0) {
      submitData.imageUrls = imageUrls;
    }
    if (postType === "video" && videoUrl) {
      submitData.videoUrl = videoUrl;
    }
    if (postType === "gif" && gifUrl) {
      submitData.gifUrl = gifUrl;
    }
    if (postType === "poll") {
      submitData.pollQuestion = pollQuestion.trim();
      submitData.pollOptions = pollOptions
        .filter(o => o.trim())
        .map(text => ({ text: text.trim(), votes: 0 }));
      if (pollEndDate) {
        submitData.pollEndDate = new Date(pollEndDate).getTime();
      }
    }

    await onSubmit(submitData);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      onPollOptionsChange([...pollOptions, ""]);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      onPollOptionsChange(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    onPollOptionsChange(newOptions);
  };

  // Compute whether the form is valid for the current post type (enables proactive submit button state)
  const isFormValid = (() => {
    if (postType === "text") return content.trim().length > 0;
    if (postType === "image") return imageUrls.length > 0 || content.trim().length > 0;
    if (postType === "video") return videoUrl.trim().length > 0 && isValidVideoUrl(videoUrl);
    if (postType === "gif") return gifUrl.trim().length > 0 && isValidGifUrl(gifUrl);
    if (postType === "poll") {
      const validOptions = pollOptions.filter(o => o.trim());
      const uniqueOptions = new Set(validOptions.map(o => o.trim().toLowerCase()));
      return pollQuestion.trim().length > 0 && validOptions.length >= 2 && uniqueOptions.size === validOptions.length;
    }
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
          className="space-y-4  p-2  rounded-xl"
        >
          <div className="flex items-center gap-3">
            <ComposerAvatar user={user} />
            <div className="flex-1 min-w-0">
              <Text fontWeight="semibold" className="truncate">
                {user?.fullName || user?.username || "User"}
              </Text>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close composer"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          <div ref={postTypeBarRef} className="flex gap-2 pb-3 overflow-x-auto scroll-fade-right" role="radiogroup" aria-label="Post type">
            {POST_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => onPostTypeChange(type.value)}
                role="radio"
                aria-checked={postType === type.value}
                aria-label={`Create ${type.label.toLowerCase()} post`}
                className={`px-4 py-2.5 min-h-[44px] rounded-lg transition-colors flex items-center gap-1 shrink-0 ${
                  postType === type.value
                    ? "bg-primary text-white"
                    : "bg-bg-elevated hover:bg-bg-muted"
                }`}
              >
                {type.icon}
                <Text size="sm">{type.label}</Text>
              </button>
            ))}
          </div>

          <div className="space-y-3">
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
              <div className="space-y-3">
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
                  multiple
                  aria-label="Choose images to upload"
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
                ) : (
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`rounded-lg p-6 text-center transition-all cursor-pointer ${
                      isDragOver
                        ? "bg-primary/10 ring-2 ring-primary ring-offset-2"
                        : "bg-bg-muted/50 hover:bg-bg-muted"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      aria-label="Upload images"
                      className="w-full"
                    >
                      <ImagePlus className="w-8 h-8 mx-auto text-text-muted mb-2" />
                      <Text size="sm" theme="muted">
                        {isDragOver ? "Drop images here" : "Click to upload or drag & drop"}
                      </Text>
                      <Text size="2" theme="muted">Max 10MB per image (will be compressed)</Text>
                    </button>
                  </div>
                )}

                {imageUrls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {imageUrls.map((url, i) => (
                      <div key={url} className={`relative group transition-all duration-200 ${fadingImages.has(i) ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Image preview ${i + 1}`}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveImage(i)}
                          aria-label="Remove image"
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {postType === "video" && (
              <div className="space-y-3">
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

            {postType === "gif" && (
              <div className="space-y-3">
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
                  <label htmlFor="gif-url" className="block text-sm font-medium mb-1">GIF URL</label>
                  <Input
                    id="gif-url"
                    value={gifUrl}
                    onChange={(e) => onGifUrlChange(e.target.value)}
                    placeholder="Paste a GIF URL from Giphy, Tenor, or Imgur"
                    className={gifUrl && !isValidGifUrl(gifUrl) ? "border-destructive" : ""}
                  />
                  {showGifError && (
                    <p id="gif-url-error" className="mt-1 text-[14px] leading-[14px] text-error" role="alert">Invalid GIF URL. Must end in .gif or be from a known GIF host</p>
                  )}
                  {gifUrl && isValidGifUrl(gifUrl) && (
                    <div className="mt-3 rounded-lg overflow-hidden bg-bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gifUrl}
                        alt="GIF preview"
                        className="max-h-48 w-auto mx-auto object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {postType === "poll" && (
              <div className="space-y-3">
                <div className="relative">
                  <label htmlFor="poll-question" className="block text-sm font-medium mb-1">Question</label>
                  <TextArea
                    id="poll-question"
                    value={pollQuestion}
                    onChange={(e) => onPollQuestionChange(e.target.value)}
                    placeholder="Ask a question..."
                    className="min-h-[60px]"
                    maxLength={500}
                  />
                  {pollQuestion.length > 0 && (
                    <span className="absolute bottom-2 right-2 text-xs text-text-muted">
                      {pollQuestion.length}/500
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <Text size="sm" fontWeight="medium">Options</Text>
                  {pollOptions.map((option, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Text size="sm" theme="muted" className="w-5 text-center shrink-0 tabular-nums">
                        {i + 1}.
                      </Text>
                      <label htmlFor={`poll-option-${i}`} className="sr-only">Option {i + 1}</label>
                      <Input
                        id={`poll-option-${i}`}
                        value={option}
                        onChange={(e) => updatePollOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1"
                        maxLength={200}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePollOption(i)}
                          aria-label="Remove option"
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-destructive hover:bg-destructive/10 rounded shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 4 && (
                    <button
                      type="button"
                      onClick={addPollOption}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-muted transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <Text size="sm">Add option</Text>
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <Text size="sm" fontWeight="medium">End date (optional)</Text>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: "1h", hours: 1 },
                      { label: "6h", hours: 6 },
                      { label: "1d", hours: 24 },
                      { label: "3d", hours: 72 },
                      { label: "1w", hours: 168 },
                    ].map((preset) => {
                      const presetTime = new Date(Date.now() + preset.hours * 60 * 60 * 1000);
                      const pad = (n: number) => String(n).padStart(2, '0');
                      const value = `${presetTime.getFullYear()}-${pad(presetTime.getMonth() + 1)}-${pad(presetTime.getDate())}T${pad(presetTime.getHours())}:${pad(presetTime.getMinutes())}`;
                      const isActive = pollEndDate === value;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => onPollEndDateChange(isActive ? "" : value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                            isActive
                              ? "bg-primary text-white"
                              : "bg-bg-elevated hover:bg-bg-muted text-text-secondary"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={pollEndDate}
                      onChange={(e) => onPollEndDateChange(e.target.value)}
                      min={getPollMinDate()}
                      className="max-w-xs"
                      aria-label="Custom end date"
                    />
                    <Text size="2" theme="muted">Custom</Text>
                  </div>
                </div>
              </div>
            )}

            {categories.length > 0 && (
              <div className="space-y-2">
                <Text size="sm" fontWeight="medium">Category (optional)</Text>
                <div className="flex gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => onCategoryIdChange(
                        composerCategoryId === cat._id ? "" : cat._id
                      )}
                      className="px-3 py-1 rounded-full text-sm transition-colors"
                      style={
                        composerCategoryId === cat._id
                          ? { backgroundColor: cat.color, color: "#fff" }
                          : undefined
                      }
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md" role="alert">
              <Text size="sm" theme="error">{error}</Text>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleValidateAndSubmit}
              disabled={isLoading || !isFormValid}
              aria-busy={isLoading}
              size="sm"
            >
              {isLoading ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
