"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Text } from "@/components/ui/Text";
import { toast } from "sonner";

interface ShortDescriptionProps {
  value?: string;
  isOwner: boolean;
  onSave: (value: string) => void;
}

const MAX_CHARS = 200;
const AUTO_SAVE_DELAY = 1500; // 1.5s

export function ShortDescription({ value = "", isOwner, onSave }: ShortDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with external value changes
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value);
    }
  }, [value, isEditing]);

  // Auto-save after delay
  const handleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (inputValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(() => {
      onSave(inputValue);
      setIsSaving(false);
      setIsEditing(false);
      toast.success("Description saved");
    }, AUTO_SAVE_DELAY);
  }, [inputValue, value, onSave]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_CHARS) {
      setInputValue(newValue);
    }
  };

  // Handle focus
  const handleFocus = () => {
    setIsEditing(true);
    setShowCounter(true);
  };

  // Handle blur (save)
  const handleBlur = () => {
    if (inputValue !== value) {
      // Clear any pending auto-save and save immediately
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setIsSaving(true);
      onSave(inputValue);
      setIsSaving(false);
    }
    setIsEditing(false);
    setShowCounter(false);
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setInputValue(value);
      setIsEditing(false);
      setShowCounter(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Empty and not owner - don't render
  if (!value && !isOwner) {
    return null;
  }

  // Owner editing mode
  if (isOwner) {
    return (
      <div className="space-y-1">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Type description..."
          className="w-full p-2 bg-bg-elevated border border-border rounded-lg text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          rows={2}
        />
        {showCounter && (
          <div className="flex justify-end">
            <Text size="1" theme={inputValue.length >= MAX_CHARS ? "error" : "muted"}>
              {inputValue.length}/{MAX_CHARS}
              {isSaving && " • Saving..."}
            </Text>
          </div>
        )}
      </div>
    );
  }

  // Non-owner view mode
  return (
    <Text size="3" theme="secondary" className="text-center">
      {value}
    </Text>
  );
}
