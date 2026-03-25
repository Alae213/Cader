# Feature: About Tab

> **Status:** `complete`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The About tab is the public face of every community. It is the only content visible to
unauthenticated visitors and authenticated non-members. It functions as a landing page for the
community — the creator's pitch to potential members. It contains a video/VSL embed, a rich
text description, links, member stats, and a Join button. The owner can edit all content inline
without leaving the page.

---

## Users

- **Public visitor (unauthenticated):** Reads About, sees Join button
- **Authenticated non-member:** Same as public visitor — sees Join button, no top bar
- **Member:** Read-only About tab with no Join button
- **Owner / Admin:** Same as member + inline editing + Edit community button

---

## User Stories

- As a **visitor**, I want to **see what a community is about before joining** so that I can decide if it's worth my time and money.
- As a **visitor**, I want to **click Join and get through the process smoothly** so that I can start learning quickly.
- As an **owner**, I want to **edit my community description directly on the page** so that I don't have to navigate to a settings screen.
- As an **owner**, I want to **embed a video** so that I can pitch my community with a VSL (video sales letter).

---

## Behaviour

### Layout

**Left column:**
- Video embed (YouTube / Vimeo / Google Drive URL) — full width of left column
- owner profile(Avtar + full name) + Members count + Price -- below the video
- Rich text description below .

**Right column (top to bottom):**
- Community thumbnail (image)
- Community title
- Community link
- Short description
- Links (website, social, etc.)
- Stats matrix: total members / online now / current streak (days)
- Join button (visible to visitors and non-members only)
- Edit community button (visible to owner/admin only — at bottom of right section)

### Public / Non-member View
- The full About tab is rendered without auth
- Top bar contain Only logo on left and placeholder avatar on right 
- tab navigation are **not rendered** — hidden entirely
- Join button is visible and functional

### Member View
- Top bar and tabs are rendered (user is authenticated and a member)
- About tab is read-only — no editing controls
- Join button is hidden

### Owner / Admin View
- Same as member view, plus:
- Left column content (video URL, rich text): click to edit inline, auto-save on blur
- Right column content (thumbnail, title, tagline, links): click to edit inline + edit button that opens the community creation modal at step 1+2 .
- "Edit community" button at bottom of right column

### Inline Editing (Owner)
1. Owner clicks on the video embed → URL input appears in place
2. Owner pastes a YouTube/Vimeo/Google Drive URL → embed updates on save
3. Owner clicks on the rich text body → enters rich text editing mode
4. Changes auto-save on blur (focus leaves the field)
5. Right column fields (title, tagline, links): same click-to-edit pattern
6. Thumbnail: hover thumbnail → show small upload button → file upload 

### Stats Matrix
- **Members:** total count of active members (from `memberships` where `status = active`)
- **Online:** members who have been active in the last 30 minutes (approximate, not real-time critical)
- **Streak:** count consecutive days where members in community

---

## Edge Cases & Rules

- Video URL validation: accepted formats are YouTube (`youtube.com/watch?v=`, `youtu.be/`), Vimeo (`vimeo.com/`), Google Drive (`drive.google.com/`). Invalid URLs show an inline error on blur.
- If no video is set, the left column shows a placeholder with a prompt for the owner ("+").
- If no rich text is set, the left column shows a placeholder ("press / for commends").
- The Join button is hidden if the viewer is already a member or an admin of this community.
- The Edit community button opens the creation modal in edit mode, pre-filling all current values.
- Stats are live via Convex `useQuery` — no page refresh needed.
- The About tab is the default tab for unauthenticated visitors regardless of localStorage state (EC-13).

---

## Connections

- **Depends on:** Community creation (community record must exist), Clerk auth (to determine view state)
- **Triggers:** Onboarding modal (when Join is clicked), Community creation modal (when Edit community is clicked)
- **Shares data with:** Members tab (member count), Leaderboard (streak data — TBD)

---

## MVP

| Aspect    | MVP (v1)                                         |
| --------- | ------------------------------------------------ |
| Video     | Single embed URL                                 |
| Rich text | Full block editor ,use Notion style "/" commands |
| Stats     | Members + online + streak                        |
| Links     | Up to 5 links                                    |
| Thumbnail | Static image                                     |

---

## Security Considerations

- Video embed URLs are sanitized before rendering to prevent XSS via malformed embed iframes.
- Rich text content is sanitized on save (server-side) before being stored in Convex.
- Only owners/admins can trigger the inline edit mutations — server-side role check on every mutation.
- File uploads (thumbnail) are validated by type and size server-side before storage.

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T30 | `[x]` | Convex query: `getCommunity` — returns all About tab fields for a given slug |
| T26 | `[x]` | Build About tab layout (two-column, responsive) |
| T27 | `[x]` | Build video embed component (YouTube / Vimeo / GDrive URL → iframe) with URL validation |
| T29 | `[x]` | Build inline edit mode for owner (click-to-edit, auto-save on blur) |
| T28 | `[x]` | Build stats matrix (members count, online count, streak) via live Convex query |
| T— | `[x]` | Build Join button (triggers onboarding modal; hidden for members/owners) |
| T— | `[x]` | Build "Edit community" button (opens creation modal in edit mode) |
| T31 | `[x]` | Ensure top bar + tabs are hidden for unauthenticated visitors and non-members |

---

## User Acceptance Tests

**UAT Status:** `passed`
**Last tested:** March 2026
**Outcome:** All tasks completed — inline editing, video embed, stats matrix, public view all working. CreateCommunityModal updated to be reusable for editing.

---
