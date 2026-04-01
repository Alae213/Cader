"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Avatar } from "@/components/shared/Avatar";
import { 
  Image as ImageIcon, 
  Video,
  Gift,
  BarChart3, 
  X, 
  Plus,
  ImagePlus
} from "lucide-react";

interface Category {
  _id: string;
  name: string;
  color: string;
}

interface PostComposerProps {
  communityId: string;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated?: () => void;
}

type PostType = "text" | "image" | "video" | "gif" | "poll";

export function PostComposer({ 
  communityId, 
  categories, 
  open, 
  onOpenChange,
  onPostCreated 
}: PostComposerProps) {
  const { userId } = useAuth();
  const [postType, setPostType] = useState<PostType>("text");
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // @mentions state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const mentionsDropdownRef = useRef<HTMLDivElement>(null);

  // Search members for mentions
  const searchResults = useQuery(
    api.functions.notifications.searchMembers,
     
    communityId && mentionSearch.length >= 1 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? { communityId: communityId as any, searchQuery: mentionSearch }
      : "skip"
  );

  // Close mentions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionsDropdownRef.current && !mentionsDropdownRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Additional fields for different post types
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  
  // Poll fields
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const createPost = useMutation(api.functions.feed.createPost);

  // Handle @ mentions in content
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Check for @ trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf("@");
    
    if (lastAt !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAt + 1);
      // Only show if there's no space after @
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setShowMentions(true);
        setMentionSearch(textAfterAt);
        setMentionPosition(lastAt);
        setSelectedIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Insert mention
  const insertMention = (username: string) => {
    const before = content.slice(0, mentionPosition);
    const after = content.slice(contentRef.current?.selectionStart || 0);
    const newContent = `${before}@${username} ${after}`;
    setContent(newContent);
    setShowMentions(false);
    contentRef.current?.focus();
  };

  // Handle keyboard for mentions navigation
  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    // Handle mention dropdown navigation
    if (showMentions && searchResults && searchResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < Math.min(searchResults.length - 1, 4) ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : Math.min(searchResults.length - 1, 4)
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = searchResults[selectedIndex];
        if (selected) {
          insertMention(selected.displayName);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }
  };

  const handleSubmit = async () => {
    if (!userId) return;
    if (!content.trim() && postType === "text") {
      setError("Please enter some text");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postData: any = {
        communityId,
        content: content.trim(),
        contentType: postType,
        categoryId: selectedCategory || undefined,
      };

      // Add type-specific data
      if (postType === "image" && imageUrls.length > 0) {
        postData.mediaUrls = imageUrls;
      }
      if (postType === "video" && videoUrl) {
        postData.videoUrl = videoUrl;
      }
      if (postType === "gif" && gifUrl) {
        postData.mediaUrls = [gifUrl];
      }
      if (postType === "poll") {
        postData.pollOptions = pollOptions
          .filter(o => o.trim())
          .map(text => ({ text: text.trim(), votes: 0 }));
        postData.content = pollQuestion;
      }

      await createPost(postData);
      
      toast.success("Post created!");
      onOpenChange(false);
      resetForm();
      onPostCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setContent("");
    setSelectedCategory("");
    setImageUrls([]);
    setVideoUrl("");
    setGifUrl("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPostType("text");
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="text-xl font-semibold">Create Post</DialogTitle>

        {/* Post Type Selector */}
        <div className="flex gap-2 py-3 border-b border-border">
          <button
            type="button"
            onClick={() => setPostType("text")}
            className={`p-2 rounded-md transition-colors ${
              postType === "text" 
                ? "bg-primary text-white" 
                : "bg-bg-elevated hover:bg-bg-muted"
            }`}
          >
            <Text size="sm">Text</Text>
          </button>
          <button
            type="button"
            onClick={() => setPostType("image")}
            className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
              postType === "image" 
                ? "bg-primary text-white" 
                : "bg-bg-elevated hover:bg-bg-muted"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <Text size="sm">Image</Text>
          </button>
          <button
            type="button"
            onClick={() => setPostType("video")}
            className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
              postType === "video" 
                ? "bg-primary text-white" 
                : "bg-bg-elevated hover:bg-bg-muted"
            }`}
          >
            <Video className="w-4 h-4" />
            <Text size="sm">Video</Text>
          </button>
          <button
            type="button"
            onClick={() => setPostType("gif")}
            className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
              postType === "gif" 
                ? "bg-primary text-white" 
                : "bg-bg-elevated hover:bg-bg-muted"
            }`}
          >
            <Gift className="w-4 h-4" />
            <Text size="sm">GIF</Text>
          </button>
          <button
            type="button"
            onClick={() => setPostType("poll")}
            className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
              postType === "poll" 
                ? "bg-primary text-white" 
                : "bg-bg-elevated hover:bg-bg-muted"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <Text size="sm">Poll</Text>
          </button>
        </div>

        {/* Content based on post type */}
        <div className="space-y-4 py-4">
          {/* Text Post */}
          {postType === "text" && (
            <div className="relative">
              <TextArea
                ref={contentRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleContentKeyDown}
                placeholder="What's on your mind?"
                className="min-h-[120px]"
              />
              {/* Mentions dropdown */}
              {showMentions && searchResults && searchResults.length > 0 && (
                <div 
                  ref={mentionsDropdownRef}
                  className="absolute left-3 top-[100px] bg-bg-elevated rounded-lg py-1 max-h-48 overflow-y-auto z-20 min-w-[200px]"
                  role="listbox"
                  aria-label="Mentions"
                >
                  {searchResults.slice(0, 5).map((member: { userId: string; displayName: string; avatarUrl?: string }, index: number) => (
                    <button
                      key={member.userId}
                      role="option"
                      aria-selected={index === selectedIndex}
                      type="button"
                      onClick={() => insertMention(member.displayName)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                        index === selectedIndex ? "bg-accent-subtle" : "hover:bg-bg-surface"
                      }`}
                    >
                      <Avatar
                        src={member.avatarUrl}
                        name={member.displayName}
                        size="xs"
                      />
                      <div className="flex-1 min-w-0">
                        <Text size="sm" fontWeight="medium" className="truncate">
                          {member.displayName}
                        </Text>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Image Post */}
          {postType === "image" && (
            <div className="relative space-y-3">
              <TextArea
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleContentKeyDown}
                placeholder="Add a caption (optional)"
              />
              {/* Mentions dropdown for image post */}
              {showMentions && searchResults && searchResults.length > 0 && (
                <div 
                  ref={mentionsDropdownRef}
                  className="absolute left-3 top-[100px] bg-bg-elevated rounded-lg py-1 max-h-48 overflow-y-auto z-20 min-w-[200px]"
                  role="listbox"
                  aria-label="Mentions"
                >
                  {searchResults.slice(0, 5).map((member: { userId: string; displayName: string; avatarUrl?: string }, index: number) => (
                    <button
                      key={member.userId}
                      role="option"
                      aria-selected={index === selectedIndex}
                      type="button"
                      onClick={() => insertMention(member.displayName)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                        index === selectedIndex ? "bg-accent-subtle" : "hover:bg-bg-surface"
                      }`}
                    >
                      <Avatar
                        src={member.avatarUrl}
                        name={member.displayName}
                        size="xs"
                      />
                      <div className="flex-1 min-w-0">
                        <Text size="sm" fontWeight="medium" className="truncate">
                          {member.displayName}
                        </Text>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <ImagePlus className="w-8 h-8 mx-auto text-text-muted mb-2" />
                <Text size="sm" theme="muted">Click to upload images</Text>
                <Text size="2" theme="muted">Max 10MB per image</Text>
              </div>
              {imageUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative">
                      <Image src={url} alt="" width={80} height={80} className="w-20 h-20 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => setImageUrls(imageUrls.filter((_, j) => j !== i))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Video Post */}
          {postType === "video" && (
            <div className="relative space-y-3">
              <TextArea
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleContentKeyDown}
                placeholder="Add a caption (optional)"
              />
              {/* Mentions dropdown for video post */}
              {showMentions && searchResults && searchResults.length > 0 && (
                <div 
                  ref={mentionsDropdownRef}
                  className="absolute left-3 top-[100px] bg-bg-elevated rounded-lg py-1 max-h-48 overflow-y-auto z-20 min-w-[200px]"
                  role="listbox"
                  aria-label="Mentions"
                >
                  {searchResults.slice(0, 5).map((member: { userId: string; displayName: string; avatarUrl?: string }, index: number) => (
                    <button
                      key={member.userId}
                      role="option"
                      aria-selected={index === selectedIndex}
                      type="button"
                      onClick={() => insertMention(member.displayName)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                        index === selectedIndex ? "bg-accent-subtle" : "hover:bg-bg-surface"
                      }`}
                    >
                      <Avatar
                        src={member.avatarUrl}
                        name={member.displayName}
                        size="xs"
                      />
                      <div className="flex-1 min-w-0">
                        <Text size="sm" fontWeight="medium" className="truncate">
                          {member.displayName}
                        </Text>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste YouTube, Vimeo, or Google Drive link"
              />
              {videoUrl && !isValidVideoUrl(videoUrl) && (
                <Text size="2" theme="error">Invalid video URL</Text>
              )}
            </div>
          )}

          {/* GIF Post */}
          {postType === "gif" && (
            <div className="space-y-3">
              <Input
                value={gifUrl}
                onChange={(e) => setGifUrl(e.target.value)}
                placeholder="Paste GIF URL"
              />
              <Text size="2" theme="muted">Or search for GIFs (coming soon)</Text>
            </div>
          )}

          {/* Poll Post */}
          {postType === "poll" && (
            <div className="space-y-4">
              <Input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
              />
              <div className="space-y-2">
                <Text size="sm" fontWeight="medium">Options</Text>
                {pollOptions.map((option, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updatePollOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(i)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
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
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    <Text size="sm">Add option</Text>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Category Selector */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <Text size="sm" fontWeight="medium">Category (optional)</Text>
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => setSelectedCategory(
                      selectedCategory === cat._id ? "" : cat._id
                    )}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCategory === cat._id
                        ? "text-white"
                        : "bg-bg-elevated hover:bg-bg-muted"
                    }`}
                    style={{ 
                      backgroundColor: selectedCategory === cat._id ? cat.color : undefined 
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <Text size="sm" theme="error">{error}</Text>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Posting..." : "Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isValidVideoUrl(url: string): boolean {
  if (!url) return true;
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  return !!(youtubeMatch || vimeoMatch || driveMatch);
}