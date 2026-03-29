"use client";

import { useState, useCallback, useEffect } from "react";
import { Link as LinkIcon, ExternalLink, Plus } from "lucide-react";
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
  const [inputValues, setInputValues] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize input values from props
  useEffect(() => {
    if (!isInitialized) {
      // Pad with empty strings to always have 3 inputs
      const padded = [...links];
      while (padded.length < MAX_LINKS) {
        padded.push("");
      }
      setInputValues(padded.slice(0, MAX_LINKS));
      setIsInitialized(true);
    }
  }, [links, isInitialized]);

  // Get filled links
  const filledLinks = inputValues.filter(l => l.trim() !== "");

  // If no filled links and not owner - don't render
  if (filledLinks.length === 0 && !isOwner) {
    return null;
  }

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
    } else if (e.key === "Escape") {
      // Reset to original value
      const newValues = [...inputValues];
      newValues[index] = links[index] || "";
      setInputValues(newValues);
      setEditingIndex(null);
    }
  }, [inputValues, links, handleSaveLink]);

  return (
    <div className="space-y-2">
      {/* Show filled links for non-owners */}
      {!isOwner && filledLinks.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {inputValues.map((link, index) => {
            if (!link.trim()) return null;
            return (
              <a
                key={index}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-accent hover:underline px-2 py-1"
              >
                <ExternalLink className="w-3 h-3" />
                <Text size="2">Link {index + 1}</Text>
              </a>
            );
          })}
        </div>
      )}

      {/* Owner: show inputs */}
      {isOwner && (
        <div className="space-y-2">
          {inputValues.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
              {editingIndex === index ? (
                <Input
                  value={link}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onBlur={() => handleBlur(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="Paste URL..."
                  className="flex-1 text-sm"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setEditingIndex(index)}
                  className={`flex-1 text-left text-sm px-2 py-1 rounded bg-bg-elevated hover:bg-bg-secondary transition-colors ${
                    link.trim() ? "text-text-primary" : "text-text-muted"
                  }`}
                >
                  {link.trim() || "Add link..."}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
