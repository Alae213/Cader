# Feature: Classrooms

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

Classrooms are the structured learning layer inside a community. Each classroom has a clear
starting point, a clear outcome, and a logical path in between. Inside a classroom, modules
act as folders containing pages (lessons). Each lesson hosts rich text, video embeds, PDFs,
and other files. The owner builds content using a `/` command editor. Members consume content
at their own pace with progress tracked per page viewed.

Each classroom has an independent access model: open to all members, level-gated, price-gated,
or both. A free community can contain paid classrooms.

---

## Users

- **Owner / Admin:** Creates classrooms, builds module/page tree, edits lesson content, configures access rules
- **Member (with access):** Views classroom grid, enters classroom viewer, consumes lessons, tracks progress
- **Member (without access):** Sees classroom card with locked state + access gate overlay

---

## User Stories

- As an **owner**, I want to **create classrooms with modules and pages** so that I can structure my knowledge into a clear learning path.
- As an **owner**, I want to **set different access rules per classroom** so that I can mix free and paid content in one community.
- As a **member**, I want to **see my progress through a classroom** so that I know where I am and what's next.
- As a **member**, I want to **see which classrooms I can access and which are locked** so that I understand what I've earned or need to pay for.

---

## Behaviour

### Classroom Grid

- Displays all classrooms in a grid of cards (3 col)
- Each card: thumbnail + title + progress bar (% of pages viewed)
- Owner sees ALL classrooms
- Member sees only classrooms they have access to, plus locked cards for the rest
- Locked card shows the access gate indicator (lock icon + "Level X" or price)
- Owner sees a "+" add card at the end of the grid

### Create Classroom Modal (Owner)

1. Owner clicks "+" card
2. Modal opens: classroom title, thumbnail, access rule (open / level-gated / price-gated / both), DZD price (if price-gated), minimum level (if level-gated)
3. On save: new classroom appears in grid with empty module tree

### Classroom Viewer

Layout:
- **Left sidebar:** Chapters / page tree
  - Chapters displayed as bolded folders 
  - Pages inside Chapters as indented items
  - Completed pages have a checkmark
  - Current page is highlighted
  - "add chapter folder" button blow left sidebar
- **Right content panel:** Lesson content

Navigation:
- Clicking a page in the sidebar loads it in the right panel
- "Next lesson" button at the bottom of each page navigates to the next page in the tree
- "Back" button direct to modals grid , the button in left top
- Progress auto-marked when a page is viewed (writes to `lessonProgress` table)

### Lesson Content (Owner Edit Mode)

Owner edits via `/` command menu (slash command):
- `/text` — paragraph block
- `/heading` — H2 or H3
- `/bullet` — bullet list
- `/numbered` — numbered list
- `/video` — video embed (YouTube / Vimeo / Google Drive URL)
- `/file` — file attachment (PDF, ZIP, etc. — stored in Convex file storage)
- `/divider` — horizontal rule
- `/callout` — highlighted callout block
- /image --- upload image from device

Changes auto-save on blur or after a short debounce.

### Lesson Content (Member View)

- Read-only , smart rendering of all blocks
- Video embeds are iframes (YouTube / Vimeo / GDrive)
- Files show as download links
- No editing controls visible

### Progress Tracking

- Each page view is recorded in `lessonProgress` (userId, pageId, classroomId, viewedAt)
- Progress % = pages viewed / total pages in classroom
- Progress bar visible on classroom card (grid) and in classroom viewer header
- Convex `useQuery` keeps progress live

### Access Gate Overlay

Shown when a member clicks a locked classroom card:

- **Level-gated:** "Reach level [X] to unlock this classroom"
  - Shows current member level vs required level
- **Price-gated:** "Purchase this classroom — [price] DZD" + "Buy now" button
- **Level + price:** Level requirement shown first. Payment CTA only shown once level is met (EC-6).
- **Free (community membership required):** This case only shows if somehow a non-member reaches the grid — should not happen (tab is auth + membership gated).

---

## Classroom Access Model

