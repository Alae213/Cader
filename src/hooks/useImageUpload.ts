import { useState, useRef } from "react";

export function useImageUpload() {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [fadingImages, setFadingImages] = useState<Set<number>>(new Set());
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      let index = 0;
      for (const file of Array.from(files)) {
        if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
          index++;
          setUploadProgress(prev => ({ ...prev, current: index }));
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          index++;
          setUploadProgress(prev => ({ ...prev, current: index }));
          continue;
        }

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

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

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

  return {
    imageUrls,
    isUploadingImages,
    uploadProgress,
    fadingImages,
    imageInputRef,
    handleImageSelect,
    removeImage,
  };
}
