# Code Conventions

> Claude follows these on every task without being reminded.
> Violations require an explicit override with a comment explaining why.

---

## Naming

### Files & Folders
- Next.js route files: lowercase, kebab-case (`community-feed.tsx`, `[communitySlug]/page.tsx`)
- React components: PascalCase files (`PostCard.tsx`, `ClassroomViewer.tsx`)
- Convex files: camelCase (`communities.ts`, `pointEvents.ts`)
- Hooks: camelCase with `use` prefix (`useTabPersistence.ts`, `useMembership.ts`)
- Utility functions: camelCase (`formatDZD.ts`, `slugify.ts`)
- Constants: SCREAMING_SNAKE_CASE in a `constants/` file or top of the module

### Variables & Functions
- Variables: camelCase (`currentCommunity`, `memberCount`)
- Functions: camelCase verbs (`createCheckoutSession`, `grantMembership`)
- Booleans: `is`, `has`, `can` prefix (`isAdmin`, `hasMembership`, `canPost`)
- Event handlers: `handle` prefix (`handleJoinClick`, `handleTabChange`)

### Convex
- Queries: noun-based names (`getCommunity`, `listMembers`, `getLeaderboard`)
- Mutations: verb-based names (`createPost`, `grantMembership`, `deleteComment`)
- Actions: verb-based names + context (`createChargilyCheckout`, `verifyWebhookSignature`)
- Table names: camelCase plural (`communities`, `memberships`, `pointEvents`, `lessonProgress`)
- Index names: descriptive (`by_community_id`, `by_user_and_community`, `by_created_at`)

### TypeScript
- Types: PascalCase (`Community`, `Membership`, `PostType`)
- Interfaces: PascalCase, no `I` prefix (`CommunityProps`, not `ICommunityProps`)
- Enums: PascalCase with SCREAMING values (`PricingType.MONTHLY`)
- Generic params: single uppercase letters or descriptive PascalCase (`T`, `TData`, `TError`)

---

## File & Folder Structure

```
/app
  /[communitySlug]
    page.tsx              ← Community SPA shell
    layout.tsx            ← Shell layout (top bar, tab nav)
  /api
    /webhooks
      /clerk/route.ts
      /chargily/route.ts
  /help
    page.tsx
  page.tsx                ← Platform landing (/)
  layout.tsx              ← Root layout (Clerk provider, Convex provider)

/components
  /ui                     ← @animate-ui components (owned, not imported)
  /About                  ← About-scoped components
  /community              ← Community-scoped components
  /classrooms             ← Classroom-specific components
  /Members                ← Members-scoped components
  /Leaderboard            ← Leaderboard-scoped components
  /Analysis               ← Analysis-scoped components
  /modals                 ← All modal components
  /layout                 ← Shell, top bar, tab navigation
  /shared                 ← Reused across features (Avatar, LevelBadge, etc.)
  /animate-ui             ← @animate-ui primitives

/convex
  /schema.ts              ← All table definitions
  /communities.ts
  /memberships.ts
  /posts.ts
  /classrooms.ts
  /pointEvents.ts
  /users.ts
  /webhooks.ts            ← Webhook processing logic (called by Route Handlers)

/lib
  /utils.ts               ← General utilities (slugify, formatDZD, etc.)
  /constants.ts           ← App-wide constants (level thresholds, tier limits)
  /validations.ts         ← Zod schemas for form validation

/hooks
  useTabPersistence.ts
  useMembership.ts
  useCommunity.ts

/types
  index.ts                ← Shared TypeScript types
```

---

## Patterns

### Data Fetching
- **Server Components:** Use Convex server-side queries (via `fetchQuery`) for initial page render — no client-side loading spinners on first paint.
- **Client Components:** Use `useQuery` for live-reactive data (feed, leaderboard, membership status).
- Never fetch data in a Client Component that was already available from the Server Component — pass it as props.

### State Management
- No global state manager (no Redux, no Zustand). Convex `useQuery` is the state for server data.
- Local UI state (modal open/closed, tab active) lives in React `useState` in the nearest parent.
- Tab persistence uses the `useTabPersistence` hook (localStorage read/write).
- Never store derived state — derive from source (e.g. level from `pointEvents`, never store level).

### Components
- Prefer small, single-responsibility components.
- Keep component files under 200  lines. Extract sub-components when a file grows beyond this.
- Server Components are the default. Only add `"use client"` when the component needs interactivity or browser APIs.
- Never put Convex mutations inside a Server Component — mutations always live in Client Components.

### Forms
- Use `react-hook-form` + Zod for all forms.
- Validate on the client for UX. Always re-validate on the server (Convex mutation).
- Never trust client-validated data in server logic.

### Error Handling
- Convex mutations throw on error — catch in the component and show a toast.
- Webhook handlers return 200 for all events (even unhandled ones) to prevent Chargily retries.
- Webhook handlers return 401 for signature failures (do not process, do not 500).
- User-visible errors use plain English: never expose stack traces, internal IDs, or raw API errors.

---

## Comments

- Write comments for **why**, not **what**. Code explains what; comments explain why.
- Every Convex function that touches payments or auth must have a brief comment explaining the security intent.
- TODO comments: `// TODO(T-[task-number]): description` — always link to a task.
- HACK comments: `// HACK: [reason] — should be fixed in [phase/task]`
- Remove commented-out code before committing — use git history instead.

---

## Formatting

- **Prettier** for formatting (auto-applied on save via VS Code / Windsurf config).
- **ESLint** with Next.js recommended config.
- Tabs: 2 spaces.
- Max line length: 100 characters (soft limit — Prettier enforces 80 on JSX attributes).
- Trailing commas: ES5 (`"trailingComma": "es5"` in Prettier config).
- Single quotes for strings in TypeScript. Double quotes in JSX attributes.
- Import order (enforced by ESLint plugin):
  1. React / Next.js
  2. Third-party packages
  3. Convex imports
  4. Local components
  5. Local utilities / hooks
  6. Types

---

## TypeScript

- Strict mode enabled (`"strict": true` in `tsconfig.json`). No exceptions.
- No `any`. Use `unknown` when type is genuinely unknown, then narrow.
- All Convex query/mutation return types must be explicitly typed.
- All component props must have explicit TypeScript interfaces or type aliases.
- Avoid type assertions (`as SomeType`) unless unavoidable — comment why when used.
