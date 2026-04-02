"use client";

import { useState, useCallback } from "react";
import { Link as LinkIcon, Plus, Trash } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";

interface LinkInputsProps {
  links?: string[];
  isOwner: boolean;
  onSave: (links: string[]) => void;
}

const MAX_LINKS = 3;

export function LinkInputs({ links = [], isOwner, onSave }: LinkInputsProps) {
  // Initialize input values from props directly
  const [inputValues, setInputValues] = useState<string[]>(() => [...links]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Get filled links
  const filledLinks = inputValues.filter(l => l.trim() !== "");
  const canAddMore = filledLinks.length < MAX_LINKS;

  // Handle single link save
  const handleSaveLink = useCallback((index: number, value: string) => {
    const newLinks = [...inputValues];
    newLinks[index] = value;
    setInputValues(newLinks);
    setEditingIndex(null);
    
    // Get all filled links and save
    const filled = newLinks.filter(l => l.trim() !== "");
    onSave(filled);
  }, [inputValues, onSave]);

  // Handle input change
  const handleChange = useCallback((index: number, value: string) => {
    const newValues = [...inputValues];
    newValues[index] = value;
    setInputValues(newValues);
  }, [inputValues]);

  // Handle blur - save immediately
  const handleBlur = useCallback((index: number) => {
    handleSaveLink(index, inputValues[index]);
  }, [inputValues, handleSaveLink]);

  // Handle key down
  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveLink(index, inputValues[index]);
    }
  }, [inputValues, handleSaveLink]);

  // Add new link
  const handleAddLink = () => {
    if (canAddMore) {
      const newIndex = filledLinks.length;
      setInputValues([...inputValues, ""]);
      setEditingIndex(newIndex);
    }
  };

  // Remove link
  const handleRemoveLink = (index: number) => {
    const newValues = inputValues.filter((_, i) => i !== index);
    setInputValues(newValues);
    const filled = newValues.filter(l => l.trim() !== "");
    onSave(filled);
  };

  // If no filled links and not owner - don't render
  if (filledLinks.length === 0 && !isOwner) {
    return null;
  }

  // Non-owner: show links
  if (!isOwner) {
    return (
      <div className="flex flex-col gap-1">
        {filledLinks.map((link, index) => (
          <a
            key={index}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-accent hover:underline"
          >
            <LinkIcon className="w-3 h-3" />
            <Text size="2">Link {index + 1}</Text>
          </a>
        ))}
      </div>
    );
  }

  // Owner: show inputs or add button
  return (
    <div className="flex flex-col gap-2">
      {/* Show all input values (including empty ones) as editable */}
      {inputValues.map((link, index) => (
        <div key={index} className="flex items-center gap-1">
          {editingIndex === index ? (
            <Input
              value={link}
              onChange={(e) => handleChange(index, e.target.value)}
              onBlur={() => handleBlur(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              placeholder="Paste URL..."
              className="flex-1 text-sm h-8 rounded-md bg-bg-subtle hover:bg-bg-elevated focus:bg-bg-elevated transition-colors"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingIndex(index)}
              className="flex-1 flex items-center gap-2 text-left text-sm px-2 py-1 rounded bg-bg-subtle hover:bg-bg-elevated transition-colors text-text-primary"
            >
              <LinkIcon className="w-3 h-3 text-text-muted" />
              <span className="truncate">{link.trim() || `Link ${index + 1}`}</span>
            </button>
          )}
          {inputValues.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-md hover:bg-red-600/5 hover:text-red-600"
              onClick={() => handleRemoveLink(index)}
            >
              <Trash className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}

      {/* Show add button if can add more */}
      {canAddMore && (
        <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 rounded-md w-fit hover:bg-bg-elevated"
          onClick={handleAddLink}
        >
          <Plus className="w-3 h-3" />
          Add link
        </Button>
        </div>
      )}
    </div>
  );
}
