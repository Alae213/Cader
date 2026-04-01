"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";
import { 
  Send,
  Image as ImageIcon,
  X,
  AtSign,
  Loader2,
} from "lucide-react";

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
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createComment = useMutation(api.functions.feed.createComment);
  
  // Search members for mentions
  const searchResults = useQuery(
    api.functions.notifications.searchMembers,
     
    communityId && mentionSearch.length >= 1 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? { communityId: communityId as any, searchQuery: mentionSearch }
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

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("You must be signed in to comment");
      return;
    }

    if (!content.trim() && mediaUrls.length === 0) {
      toast.error("Please enter a comment or add an image");
      return;
    }

    setIsLoading(true);
    try {
       
      await createComment({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postId: postId as any,
        content: content.trim(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parentCommentId: parentCommentId as any,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      });
      
      setContent("");
      setMediaUrls([]);
      onSubmit?.();
      toast.success("Comment posted!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post comment");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
          toast.error("Invalid format. Use JPG, PNG, WebP, or GIF.");
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error("File too large. Maximum size is 10MB.");
          continue;
        }

        // Compress and add to mediaUrls
        const compressed = await compressImage(file, 800, 0.6);
        
        // Check base64 size (Convex 1MB limit, base64 is ~33% larger)
        if (compressed.length > 700 * 1024) {
          toast.error("Image too large after compression. Please try a smaller image.");
          continue;
        }

        setMediaUrls(prev => [...prev, compressed]);
      }
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
    <div className="relative">
      <div className="flex gap-3 p-3 rounded-xl bg-bg-elevated">
        <Avatar
          src={user?.imageUrl}
          name={user?.firstName || user?.username || "User"}
          size="sm"
        />
        
        <div className="flex-1">
          {/* Image previews */}
          {mediaUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {mediaUrls.map((url, i) => (
                <div key={i} className="relative group">
                  <img 
                    src={url} 
                    alt="" 
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full bg-transparent resize-none outline-none text-sm min-h-[40px] max-h-[200px] placeholder:text-text-muted"
            rows={1}
          />
          
          {/* Actions */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded-md hover:bg-bg-muted transition-colors"
                title="Add image"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImages}
              >
                {isUploadingImages ? (
                  <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-text-muted" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              <button
                type="button"
                className="p-1.5 rounded-md hover:bg-bg-muted transition-colors"
                title="Mention someone"
                onClick={() => {
                  const cursorPos = textareaRef.current?.selectionStart || 0;
                  const before = content.slice(0, cursorPos);
                  const newContent = `${before}@`;
                  setContent(newContent);
                  setShowMentions(true);
                  setMentionSearch("");
                  setMentionPosition(cursorPos);
                  textareaRef.current?.focus();
                }}
              >
                <AtSign className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={handleSubmit}
                disabled={isLoading || (!content.trim() && mediaUrls.length === 0)}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mentions dropdown */}
      {showMentions && searchResults && searchResults.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute left-3 top-full mt-1 bg-bg-elevated rounded-lg py-1 max-h-48 overflow-y-auto z-20 min-w-[200px]"
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
