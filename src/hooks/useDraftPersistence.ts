import { useEffect, useRef, useCallback } from 'react';

interface DraftSetters {
  setPostType: (v: "text" | "image" | "video" | "gif" | "poll") => void;
  setContent: (v: string) => void;
  setComposerCategoryId: (v: string) => void;
  setImageUrls: (v: string[]) => void;
  setVideoUrl: (v: string) => void;
  setGifUrl: (v: string) => void;
  setPollQuestion: (v: string) => void;
  setPollOptions: (v: string[]) => void;
  setPollEndDate: (v: string) => void;
}

interface DraftState {
  postType: "text" | "image" | "video" | "gif" | "poll";
  content: string;
  composerCategoryId: string;
  imageUrls: string[];
  videoUrl: string;
  gifUrl: string;
  pollQuestion: string;
  pollOptions: string[];
  pollEndDate: string;
  savedAt: number;
}

const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000;
const DEBOUNCE_MS = 300;

export function useDraftPersistence(
  communityId: string,
  composerExpanded: boolean
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = `feed-draft-${communityId}`;

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Silently fail
    }
  }, [draftKey]);

  const saveDraft = useCallback(
    (state: Omit<DraftState, 'savedAt'>) => {
      if (typeof window === 'undefined') return;
      if (!composerExpanded) return;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const draft = {
        ...state,
        savedAt: Date.now(),
      };

      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(draftKey, JSON.stringify(draft));
        } catch {
          // localStorage may be full or unavailable — silently fail
        }
      }, DEBOUNCE_MS);
    },
    [composerExpanded, draftKey]
  );

  const restoreDraft = useCallback(
    (setters: DraftSetters) => {
      if (typeof window === 'undefined') return;
      try {
        const saved = localStorage.getItem(draftKey);
        if (!saved) return;

        const draft = JSON.parse(saved) as DraftState;

        if (Date.now() - draft.savedAt > DRAFT_EXPIRY_MS) {
          localStorage.removeItem(draftKey);
          return;
        }

        if (draft.postType) setters.setPostType(draft.postType);
        if (draft.content) setters.setContent(draft.content);
        if (draft.composerCategoryId)
          setters.setComposerCategoryId(draft.composerCategoryId);
        if (draft.imageUrls?.length) setters.setImageUrls(draft.imageUrls);
        if (draft.videoUrl) setters.setVideoUrl(draft.videoUrl);
        if (draft.gifUrl) setters.setGifUrl(draft.gifUrl);
        if (draft.pollQuestion) setters.setPollQuestion(draft.pollQuestion);
        if (draft.pollOptions?.length >= 2)
          setters.setPollOptions(draft.pollOptions);
        if (draft.pollEndDate) setters.setPollEndDate(draft.pollEndDate);
      } catch {
        // Corrupted draft — ignore
      }
    },
    [draftKey]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { restoreDraft, saveDraft, clearDraft };
}
