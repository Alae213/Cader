import { useState, useRef, useCallback } from "react";

export function useImageUpload(maxImages: number = 1) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [fadingImages, setFadingImages] = useState<Set<number>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const isValidImageFile = (file: File): boolean => {
    return VALID_IMAGE_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE;
  };

  const getErrorMessage = (file: File): string | null => {
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      return "Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 10MB.`;
    }
    return null;
  };

  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Shared file processing — used by file picker, drag-and-drop, and paste
  const processFiles = useCallback(async (files: File[]) => {
    // Check if already at max capacity
    if (imageUrls.length >= maxImages) {
      setUploadError(`Maximum ${maxImages} image${maxImages > 1 ? 's' : ''} allowed`);
      return;
    }

    // Validate and categorize files
    const validFiles: File[] = [];
    const invalidFiles: { file: File; error: string }[] = [];

    for (const file of files) {
      if (imageUrls.length + validFiles.length >= maxImages) {
        break; // Stop adding more files
      }
      const error = getErrorMessage(file);
      if (error) {
        invalidFiles.push({ file, error });
      } else {
        validFiles.push(file);
      }
    }

    // Show error for first invalid file
    if (invalidFiles.length > 0) {
      setUploadError(invalidFiles[0].error);
      setTimeout(() => setUploadError(null), 4000);
    }

    if (validFiles.length === 0) return;

    setIsUploadingImages(true);
    setUploadProgress({ current: 0, total: validFiles.length });

    try {
      let index = 0;
      for (const file of validFiles) {
        try {
          const compressed = await compressImage(file, 1200, 0.6);

          const base64StringSize = compressed.length;
          if (base64StringSize > 700 * 1024) {
            const moreCompressed = await compressImage(file, 800, 0.4);
            setImageUrls(prev => [...prev, moreCompressed]);
          } else {
            setImageUrls(prev => [...prev, compressed]);
          }
        } catch {
          // Failed to process image
        }
        index++;
        setUploadProgress(prev => ({ ...prev, current: index }));
      }
    } finally {
      setIsUploadingImages(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  }, [maxImages, imageUrls.length]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    await processFiles(Array.from(files));

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  }, [processFiles]);

  // Paste handler — attach to a text area's onPaste
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageFiles = items
      .filter(item => item.kind === "file" && item.type.startsWith("image/"))
      .map(item => item.getAsFile())
      .filter((f): f is File => f !== null);

    if (imageFiles.length > 0) {
      e.preventDefault(); // prevent the image from being pasted as text
      await processFiles(imageFiles);
    }
  }, [processFiles]);

  const removeImage = (index: number) => {
    setFadingImages(prev => new Set(prev).add(index));
    setTimeout(() => {
      setImageUrls(prev => prev.filter((_, i) => i !== index));
      setFadingImages(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, 200);
  };

  // Reset all images (used after successful post)
  const resetImages = useCallback(() => {
    setImageUrls([]);
    setUploadError(null);
  }, []);

  return {
    imageUrls,
    isUploadingImages,
    uploadProgress,
    fadingImages,
    isDragOver,
    uploadError,
    imageInputRef,
    handleImageSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
    removeImage,
    resetImages,
  };
}
