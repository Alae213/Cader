# Feature: Profile Panel

> **Status:** `active`
> **Phase:** v1
> **Last updated:** April 2026

---

## Summary

The Profile Panel is a **right-side slide-out drawer** that shows a user's full profile. It replaces the old ProfileModal. It supports two modes:

- **Self profile** — triggered from TopBar avatar dropdown (Profile menu item). Shows all profile data + inline editing.
- **Other user's profile** — triggered from Leaderboard avatar click, Feed post author click, or Members tab. Read-only view.

---

## Users

- **Authenticated user viewing their own profile:** Full profile + inline editing (displayName, bio, wilaya, profile image)
- **Authenticated user viewing another member's profile:** Read-only display
- **Triggered from:** TopBar (Profile → Profile) for self; Leaderboard/Feed/Members avatar click for others

---

## User Stories

- As a **member**, I want to **see my own profile summary** so that I know how I appear to others.
- As a **member**, I want to **view another member's profile** so that I can learn about them.
- As a **member**, I want to **edit my profile inline** without navigating away.
- As an **owner**, I want to **see which communities a member has joined or created** so that I can understand their background.

---

## Behaviour

### Panel Layout (right-side slide-out, 384px wide)

**Header:**
- Close button (X)
- Title: "Profile" (self) or user's display name (others)

**Profile Card:**
- Avatar (large, 80px) — clickable to change profile image (self only)
- Display name (editable inline for self)
- Level badge (community-scoped level from pointEvents)
- Total points
- Join date
- Bio (max 160 chars, editable inline for self)
- Wilaya (58 Algerian options, editable inline for self)

**Contribution Activity Map:**
- GitHub-style grid (weeks × days) showing activity over the past year
- Each cell represents a day; filled/colored cells indicate activity
- Activity signals: posts, comments, upvotes, lesson completions, streak days
- Hovering a cell shows: date + activity count
- Horizontally scrollable

**Communities Section:**
- "Communities Joined" — list of community names + thumbnails
- "Communities Created" — list of communities where user is owner
- Clicking a community opens it in a **new browser tab** and closes the panel

**Edit Behavior (self only):**
- No "Edit Profile" button — editing is inline
- Auto-save on: 1.5s debounce of no typing, blur, or Enter key
- "Change Profile Image" button → opens Clerk's UserProfile modal

**Footer:**
- None (no edit button)

---

## Edge Cases & Rules

| Edge Case | Rule |
|-----------|------|
| Viewing another member's profile | All edit UI is hidden |
| User has no communities | Shows "No communities yet" empty state |
| Activity map is platform-wide | All communities combined (not scoped) |
| Level badge | Community-scoped: user's level in the current community |
| User has left/been removed | Community doesn't appear in "Communities Joined" |
| Deleted user viewing | Shows "Deleted User" with grayed avatar |
| Panel open + navigate communities | Panel closes on navigation |
| Unsaved changes on close | Warn with confirm dialog |
| Clerk profile image change | Opens Clerk's `<UserProfile />` modal |
| Auto-save race condition | Single setTimeout ref, cleared on unmount/new input |

---

## Connections

- **Depends on:** Clerk auth, Convex `users` table, `memberships` table, `pointEvents` table
- **Replaces:** ProfileModal.tsx (deleted)
- **Shares data with:** Members tab, Community feed, Leaderboard
- **Triggers:** Clerk UserProfile modal (for image change)

---

## MVP vs Full Version

| Aspect                | MVP (v1)                                         | Full Version                                     |
| --------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Activity map data     | All signals (posts, comments, upvotes, lessons, streaks) | Same |
| Communities list      | Names + thumbnails, open in new tab              | Click to navigate in same tab |
| Direct message        | Not in v1                                        | "Message" button on other users' profiles        |
| Badges / achievements | Not in v1                                        | Earned badges displayed on profile               |
| Profile visibility    | Always visible to all community members          | Privacy settings                                 |

---

## Security Considerations

- Profile panel only shows non-sensitive fields: name, level, bio, wilaya, community list, activity map
- Email and phone number are never shown
- "Communities Joined" list is filtered to only show communities the user is actually in
- Inline editing is gated by `isOwnProfile` check (Clerk ID comparison)
- All profile data is fetched with a valid Clerk JWT

---

## Tasks

| Task # | Status | What needs to be done                                                              |
| ------ | ------ | ---------------------------------------------------------------------------------- |
| T-PP-001 | `[ ]` | Expand getUserActivity to include all signals (upvotes, lessons, streaks)          |
| T-PP-002 | `[ ]` | Add bio field to users schema (max 160 chars)                                      |
| T-PP-003 | `[ ]` | Update updateUserProfile mutation to accept bio                                    |
| T-PP-004 | `[ ]` | Add wilaya field to users schema (restore from deprecated)                         |
| T-PP-005 | `[ ]` | Update updateUserProfile mutation to accept wilaya                                 |
| T-PP-006 | `[ ]` | Rewrite ProfilePanel to accept userId prop (Clerk ID) — support self + others      |
| T-PP-007 | `[ ]` | Add activity map (GitHub-style grid) to ProfilePanel                               |
| T-PP-008 | `[ ]` | Add communities section to ProfilePanel                                            |
| T-PP-009 | `[ ]` | Add inline editing with auto-save (1.5s debounce + blur + Enter)                   |
| T-PP-010 | `[ ]` | Add "Change profile image" button (Clerk UserProfile modal)                        |
| T-PP-011 | `[ ]` | Hide edit UI when viewing other users                                              |
| T-PP-012 | `[ ]` | Handle deleted user display ("Deleted User" placeholder)                           |
| T-PP-013 | `[ ]` | Wire LeaderboardTab avatar click → open ProfilePanel                               |
| T-PP-014 | `[ ]` | Wire FeedTab post author click → open ProfilePanel                                 |
| T-PP-015 | `[ ]` | Delete ProfileModal.tsx entirely                                                   |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [x] What counts as "activity"? — **Answer:** All signals: posts, comments, upvotes, lesson completions, streak days
- [x] Is the activity map platform-wide or community-scoped? — **Answer:** Platform-wide (all communities combined)
- [x] Is the level badge community-scoped or global? — **Answer:** Community-scoped (level in current community)
- [x] Is "Communities Joined" visible to other members? — **Answer:** Yes, always visible to all community members
