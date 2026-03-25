# Component Inventory

> v2: Frosted UI integration — March 2026.
> Three-layer model: Frosted UI primitives → shadcn/ui extensions → Cader custom components.

---

## Layer Architecture

Cader uses a **three-layer component model**:

| Layer            | Source                     | Role                                                                                                                                  |
| ---------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Primitives**   | Frosted UI (`@whop/react`) | Standard UI building blocks — buttons, dialogs, inputs, tabs, cards, badges                                                           |
| **Extensions**   | shadcn/ui + custom         | shadcn/ui for Cader-specific UI (AlgeriaMap, Leaderboard) and any component that needs deep customization beyond Frosted UI's surface |
| **Custom Cader** | `components/`              | Business components: PostCard, ClassroomGrid, MemberList, etc. Built on top of layer 1 and 2                                          |

**Rule:** When Frosted UI and shadcn/ui both offer a component (e.g. Dialog, Tabs, Select),
use Frosted UI. Use shadcn/ui only when Frosted UI doesn't have an equivalent or when
Cader needs to override styles beyond what Frosted UI exposes.

---

## Layer 1 — Frosted UI Primitives (`@whop/react`)

> 60+ accessible components built on Radix UI primitives.
> Install: `npm install @whop/react`
> Also install icons: `npm install @frosted-ui/icons`

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

### Typography (prefer these over raw HTML)

| Component | Notes | Status |
|---|---|---|
| `Heading` | 0–9 size scale, `display`/`title`/`subtitle` variants, `tight` line-height | — |
| `Text` | 0–9 size scale, `muted`/`secondary` color variants | — |
| `Code` | Inline code styling | — |
| `Strong` | Bold text | — |
| `Kbd` | Keyboard shortcut display | — |

### Forms

| Component | Notes | Status |
|---|---|---|
| `TextInput` | Single-line text input — replaces shadcn/ui Input | — |
| `TextArea` | Multi-line text area — replaces shadcn/ui Textarea | — |
| `Checkbox` | Checkbox input | — |
| `RadioGroup` | Radio button groups | — |
| `Select` | Dropdown select — replaces shadcn/ui Select | — |
| `Switch` | Toggle switch — replaces shadcn/ui Switch | — |
| `Slider` | Range slider | — |
| `DatePicker` | Date input | — |
| `OTPField` | One-time password input | — |

> **Migration note:** `TextInput` from Frosted UI replaces `Input` from shadcn/ui in all
> form contexts. See `UX_PATTERNS.md` for updated form field styling rules.
> Frosted UI `TextInput` handles its own focus ring, border, and background — do NOT add
> shadcn/ui `Input` classes on top.

### Buttons

| Component | Notes | Status |
|---|---|---|
| `Button` | Primary action button — `variant` prop: `primary`, `secondary`, `tertiary`, `ghost`, `danger` | — |
| `IconButton` | Icon-only button — replaces icon-only shadcn/ui Buttons | — |

> Primary `Button` uses `accent` color (Chargily green) by default.
> Danger variant uses `error` (red) color.
> Do NOT use shadcn/ui `Button` for new components — use Frosted UI `Button`.

### Display

| Component | Notes | Status |
|---|---|---|
| `Card` | Card container with surface styling — replaces shadcn/ui Card | — |
| `Avatar` | User avatar with fallback initials | — |
| `AvatarGroup` | Multiple overlapping avatars | — |
| `Badge` | Status/category badges — replaces shadcn/ui Badge | — |
| `Callout` | Info/warning/error callout boxes | — |
| `Table` | Data table | — |
| `DataList` | Key-value data display | — |
| `Skeleton` | Loading placeholder — replaces custom `bg-elevated animate-pulse` pattern | — |

### Navigation

| Component          | Notes                                                        | Status |
| ------------------ | ------------------------------------------------------------ | ------ |
| `Tabs`             | Tab navigation — replaces shadcn/ui Tabs                     | —      |
| `Breadcrumbs`      | Breadcrumb navigation                                        | —      |
| `Link`             | Styled anchor link                                           | —      |
| `SegmentedControl` | Segmented button groups (time range filters: 7d / 30d / all) | —      |

