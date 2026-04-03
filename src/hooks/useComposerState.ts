import { useState, useCallback, useRef, useEffect } from "react";
import type { PostType, ComposerState, ComposerActions } from "@/types/composer";

interface UseComposerStateOptions {
  communityId: string;
  onResetImages?: () => void;
}

interface ComposerStateReturn extends ComposerState, ComposerActions {
  /** Whether the composer has any unsaved content */
  hasContent: boolean;
}

/**
 * Consolidated composer state management hook.
 * Replaces the scattered useState calls in FeedTab with a single source of truth.
 * Includes draft auto-save, reset logic, and content detection.
 */
export function useComposerState({
  communityId,
  onResetImages,
}: UseComposerStateOptions): ComposerStateReturn {
  const [expanded, setExpanded] = useState(false);
  const [postType, setPostType] = useState<PostType>("text");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = `feed-draft-${communityId}`;

  // Detect whether the composer has any meaningful content (for draft detection)
  const hasContent =
    content.trim().length > 0 ||
    videoUrl.trim().length > 0 ||
    categoryId.length > 0;

  // --- Draft persistence ---
  const saveDraft = useCallback(
    (state: {
      postType: PostType;
      content: string;
      categoryId: string;
      videoUrl: string;
    }) => {
      if (typeof window === "undefined") return;
      if (!expanded) return;

      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }

      draftTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(
            draftKey,
            JSON.stringify({ ...state, savedAt: Date.now() })
          );
        } catch {
          // localStorage may be full — silently fail
        }
      }, 300);
    },
    [expanded, draftKey]
  );

  const restoreDraft = useCallback(
    (actions: {
      setPostType: (v: PostType) => void;
      setContent: (v: string) => void;
      setCategoryId: (v: string) => void;
      setVideoUrl: (v: string) => void;
    }) => {
      if (typeof window === "undefined") return;
      try {
        const saved = localStorage.getItem(draftKey);
        if (!saved) return;

        const draft = JSON.parse(saved) as ComposerState & { savedAt: number };
        const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

        if (Date.now() - draft.savedAt > EXPIRY_MS) {
          localStorage.removeItem(draftKey);
          return;
        }

        const raw = draft as unknown as Record<string, unknown>;
        if (draft.postType) actions.setPostType(draft.postType);
        if (draft.content) actions.setContent(draft.content);
        if (raw.categoryId) actions.setCategoryId(raw.categoryId as string);
        if (draft.videoUrl) actions.setVideoUrl(draft.videoUrl);
      } catch {
        // Corrupted draft — ignore
      }
    },
    [draftKey]
  );

  // Restore draft on mount
  useEffect(() => {
    restoreDraft({
      setPostType,
      setContent,
      setCategoryId,
      setVideoUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft on state change
  useEffect(() => {
    saveDraft({
      postType,
      content,
      categoryId,
      videoUrl,
    });
  }, [
    postType,
    content,
    categoryId,
    videoUrl,
    saveDraft,
  ]);

  // Cleanup draft timer on unmount
  useEffect(() => {
    return () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }
    };
  }, []);

  // --- Actions ---
  const expand = useCallback(() => {
    setExpanded(true);
  }, []);

  const reset = useCallback(() => {
    setContent("");
    setCategoryId("");
    setVideoUrl("");
    setPostType("text");
    setError("");
    onResetImages?.();
    if (typeof window !== "undefined") {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, onResetImages]);

  const close = useCallback(() => {
    setExpanded(false);
    reset();
  }, [reset]);

  return {
    expanded,
    postType,
    content,
    categoryId,
    videoUrl,
    error,
    hasContent,
    expand,
    close,
    reset,
    setPostType,
    setContent,
    setCategoryId,
    setVideoUrl,
    setError,
  };
}
