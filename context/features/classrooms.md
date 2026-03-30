# Feature: Classrooms

> **Status:** `in_review`
> **Phase:** v1
> **Last updated:** March 30, 2026

---

## Summary

Classrooms are the structured learning layer inside a community. Each classroom has a clear
starting point, a clear outcome, and a logical path in between. Inside a classroom, **chapters**
act as folders containing **lessons**. Each lesson hosts a video embed and plain text description.
Members consume content at their own pace with progress tracked per lesson completion.

Each classroom has an independent access model: open to all members, level-gated, price-gated,
or both. A free community can contain paid classrooms.

---

## Terminology Change (v1.Review)

| Old Term | New Term | Notes |
|----------|----------|-------|
| module | chapter | Renamed throughout codebase |
| page | lesson | Renamed throughout codebase |

---

## Users

- **Owner / Admin:** Creates classrooms, builds chapter/lesson tree, edits lesson content (video + description), configures access rules
- **Member (with access):** Views classroom grid, enters classroom viewer, consumes lessons, tracks progress
- **Member (without access):** Sees classroom card with locked state + access gate overlay

---

## User Stories

- As an **owner**, I want to **create classrooms with chapters and lessons** so that I can structure my knowledge into a clear learning path.
- As an **owner**, I want to **set different access rules per classroom** so that I can mix free and paid content in one community.
- As a **member**, I want to **see my progress through a classroom** so that I know where I am and what's next.
- As a **member**, I want to **see which classrooms I can access and which are locked** so that I understand what I've earned or need to pay for.
- As a **member**, I want to **mark lessons as complete** so that my progress is accurately tracked.

---

## Behaviour

### Classroom Grid

- Displays all classrooms in a grid of cards (3 col)
- Each card: thumbnail + title + progress bar (% of lessons completed)
- Owner sees ALL classrooms
- Member sees only classrooms they have access to, plus locked cards for the rest
- Locked card shows the access gate indicator (lock icon + "Level X" or price)
- Owner sees a "+" add card at the end of the grid

### Create Classroom Modal (Owner)

1. Owner clicks "+" card
2. Modal opens: classroom title, thumbnail, access rule (open / level-gated / price-gated / both), DZD price (if price-gated), minimum level (if level-gated)
3. On save: new classroom appears in grid with empty chapter tree

### Classroom Viewer

**Layout:**
- **Left sidebar:** Card component with fixed width (w-72)
  - Progress info at top (Total Lessons: X)
  - Chapters displayed as bolded folders with collapse/expand
  - Lessons inside Chapters as indented items
  - Completed lessons have a checkmark icon
  - Current lesson is highlighted
  - "Add Chapter" button at bottom
- **Right content panel:** Single Card with:
  - Header: "Chapter Name / Lesson Name" using Text component
  - Green circle toggle button to mark lesson as complete (toggle ON/OFF)
  - Video embed (YouTube/Vimeo/Google Drive) - owner editable via modal
  - Description - plain text, owner editable inline with auto-save

**Navigation:**
- Clicking a lesson in the sidebar loads it in the right panel
- "Back" button in left top of sidebar, navigates to classroom grid
- Progress auto-updates via lessonProgress table

### Lesson Content (Owner Edit Mode)

**Video:**
- Owner clicks "Edit" button on video to open modal
- Modal: paste YouTube/Vimeo/Google Drive link
- Live preview in modal
- Remove button to delete video
- Auto-saves to `videoUrl` field on pages table

**Description:**
- Inline editable textarea (auto-grow)
- Auto-save on blur (immediate)
- Auto-save after 1.5s debounce when typing
- Plain text only (no formatting)

**Changes auto-save** on blur or after 1.5s debounce.

### Lesson Content (Member View)

- Read-only video embed (YouTube / Vimeo / GDrive)
- Read-only plain text description
- Green circle toggle to mark lesson as complete
- No editing controls visible

### Progress Tracking

