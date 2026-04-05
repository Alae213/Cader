/**
 * Type validation utilities for Convex IDs
 */

import { Id, TableNames } from "../../convex/_generated/dataModel";

/**
 * Validate and cast a string to a Convex Id type
 * Throws error if validation fails
 */
export function validateId<T extends TableNames>(
  id: string,
  tableName: T
): Id<T> {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new Error(`Invalid ${tableName} ID`);
  }
  return id as Id<T>;
}

/**
 * Validate postId
 */
export function validatePostId(postId: string): Id<"posts"> {
  return validateId(postId, "posts");
}

/**
 * Validate communityId
 */
export function validateCommunityId(communityId: string): Id<"communities"> {
  return validateId(communityId, "communities");
}

/**
 * Validate commentId
 */
export function validateCommentId(commentId: string): Id<"comments"> {
  return validateId(commentId, "comments");
}

/**
 * Validate userId
 */
export function validateUserId(userId: string): Id<"users"> {
  return validateId(userId, "users");
}

/**
 * Safe validation - returns null instead of throwing
 */
export function safeValidateId<T extends TableNames>(
  id: string | undefined | null,
  tableName: T
): Id<T> | null {
  if (!id) return null;
  try {
    return validateId(id, tableName);
  } catch {
    return null;
  }
}