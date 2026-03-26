# COMPONENTS.md

> **CRITICAL: The Agent must follow these Conventions at all times.**
> This file is the single source of truth for all frontend component architecture decisions in Cader.

---

## Core Rules

- **Never use raw HTML elements** (`div`, `span`, `p`, `h1`–`h6`, `button`, `input`, etc.) directly in feature components.
- **Always check `@animate-ui` first.** If the library offers the component, use it. If not, build a custom component.
- **Never use default token values.** The only source of truth for all design tokens is `/context/design/DESIGN_SYSTEM.md`.
- **Never add inline Tailwind classes that duplicate what a component already handles internally.

---

## Directory Structure

```
/components
  /ui                ← @animate-ui standard building blocks (primary layer)
    /Text            ← Custom Heading and Text components (HTML + Tailwind)
  /About             ← About-scoped components
  /community         ← Community-scoped components
  /classrooms        ← Classroom-specific components
  /Members           ← Members-scoped components
  /Leaderboard       ← Leaderboard-scoped components
  /Analysis          ← Analysis-scoped components
  /modals            ← All modal components
  /layout            ← Shell, top bar, tab navigation
  /shared            ← Reused across features (Avatar, LevelBadge, etc.)
  /animate-ui        ← @animate-ui components (radix-dialog, etc.)
```

---

## Layer Architecture

Cader uses a **two-layer component model**:

| Layer | Source | Role |
|---|---|---|
| **Primitives** | `@animate-ui` + `/components/ui/Text` | Standard UI building blocks — buttons, dialogs, inputs, tabs, cards, badges, typography |
| **Custom Cader** | `components/` | Business components: PostCard, ClassroomGrid, MemberList, etc. Built on top of Layer 1 |

---

## Layer 1 — @animate-ui Primitives

### Layout

| Component | Notes | Status |
|---|---|---|
| `Box` | Flex primitive — use instead of raw `div` with `flex` | — |
| `Flex` | Convenient flexbox with built-in gap and direction props | — |
| `Grid` | CSS grid wrapper | — |
| `Container` | Max-width container with responsive padding | — |
| `Section` | Semantic section wrapper with spacing | — |
| `Inset` | Consistent padding/margin helpers | — |
| `AspectRatio` | For image/video aspect ratios in cards | — |

### Typography

> Font stack is defined in `tailwind.config.ts` and loaded via `next/font/google`.
> Typography scale and token values are fully configured in `global.css` — do not redefine them.
> Raw HTML tags (`h1`–`h6`, `p`) are **forbidden** in feature components.
> Use only the custom components in `/components/ui/Text/`.

| Component | Notes | Status |
|---|---|---|
| `Heading` | Built from scratch using HTML + Tailwind. Accepts `size` prop (0–9 scale) | — |
| `Text` | Built from scratch using HTML + Tailwind. Accepts `size` and `theme` props | — |
| `Code` | Inline code styling with Geist Mono | — |
| `Kbd` | Keyboard shortcut display | — |

**Typography Rules:**
- Never use font weights below 400 in dark mode (legibility).
- Use `tracking-3` on all-caps badges and category labels.
- Letter spacing must be tight (`tracking-0` or `tracking-1`) on display and title text.
- Line height for body: `leading-3` or `leading-4`.
- Line height for headings: `leading-tight` (`leading-6` or tighter).

### Forms

| Component | Notes | Status |
|---|---|---|
| `TextInput` | Single-line text input | — |
| `TextArea` | Multi-line text area | — |
| `Checkbox` | Checkbox input | — |
| `RadioGroup` | Radio button groups | — |
| `Select` | Dropdown select | — |
| `Switch` | Toggle switch | — |
| `Slider` | Range slider | — |
| `DatePicker` | Date input | — |
| `OTPField` | One-time password input | — |

### Buttons

| Component | Notes | Status |
|---|---|---|
| `Button` | Primary action button — `variant` prop: `primary`, `secondary`, `tertiary`, `ghost`, `danger` | — |
| `IconButton` | Icon-only button | — |

> Primary `Button` uses `accent` color by default.
> Danger variant uses `error` (red) color.
> Do **NOT** use raw `<button>` elements — always use `Button` or `IconButton`.

### Display

| Component | Notes | Status |
|---|---|---|
| `Card` | Card container with surface styling | — |
| `Avatar` | User avatar with fallback initials | — |
| `AvatarGroup` | Multiple overlapping avatars | — |
| `Badge` | Status/category badges | — |
| `Callout` | Info/warning/error callout boxes | — |
| `Table` | Data table | — |
| `DataList` | Key-value data display | — |
| `Skeleton` | Loading placeholder | — |

### Navigation

| Component | Notes | Status |
|---|---|---|
| `Tabs` | Tab navigation | — |
| `Breadcrumbs` | Breadcrumb navigation | — |
| `Link` | Styled anchor link | — |
| `SegmentedControl` | Segmented button groups (time range filters: 7d / 30d / all) | — |

### Overlay / Dialog

| Component | Notes | Status |
|---|---|---|
| `Dialog` | Modal/dialog — `@animate-ui` radix-dialog with animations | — |
| `Popover` | Popover menus | — |
| `DropdownMenu` | Context menus, action menus | — |
| `Tooltip` | Hover tooltips | — |
| `Toaster` | Toast notifications | — |