| Access type | Condition |
|---|---|
| Open | Any active community member can access |
| Level-gated | Member's current level ≥ classroom's `minLevel` |
| Price-gated | Member has a `classroomAccess` record for this classroom |
| Level + price | Both level ≥ `minLevel` AND `classroomAccess` record exists |

Access is evaluated on every load — not cached client-side. See EC-6 and EC-13.

---

## Edge Cases & Rules

- **EC-6 (level+price):** Level is checked before payment is offered. A member who pays without the level cannot bypass the level check — the access gate still shows "Reach level X".
- Progress is per-user per-classroom — if two members are in the same classroom, their progress is independent.
- Deleting a page while a member is viewing it: the content disappears on next load; progress record for that page is soft-deleted or ignored.
- A classroom with zero pages is valid (owner can create and add content later).
- Module tree drag-and-drop reordering is deferred to v1.1.
- The "Start Here" course is a regular classroom marked as the onboarding course — it appears first in the grid for new members and is auto-assigned as free access.

---

## Connections

- **Depends on:** Active community membership (tab is membership-gated), Chargily integration (price-gated classroom payment), Leaderboard/gamification (level threshold for level-gated access)
- **Triggers:** Chargily checkout (price-gated access), `lessonProgress` write (on page view), `classroomAccess` write (on payment webhook)
- **Shares data with:** Leaderboard (level derived from points), Members tab (member's classroom progress visible to owner)

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|---|---|---|
| Editor | Slash command (`/`) block editor | Full rich text + drag-and-drop blocks |
| Module reorder | Manual (fixed order) | Drag-and-drop reorder |
| Progress | Per-page view | Per-page view + quiz completion |
| Quizzes | Not in v1 | Multiple choice quizzes with pass/fail |
| Certificates | Not in v1 | Completion certificates |
| Comments per lesson | Not in v1 | Lesson-level comments |
| Offline access | Not supported | Download for offline |

---

## Security Considerations

- Classroom content is only served to users with a valid access record (server-side check).
- File attachments: validate MIME type and size server-side; serve via Convex storage (not directly from filesystem).
- Video embed URLs sanitized before rendering to prevent XSS.
- Owner-only mutations (create/edit/delete classroom, module, page) have server-side admin role check.
- Price-gated access is granted only via the Chargily webhook — never by client assertion.

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[ ]` | Create Convex schema: `classrooms` (communityId, title, thumbnail, accessType, minLevel, priceInDZD, isOnboarding) |
| T— | `[ ]` | Create Convex schema: `modules` (classroomId, title, order) |
| T— | `[ ]` | Create Convex schema: `pages` (moduleId, classroomId, title, content, order) |
| T— | `[ ]` | Create Convex schema: `lessonProgress` (userId, pageId, classroomId, viewedAt) |
| T— | `[ ]` | Create Convex schema: `classroomAccess` (userId, classroomId, grantedAt) |
| T— | `[ ]` | Convex query: `listClassrooms` — returns classrooms with member's access status |
| T— | `[ ]` | Convex query: `getClassroomContent` — returns module/page tree + lesson content |
| T— | `[ ]` | Convex mutation: `markPageViewed` — writes to `lessonProgress`, idempotent |
| T— | `[ ]` | Convex mutation: `createClassroom` / `updateClassroom` / `deleteClassroom` (admin only) |
| T— | `[ ]` | Convex mutation: `createModule` / `createPage` / `updatePageContent` (admin only) |
| T— | `[ ]` | Build classroom grid with progress bars |
| T— | `[ ]` | Build classroom viewer (left sidebar tree + right content panel) |
| T— | `[ ]` | Build slash command (`/`) editor for lesson content (owner mode) |
| T— | `[ ]` | Build lesson content read-only renderer (member mode) |
| T— | `[ ]` | Build access gate overlay (level-gated + price-gated + combined) |
| T— | `[ ]` | Build create classroom modal (owner) |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] What block types are required in the slash command editor for v1?
- [ ] Is there a maximum number of modules or pages per classroom?
- [ ] Is the "Start Here" course auto-assigned to new members, or does the owner manually mark a classroom as the onboarding course?
- [ ] Can the owner reorder modules/pages in v1 (even without drag-and-drop — e.g. up/down arrows)?
