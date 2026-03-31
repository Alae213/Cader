# Feature: Community Feed

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The Community tab is the social heart of every community. It is a chronological (or ranked) feed of posts from members and the owner. Posts support text, images, video embeds, GIFs, and polls. Members interact via inline threaded comments (Whop/Reddit style), @mentions, and upvotes. The owner can define post categories, pin posts, and delete any content. Upvotes award points that feed into the gamification/leaderboard system.

**Key Design Change:** Comments are inline below posts (no modal), threaded 2 levels deep, like Whop/Reddit.

---

## Users

- **Owner / Admin:** Full control — post, comment, pin, delete, define categories
- **Member:** Post, comment, @mention, upvote (cannot pin or delete others' content)
- **Visitor / non-member:** No access — Community tab is hidden

---

## User Stories

- As a **member**, I want to **post text, images, videos, and polls** so that I can share knowledge and start conversations.
- As a **member**, I want to **see comments inline below posts** so I can read the conversation without opening a modal.
- As a **member**, I want to **reply to comments** creating threaded replies (2 levels deep).
- As a **member**, I want to **@mention someone** so that they are notified of my post or comment.
- As a **member**, I want to **upvote posts and comments** so that good content rises and I earn points.
- As an **owner**, I want to **pin posts** so that announcements always stay visible at the top.
- As an **owner**, I want to **define categories** so that members can filter content by topic.
- As an **owner/admin**, I want to **delete any comment** so I can moderate the community.
- As a **post author**, I want to **delete any comment on my post** so I can moderate my content.

---

## UI/UX Specification (Whop-Inspired)

### Layout Structure

```
┌─────────────────────────────────────────┐
│ Post Composer                           │
│ (expanded when clicked)                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Post Card                               │
│ ┌─────────────────────────────────────┐ │
│ │ Header: Avatar + Name + [Level X]   │ │
│ │           + @username + timestamp  │ │
│ ├─────────────────────────────────────┤ │
│ │ Category Tag (if set)              │ │
│ ├─────────────────────────────────────┤ │
│ │ Content: Text / Media / Poll       │ │
│ ├─────────────────────────────────────┤ │
│ │ Footer: [Upvote] [Comment] [Share] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Comments Section (inline)                │
│ ┌─────────────────────────────────────┐ │
│ │ Comment 1                           │ │
│ │   └─ Comment 1.1 (reply, indented)  │ │
│ │   └─ Comment 1.2 (reply, indented) │ │
│ │ Comment 2                           │ │
│ │   └─ Comment 2.1 (reply, indented) │ │
│ │ [Load More Comments]                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Comment Input                       │ │
│ │ [Avatar] [Write a comment...]       │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Visual Design (per DESIGN_SYSTEM.md)

- **No borders** - use surface hierarchy
- **Rounded corners** - `rounded-2xl` (32px) for post containers
- **Post background** - `bg-bg-elevated`
- **Hover state** - `hover:bg-bg-muted/50`
- **Pinned posts** - Blue left border (`border-l-4 border-blue-500`) + pin icon badge

### Spacing (per DESIGN_SYSTEM.md)

| Element | Spacing |
|---------|---------|
| Post container padding | `p-5` (20px) |
| Post to comments | `mt-4` (16px) |
| Comment padding | `p-3` (12px) |
| Top-level indent | `pl-0` |
| Level-2 indent desktop | `pl-8` (32px) |
| Level-2 indent mobile | `pl-4` (16px) |
| Between comments | `gap-2` (8px) |
| Avatar to content | `gap-3` (12px) |

### Components

#### PostCard
- Avatar (40px)
- Author name + level badge "[Level X]"
- @username (if available)
- Timestamp ("2h ago")
- Category tag (if set)
- Content (text/media/poll)
- Actions: Upvote + count, Comment + count, Share
- Pin indicator (if pinned)
- Three-dot menu (delete, pin/unpin)

#### Comment Component
- Avatar (32px)
- Author name + level badge "[Level X]"
- @username
- Timestamp ("2h ago")
- Comment content
- Actions: Upvote + count, Reply (if level < 2)
- Three-dot menu (delete if author/admin/post-author)

#### Comment Input
- Avatar (32px) + text input
- Plain text only
- Image/GIF attachments support
- @mentions support (autocomplete)
- "Write a comment..." placeholder

---

## Functionality Specification

### Post Composer
1. Member clicks the composer bar → expands inline
2. Post types available:
   - **Text** — plain text
   - **Image** — file upload (stored in Convex)
   - **Video embed** — YouTube / Vimeo / Google Drive URL
   - **GIF** — URL input
   - **Poll** — question + 2-4 options
3. Category selector (optional)
4. @mentions autocomplete
5. Submit → post appears in real-time

### Comments (Inline, No Modal)
- **Threaded**: top-level comments + replies (2 levels max)
- **Sorting**: Top (most upvotes)
- **Pagination**: Initial 5, infinite scroll 5 more
- **No empty state**: Don't show "Be the first to comment"
- **Inline input**: At bottom of comments section

### Comment Actions
- **Upvote**: Toggle, real-time count, awards points
- **Reply**: Opens inline reply input below comment
- **Delete**: Post author or admin/owner only

### @Mentions
- Works in post composer AND comment composer
- Autocomplete: avatar + name + level badge
- Max 20 mentions per post/comment
- Triggers notification in real-time

### Upvotes
- One upvote per member per post/comment (toggle)
- Awards 1 point to author (per gamification rules)
- Real-time count via Convex live query
- Points awarded in real-time (optimistic UI)

### Pinned Posts
- Blue border + pin icon badge
- Appear at top of feed
- Max 3 pinned per community

---

## Data Model

### Posts (existing or update)
```typescript
{
  _id: string;
  communityId: string;
  authorId: string;
  author: {
    _id: string;
    displayName: string;
    avatarUrl?: string;
    username?: string;
  };
  categoryId?: string;
  content: string;
  contentType: "text" | "image" | "video" | "gif" | "poll";
  mediaUrls?: string[];
  videoUrl?: string;
  pollOptions?: { text: string; votes: number }[];
  isPinned: boolean;
  upvoteCount: number;
  commentCount: number;
  createdAt: number;
}
```

### Comments (new)
```typescript
{
  _id: string;
  postId: string;
  parentId?: string; // null for top-level
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
}
```

---

## Gamification Integration

Per `leaderboard-gamification.md`:
- Post creation: +2 points (if visible 10+ min)
- Comment creation: +1 point (if 20+ chars, visible 2+ min)
- Post upvote received: +1 point
- Comment upvote received: +1 point
- All points awarded in real-time (optimistic UI)

Level badges shown on:
- Post author
- Comment author

Badge format: `[Level X]` (e.g., `[Level 3]`)

---

## Integration with @Mentions

Per `mentions.md`:
- Autocomplete in post composer AND comment composer
- Shows: avatar, name, level badge
- Max 20 mentions per post/comment
- Notification sent in real-time

---

## Edge Cases

1. **Comment nesting**: After level 2, show "Reply to [username]" link
2. **Deleted comment**: Remove entirely from UI
3. **Deleted post**: Cascade delete comments
4. **Rapid upvotes**: Debounce to prevent spam
5. **Empty comment**: Validate min 1 character

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full |
|--------|----------|------|
| Post types | Text, image, video embed, GIF, poll | + Audio, files |
| Comment depth | 2 levels | Unlimited |
| Comment editing | No | Yes |
| Comment sorting | Top only | Top/Newest/Oldest |
| Rich text | No | Yes |
| @mentions | Basic autocomplete | @everyone, @role |

---

## Security Considerations

- Content sanitized server-side (prevent XSS)
- Image uploads: validate MIME, 10MB limit server-side
- Delete: server-side permission check (author or admin)
- Upvote: idempotency check per (userId, targetId)
- @mention: scoped to community members only
- Rate limiting: max 20 posts/hour, max 60 comments/hour

---

## Tasks

See TASK-LIST.md for implementation tasks (Phase: Inline Comments Redesign).

---

## Open Questions

- [x] What is the maximum number of pinned posts? → **3**
- [x] Feed sort? → **Pinned first, then by selected sort (newest/most liked/most commented)**
- [x] Comments inline or modal? → **Inline (Whop/Reddit style)**
- [x] Comment nesting depth? → **2 levels**
- [x] Mobile indentation? → **Less than desktop (pl-4 vs pl-8)**
