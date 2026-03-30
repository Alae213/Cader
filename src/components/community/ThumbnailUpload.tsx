"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import { Upload, X, Check, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { toast } from "sonner";
import "react-image-crop/dist/ReactCrop.css";

interface ThumbnailUploadProps {
  currentUrl?: string;
  communityName: string;
  onSave: (croppedImageData: string) => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const ASPECT_RATIO = 16 / 9;

// Helper to center crop on initial load
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ThumbnailUpload({ currentUrl, communityName, onSave }: ThumbnailUploadProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
      setIsCropping(true);
      setCrop(undefined);
      setCompletedCrop(undefined);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [validateFile]);

  // Handle crop complete
  const onCropComplete = useCallback((crop: PixelCrop) => {
    setCompletedCrop(crop);
  }, []);

  // Generate cropped image
  const getCroppedImage = useCallback(async (): Promise<string | null> => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const cropData = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Output size: 1600x900 for 16:9
    const outputWidth = 1600;
    const outputHeight = 900;
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // High quality image scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      cropData.x * scaleX,
      cropData.y * scaleY,
      cropData.width * scaleX,
      cropData.height * scaleY,
      0,
      0,
      outputWidth,
      outputHeight
    );

    return canvas.toDataURL("image/jpeg", 0.9);
  }, [completedCrop]);

  // Handle save crop
  const handleSaveCrop = useCallback(async () => {
    const croppedData = await getCroppedImage();
    if (croppedData) {
      onSave(croppedData);
      setIsCropping(false);
      setImageSrc(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [getCroppedImage, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setIsCropping(false);
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);

  // Handle image load to center crop
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, ASPECT_RATIO));
  }, []);

  // Cropping mode - Modern UI
  if (isCropping && imageSrc) {
    return (
      <div className="relative w-full bg-bg-canvas rounded-xl border border-border overflow-hidden">
        {/* Crop container - Modern styling */}
        <div className="p-4 bg-bg-secondary/50">
          <div className="relative rounded-lg overflow-hidden bg-black/10">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={onCropComplete}
              aspect={ASPECT_RATIO}
              className="[&_.reactCrop__crop-selection]:!border-2 [&_.reactCrop__crop-selection]:!border-white [&_.reactCrop__crop-selection]:!shadow-lg [&_.reactCrop__crop-selection]:!shadow-black/50 [&_.reactCrop__handles]:!w-3 [&_.reactCrop__handles]:!h-3 [&_.reactCrop__handles]:!bg-white [&_.reactCrop__handles]:!border-2 [&_.reactCrop__handles]:!border-accent [&_.reactCrop__handles]:!rounded-full [&_.reactCrop__crop-selection]:!rounded-lg"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                className="max-h-[250px] w-full object-contain"
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Action buttons - Modern floating style */}
        <div className="flex items-center justify-end gap-2 p-3 bg-bg-elevated">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="text-text-secondary hover:text-text-primary"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveCrop}
            disabled={!completedCrop}
          >
            <Check className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  // Display mode with hover
  return (
    <div
      className="relative w-full aspect-video bg-bg-elevated rounded-[16px] overflow-hidden group "
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
        <div className="w-full h-full flex flex-col  items-center justify-center bg-bg-secondary gap-3">
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
  );
}
