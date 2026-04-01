import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/live\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract YouTube thumbnail URL from video URL
 */
export function getYouTubeThumbnail(url: string, size: 'default' | 'medium' | 'high' | 'max' = 'default'): string | null {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  
  const sizes = {
    default: 'default',  // 120x90
    medium: 'mqdefault', // 320x180
    high: 'hqdefault',  // 480x360
    max: 'maxresdefault', // 1280x720
  };
  
  return `https://i.ytimg.com/vi/${videoId}/${sizes[size]}.jpg`;
}

/**
 * Extract Vimeo video ID from URL
 */
export function getVimeoVideoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
    /^(\d+)$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get Vimeo thumbnail URL (requires API call for actual thumbnail)
 * Returns a placeholder since Vimeo oEmbed requires an API call
 */
export function getVimeoThumbnail(url: string): string | null {
  const videoId = getVimeoVideoId(url);
  if (!videoId) return null;
  
  // Vimeo doesn't have direct thumbnail URLs like YouTube
  // We'll return null and show a placeholder - in production you'd call the oEmbed API
  return null;
}

/**
 * Extract thumbnail from video URL (YouTube or Vimeo)
 */
export function getVideoThumbnail(url: string): string | null {
  if (!url) return null;
  
  // Try YouTube first
  const ytThumbnail = getYouTubeThumbnail(url, 'medium');
  if (ytThumbnail) return ytThumbnail;
  
  // Try Vimeo
  const vimeoThumbnail = getVimeoThumbnail(url);
  if (vimeoThumbnail) return vimeoThumbnail;
  
  return null;
}
