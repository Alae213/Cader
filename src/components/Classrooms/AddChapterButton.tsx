"use client";

interface AddChapterButtonProps {
  showInput: boolean;
  inputValue: string;
  isCreating: boolean;
  onOpenModal: () => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function AddChapterButton({
  showInput,
  inputValue,
  isCreating,
  onOpenModal,
  onInputChange,
  onSubmit,
  onCancel,
}: AddChapterButtonProps) {
  if (showInput) {
    return (
      <div className="flex gap-2 p-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Chapter title..."
          className="flex-1 bg-bg-elevated border border-mauve-4 rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          autoFocus
          disabled={isCreating}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={isCreating || !inputValue.trim()}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? 'Adding...' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isCreating}
          className="px-3 py-2 text-text-secondary text-sm hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenModal}
      className="group flex h-[55px] w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed border-mauve-4 px-4 hover:border-mauve-6 hover:bg-bg-elevated transition-colors"
    >
      <div className="flex h-full cursor-grab items-center text-text-muted" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 11.75C6.19036 11.75 6.75 12.3096 6.75 13C6.75 13.6904 6.19036 14.25 5.5 14.25C4.80964 14.25 4.25 13.6904 4.25 13C4.25 12.3096 4.80964 11.75 5.5 11.75ZM10.5 11.75C11.1904 11.75 11.75 12.3096 11.75 13C11.75 13.6904 11.1904 14.25 10.5 14.25C9.80964 14.25 9.25 13.6904 9.25 13C9.25 12.3096 9.80964 11.75 10.5 11.75ZM5.5 6.75C6.19036 6.75 6.75 7.30964 6.75 8C6.75 8.69036 6.19036 9.25 5.5 9.25C4.80964 9.25 4.25 8.69036 4.25 8C4.25 7.30964 4.80964 6.75 5.5 6.75ZM10.5 6.75C11.1904 6.75 11.75 7.30964 11.75 8C11.75 8.69036 11.1904 9.25 10.5 9.25C9.80964 9.25 9.25 8.69036 9.25 8C9.25 7.30964 9.80964 6.75 10.5 6.75ZM5.5 1.75C6.19036 1.75 6.75 2.30964 6.75 3C6.75 3.69036 6.19036 4.25 5.5 4.25C4.80964 4.25 4.25 3.69036 4.25 3C4.25 2.30964 4.80964 1.75 5.5 1.75ZM10.5 1.75C11.1904 1.75 11.75 2.30964 11.75 3C11.75 3.69036 11.1904 4.25 10.5 4.25C9.80964 4.25 9.25 3.69036 9.25 3C9.25 2.30964 9.80964 1.75 10.5 1.75Z" fill="currentColor"/>
        </svg>
      </div>
      <span className="flex-1 text-left font-medium text-text-muted group-hover:text-text-secondary">
        Add Chapter
      </span>
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated text-text-muted group-hover:text-accent group-hover:bg-accent-muted transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1.75V8M8 14.25V8M8 8H1.75M8 8H14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}