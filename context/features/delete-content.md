# Feature: Delete Post & Comment

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

Delete Post & Comment allows content removal for moderation purposes. Authors can delete their own posts and comments. Community owners and admins can delete any post or comment in their community. Deletion includes a confirmation step to prevent accidental removal.

---

## Users

- **Post/Comment Author:** Can delete their own content
- **Owner / Admin:** Can delete any content in their community
- **Member:** Can only delete their own content
- **Visitor / non-member:** No access

---

## User Stories

- As a **post author**, I want to **delete my own post** so that I can remove content I no longer want shared.
- As a **comment author**, I want to **delete my own comment** so that I can correct or remove my remarks.
- As an **owner**, I want to **delete any post or comment** so that I can moderate inappropriate content.
- As an **owner**, I want to **confirm before deleting** so that I don't accidentally remove content.

---

## Behaviour

### Delete Post

1. Author or admin clicks the three-dot menu on a post card
2. "Delete post" option appears (red text)
3. Click "Delete post"
4. Confirmation dialog appears:
   ```
   ┌─────────────────────────────────────┐
   │ Delete this post?                   │
   │                                     │
   │ This will permanently remove the    │
   │ post and all its comments.          │
   │                                     │
   │ [Cancel]  [Delete]                  │
   └─────────────────────────────────────┘
   ```
5. Click "Delete" → post is soft-deleted (or hard-deleted TBD)
6. Post removed from feed in real-time (Convex live query)
7. Toast notification: "Post deleted"

### Delete Comment

1. Author or admin clicks the three-dot menu on a comment
2. "Delete comment" option appears (red text)
3. Click "Delete comment"
4. Confirmation dialog appears:
   ```
   ┌─────────────────────────────────────┐
   │ Delete this comment?                │
   │                                     │
   │ This cannot be undone.              │
   │                                     │
   │ [Cancel]  [Delete]                  │
   └─────────────────────────────────────┘
   ```
5. Click "Delete" → comment removed
6. Comment removed from thread in real-time
7. Toast notification: "Comment deleted"

### Permission Matrix

| User Type | Delete Own Post | Delete Others' Post | Delete Own Comment | Delete Others' Comment |
|---|---|---|---|---|
| Author (member) | ✅ | ❌ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Owner | ✅ | ✅ | ✅ | ✅ |
| Visitor | ❌ | ❌ | ❌ | ❌ |

---

### Edge Cases & Rules

- Delete permission checked server-side (not just client-side hiding)
- Deleting a post also deletes all its comments (cascade delete)
- If a pinned post is deleted, it's automatically unpinned
- Author can delete their own content without admin privileges
- Admin check: user's `memberships.role === 'admin'` for the current community
- Three-dot menu shows "Delete post/comment" only if user has permission
- After deletion, feed updates in real-time via Convex live query
- Deleted content is not recoverable in v1 (or soft-delete with recovery window — open question)

---

## Connections

- **Depends on:** Community Feed (posts/comments), Admin role check
- **Triggers:** Pin Post (auto-unpin if pinned post deleted), Gamification (point events remain for audit)
- **Shares data with:** Community Feed (real-time removal), Profile modal (post count may decrease)

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|---|---|---|
| Delete type | Hard delete (permanent) | Soft delete with 30-day recovery |
| Bulk delete | Not supported | Select multiple to delete at once |
| Delete reason | Not required | Optional reason field for audit log |
| Undo | Not supported | Undo within 10 seconds (toast action) |
| Delete notifications | None | Notify author when content deleted by admin |
| Audit log | Not in v1 | Log who deleted what and when |

---

## Security Considerations

- Delete mutation must verify permission server-side:
  - `authorId === userId` OR `user is admin of communityId`
- Post deletion: cascade delete all comments in single transaction
- Pin state: auto-unpin before deletion to maintain data consistency
- No soft-delete recovery in v1 (hard delete) — ensure confirmation dialog is clear
- Rate limiting: max 10 deletions per minute per user (prevent abuse)

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T-001 | `[ ]` | Create Convex mutation: `deletePost(postId, communityId)` with author/admin check |
| T-002 | `[ ]` | Create Convex mutation: `deleteComment(commentId)` with author/admin check |
| T-003 | `[ ]` | Implement cascade delete: deleting post removes all related comments |
| T-004 | `[ ]` | Implement auto-unpin: unpin post before deletion if `isPinned === true` |
| T-005 | `[ ]` | Build delete confirmation dialog component |
| T-006 | `[ ]` | Add "Delete post" to post three-dot menu (conditional: author or admin) |
| T-007 | `[ ]` | Add "Delete comment" to comment three-dot menu (conditional: author or admin) |
| T-008 | `[ ]` | Style delete option in red within menu |
| T-009 | `[ ]` | Add toast notification on successful deletion |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] Is deleted content hard-deleted or soft-deleted (with recovery window)?
- [ ] Should deleting a post show the cascade effect in confirmation ("This will also delete X comments")?
- [ ] Is there an audit log of deletions in v1?
- [ ] Can a deleted post be restored, or is it permanent?