- Each lesson completion is recorded in `lessonProgress` (userId, pageId/lessonId, classroomId, completedAt)
- **Toggle ON/OFF**: Clicking green circle adds/removes from lessonProgress
- Progress % = lessons completed / total lessons in classroom × 100
- Progress bar visible on classroom card (grid)
- Convex `useQuery` keeps progress live

---

## Schema Updates (v1.Review)

### pages table changes

```typescript
// New fields added
pages: defineTable({
  moduleId: v.id("modules"), // will be renamed to chapterId
  
  title: v.string(),
  content: v.string(), // JSON string of blocks (legacy, being deprecated)
  videoUrl: v.optional(v.string()), // NEW: video embed URL
  description: v.optional(v.string()), // NEW: plain text description
  
  order: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_module_id", ["moduleId"]),
```

### lessonProgress table

```typescript
lessonProgress: defineTable({
  classroomId: v.id("classrooms"),
  userId: v.id("users"),
  pageId: v.id("pages"),
  
  completedAt: v.number(), // for toggle ON
  // For toggle OFF: record is deleted
}).index("by_classroom_id", ["classroomId"])
  .index("by_user_id", ["userId"])
  .index("by_user_and_classroom", ["userId", "classroomId"]),
```

---

## Mutations (New/Updated)

| Mutation | Description |
|----------|-------------|
| `updatePageContent` | Updated: now accepts `videoUrl` and `description` fields |
| `updateChapter` | **NEW**: Updates chapter title (inline edit) |
| `toggleLessonComplete` | **NEW**: Adds/removes from lessonProgress (toggle ON/OFF) |
| `markPageViewed` | Existing: idempotent, marks as viewed |

---

## Classroom Access Model

| Access type | Condition |
|---|---|
| Open | Any active community member can access |
| Level-gated | Member's current level ≥ classroom's `minLevel` |
| Price-gated | Member has a `classroomAccess` record for this classroom |
| Level + price | Both level ≥ `minLevel` AND `classroomAccess` record exists |

Access is evaluated on every load — not cached client-side.

---

## Edge Cases & Rules

- Progress is per-user per-classroom — if two members are in the same classroom, their progress is independent.
- Deleting a lesson while a member is viewing it: the content disappears on next load.
- A classroom with zero lessons is valid (owner can create and add content later).
- Chapter tree drag-and-drop reordering is deferred to v1.1.
- Toggling lesson completion updates progress bar in real-time.

---

## Connections

