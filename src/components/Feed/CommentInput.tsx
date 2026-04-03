"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/shared/Avatar";
import { 
  ArrowUp,
  Image as ImageIcon,
  X,
  AtSign,
  Loader2,
  Plus,
} from "lucide-react";

// Constants
const COMMENT_MAX_LENGTH = 2000;
const COMMENT_RATE_LIMIT_MS = 2000;
const MENTION_DEBOUNCE_MS = 300;

interface CommentInputProps {
  postId: string;
  parentCommentId?: string;
  communityId: string;
  onSubmit?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// Compress image to base64
const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new (window.Image || HTMLImageElement)();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        
        ctx.drawImage(img as HTMLImageElement, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Custom textarea with no border/ring/outline - using CSS classes instead of inline styles
const NoBorderTextarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({
  className,
  ...props
}, ref) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);
  
  return (
    <textarea
      ref={innerRef}
      {...props}
      className={`w-full resize-none text-sm min-h-[24px] pt-[2px] placeholder:text-text-muted no-border outline-none focus:outline-none bg-transparent ${className || ""}`}
    />
  );
});

NoBorderTextarea.displayName = "NoBorderTextarea";

export function CommentInput({ 
  postId, 
  parentCommentId,
  communityId,
  onSubmit, 
  onCancel,
  placeholder = "Write a comment...",
  autoFocus = false
}: CommentInputProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [debouncedMentionSearch, setDebouncedMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const createComment = useMutation(api.functions.feed.createComment);
  
  // Debounce mention search
  useEffect(() => {
    if (mentionDebounceRef.current) {
      clearTimeout(mentionDebounceRef.current);
    }
    mentionDebounceRef.current = setTimeout(() => {
      setDebouncedMentionSearch(mentionSearch);
    }, MENTION_DEBOUNCE_MS);
    return () => {
      if (mentionDebounceRef.current) {
        clearTimeout(mentionDebounceRef.current);
      }
    };
  }, [mentionSearch]);

  // Search members for mentions (debounced)
  const searchResults = useQuery(
    api.functions.notifications.searchMembers,
    communityId && debouncedMentionSearch.length >= 1 
      ? { communityId: communityId as Id<"communities">, searchQuery: debouncedMentionSearch }
      : "skip"
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-expand textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [content]);

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("You must be signed in to comment");
      return;
    }

    // Rate limiting check
    const now = Date.now();
    if (now - lastSubmitTime < COMMENT_RATE_LIMIT_MS) {
      toast.error("Please wait before posting another comment");
      return;
    }

    if (!content.trim() && mediaUrls.length === 0) {
      toast.error("Please enter a comment or add an image");
      return;
    }

    // Store content for optimistic display
    const pendingContent = content.trim();
    const pendingMedia = [...mediaUrls];
    
    // Optimistic update: clear input immediately
    setIsLoading(true);
    setLastSubmitTime(now);
    setContent("");
    setMediaUrls([]);
    
    // Trigger onSubmit immediately for instant feedback
    onSubmit?.();
    
    try {
      // Fire mutation without awaiting - UI already updated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createComment({
        postId: postId as any,
        content: pendingContent,
        parentCommentId: parentCommentId ? parentCommentId as any : undefined,
        mediaUrls: pendingMedia.length > 0 ? pendingMedia : undefined,
      })
        .then(() => {
          toast.success("Comment posted!");
        })
        .catch((error) => {
          // Revert content on error
          setContent(pendingContent);
          setMediaUrls(pendingMedia);
          toast.error(error instanceof Error ? error.message : "Failed to post comment");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } catch (error) {
      // Revert on error
      setContent(pendingContent);
      setMediaUrls(pendingMedia);
      toast.error(error instanceof Error ? error.message : "Failed to post comment");
      setIsLoading(false);
    }
  };

  // Handle image selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Only allow one image
    if (mediaUrls.length >= 1) {
      toast.error("You can only attach one image per comment");
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setIsUploadingImages(true);
    try {
      const file = files[0];
      // Validate file type
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        toast.error("Invalid format. Use JPG, PNG, WebP, or GIF.");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB.");
        return;
      }

      // Compress and add to mediaUrls
      const compressed = await compressImage(file, 800, 0.6);
      
      // Check base64 size (Convex 1MB limit, base64 is ~33% larger)
      if (compressed.length > 700 * 1024) {
        toast.error("Image too large after compression. Please try a smaller image.");
        return;
      }

      setMediaUrls(prev => [...prev, compressed]);
    } catch {
      toast.error("Failed to process image");
    } finally {
      setIsUploadingImages(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Remove image from mediaUrls
  const removeImage = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Handle @ mentions
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
    const after = content.slice(textareaRef.current?.selectionStart || 0);
    const newContent = `${before}@${username} ${after}`;
    setContent(newContent);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  // Handle keyboard navigation for mentions
  const handleKeyDown = (e: React.KeyboardEvent) => {
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

    // Submit on Cmd/Ctrl+Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    // Close on Escape (when not in dropdown)
    if (e.key === "Escape") {
      setShowMentions(false);
      if (onCancel) onCancel();
    }
  };

  const isDisabled = isLoading || (!content.trim() && mediaUrls.length === 0);

  if (!userId) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated">
        <Avatar
          src={user?.imageUrl}
          name={user?.firstName || "User"}
          size="sm"
        />
        <Text theme="muted" size="sm">Sign in to comment</Text>
      </div>
    );
  }

  return (
    <div className="relative flex flex-row w-full items-center gap-2 justify-center mt-4">
      <div className="border-white/25 border-b-1 rounded-full">
        <Avatar
          src={user?.imageUrl}
          name={user?.firstName || user?.username || "User"}
          className="h-10 w-10 "
        />
      </div>
      
      <div className="flex w-full grow flex-col bg-bg-canvas gap-3 overflow-hidden p-2 justify-start items-start rounded-[20px] border-white/25  border-b-1 hover:bg-bg-elevated">
        
        
        <div className="flex gap-2 items-start w-full  ">
          {/* Add image button */}
          <button
            type="button"
            className="rounded-full cursor-pointer text-white bg-accent hover:bg-accent-hover transition-colors p-1"
            title="Add image"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImages}
            aria-label="Attach image"
          >
            {isUploadingImages ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 stroke-3" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Textarea */}
            <NoBorderTextarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className="bg-transparent"
              rows={1}
              maxLength={COMMENT_MAX_LENGTH}
              aria-label={placeholder}
            />
            {/* Send button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isDisabled}
            aria-label={isLoading ? "Posting comment..." : "Post comment"}
            className={`
              rounded-full p-1 transition-colors cursor-pointer
              ${isDisabled 
                ? "bg-bg-muted text-text-muted cursor-not-allowed" 
                : "bg-accent text-white hover:bg-accent-hover"
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )} 
          </button>
         
        </div>

        {/* Image previews */}
        {mediaUrls.length > 0 && (
          <div aria-live="polite" className="flex flex-wrap gap-2 mt-2">
            {mediaUrls.map((url, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={url} 
                  alt="" 
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove image ${i + 1}`}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Mentions dropdown */}
      {showMentions && searchResults && searchResults.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute left-10 top-full mt-1 bg-bg-elevated rounded-lg py-1 max-h-48 overflow-y-auto z-20 min-w-[200px] border border-[var(--border)] shadow-lg"
          role="listbox"
          aria-label="Mentions"
        >
          {searchResults.slice(0, 5).map((member: { userId: string; displayName: string; avatarUrl?: string }, index: number) => (
            <button
              key={member.userId}
              role="option"
              aria-selected={index === selectedIndex}
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
  );
}
