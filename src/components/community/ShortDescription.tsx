"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Text } from "@/components/ui/Text";

interface ShortDescriptionProps {
  value?: string;
  isOwner: boolean;
  onSave: (value: string) => void;
}

const MAX_CHARS = 200;

export function ShortDescription({ value = "", isOwner, onSave }: ShortDescriptionProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync when value changes from parent
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Save function
  const save = useCallback(async (text: string) => {
    const currentValue = value || "";
    const newValue = text || "";
    
    if (newValue === currentValue) return; // No changes - don't save
    
    try {
      setIsSaving(true);
      await onSave(text);
    } finally {
      setIsSaving(false);
    }
  }, [value, onSave]);

  // Handle change with debounce
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_CHARS) {
      setInputValue(newValue);
      
      // Clear existing timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Set new timer for 1.5s auto-save
      debounceRef.current = setTimeout(() => {
        save(newValue);
      }, 1500);
    }
  };

  // Handle focus/blur - show/hide counter
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => {
    setIsFocused(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    save(inputValue);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
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
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Write a short description..."
          className="w-full p-3 bg-bg-subtle hover:bg-bg-elevated focus:bg-bg-elevated rounded-lg text-text-primary resize-none focus:outline-none transition-colors text-sm"
          rows={2}
        />
        {isFocused && (
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
