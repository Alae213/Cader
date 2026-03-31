/**
 * Utility functions for parsing and rendering @mentions
 */

// Regex to find @mentions in text
export const MENTION_REGEX = /@(\w+)/g;

/**
 * Extract @mentions usernames from content
 * Returns array of usernames without the @ symbol
 */
export function extractMentions(content: string): string[] {
  const mentions: string[] = [];
  let match;
  
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  // Reset regex lastIndex
  MENTION_REGEX.lastIndex = 0;
  
  return mentions;
}

/**
 * Check if content contains any @mentions
 */
export function hasMentions(content: string): boolean {
  MENTION_REGEX.lastIndex = 0;
  return MENTION_REGEX.test(content);
}

/**
 * Parse content and return parts that are mentions vs regular text
 * Used for rendering @mentions as clickable elements
 */
export interface ContentPart {
  type: 'text' | 'mention';
  value: string;
}

export function parseContentWithMentions(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let lastIndex = 0;
  let match;
  
  MENTION_REGEX.lastIndex = 0;
  
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: content.slice(lastIndex, match.index),
      });
    }
    
    // Add the mention
    parts.push({
      type: 'mention',
      value: match[1], // Username without @
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last mention
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      value: content.slice(lastIndex),
    });
  }
  
  return parts;
}
