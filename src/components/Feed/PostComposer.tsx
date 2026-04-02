"use client";

import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { Image as ImageIcon, Video, Gift, BarChart3, X, Plus, ImagePlus } from "lucide-react";

const POST_TYPES: { value: "text" | "image" | "video" | "gif" | "poll"; label: string; icon: React.ReactNode }[] = [
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ComposerAvatar({ user }: { user: any }) {
  if (user?.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.imageUrl}
        alt="Your avatar"
        width={40}
        height={40}
        loading="lazy"
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  isMember: boolean;
  categories: Array<{ _id: string; name: string; color: string }>;
  composerExpanded: boolean;
  onExpand: () => void;
  onClose: () => void;
  onSubmit: (data: {
    postType: "text" | "image" | "video" | "gif" | "poll";
    content: string;
    categoryId?: string;
    imageUrls?: string[];
    videoUrl?: string;
    gifUrl?: string;
    pollQuestion?: string;
    pollOptions?: { text: string; votes: number }[];
    pollEndDate?: number;
  }) => Promise<void>;
  isLoading: boolean;
  error: string;
  onErrorChange: (error: string) => void;
  imageUrls: string[];
  isUploadingImages: boolean;
  uploadProgress: { current: number; total: number };
  fadingImages: Set<number>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveImage: (index: number) => void;
  postType: "text" | "image" | "video" | "gif" | "poll";
  onPostTypeChange: (type: "text" | "image" | "video" | "gif" | "poll") => void;
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
  imageInputRef,
  onImageSelect,
  onRemoveImage,
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
  const handleValidateAndSubmit = async () => {
    onErrorChange("");

    if (postType === "text" && !content.trim()) {
      const msg = "Please enter some text";
      onErrorChange(msg);
      onErrorChange(msg);
      return;
    }

    if (postType === "image" && imageUrls.length === 0 && !content.trim()) {
      const msg = "Please add an image or caption";
      onErrorChange(msg);
      onErrorChange(msg);
      return;
    }

    if (postType === "video") {
      if (!videoUrl.trim()) {
        const msg = "Please enter a video URL";
        onErrorChange(msg);
        onErrorChange(msg);
        return;
      }
      if (!isValidVideoUrl(videoUrl)) {
        const msg = "Invalid video URL. Use YouTube, Vimeo, or Google Drive";
        onErrorChange(msg);
        onErrorChange(msg);
        return;
      }
    }

    if (postType === "gif") {
      if (!gifUrl.trim()) {
        const msg = "Please enter a GIF URL";
        onErrorChange(msg);
        onErrorChange(msg);
        return;
      }
      if (!isValidGifUrl(gifUrl)) {
        const msg = "Invalid GIF URL";
        onErrorChange(msg);
        onErrorChange(msg);
        return;
      }
    }

    if (postType === "poll") {
      if (!pollQuestion.trim()) {
        const msg = "Please enter a poll question";
        onErrorChange(msg);
        onErrorChange(msg);
        return;
      }
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        const msg = "Please add at least 2 options";
        onErrorChange(msg);
        onErrorChange(msg);
        return;
      }
      const uniqueOptions = new Set(validOptions.map(o => o.trim().toLowerCase()));
      if (uniqueOptions.size < validOptions.length) {
        const msg = "Poll options must be unique";
        onErrorChange(msg);
        onErrorChange(msg);
        return;
      }
      if (pollEndDate) {
        const endDate = new Date(pollEndDate);
        if (endDate.getTime() <= Date.now()) {
          const msg = "Poll end date must be in the future";
          onErrorChange(msg);
          onErrorChange(msg);
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

  if (!isMember) return null;

  return (
    <div className="rounded-2xl p-5 mb-3 bg-bg-elevated">
      {!composerExpanded ? (
        <button
          onClick={onExpand}
          className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg bg-bg-elevated hover:bg-bg-muted transition-colors"
        >
          <ComposerAvatar user={user} />
          <Text theme="muted" className="line-clamp-1">What&apos;s on your mind?</Text>
        </button>
      ) : (
        <div className={`space-y-4 ${prefersReducedMotion ? '' : 'animate-in fade-in slide-in-from-top-2 duration-200'}`}>
          <div className="flex items-center gap-3">
            <ComposerAvatar user={user} />
            <div className="flex-1 min-w-0">
              <Text fontWeight="semibold" className="truncate">
                {user?.fullName || user?.username || "User"}
              </Text>
            </div>
          </div>

          <div className="flex gap-2 pb-3 border-b border-border overflow-x-auto" role="group" aria-label="Post type">
            {POST_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => onPostTypeChange(type.value)}
                aria-label={`Create ${type.label.toLowerCase()} post`}
                aria-pressed={postType === type.value}
                className={`px-4 py-2.5 min-h-[44px] rounded-lg transition-colors flex items-center gap-1 ${
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
                  className="min-h-[100px] pr-12 max-w-prose"
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
                <TextArea
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder="Add a caption (optional)"
                />

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onImageSelect}
                  className="hidden"
                  multiple
                />

                {isUploadingImages ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <div className="animate-spin w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full mb-2" />
                    <Text size="sm" theme="muted">
                      {uploadProgress.total > 1
                        ? `Processing image ${uploadProgress.current} of ${uploadProgress.total}...`
                        : "Compressing image..."}
                    </Text>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        imageInputRef.current?.click();
                      }
                    }}
                    aria-label="Upload images"
                    className="w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors border-border cursor-pointer hover:border-primary/50 hover:bg-bg-elevated/50"
                  >
                    <ImagePlus className="w-8 h-8 mx-auto text-text-muted mb-2" />
                    <Text size="sm" theme="muted">Click to upload images</Text>
                    <Text size="2" theme="muted">Max 10MB per image (will be compressed)</Text>
                  </button>
                )}

                {imageUrls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {imageUrls.map((url, i) => (
                      <div key={i} className={`relative group transition-all duration-200 ${fadingImages.has(i) ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Image preview ${i + 1}`}
                          loading="lazy"
                          className="w-20 h-20 object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveImage(i)}
                          aria-label="Remove image"
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center -m-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                <label htmlFor="video-caption" className="sr-only">Video caption</label>
                <TextArea
                  id="video-caption"
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder="Add a caption (optional)"
                />
                <div>
                  <label htmlFor="video-url" className="block text-sm font-medium mb-1">Video URL</label>
                  <Input
                    id="video-url"
                    value={videoUrl}
                    onChange={(e) => onVideoUrlChange(e.target.value)}
                    placeholder="Paste YouTube, Vimeo, or Google Drive link"
                    className={videoUrl && !isValidVideoUrl(videoUrl) ? "border-destructive" : ""}
                  />
                  {videoUrl && !isValidVideoUrl(videoUrl) && (
                    <Text size="2" theme="error" className="mt-1">Invalid URL. Use YouTube, Vimeo, or Google Drive</Text>
                  )}
                </div>
              </div>
            )}

            {postType === "gif" && (
              <div className="space-y-3">
                <label htmlFor="gif-caption" className="sr-only">GIF caption</label>
                <TextArea
                  id="gif-caption"
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder="Add a caption (optional)"
                />
                <div>
                  <label htmlFor="gif-url" className="block text-sm font-medium mb-1">GIF URL</label>
                  <Input
                    id="gif-url"
                    value={gifUrl}
                    onChange={(e) => onGifUrlChange(e.target.value)}
                    placeholder="Paste GIF URL"
                    className={gifUrl && !isValidGifUrl(gifUrl) ? "border-destructive" : ""}
                  />
                  {gifUrl && !isValidGifUrl(gifUrl) && (
                    <Text size="2" theme="error" className="mt-1">Invalid GIF URL. Must end in .gif or be from a known GIF host</Text>
                  )}
                </div>
              </div>
            )}

            {postType === "poll" && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="poll-question" className="block text-sm font-medium mb-1">Question</label>
                  <TextArea
                    id="poll-question"
                    value={pollQuestion}
                    onChange={(e) => onPollQuestionChange(e.target.value)}
                    placeholder="Ask a question..."
                    className="min-h-[60px]"
                  />
                </div>
                <div className="space-y-2">
                  <Text size="sm" fontWeight="medium">Options</Text>
                  {pollOptions.map((option, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span
                        aria-hidden="true"
                        className="w-5 h-5 rounded-full border-2 border-border bg-bg-elevated shrink-0 block"
                      />
                      <label htmlFor={`poll-option-${i}`} className="sr-only">Option {i + 1}</label>
                      <Input
                        id={`poll-option-${i}`}
                        value={option}
                        onChange={(e) => updatePollOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1"
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
                  <Input
                    type="datetime-local"
                    value={pollEndDate}
                    onChange={(e) => onPollEndDateChange(e.target.value)}
                    min={getPollMinDate()}
                    className="max-w-xs"
                  />
                  <Text size="2" theme="muted">Leave empty for no expiration</Text>
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
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        composerCategoryId === cat._id
                          ? "text-white"
                          : "bg-bg-elevated hover:bg-bg-muted"
                      }`}
                      style={{
                        backgroundColor: composerCategoryId === cat._id ? cat.color : undefined,
                        ...(composerCategoryId === cat._id ? { mixBlendMode: 'normal' } : {})
                      }}
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
              disabled={isLoading}
              aria-busy={isLoading}
              size="sm"
            >
              {isLoading ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
