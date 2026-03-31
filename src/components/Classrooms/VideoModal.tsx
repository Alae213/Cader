"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { X, Check } from "lucide-react";
import { toast } from "sonner";

// Video URL validation and embed conversion
export function getEmbedUrl(videoUrl: string): string | null {
  if (!videoUrl) return null;
  
  const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  const driveMatch = videoUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  
  return null;
}

export function getVideoPlatform(videoUrl: string): string | null {
  if (!videoUrl) return null;
  if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) return "YouTube";
  if (videoUrl.includes("vimeo.com")) return "Vimeo";
  if (videoUrl.includes("drive.google.com")) return "Google Drive";
  return null;
}

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string;
  onSave: (url: string) => void;
}

export function VideoModal({
  open,
  onOpenChange,
  url,
  onSave,
}: VideoModalProps) {
  const [inputValue, setInputValue] = useState(url || "");
  const [error, setError] = useState("");
  
  // Reset form when dialog opens with new URL
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue(url || "");
      setError("");
    }
  }, [open, url]);

  const embedUrl = getEmbedUrl(inputValue);
  const platform = getVideoPlatform(inputValue);
  const isValid = inputValue === "" || embedUrl !== null;

  const handleSave = () => {
    if (!inputValue.trim()) {
      onSave("");
      onOpenChange(false);
      return;
    }
    
    if (!embedUrl) {
      setError("Invalid URL. Use YouTube, Vimeo, or Google Drive links.");
      return;
    }
    
    onSave(inputValue);
    onOpenChange(false);
    toast.success("Video updated");
  };

  const handleRemove = () => {
    onSave("");
    onOpenChange(false);
    toast.success("Video removed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Add Video</DialogTitle>
        
        <div className="space-y-4">
          <div>
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError("");
              }}
              placeholder="Paste YouTube, Vimeo, or Google Drive link"
              className={!isValid ? "border-red-500" : ""}
            />
            {error && <Text size="2" theme="error" className="mt-1">{error}</Text>}
          </div>

          {embedUrl && (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-elevated">
              <iframe
                title="Video preview"
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {inputValue && platform && embedUrl && (
            <Text size="2" theme="secondary">
              Platform: {platform}
            </Text>
          )}

          {inputValue && !embedUrl && (
            <Text size="2" theme="error">
              Invalid video URL
            </Text>
          )}
        </div>

        <div className="flex justify-between mt-4">
          {url && (
            <Button variant="ghost" onClick={handleRemove}>
              <X className="w-4 h-4 mr-1" /> Remove
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="w-4 h-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