- **Depends on:** Active community membership (tab is membership-gated), Chargily integration (price-gated classroom payment), Leaderboard/gamification (level threshold for level-gated access)
- **Triggers:** Chargily checkout (price-gated access), `lessonProgress` write (on toggle), `classroomAccess` write (on payment webhook)
- **Shares data with:** Leaderboard (level derived from points), Members tab (member's classroom progress visible to owner)

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|---|---|---|
| Editor | Video modal + inline description | Rich text + drag-and-drop |
| Chapter reorder | Manual (fixed order) | Drag-and-drop reorder |
| Progress | Toggle completion | Toggle completion + quiz completion |
| Quizzes | Not in v1 | Multiple choice quizzes with pass/fail |
| Certificates | Not in v1 | Completion certificates |
| Comments per lesson | Not in v1 | Lesson-level comments |

---

## Security Considerations

- Classroom content is only served to users with a valid access record (server-side check).
- Video embed URLs sanitized before rendering to prevent XSS.
- Owner-only mutations (create/edit/delete classroom, chapter, lesson) have server-side admin role check.
- Price-gated access is granted only via the Chargily webhook — never by client assertion.

---

## Tasks

### Existing Tasks (Original v1)

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[x]` | Create Convex schema: `classrooms` (communityId, title, thumbnail, accessType, minLevel, priceInDZD, isOnboarding) |
| T— | `[x]` | Create Convex schema: `modules` (classroomId, title, order) |
| T— | `[x]` | Create Convex schema: `pages` (moduleId, classroomId, title, content, order) |
| T— | `[x]` | Create Convex schema: `lessonProgress` (userId, pageId, classroomId, viewedAt) |
| T— | `[x]` | Create Convex schema: `classroomAccess` (userId, classroomId, grantedAt) |
| T— | `[x]` | Convex query: `listClassrooms` — returns classrooms with member's access status |
| T— | `[x]` | Convex query: `getClassroomContent` — returns module/page tree + lesson content |
| T— | `[x]` | Convex mutation: `markPageViewed` — writes to `lessonProgress`, idempotent |
| T— | `[x]` | Convex mutation: `createClassroom` / `updateClassroom` / `deleteClassroom` (admin only) |
| T— | `[x]` | Convex mutation: `createModule` / `createPage` / `updatePageContent` (admin only) |
| T— | `[x]` | Build classroom grid with progress bars |
| T— | `[x]` | Build classroom viewer (left sidebar tree + right content panel) |
| T— | `[ ]` | Build slash command (`/`) editor for lesson content (owner mode) - **DEFERRED** |
| T— | `[x]` | Build lesson content read-only renderer (member mode) |
| T— | `[ ]` | Build access gate overlay (level-gated + price-gated + combined) - **DEFERRED** |
| T— | `[x]` | Build create classroom modal (owner) |

### New Tasks (v1.Review)

| Task # | Status | What needs to be done |
|---|---|---|
| T-CL-001 | `[ ]` | Rename `module` → `chapter` in schema, mutations, queries, and frontend components |
| T-CL-002 | `[ ]` | Add `videoUrl` field to `pages` table in schema |
| T-CL-003 | `[ ]` | Add `description` field to `pages` table in schema |
| T-CL-004 | `[ ]` | Update `updatePageContent` mutation to accept `videoUrl` and `description` |
| T-CL-005 | `[ ]` | Create `updateChapter` mutation for chapter title inline editing |
| T-CL-006 | `[ ]` | Create `toggleLessonComplete` mutation (toggle ON/OFF lessonProgress) |
| T-CL-007 | `[ ]` | Update ClassroomViewer: Right section with Text header component |
| T-CL-008 | `[ ]` | Implement VideoModal (copy from AboutTab) for lesson video editing |
| T-CL-009 | `[ ]` | Implement inline description editing with auto-save (1.5s debounce + blur) |
| T-CL-010 | `[ ]` | Implement green circle toggle for lesson completion |
| T-CL-011 | `[ ]` | Update sidebar: Card wrapper, progress info, chapter/lesson tree |
| T-CL-012 | `[ ]` | Update progress calculation: lessons completed / total lessons |
| T-CL-013 | `[ ]` | Update ClassroomCard in ClassroomsTab: ensure progress syncs with toggle |

---

## Implementation Notes

### Auto-save Behavior
- **Debounce**: 1.5s after last keystroke
- **Immediate**: On blur (click outside)
- **Loading state**: Show "Saving..." text while saving

### Video Modal
- Copy exact VideoModal from AboutTab.tsx
- Same styling: rounded-[16px], aspect-video, modal with live preview
- Supported platforms: YouTube, Vimeo, Google Drive

### Progress Toggle
- Green filled circle = completed (lessonProgress record exists)
- Gray outlined circle = not completed
- Click toggles: ON adds record, OFF removes record

### Naming Convention
- Code: `chapter`, `lesson`, `chapters`, `lessons`
- UI Display: "Chapter", "Lesson", "Add Chapter", "Add Lesson"
- Database: Still uses `modules` table (for migration simplicity), renamed in queries only

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [x] ~~What block types are required in the slash command editor for v1?~~ - **Changed**: Video modal + plain text description only
- [ ] Is there a maximum number of chapters or lessons per classroom?
- [ ] Is the "Start Here" course auto-assigned to new members, or does the owner manually mark a classroom as the onboarding course?
- [x] ~~Can the owner reorder chapters/lessons in v1 (even without drag-and-drop — e.g. up/down arrows)?~~ - **Added in v1.Review**: Drag & drop reordering

---

## Phase 19: Classroom Sidebar v2 (NEW)

### Overview

New sidebar design inspired by modern course platforms with drag-and-drop reordering, inline editing, and improved visual hierarchy.

### New Layout Structure

```
┌────────────────────────────────────────────────────────────────┐
│ [< Back]  [████████░░] 65%  [⛶ Expand/Collapse All]        │ ← Top Row
├────────────────────────────────────────────────────────────────┤
│ [⋮⋮] [▶/▼] Chapter 1  (Progress Ring)  [+] [⋮]            │ ← Chapter Row
│  │      │       │              │       │  │                     │
│  │      │       │              │       │  └── 3-dot: Edit/Delete
│  │      │       │              │       └────── "+": Add lesson
│  │      │       │              └─────────────── Visual progress ring
│  │      │       └─────────────────────────── Chapter name (editable)
│  │      └────────────────────────────────── Expand/Collapse button
│  └───────────────────────────────────────── Drag handle (owner only)
│
│   [⋮⋮] [▶] [🖼️ Thumbnail] Lesson 1   [✓]                  │ ← Lesson Row
│   [⋮⋮] [▶] [🖼️ Thumbnail] Lesson 2                        │
│   [⋮⋮] [▶] [🖼️ Thumbnail] Lesson 3                        │
└────────────────────────────────────────────────────────────────┘
```

### Feature Specifications

#### 1. Drag & Drop Reordering
- **Scope**: Chapters (top-level) AND Lessons (within a chapter)
- **Cross-chapter**: No - lessons stay within their chapter
- **Platform**: Desktop only (touch not supported)
- **Library**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Visibility**: Drag handles visible to owner only

#### 2. Inline Title Editing
- **Scope**: Both chapter titles AND lesson titles
- **Save triggers**:
  - Auto-save after 1.5s debounce (no typing)
  - Enter key press
  - Click outside / blur
- **UX**: Click title → turns into input → saves on trigger

#### 3. Lesson Thumbnails
- **Size**: 110x60px (black box when no video)
- **With video**: Extract thumbnail from YouTube/Vimeo embed
  - YouTube: `img.youtube.com/vi/{videoId}/default.jpg`
  - Vimeo: Use oEmbed API to get thumbnail_url
- **Without video**: Generic file icon on black 110x60px box

#### 4. 3-Dot Menu
- **Chapter menu options**: Edit title, Delete (with confirmation)
- **Lesson menu options**: Edit title, Delete (with confirmation), Toggle view (mark complete)
- **Component**: Use existing MenuItem + custom Dropdown

#### 5. Progress Ring
- **Type**: Visual circular progress indicator
- **Shows**: X/Y lessons completed in that specific chapter
- **Style**: Same tokens as progress bar in ClassroomCard (green-500)
- **Location**: Between chapter name and "+" button

#### 6. Expand/Collapse All
- **Default**: All chapters expanded on load
- **Buttons**: "Expand All" / "Collapse All" in top row
- **Individual**: Each chapter has its own expand/collapse toggle

### Technical Implementation

#### Dependencies
```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

#### Convex Mutations Required
| Mutation | Description |
|----------|-------------|
| `reorderChapters` | Update `order` field for multiple chapters in a classroom |
| `reorderLessons` | Update `order` field for multiple lessons in a module |
| `deleteChapter` | Delete chapter + all its lessons (with confirmation) |
| `deleteLesson` | Delete lesson (with confirmation) |

#### Frontend Components
| Component | Description |
|-----------|-------------|
| `SidebarHeader` | Top row with back, progress bar, expand/collapse all |
| `ChapterRow` | Single chapter with drag, expand/coll, title, progress ring, +, menu |
| `LessonRow` | Single lesson with drag, thumbnail, title, checkmark |
| `ProgressRing` | Circular progress indicator (SVG) |
| `Thumbnail` | Video thumbnail or placeholder |
| `DropdownMenu` | 3-dot menu with options |

### Design Tokens (Progress Ring)

Based on ClassroomsTab progress bar:
```css
/* Progress ring colors */
--progress-track: #1a1a1a; /* black/80 */
--progress-fill: #22c55e;  /* green-500 */
--progress-shadow: 0 0px 4px rgba(5, 222, 106, 0.2);
```

---

## Tasks (Phase 19)

### Phase 19A: Foundation
| Task # | Status | What needs to be done |
|---|---|---|
| T-CL-014 | `[ ]` | Install @dnd-kit packages (@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities) |
| T-CL-015 | `[ ]` | Add `order` field to `modules` table in schema (if not exists) |
| T-CL-016 | `[ ]` | Add `order` field to `pages` table in schema (if not exists) |
| T-CL-017 | `[ ]` | Create `reorderChapters` Convex mutation |
| T-CL-018 | `[ ]` | Create `reorderLessons` Convex mutation |
| T-CL-019 | `[ ]` | Create `deleteChapter` Convex mutation with confirmation |
| T-CL-020 | `[ ]` | Create `deleteLesson` Convex mutation with confirmation |

### Phase 19B: Drag & Drop
| Task # | Status | What needs to be done |
|---|---|---|
| T-CL-021 | `[ ]` | Implement chapter list with @dnd-kit sortable |
| T-CL-022 | `[ ]` | Implement lesson list with @dnd-kit sortable |
| T-CL-023 | `[ ]` | Add drag handles to chapter rows (owner only) |
| T-CL-024 | `[ ]` | Add drag handles to lesson rows (owner only) |

### Phase 19C: Inline Editing
| Task # | Status | What needs to be done |
|---|---|---|
| T-CL-025 | `[ ]` | Implement inline chapter title editing with auto-save |
| T-CL-026 | `[ ]` | Implement inline lesson title editing with auto-save |

### Phase 19D: 3-Dot Menu
| Task # | Status | What needs to be done |
|---|---|---|
| T-CL-027 | `[ ]` | Build DropdownMenu component for sidebar |
| T-CL-028 | `[ ]` | Implement chapter menu: Edit title, Delete with confirmation |
| T-CL-029 | `[ ]` | Implement lesson menu: Edit title, Delete with confirmation, Toggle view |

### Phase 19E: Thumbnails & Progress Ring
| Task # | Status | What needs to be done |
|---|---|---|
| T-CL-030 | `[ ]` | Create helper function to extract YouTube thumbnail from videoUrl |
| T-CL-031 | `[ ]` | Create helper function to extract Vimeo thumbnail from videoUrl |
| T-CL-032 | `[ ]` | Build ProgressRing component (SVG circular progress) |
| T-CL-033 | `[ ]` | Implement lesson thumbnail in sidebar (110x60px) |
| T-CL-034 | `[ ]` | Add progress ring to chapter row |

### Phase 19F: Layout Updates
| Task # | Status | What needs to be done |
|---|---|---|
| T-CL-035 | `[ ]` | Update sidebar header: Back + Progress bar + Expand/Collapse All |
| T-CL-036 | `[ ]` | Update chapter row layout: drag + expand + title + ring + + + menu |
| T-CL-037 | `[ ]` | Update lesson row layout: drag + thumbnail + title + check |
| T-CL-038 | `[ ]` | Add Expand All / Collapse All functionality |
| T-CL-039 | `[ ]` | Connect all mutations and queries |

---

## Dependencies Between Phases

```
Phase 19A (Foundation)
    ↓
Phase 19B (Drag & Drop) ──→ Depends on 19A
    ↓
Phase 19C (Inline Edit) ──→ Depends on 19A
    ↓
Phase 19D (3-Dot Menu) ──→ Depends on 19A
    ↓
Phase 19E (Thumbnails) ──→ Depends on 19A
    ↓
Phase 19F (Layout) ──→ Depends on 19B, 19C, 19D, 19E
```
