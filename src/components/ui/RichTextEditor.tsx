"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, Heading2, Sparkles } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  minHeight?: string;
}

// ToolbarButton component moved outside to fix "Cannot create components during render" error
type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
};

function ToolbarButton({ onClick, active, children, title }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  content = "",
  onChange,
  placeholder = "Write a description...",
  editable = true,
  className,
  minHeight = "150px",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder, emptyEditorClass: "is-editor-empty" }),
    ],
    content: editable ? content : "",
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[80px]",
      },
    },
  });

  // Update content when it changes from parent
  if (editor && content !== editor.getHTML() && editable) {
    editor.commands.setContent(content);
  }

  const hasContent = content && content !== "<p></p>";

  // Non-editable view
  if (!editable) {
    return (
      <div className={cn("rounded-lg", className)}>
        {hasContent ? (
          <div 
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        ) : (
          <Text theme="muted">No description yet.</Text>
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border bg-bg-elevated overflow-hidden", className)}>
      {/* Minimal Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-bg-subtle">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive("heading", { level: 2 })}
          title="Heading"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div className="p-3" style={{ minHeight }}>
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="flex items-center gap-2 text-text-muted">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">{placeholder}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple Text component fallback
function Text({ 
  children, 
  theme, 
  className, 
}: { 
  children: React.ReactNode; 
  theme?: string; 
  className?: string;
}) {
  const themeClasses: Record<string, string> = {
    muted: "text-text-muted",
  };
  
  return (
    <p className={cn(theme && themeClasses[theme], className)}>
      {children}
    </p>
  );
}