### Overlay / Dialog

| Component | Notes | Status |
|---|---|---|
| `Dialog` | Modal/dialog — replaces shadcn/ui Dialog | — |
| `Popover` | Popover menus | — |
| `DropdownMenu` | Context menus, action menus | — |
| `Tooltip` | Hover tooltips | — |
| `Toaster` | Toast notifications — replaces shadcn/ui Sonner | — |

> **Migration note:** Frosted UI `Dialog` replaces shadcn/ui `Dialog` for all modal use cases.
> Frosted UI `Toaster` replaces `Sonner`. Keep Framer Motion for enter/exit animations on
> Dialog — see `UX_PATTERNS.md`.

### Icons

| Package | Use |
|---|---|
| `@frosted-ui/icons` | Standard icon set — 16/20/24/32px sizes. Add to `next.config.mjs` via `modularizeImports`. |
| `lucide-react` | Cader-specific icons only (Algeria map, Chargily logo, custom). |

---

## Layer 2 — shadcn/ui + Custom Extensions

> shadcn/ui components that Frosted UI doesn't have, or that need Cader-specific styling.
> These are installed via `npx shadcn@latest add [component]`.

| Component | Notes | Status |
|---|---|---|
| `Command` | Slash-command palette for lesson editor (`/` commands) | — |
| `ScrollArea` | Custom scrollbar styling | — |
| `Separator` | Divider with Cader token styling | — |
| `Tooltip` (shadcn) | Only if Frosted UI Tooltip is insufficient | — |

### shadcn/ui components to MIGRATE AWAY FROM

These components are in the existing codebase but should be replaced by Frosted UI equivalents:

| Existing shadcn/ui | Migrate to | Notes |
|---|---|---|
| `Button` | Frosted UI `Button` | Primary and ghost variants covered |
| `Input` | Frosted UI `TextInput` | All form inputs |
| `Dialog` | Frosted UI `Dialog` | All modals |
| `Tabs` | Frosted UI `Tabs` | Tab navigation |
| `Badge` | Frosted UI `Badge` | Status/category badges |
| `Card` | Frosted UI `Card` | Card containers |
| `Avatar` | Frosted UI `Avatar` | User avatars |
| `Select` | Frosted UI `Select` | Dropdown selects |
| `Switch` | Frosted UI `Switch` | Toggle switches |
| `Sonner` | Frosted UI `Toaster` | Toast notifications |

---

## Layer 3 — Custom Cader Components

> Business-specific components built on top of Frosted UI + shadcn/ui.

### Layout (in `components/layout/`)

| Component | File | Status |
|---|---|---|
| Root layout | `app/layout.tsx` | — |
| Community SPA shell | `components/layout/CommunityShell.tsx` | — |
| Top bar | `components/layout/TopBar.tsx` | — |
| Tab navigation | `components/layout/TabNav.tsx` | — |
| Community dropdown | `components/layout/CommunityDropdown.tsx` | — |

### Common UI (in `components/`)

| Component | Notes | Status |
|---|---|---|
| `LevelBadge` | Shared across feed, members, leaderboard. Uses Frosted UI `Badge` | — |
| `SkeletonCard` | Uses Frosted UI `Skeleton` | — |
| `PriceDisplay` | DZD price display with Chargily green | — |
| `WilayaDropdown` | Algeria Wilaya select — uses Frosted UI `Select` | — |
| `VideoEmbed` | YouTube/Vimeo embed wrapper | — |
| `ChargilyBadge` | "Paid via Chargily" trust badge | — |

### Feature-Specific (in `components/features/`)

