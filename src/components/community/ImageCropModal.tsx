"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import { Check, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import "react-image-crop/dist/ReactCrop.css";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (croppedImageData: string) => void;
  aspectRatio?: number;
}

const ASPECT_RATIO = 16 / 9;
const OUTPUT_WIDTH = 1600;
const OUTPUT_HEIGHT = 900;

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

export function ImageCropModal({ 
  isOpen, 
  onClose, 
  imageSrc, 
  onSave,
  aspectRatio = ASPECT_RATIO 
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      setIsProcessing(false);
    }
  }, [isOpen]);

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
    
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    
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
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT
    );

    return canvas.toDataURL("image/jpeg", 0.9);
  }, [completedCrop]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsProcessing(true);
    try {
      const croppedData = await getCroppedImage();
      if (croppedData) {
        onSave(croppedData);
        onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  }, [getCroppedImage, onSave, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle image load to center crop
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspectRatio));
  }, [aspectRatio]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>
        
        <div className="p-4 pt-0 overflow-auto max-h-[calc(90vh-180px)]">
          <div className="relative rounded-lg overflow-hidden bg-black/10">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={onCropComplete}
              aspect={aspectRatio}
              className="[&_.reactCrop__crop-selection]:!border-2 [&_.reactCrop__crop-selection]:!border-white [&_.reactCrop__crop-selection]:!shadow-lg [&_.reactCrop__crop-selection]:!shadow-black/50 [&_.reactCrop__handles]:!w-3 [&_.reactCrop__handles]:!h-3 [&_.reactCrop__handles]:!bg-white [&_.reactCrop__handles]:!border-2 [&_.reactCrop__handles]:!border-accent [&_.reactCrop__handles]:!rounded-full [&_.reactCrop__crop-selection]:!rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                className="max-h-[50vh] w-full object-contain"
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>
          
          {/* Hidden canvas for cropping */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border">
          <Text size="sm" theme="muted">
            Output: {OUTPUT_WIDTH}×{OUTPUT_HEIGHT}px (16:9)
          </Text>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!completedCrop || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
