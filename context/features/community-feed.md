# Feature: Community Feed

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The Community tab is the social heart of every community. It is a chronological (or ranked)
feed of posts from members and the owner. Posts support text, images, video embeds, GIFs, and
polls. Members interact via threaded comments, @mentions, and upvotes. The owner can define
post categories, pin posts, and delete any content. Upvotes award points that feed into the
gamification/leaderboard system.

---

## Users

- **Owner / Admin:** Full control — post, comment, pin, delete, define categories
- **Member:** Post, comment, @mention, upvote (cannot pin or delete others' content)
- **Visitor / non-member:** No access — Community tab is hidden

---

## User Stories

- As a **member**, I want to **post text, images, videos, and polls** so that I can share knowledge and start conversations.
- As a **member**, I want to **comment in threads** so that I can engage with other members' posts.
- As a **member**, I want to **@mention someone** so that they are notified of my post or comment.
- As a **member**, I want to **upvote posts** so that good content rises and I earn points.
- As an **owner**, I want to **pin posts** so that announcements always stay visible at the top.
- As an **owner**, I want to **define categories** so that members can filter content by topic.
- As an **owner**, I want to **delete any post or comment** so that I can moderate the community.

---

## Behaviour

### Feed Layout

- Right column: same as About tab (community info, stats, Invite Friend link for members)
- Left/main column: post composer + feed of posts

### Post Composer

1. Member clicks the composer bar
2. "Add post" modal opens
3. Post types available:
   - **Text** — plain text with rich text formatting
   - **Image** — file upload (stored in Convex file storage)
   - **Video embed** — YouTube / Vimeo / Google Drive URL (not file upload)
   - **GIF** — GIF search or URL
   - **Poll** — question + 2–4 options, optional end date
4. Category selector (optional — pick from owner-defined categories)
5. Submit → post appears at top of feed in real time (Convex live query)

### Post Card

Each post shows:
- Author avatar + name + level badge + timestamp
- Post content (text / image / embed / poll)
- Category tag (if set)
- Upvote button + count
- Comment button + count
- Pin indicator (if pinned by owner)
- Three-dot menu (owner: delete + pin; author: delete own post)

### "Open post" Modal

- Clicking a post card opens a modal with the full post
- Full threaded comment thread visible
- Comment composer at the bottom

### Comments

- Threaded: top-level comments + replies (one level deep in v1)
- @mention autocomplete: type `@` to search members
- Comment submit → appears in real time
- Owner / admin can delete any comment
- Author can delete their own comment

### Upvotes

- One upvote per member per post (toggle)
- Upvoting a post: awards 1 point to the post author (written to `pointEvents` table)
- Un-upvoting: writes a -1 event to `pointEvents` (does not delete the original event)
- Real-time count via Convex `useQuery`

### Categories

- Owner defines categories in Settings or inline via a category manager
- Members can filter feed by category
- Posts without a category appear in "All"

### Pinned Posts

- Owner can pin up to 3 posts (suggested limit — TBD in open questions)
- Pinned posts appear at the top of the feed with a pin indicator
- Owner can unpin via the three-dot menu

### Edge Cases & Rules

- Minimum post content: at least one non-empty field (text, image, embed, or poll)
- Poll option minimum: 2 options. Maximum: 4 options.
- Poll voting: one vote per member per poll, cannot change vote after submission
- Image upload size limit: 10MB per image, validated server-side
- Video embed URL validation: same rules as About tab (YouTube / Vimeo / GDrive only)
- @mention notification: in-app notification sent to mentioned user
- Feed updates are real-time via Convex `useQuery` — no manual refresh
- Feed default sort: newest first (chronological). Possible v1.1: hot/trending sort.
- Only members (not visitors or non-members) can see the Community tab

---

## Connections

- **Depends on:** Clerk auth + active membership (required to access tab), Community creation (categoryIds scoped to community)
- **Triggers:** Leaderboard/gamification (upvote → `pointEvents` write), In-app notifications (@mention, comment reply)
- **Shares data with:** Leaderboard (point aggregation), Profile modal (post activity)

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|---|---|---|
| Post types | Text, image, video embed, GIF, poll | + Audio, file attachments |
| Comment depth | 1 level of replies | Multi-level threading |
| Feed sort | Chronological (newest first) | Hot / trending / category-specific |
| Notifications | In-app only | + Email digest |
| Post scheduling | Not supported | Schedule posts in advance |
| Post reactions | Upvote only | Multi-reaction (like, fire, etc.) |
| Media storage | Convex file storage | CDN-backed media storage |

---

## Security Considerations

- Rich text and user-generated content sanitized server-side before storage (prevent XSS).
- Image uploads: validate MIME type by content (not just extension), enforce 10MB limit server-side.
- Delete operations: server-side check that the requesting user is the post author OR an admin of this community.
- Upvote: server-side idempotency check — one upvote event per (userId, postId).
- @mention: only surfaces member usernames within the same community — no cross-community leakage.
- Rate limiting: max 20 posts per member per hour; max 60 comments per member per hour.

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[ ]` | Create Convex schema: `posts` (communityId, authorId, type, content, categoryId, isPinned, createdAt) |
| T— | `[ ]` | Create Convex schema: `comments` (postId, authorId, content, parentCommentId, createdAt) |
| T— | `[ ]` | Create Convex schema: `upvotes` (postId, userId, communityId) |
| T— | `[ ]` | Create Convex schema: `categories` (communityId, name, color) |
| T— | `[ ]` | Convex query: `listPosts` — paginated, filtered by communityId + optional categoryId, live |
| T— | `[ ]` | Convex mutation: `createPost` — validates content, writes post, returns id |
| T— | `[ ]` | Convex mutation: `toggleUpvote` — idempotent, writes to `upvotes` + `pointEvents` |
| T— | `[ ]` | Convex mutation: `createComment` (+ reply) |
| T— | `[ ]` | Convex mutation: `deletePost` / `deleteComment` (auth check: author or admin) |
| T— | `[ ]` | Convex mutation: `pinPost` / `unpinPost` (admin only) |
| T— | `[ ]` | Build post composer UI + "Add post" modal |
| T— | `[ ]` | Build post card component (all post types) |
| T— | `[ ]` | Build "Open post" modal with comment thread |
| T— | `[ ]` | Build @mention autocomplete in comment composer |
| T— | `[ ]` | Build category filter UI |
| T— | `[ ]` | Build poll component (vote, results display) |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] What is the maximum number of pinned posts allowed at once?
- [ ] Is the feed sorted purely by newest-first in v1, or is there a pinned-first then newest-first sort?
- [ ] Are GIFs uploaded as files or loaded via a third-party GIF search API (e.g. Giphy)?
- [ ] What types of in-app notifications exist in v1 (upvote, comment, @mention, new post)?
