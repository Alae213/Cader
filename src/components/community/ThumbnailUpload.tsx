"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useCallback } from "react";
import { ImageCropModal } from "./ImageCropModal";
import { Text } from "@/components/ui/Text";
import { toast } from "sonner";

interface ThumbnailUploadProps {
  currentUrl?: string;
  communityName: string;
  onSave: (croppedImageData: string) => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

export function ThumbnailUpload({ currentUrl, communityName, onSave }: ThumbnailUploadProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return "Invalid format. Use JPG, PNG, or WebP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 2MB.";
    }
    return null;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [validateFile]);

  // Handle crop save from modal
  const handleCropSave = useCallback((croppedData: string) => {
    onSave(croppedData);
    setImageSrc(null);
  }, [onSave]);

  // Handle modal close
  const handleCropClose = useCallback(() => {
    setCropModalOpen(false);
    setImageSrc(null);
  }, []);

  // Display mode with hover
  return (
    <>
      <div
        className="relative w-full aspect-video bg-bg-elevated rounded-[16px] overflow-hidden group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={communityName}
            className="w-full h-full object-cover rounded-[16px] transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-bg-secondary gap-3">
            <Text theme="muted" size="3">Add cover image</Text>
          </div>
        )}
        
        {/* Hover overlay with upload button */}
        {isHovering && (
          <div className="absolute inset-0 rounded-[16px] backdrop-blur-sm flex flex-col items-center justify-center gap-3 transition-all duration-200">
            <div className="bg-bg-base/50 rounded-lg p-2 cursor-pointer hover:bg-bg-base/70 transition-colors shadow-md">
              <Text size="3" className="text-white font-medium">Upload Image</Text>
            </div>
          </div>
        )}
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FORMATS.join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Crop Modal */}
      {imageSrc && (
        <ImageCropModal
          isOpen={cropModalOpen}
          onClose={handleCropClose}
          imageSrc={imageSrc}
          onSave={handleCropSave}
        />
      )}
    </>
  );
}
