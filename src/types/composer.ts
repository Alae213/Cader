/**
 * Shared type definitions for the PostComposer component.
 * Eliminates `any` types and provides a single source of truth.
 */

export interface ComposerUser {
  user?: ComposerUser;
  imageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  fullName?: string | null;
}

export type PostType = "text" | "image" | "video" | "gif" | "poll";

export interface ComposerCategory {
  _id: string;
  name: string;
  color: string;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface ComposerSubmitData {
  postType: PostType;
  content: string;
  categoryId?: string;
  imageUrls?: string[];
  videoUrl?: string;
  gifUrl?: string;
  pollQuestion?: string;
  pollOptions?: PollOption[];
  pollEndDate?: number;
}

export interface ComposerState {
  expanded: boolean;
  postType: PostType;
  content: string;
  categoryId: string;
  videoUrl: string;
  gifUrl: string;
  pollQuestion: string;
  pollOptions: string[];
  pollEndDate: string;
  error: string;
}

export interface ComposerActions {
  expand: () => void;
  close: () => void;
  reset: () => void;
  setPostType: (type: PostType) => void;
  setContent: (content: string) => void;
  setCategoryId: (id: string) => void;
  setVideoUrl: (url: string) => void;
  setGifUrl: (url: string) => void;
  setPollQuestion: (q: string) => void;
  setPollOptions: (options: string[]) => void;
  setPollEndDate: (date: string) => void;
  setError: (error: string) => void;
}
