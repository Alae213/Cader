"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";
import { 
  Send,
  Image,
  X,
  AtSign,
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
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const createComment = useMutation(api.functions.feed.createComment);
  
  // Search members for mentions
  const searchResults = useQuery(
    api.functions.notifications.searchMembers,
    communityId && mentionSearch.length >= 1 
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

    if (!content.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setIsLoading(true);
    try {
      await createComment({
        postId: postId as any,
        content: content.trim(),
        parentCommentId: parentCommentId as any,
      });
      
      setContent("");
      onSubmit?.();
      toast.success("Comment posted!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post comment");
    } finally {
      setIsLoading(false);
    }
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
              >
                <Image className="w-4 h-4 text-text-muted" />
              </button>
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
                disabled={isLoading || !content.trim()}
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
          {searchResults.slice(0, 5).map((member: { userId: any; displayName: string; avatarUrl?: string }, index: number) => (
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
