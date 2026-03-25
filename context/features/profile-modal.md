# Feature: Profile Modal

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The Profile modal is a platform-level overview of a user's identity and activity. It shows
the user's avatar, full name, a GitHub-style contribution activity map, the list of communities "https://www.assistant-ui.com/heat-graph",
they've joined, and the communities they've created. It is read-only for other members viewing
someone else's profile; the user viewing their own profile can navigate to Settings to edit.

---

## Users

- **Authenticated user viewing their own profile:** Read-only display + link to Settings for edits
- **Authenticated user viewing another member's profile:** Read-only
- **Triggered from:** Top bar (Profile → Profile) for self; member profile card click for others

---

## User Stories

- As a **member**, I want to **see my own profile summary** so that I know how I appear to others in the community.
- As a **member**, I want to **view another member's profile** so that I can learn about them.
- As an **owner**, I want to **see which communities a member has joined or created** so that I can understand their background.

---

## Behaviour

### Profile Modal Layout

**Header:**
- Avatar (large)
- Full display name
- Level badge (current level in the current community — or global? — open question)
- Wilaya

**Contribution Activity Map:**
- A GitHub-style grid (weeks × days) showing activity over the past year "https://www.assistant-ui.com/heat-graph",
- Each cell represents a day; filled/colored cells indicate activity on that day
- Activity definition: TBD (posts created? upvotes given? lessons viewed? — open question)
- Hovering a cell shows: date + activity count

**Communities Section:**
- "Communities I've joined" — list of community names + thumbnails the user is an active member of
- "Communities I've created" — list of communities where the user is an owner

**Footer:**
- "Edit profile" button → closes modal, opens Settings → Profile section (self only)

---

## Edge Cases & Rules

- Viewing another member's profile: "Edit profile" button is hidden
- A user with no communities joined shows an empty state for that section
- Activity map is platform-wide (all communities combined) or community-scoped — open question
- Level badge shown on the profile modal: the user's level in the community where the profile was opened (community-scoped level) — not a global level
- If the user has left or been removed from a community, that community does not appear in "Communities I've joined"

---

## Connections

- **Depends on:** Clerk auth, Convex `users` table, `memberships` table
- **Triggers:** Settings modal (via "Edit profile" button)
- **Shares data with:** Members tab (same member data), Community feed (post activity for activity map), Leaderboard (level badge)

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|---|---|---|
| Activity map data | Post activity or basic engagement | Multi-signal (posts, comments, lessons, upvotes) |
| Communities list | Names + thumbnails | Click to navigate to that community |
| Direct message | Not in v1 | "Message" button on other users' profiles |
| Badges / achievements | Not in v1 | Earned badges displayed on profile |
| Profile visibility | Always visible to all community members | Privacy settings |

---

## Security Considerations

- Profile modal only shows non-sensitive fields: name, level, Wilaya, community list, activity map
- Email and phone number are never shown in the profile modal
- "Communities I've joined" list is filtered to only show communities — never exposes private community membership to someone outside those communities (TBD: should this list be visible cross-community?)
- All profile data is fetched with a valid Clerk JWT

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[ ]` | Build Profile modal layout (avatar, name, level, wilaya, activity map, communities) |
| T— | `[ ]` | Build contribution activity map component (GitHub-style grid, hover tooltip) |
| T— | `[ ]` | Convex query: `getUserProfile` — returns profile data + communities joined/created |
| T— | `[ ]` | Convex query: `getUserActivity` — returns daily activity counts for the past year |
| T— | `[ ]` | Wire "Edit profile" button to open Settings modal at Profile section (self only) |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] What counts as "activity" for the contribution activity map — posts only, or posts + comments + upvotes given + lessons completed?
- [ ] Is the activity map platform-wide (all communities combined) or scoped to the current community?
- [ ] Is the level badge on the Profile modal the user's level in the current community or a global level?
- [ ] Is the "Communities I've joined" list visible to other members, or only to the user themselves?
