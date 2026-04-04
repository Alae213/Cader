"use client";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { VideoModal, getEmbedUrl } from "./VideoModal";
import { Play, Edit3 } from "lucide-react";

interface VideoEmbedProps {
  url?: string;
  onChange?: (url: string) => void;
  isOwner: boolean;
  modalOpen?: boolean;
  onModalOpenChange?: (open: boolean) => void;
}

export function VideoEmbed({
  url,
  onChange,
  isOwner,
  modalOpen,
  onModalOpenChange,
}: VideoEmbedProps) {
  const embedUrl = url ? getEmbedUrl(url) : null;

  if (embedUrl) {
    return (
      <>
        <div className="relative aspect-video rounded-[16px] overflow-hidden bg-bg-elevated">
          <iframe
            title="Lesson video"
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {isOwner && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={() => onModalOpenChange?.(true)}
            >
              <Edit3 className="w-4 h-4 mr-1" /> Edit
            </Button>
          )}
        </div>
        {isOwner && modalOpen !== undefined && (
          <VideoModal
            open={modalOpen}
            onOpenChange={onModalOpenChange!}
            url={url}
            onSave={onChange!}
          />
        )}
      </>
    );
  }

  if (isOwner) {
    return (
      <>
        <div 
          className="aspect-video hover:bg-accent-subtle rounded-[16px] bg-black/50 shadow-input-shadow border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-accent transition-colors"
          onClick={() => onModalOpenChange?.(true)}
        >
          <div className="text-center">
            <Play className="w-12 h-12 mx-auto text-text-muted mb-2" />
            <Text theme="secondary">Add a video for this lesson</Text>
          </div>
        </div>
        {modalOpen !== undefined && (
          <VideoModal
            open={modalOpen}
            onOpenChange={onModalOpenChange!}
            url={url}
            onSave={onChange!}
          />
        )}
      </>
    );
  }

  return (
    <div className="aspect-video rounded-[16px] bg-bg-elevated flex items-center justify-center">
      <Text theme="muted">No video for this lesson.</Text>
    </div>
  );
}
