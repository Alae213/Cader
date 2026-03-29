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
- Community thumbnail (16:9 image with upload + inline crop)
- Community title
- Short description (200 char limit, auto-save after 1.5s)
- 3 Link inputs (icon + URL, empty = hidden for non-owners)
- Stats matrix: total members / online now / current streak (numbers only, no icons, separator lines)
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

**Left Column:**
1. Owner clicks on the video embed → URL input appears in place
2. Owner pastes a YouTube/Vimeo/Google Drive URL → embed updates on save
3. Owner clicks on the rich text body → enters rich text editing mode
4. Changes auto-save on blur (focus leaves the field)

**Right Column - Thumbnail:**
1. Owner hovers on thumbnail → upload button appears in center
2. Owner clicks upload → file picker opens (JPG, PNG, WebP only)
3. Platform checks: file size ≤2MB, valid image format
4. If valid → enters crop mode with zoom/pan controls
5. Owner drags image to position the 16:9 crop area
6. Owner clicks outside image → crop saved, thumbnail updated

**Right Column - Short Description:**
1. Click to edit inline
2. Character limit: 200 chars (counter shown)
3. Auto-save after 1.5s of no typing
4. If empty → hidden for non-owners (no placeholder shown)

**Right Column - Link Inputs:**
1. 3 separate input fields with link icon
2. Click to edit, auto-save on blur
3. If empty → hidden for non-owners (completely removed from layout)

**Right Column - Edit Community Button:**
1. Opens EditCommunityModal (not CreateCommunityModal)
2. Modal has 2 tabs: "Basic" and "Pricing"
3. No Next/Back buttons - free tab switching
4. Save button at bottom
5. Clicking outside closes modal with "unsaved changes" toast (if dirty)
6. Pre-populated with current community data 

### Stats Matrix
- **Members:** total count of active members (from `memberships` where `status = active`)
- **Online:** members who have been active in the last 30 minutes (approximate, not real-time critical)
- **Streak:** count consecutive days where members in community
- **Layout:** Numbers only, no icons, separated by vertical lines

### EditCommunityModal

**Layout:**
- Dialog/Modal with 2 tabs at top: "Basic" and "Pricing"
- No Next/Back buttons - free navigation between tabs
- Save button at bottom (fixed position)

**Basic Tab:**
- Community Name (required)
- Community URL/Slug (required, real-time availability check)
- Pre-populated with current values on open

**Pricing Tab:**
- Pricing Type (free/monthly/annual/one_time)
- Price (if not free)
- Chargily API Key (if not free)
- Chargily Webhook Secret (if not free)
- Wilaya (optional)

**Validation Rules:**
- Validate slug availability on blur (real-time)
- Re-check slug one final time when Save button is clicked (before enabling)
- Validate Chargily keys on blur (immediate error)
- If slug unavailable or keys invalid → Save button disabled

**Save Behavior:**
- Show spinner on Save button while saving
- Disable tabs while saving
- Disable outside click warning while saving
- On success: close modal, show success toast, refresh data
- On failure: keep modal open, clear sensitive fields (API keys), show error toast

**Edge Cases:**
- If user changed fields but clicks outside → show "You have unsaved changes" toast
- If data was changed by another user → show warning, offer to reload
- On modal close → reset form state to empty
- Send `null` for optional empty fields

---

## Edge Cases & Rules

- Video URL validation: accepted formats are YouTube (`youtube.com/watch?v=`, `youtu.be/`), Vimeo (`vimeo.com/`), Google Drive (`drive.google.com/`). Invalid URLs show an inline error on blur.
- If no video is set, the left column shows a placeholder with a prompt for the owner ("+").
- If no rich text is set, the left column shows a placeholder ("press / for commends").
- **Thumbnail upload:** Max 2MB, accepted formats: JPG, PNG, WebP. Platform validates size and format before allowing crop. Crop enforced to 16:9 aspect ratio with zoom/pan controls.
- **Short description:** 200 character limit, auto-save after 1.5s of inactivity. If empty → hidden for non-owners.
- **Link inputs:** 3 fields with link icon. If all empty → hidden for non-owners. If partial → show only filled links.
- **Stats matrix:** Numbers only, no icons, separated by vertical lines.
- The Join button is hidden if the viewer is already a member or an admin of this community.
- The Edit community button opens the EditCommunityModal (not CreateCommunityModal) in edit mode.
- Stats are live via Convex `useQuery` — no page refresh needed.
- The About tab is the default tab for unauthenticated visitors regardless of localStorage state (EC-13).

---

## Connections

- **Depends on:** Community creation (community record must exist), Clerk auth (to determine view state), Convex mutations for inline editing
- **Triggers:** Onboarding modal (when Join is clicked), EditCommunityModal (when Edit community is clicked)
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
| T32 | `[x]` | Create QuickInfoCard component (Right column as separate component) |
| T33 | `[x]` | Build ThumbnailUpload with upload + crop (zoom/pan) - 16:9, 2MB limit |
| T34 | `[x]` | Build ShortDescription inline edit (200 char, 1.5s auto-save) |
| T35 | `[x]` | Build 3 Link inputs (icon + URL, empty = hidden) |
| T36 | `[x]` | Update StatsMatrix (remove icons, use separator lines) |
| T37 | `[x]` | Create EditCommunityModal (2 tabs: Basic/Pricing, free nav, pre-populated) |
| T38 | `[x]` | Add updateCommunity Convex mutation (partial updates) |
| T39 | `[x]` | Add slug re-check on Save button click |

---

## User Acceptance Tests

**UAT Status:** `passed`
**Last tested:** March 2026
**Outcome:** All tasks completed — QuickInfoCard with thumbnail upload + crop, ShortDescription inline edit, 3 LinkInputs, StatsMatrix without icons, EditCommunityModal with 2 tabs, free navigation, pre-populated fields.

---
