"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Text } from "@/components/ui/Text";

interface LessonDescriptionProps {
  description: string;
  isOwner: boolean;
  onSave: (description: string) => void;
}

export function LessonDescription({
  description,
  isOwner,
  onSave,
}: LessonDescriptionProps) {
  const [text, setText] = useState(description);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(description);
  }, [description]);

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  const handleChange = useCallback((newText: string) => {
    setText(newText);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      setSaving(true);
      onSave(newText);
      setSaving(false);
    }, 1500);
    
    setTimeout(adjustTextareaHeight, 0);
  }, [onSave, adjustTextareaHeight]);

  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setSaving(true);
    onSave(text);
    setSaving(false);
  }, [text, onSave]);

  useEffect(() => {
    setTimeout(adjustTextareaHeight, 0);
  }, [adjustTextareaHeight]);

  if (isOwner) {
    return (
      <div>
        <textarea
          ref={textareaRef}
          className="w-full p-3 text-sm bg-bg-subtle hover:bg-bg-elevated focus:bg-bg-elevated rounded-lg resize-none focus:outline-none"
          placeholder="Write a description..."
          value={text}
          onChange={(e) => {
            handleChange(e.target.value);
            adjustTextareaHeight();
          }}
          onBlur={handleBlur}
          style={{ height: "auto" }}
        />
        {saving && (
          <Text size="1" theme="muted" className="mt-1">Saving...</Text>
        )}
      </div>
    );
  }

  return (
    <Text size="2" className="text-text-secondary whitespace-pre-wrap">
      {description || <Text theme="muted">No description yet.</Text>}
    </Text>
  );
}
