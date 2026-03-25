# Feature: Pin Post

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

Pin Post allows community owners and admins to pin important posts to the top of the community feed. Pinned posts remain visible at the top regardless of chronological order, ensuring announcements and critical information are always seen by members. Maximum 3 pinned posts per community.

---

## Users

- **Owner / Admin:** Can pin and unpin posts
- **Member:** Can view pinned posts (cannot pin/unpin)
- **Visitor / non-member:** No access (Community tab hidden)

---

## User Stories

- As an **owner**, I want to **pin important posts** so that announcements stay visible at the top.
- As an **owner**, I want to **unpin posts** so that I can manage what's highlighted.
- As an **member**, I want to **see pinned posts first** so that I don't miss important updates.

---

## Behaviour

### Pinning a Post

1. Owner/admin clicks the three-dot menu on a post card
2. "Pin to top" option appears (only for admin users)
3. Click "Pin to top"
4. Post moves to the pinned section at the top of feed
5. Pin indicator (pin icon) appears on the post card
6. Toast notification: "Post pinned to top"

### Unpinning a Post

1. Owner/admin clicks the three-dot menu on a pinned post
2. "Unpin from top" option appears (replaces "Pin to top")
3. Click "Unpin from top"
4. Post returns to chronological position in feed
5. Pin indicator removed
6. Toast notification: "Post unpinned"

### Feed Display Order

```
┌─────────────────────────────────┐
│ 📌 Pinned Posts                 │
│ ┌─────────────────────────────┐ │
│ │ Pinned Post 1               │ │
│ ├─────────────────────────────┤ │
│ │ Pinned Post 2               │ │
│ └─────────────────────────────┘ │
│                                 │
│ Recent Posts                    │
│ ┌─────────────────────────────┐ │
│ │ Regular Post 1 (newest)     │ │
│ ├─────────────────────────────┤ │
│ │ Regular Post 2              │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Pin Limit

- Maximum **3 pinned posts** per community
- When limit reached, "Pin to top" option is disabled with tooltip: "Maximum 3 pinned posts reached. Unpin one first."

---

### Edge Cases & Rules

- Only admin users see the "Pin to top" option in the three-dot menu
- Pinned posts maintain their position even when new posts are added
- If a pinned post is deleted, it's automatically unpinned
- Pin limit (3) is enforced server-side, not just client-side
- Unpinning a post returns it to its original chronological position
- Pin state persists across sessions and page reloads

---

## Connections

- **Depends on:** Community Feed (posts must exist), Admin role check
- **Triggers:** Feed re-ordering (pinned section renders separately)
- **Shares data with:** Community Feed (pin indicator on post card), Post card (three-dot menu)

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|---|---|---|
| Pin limit | 3 posts | Configurable by owner |
| Pin duration | Indefinite | Optional auto-unpin after X days |
| Pin notifications | None | Notify members when post is pinned |
| Pin groups | All pins together | Separate pin groups (Announcements, Rules, etc.) |
| Pin highlighting | Pin icon only | Special background/border styling |

---

## Security Considerations

- Pin/unpin mutations require admin role check server-side
- "Pin to top" option must be hidden from non-admin users via server-side permission check
- Pin limit (3) validated server-side to prevent bypass
- Only posts within the current community can be pinned (communityId validation)

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T-001 | `[ ]` | Add `isPinned` boolean field to `posts` Convex schema |
| T-002 | `[ ]` | Create Convex mutation: `pinPost(postId, communityId)` with admin check and limit validation |
| T-003 | `[ ]` | Create Convex mutation: `unpinPost(postId, communityId)` with admin check |
| T-004 | `[ ]` | Update `listPosts` query to return pinned posts separately and sort non-pinned by createdAt desc |
| T-005 | `[ ]` | Add pin indicator (pin icon) to post card component |
| T-006 | `[ ]` | Add "Pin to top" / "Unpin from top" to post three-dot menu (admin only) |
| T-007 | `[ ]` | Build pinned posts section UI at top of feed |
| T-008 | `[ ]` | Add pin limit check (3 max) with disable tooltip |
| T-009 | `[ ]` | Auto-unpin post when deleted |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] Should pinned posts have a distinct visual style beyond the pin icon (e.g., subtle background)?
- [ ] Should members be notified when a post they interacted with is pinned?
- [ ] Can a member bookmark/save posts in v1, or is pinning only for admins?