### Utilities

| Component | Notes | Status |
|---|---|---|
| `Command` | Slash-command palette for lesson editor (`/` commands) | — |
| `ScrollArea` | Custom scrollbar styling | — |
| `Separator` | Divider with Cader token styling | — |

---

## Layer 2 — Custom Cader Components

### Layout (in `components/layout/`)

| Component | File | Status |
|---|---|---|
| Root layout | `app/layout.tsx` | — |
| Community SPA shell | `components/layout/CommunityShell.tsx` | — |
| Top bar | `components/layout/TopBar.tsx` | — |
| Tab navigation | `components/layout/TabNav.tsx` | — |
| Community dropdown | `components/layout/CommunityDropdown.tsx` | — |

### Common UI (in `components/shared/`)

| Component | Notes | Status |
|---|---|---|
| `LevelBadge` | Shared across feed, members, leaderboard | — |
| `SkeletonCard` | Loading placeholder | — |
| `PriceDisplay` | DZD price display with Chargily color | — |
| `WilayaDropdown` | Algeria Wilaya select | — |
| `VideoEmbed` | YouTube/Vimeo embed wrapper | — |
| `ChargilyBadge` | "Paid via Chargily" trust badge | — |

### Feature-Specific (in `components/features/`)

| Component | Feature | Status |
|---|---|---|
| `CommunityCreationModal` | Community creation | — |
| `OnboardingModal` | Onboarding — multi-step | — |
| `ProfileModal` | Profile | — |
| `SettingsModal` | Settings | — |
| `ExploreModal` | Community directory | — |
| `PostCard` | Community feed | — |
| `PostComposer` | Feed post composer | — |
| `AddPostModal` | Add post | — |
| `OpenPostModal` | Full post view | — |
| `ClassroomGrid` | Classrooms — grid | — |
| `ClassroomCard` | Individual classroom card | — |
| `ClassroomViewer` | Lesson viewer shell | — |
| `ModulePageTree` | Sidebar tree | — |
| `LessonRenderer` | Rich text + embeds | — |
| `SlashCommandEditor` | `/` command palette | — |
| `AccessGateOverlay` | Locked content overlay | — |
| `AlgeriaSVGMap` | Interactive Wilaya map — SVG + Lucide icons | — |
| `MemberList` | Searchable member list | — |
| `MemberProfileCard` | Member hover card | — |
| `LeaderboardList` | Leaderboard with segmented time filter | — |
| `LevelProgressVisualization` | 5-level progress display | — |
| `DZDPriceDisplay` | Price in DZD with Chargily green | — |

### Community Tabs (in `components/community/`)

| Component | Tab | Status |
|---|---|---|
| `AboutTab` | About | — |
| `FeedTab` | Feed | placeholder |
| `MembersTab` | Members | placeholder |
| `ClassroomsTab` | Classrooms | placeholder |
| `LeaderboardTab` | Leaderboard | placeholder |
| `AnalysisTab` | Analysis (owner only) | placeholder |

---

## Component Ownership Map

```
┌─────────────────────────────────────────────────────────────┐
│  @animate-ui + /components/ui/Text — Layer 1                │
│  Button, IconButton, Dialog, Tabs, Select, Card, Badge,     │
│  Avatar, TextInput, TextArea, Switch, Popover,              │
│  DropdownMenu, Tooltip, Toaster, Skeleton, Callout,        │
│  Command, ScrollArea, Separator, Heading, Text, Code        │
└────────────────────────┬────────────────────────────────────┘
                         │ (composed into)
┌────────────────────────▼────────────────────────────────────┐
│  Custom Cader Components — Layer 2                          │
│  PostCard, ClassroomGrid, ClassroomViewer,                  │
│  LeaderboardList, AlgeriaSVGMap, MemberList,                │
│  LevelBadge, CommunityShell, TopBar, TabNav,               │
│  All feature modals, DZDPriceDisplay                        │
└─────────────────────────────────────────────────────────────┘
```
┌─────────────────────────────────────────────────────────────┐
│  @animate-ui + /components/ui/Text — Layer 1                │
│  Button, IconButton, Dialog, Tabs, Select, Card, Badge,     │
│  Avatar, TextInput, TextArea, Switch, Popover,             │
│  DropdownMenu, Tooltip, Toaster, Skeleton, Callout,        │
│  Command, ScrollArea, Separator, Heading, Text, Code        │
└────────────────────────┬────────────────────────────────────┘
                         │ (composed into)
┌────────────────────────▼────────────────────────────────────┐
│  Custom Cader Components — Layer 2                          │
│  PostCard, ClassroomGrid, ClassroomViewer,                  │
│  LeaderboardList, AlgeriaSVGMap, MemberList,               │
│  LevelBadge, CommunityShell, TopBar, TabNav,               │
│  All feature modals, DZDPriceDisplay                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Icon Ownership

| Icon Set | Owner | Used For |
|---|---|---|
| `lucide-react` | Cader | All standard UI icons (close, chevron, check, copy, edit, etc.) and custom feature icons |
| Custom SVG | Cader | Algeria SVG map (hand-crafted), Chargily logo, Wilaya flag icons |
