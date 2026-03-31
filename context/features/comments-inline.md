# Feature: Inline Threaded Comments

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

Comments appear inline below posts (like Whop/Reddit), not in a modal. Threaded replies support 2 levels deep. Comments are sorted by upvotes (top), with infinite scroll loading 5 at a time.

---

## Requirements from User

| Requirement | Decision |
|-------------|----------|
| Comments Display | Inline, like Reddit threads (no modal) |
| Nesting | 2 levels deep |
| Sorting | Top (most upvotes) |
| Mobile indentation | Less than desktop |
| First comment treatment | No special treatment |
| Comment editing | No |
| Comment deletion by user | No |
| Comment deletion by post author | Yes |
| Comment deletion by admin/owner | Yes |
| Comment upvotes | Yes, same as post upvotes |
| Comment upvote count | Inline, visible |
| Real-time | Yes, instant updates |
| Empty state | No "Be the first" prompt |

---

## User Stories

- As a **member**, I want to see comments inline below posts so I can read the conversation without opening a modal
- As a **member**, I want to reply to comments creating threaded replies so I can have deeper conversations
- As a **member**, I want to upvote comments so I can show appreciation
- As a **post author**, I want to delete any comment on my post so I can moderate my content
- As an **admin/owner**, I want to delete any comment anywhere so I can moderate the community

---

## UI/UX Specification

### Layout Structure

```
Post Card
├── Header (author, timestamp, category)
├── Content (text, media, poll)
└── Footer (upvote, comment count, share)
    └── Comments Section (inline, below footer)
        ├── Comment 1 (top-level)
        │   ├── Comment 1.1 (reply, indented)
        │   └── Comment 1.2 (reply, indented)
        ├── Comment 2 (top-level)
        │   └── Comment 2.1 (reply, indented)
        └── [Load More] button (infinite scroll)
    └── Comment Input (inline at bottom)
```

### Spacing (per DESIGN_SYSTEM.md)

| Element | Spacing |
|---------|---------|
| Post to comments | `mt-4` (16px) |
| Comment padding | `p-3` (12px) |
| Top-level indent | `pl-0` |
| Level-2 indent | `pl-8` (desktop), `pl-4` (mobile) |
| Between comments | `gap-2` (8px) |
| Avatar to content | `gap-3` (12px) |

### Visual Design (per DESIGN_SYSTEM.md)

- **No borders** - use surface hierarchy (`bg-bg-elevated`, `hover:bg-bg-muted`)
- **Rounded corners** - `rounded-xl` (24px) for comment containers
- **Background** - `bg-bg-elevated` for comments
- **Hover state** - `hover:bg-bg-muted/50`
- **Pinned posts** - Blue border (`border-l-4 border-blue-500`) + pin icon

### Components

#### Comment Component
- Avatar (32px)
- Author name + level badge [Level X]
- @username (if available)
- Timestamp ("2h ago")
- Comment content
- Actions: Upvote + count, Reply (if level 2 allowed)
- Three-dot menu (delete if author/admin)

#### Comment Input
- Inline at bottom of comments section
- Plain text only
- Image/GIF attachments support
- @mentions support
- "Write a comment..." placeholder

---

## Functionality Specification

### Loading & Pagination
- Initial load: 5 comments
- Infinite scroll: Load 5 more
- Sort: By upvotes (descending)

### Actions
- **Upvote comment**: Toggle upvote, real-time count update
- **Reply**: Opens inline reply input below the comment
- **Delete**: Only post author or admin/owner can delete

### Real-time
- New comments appear instantly without refresh
- Upvote counts update in real-time

### Permissions
| Action | Post Author | Admin/Owner | Regular Member |
|--------|-------------|-------------|----------------|
| Delete own comment | No | Yes | No |
| Delete any comment on own post | Yes | Yes | No |
| Delete any comment anywhere | N/A | Yes | No |
| Upvote | Yes | Yes | Yes |
| Reply | Yes | Yes | Yes |

---

## Integration with Gamification

- Comment creation awards +1 point (per leaderboard-gamification.md)
- Comment upvote received awards +1 point to comment author
- Points awarded in real-time (optimistic UI)

---

## Integration with @Mentions

- @mentions work in comments just like posts
- Autocomplete shows: avatar, name, level badge
- Mention triggers notification in real-time
- Max 20 mentions per comment

---

## Data Model

### Comment Schema (existing or new)
```typescript
{
  _id: string;
  postId: string;
  parentId?: string; // null for top-level, set for replies
  authorId: string;
  author: {
    _id: string;
    displayName: string;
    avatarUrl?: string;
    username?: string;
  };
  content: string;
  mentions?: string[]; // user IDs
  mediaUrls?: string[];
  upvoteCount: number;
  createdAt: number;
  updatedAt?: number;
}
```

### Required Convex Functions
- `createComment(postId, parentId?, content, mentions?, mediaUrls?)`
- `deleteComment(commentId)` — with permission check
- `toggleCommentUpvote(commentId)` — with point events
- `listComments(postId, cursor?, limit?)` — paginated, sorted by upvotes
- `getComment(commentId)` — single comment

---

## Edge Cases

1. **Deleted comment**: Show "[deleted]" placeholder or remove entirely?
   - Decision: Remove from UI entirely (like Reddit)
   
2. **Long comment threads**: After 2 levels, show "Reply to [username]" link instead of nesting further
   
3. **Comment on deleted post**: Comments should also be deleted (cascade)

4. **Rapid upvotes**: Debounce to prevent spam

5. **Empty comments**: Validate min length (1 character)

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full |
|--------|----------|------|
| Nesting depth | 2 | Unlimited |
| Edit comment | No | Yes |
| Rich text | No | Yes |
| Sort options | Top only | Top/Newest/Oldest |

---

## Tasks

| # | Status | Task |
|---|--------|------|
| T-001 | `[ ]` | Update Convex schema: add comments table (if not exists) |
| T-002 | `[ ]` | Create `createComment` mutation |
| T-003 | `[ ]` | Create `deleteComment` mutation with permission checks |
| T-004 | `[ ]` | Create `toggleCommentUpvote` mutation with point events |
| T-005 | `[ ]` | Create `listComments` query with pagination |
| T-006 | `[ ]` | Build Comment component (single comment) |
| T-007 | `[ ]` | Build CommentThread component (threaded view) |
| T-008 | `[ ]` | Build CommentInput component (inline composer) |
| T-009 | `[ ]` | Integrate comments into PostCard (inline, no modal) |
| T-010 | `[ ]` | Add infinite scroll for comments |
| T-011 | `[ ]` | Connect @mentions in comment composer |
| T-012 | `[ ]` | Add real-time subscriptions |
| T-013 | `[ ]` | Test permission matrix |