| Component | Feature | Status |
|---|---|---|
| `CommunityCreationModal` | Community creation — Frosted UI `Dialog` + `TextInput` | — |
| `OnboardingModal` | Onboarding — multi-step Frosted UI `Dialog` | — |
| `ProfileModal` | Profile — Frosted UI `Dialog` + `Avatar` | — |
| `SettingsModal` | Settings — Frosted UI `Dialog` + `Tabs` | — |
| `ExploreModal` | Community directory — Frosted UI `Dialog` + `Card` grid | — |
| `PostCard` | Community feed — built on Frosted UI `Card` | — |
| `PostComposer` | Feed post composer | — |
| `AddPostModal` | Add post — Frosted UI `Dialog` | — |
| `OpenPostModal` | Full post view — Frosted UI `Dialog` | — |
| `ClassroomGrid` | Classrooms — grid of Frosted UI `Card` | — |
| `ClassroomCard` | Individual classroom card | — |
| `ClassroomViewer` | Lesson viewer shell | — |
| `ModulePageTree` | Sidebar tree — uses Frosted UI `Inset` | — |
| `LessonRenderer` | Rich text + embeds | — |
| `SlashCommandEditor` | `/` command palette — shadcn/ui `Command` | — |
| `AccessGateOverlay` | Locked content overlay — Frosted UI `Callout` | — |
| `AlgeriaSVGMap` | Interactive Wilaya map — SVG + Lucide icons | — |
| `MemberList` | Searchable member list | — |
| `MemberProfileCard` | Member hover card | — |
| `LeaderboardList` | Leaderboard with segmented time filter (Frosted UI `SegmentedControl`) | — |
| `LevelProgressVisualization` | 5-level progress display | — |
| `DZDPriceDisplay` | Price in DZD with Chargily green | — |

---

## Component Ownership Map

```
┌─────────────────────────────────────────────────────┐
│  Frosted UI (@whop/react) — Layer 1                │
│  Button, Dialog, Tabs, Select, Card, Badge,         │
│  Avatar, TextInput, TextArea, Switch, Popover,     │
│  DropdownMenu, Tooltip, Toaster, Heading, Text,    │
│  Box, Flex, Grid, Inset, Skeleton, Callout         │
└────────────────────┬────────────────────────────────┘
                     │ (built on)
┌────────────────────▼────────────────────────────────┐
│  shadcn/ui + Custom Extensions — Layer 2             │
│  Command (slash menu), ScrollArea, Separator        │
│  (migrate away from: Button, Dialog, Tabs, Badge,   │
│   Avatar, Input, Select, Switch, Sonner → Frosted) │
└────────────────────┬────────────────────────────────┘
                     │ (composed into)
┌────────────────────▼────────────────────────────────┐
│  Custom Cader Components — Layer 3                   │
│  PostCard, ClassroomGrid, ClassroomViewer,           │
│  LeaderboardList, AlgeriaSVGMap, MemberList,        │
│  LevelBadge, CommunityShell, TopBar, TabNav         │
│  All feature modals, DZDPriceDisplay                │
└─────────────────────────────────────────────────────┘
```

---

## Icon Ownership

| Icon Set | Owner | Used For |
|---|---|---|
| `@frosted-ui/icons` | Frosted UI | All standard UI icons (close, chevron, check, copy, edit, etc.) |
| `lucide-react` | Cader | Algeria map Wilaya icons, Chargily logo SVG, custom feature icons |
| Custom SVG | Cader | Algeria SVG map (hand-crafted), Chargily logo, Wilaya flag icons |

---

## Migration Checklist (shadcn/ui → Frosted UI)

When migrating existing shadcn/ui components:

1. Replace shadcn `Button` → Frosted UI `Button` (keep `variant="destructive"` → `variant="danger"`)
2. Replace shadcn `Input` → Frosted UI `TextInput` (remove custom token classes — Frosted UI handles styling)
3. Replace shadcn `Dialog` → Frosted UI `Dialog` (keep Framer Motion wrapper from `UX_PATTERNS.md`)
4. Replace shadcn `Tabs` → Frosted UI `Tabs` (keep tab content structure)
5. Replace shadcn `Badge` → Frosted UI `Badge`
6. Replace shadcn `Card` → Frosted UI `Card`
7. Replace shadcn `Avatar` → Frosted UI `Avatar`
8. Replace shadcn `Select` → Frosted UI `Select`
9. Replace shadcn `Switch` → Frosted UI `Switch`
10. Replace `Sonner` toast → Frosted UI `Toaster` (same API shape)
11. Replace custom skeleton `div` → Frosted UI `Skeleton`
12. Keep `Command` (shadcn) for slash-command editor
13. Keep `ScrollArea` (shadcn) for custom scrollbar behavior
