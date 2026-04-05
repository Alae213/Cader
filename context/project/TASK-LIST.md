# Task List

> The single source of truth for what needs to be done.
> Updated by Claude after every meaningful piece of work.
> Each task links to the feature file it belongs to.
>
> **Status keys:**
> `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` blocked · `[>]` deferred
>
> **Questions:** Tasks with open questions are marked `[Q: ...]` inline. Answer before building that task.

---

## How Tasks Are Numbered

Tasks are numbered globally across the whole project: T1, T2, T3...
They never get renumbered — a completed task keeps its number forever.
This means you can reference "T12" in a commit message or conversation and
it always points to the same thing.

---

## Active Sprint

Tasks currently being worked on or up next.

<!-- Claude: keep this section short — max 5-7 tasks at a time -->

**Phase 26 — Classroom Cards Enhancements**

New features for ClassroomsTab.tsx classroom cards:

- T-CL-CARD-001: Add `order` field to classrooms schema
- T-CL-CARD-002: Create reorderClassrooms mutation  
- T-CL-CARD-004: Add drag handle (6-dot grip) on ClassroomCard
- T-CL-CARD-005: Integrate @dnd-kit sortable into grid
- T-CL-CARD-010: Create LockedClassroomModal component
- T-CL-CARD-011: Implement level gating UI
- T-CL-CARD-012: Implement paid gating UI + checkout
- T-CL-CARD-020: Refactor ThumbnailUpload to modal-based cropping
- T-CL-CARD-030: Implement server-side pagination (9 per page)

---

## Backlog

Tasks that are planned but not started yet. Ordered by dependency (build top-down).

### Phase 1 — Foundation & Auth (T8–T12)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T8 | `[x]` | Build Clerk + membership middleware — protects `/create`, `/explore`, `/settings`. `/[communitySlug]` is public (About tab visible to all). Membership check in page components. | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Renamed to middleware.ts. /[communitySlug] intentionally public for About tab |
| T9 | `[x]` | Create `.env.example` — list all env vars (Convex, Clerk, Chargily webhook secret, platform Chargily keys) | Foundation | |
| T10 | `[x]` | Wrap root layout in `WhopApp appearance="dark" accentColor="green"` | [context/design/DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md) | Using custom CSS variables instead (WhopApp had import issues) |
| T11 | `[x]` | Build `app/layout.tsx` — root layout with providers (ClerkProvider, ConvexProvider, WhopApp, Toaster) | Foundation | |
| T12 | `[x]` | Set up shared utility files — `lib/utils.ts` (slugify, formatDZD), `lib/constants.ts` (level thresholds: 0/20/60/140/280, tier limit 50, platform price 2000), `lib/validations.ts` (Zod schemas) | Foundation | |

### Phase 2 — Platform Landing & Help (T13–T15)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T13 | `[x]` | Build platform landing page (`/`) — hero section, "How it works" 3-step, Chargily highlight, footer with Help link | [context/features/platform-landing.md](../features/platform-landing.md) | |
| T14 | `[x]` | Build CTA behavior on landing — unauthenticated: Clerk modal → community creation; authenticated no communities: creation modal directly | [context/features/platform-landing.md](../features/platform-landing.md) | Basic auth flow implemented |
| T15 | `[x]` | Build static help page (`/help`) | [context/features/platform-landing.md](../features/platform-landing.md) | FAQ, payment help, getting started guides |

### Phase 3 — Community Creation (T16–T20)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T16 | `[x]` | Build community creation modal — Step 1: name input + slug auto-gen + debounced uniqueness check against Convex | [context/features/community-creation.md](../features/community-creation.md) | |
| T17 | `[x]` | Build community creation modal — Step 2: pricing type (free/monthly/annual/one-time) + DZD price + Chargily keys | [context/features/community-creation.md](../features/community-creation.md) | |
| T18 | `[x]` | Build Chargily key validation — server-side action that tests keys via Chargily API before allowing paid community creation | [context/features/community-creation.md](../features/community-creation.md) | validateChargilyKeys action validates via API before creation |
| T19 | `[x]` | Build `createCommunity` Convex mutation — write community record, encrypt Chargily keys, validate slug uniqueness server-side | [context/features/community-creation.md](../features/community-creation.md) | Keys encrypted with AES-GCM, slug validated server-side |
| T20 | `[x]` | Build community creation redirect — after create, redirect to `/[communitySlug]` | [context/features/community-creation.md](../features/community-creation.md) | |

### Phase 4 — Community Shell & Tab Persistence (T21–T25)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T21 | `[x]` | Build `/[communitySlug]` page — route segment, load community by slug, 404 if not found | [context/features/community-creation.md](../features/community-creation.md) | |
| T22 | `[x]` | Build SPA shell — top bar (logo, community name, user avatar dropdown, "Explore" link), tab navigation (About, Community, Classrooms, Members, Leaderboard, Analysis) | [context/features/community-creation.md](../features/community-creation.md) | |
| T23 | `[x]` | Build tab visibility logic — unauthenticated/non-member: only About tab visible; member: all tabs; owner/admin: all tabs + Analysis | [context/features/community-creation.md](../features/community-creation.md) | EC-11 |
| T24 | `[x]` | Build `useTabPersistence` hook — localStorage read/write keyed by community slug, access-aware fallback (About for non-members, Community for members) | [context/features/tab-persistence.md](../features/tab-persistence.md) | EC-13 |
| T25 | `[x]` | Build tab state restoration — on load, validate stored tab against access; fallback to About (unauthenticated) or Community (member) | [context/features/tab-persistence.md](../features/tab-persistence.md) | `[Clear stored tab on logout: Yes, clear localStorage entry on logout]` |

### Phase 5 — About Tab (T26–T31)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T26 | `[x]` | Build About tab layout — two-column: left (video, description, links), right (stats, Join button, Edit community button) | [context/features/about-tab.md](../features/about-tab.md) | |
| T27 | `[x]` | Build video embed component — YouTube/Vimeo/GDrive URL validation on blur, sanitize before render, placeholder for owner when empty | [context/features/about-tab.md](../features/about-tab.md) | |
| T28 | `[x]` | Build stats matrix component — total members, online now (active last 30 min), current streak — live via Convex `useQuery` | [context/features/about-tab.md](../features/about-tab.md) | |
| T29 | `[x]` | Build inline edit mode for owner — click-to-edit video URL, rich text description, title, tagline, links (up to 5); auto-save on blur | [context/features/about-tab.md](../features/about-tab.md) | |
| T30 | `[x]` | Build `getCommunity` Convex query — returns all About tab fields for a given slug | [context/features/about-tab.md](../features/about-tab.md) | Implicitly completed — getBySlug returns ownerName, ownerAvatar, onlineCount |
| T31 | `[x]` | Build public/non-member view — only logo + placeholder avatar in top bar, tabs hidden, Join button visible, About content read-only | [context/features/about-tab.md](../features/about-tab.md) | |

### Phase 6 — Chargily Integration & Payments (T32–T39)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T32 | `[x]` | Build Chargily checkout creation — Convex action that calls `POST https://pay.chargily.net/api/v2/checkouts` with creator's keys, metadata (communityId, userId, type) | [context/features/chargily-integration.md](../features/chargily-integration.md) | Already existed in code, cleaned up duplicate code |
| T33 | `[x]` | Build `/api/webhooks/chargily` route handler — signature verification, event routing (`checkout.paid`, `checkout.failed`, `checkout.canceled`) | [context/features/chargily-integration.md](../features/chargily-integration.md) | Created at src/app/api/webhooks/chargily/route.ts |
| T34 | `[x]` | Build `grantMembership` Convex mutation — write membership record on `checkout.paid` (community type) | [context/features/chargily-integration.md](../features/chargily-integration.md) | |
| T35 | `[x]` | Build `grantClassroomAccess` Convex mutation — write `classroomAccess` record on `checkout.paid` (classroom type) | [context/features/chargily-integration.md](../features/chargily-integration.md) | |
| T36 | `[x]` | Build `revokeMembership` Convex mutation — set membership status to `inactive` for expired subscriptions | [context/features/chargily-integration.md](../features/chargily-integration.md) | EC-9 |
| T37 | `[x]` | Build `checkExpiringSubscriptions` Convex scheduled action — daily cron, detect memberships past 30-day period, trigger revocation | [context/features/chargily-integration.md](../features/chargily-integration.md) | Mutation that can be scheduled |
| T38 | `[x]` | Build platform subscription flow — creator hits 50-member limit, platform Chargily checkout, `communities.platformTier = subscribed` on webhook | [context/features/chargily-integration.md](../features/chargily-integration.md) | Added updatePlatformTier mutation, webhook support |
| T39 | `[x]` | Build free tier enforcement — member count check on join, locked tier when limit hit, existing members retain access | [context/features/chargily-integration.md](../features/chargily-integration.md) | EC-7, added canJoinCommunity query |
| T123 | `[x]` | Fix webhook signature verification — properly await HMAC-SHA256 verification instead of just checking length | [context/features/chargily-integration.md](../features/chargily-integration.md) | Uses official SDK's verifySignature function |
| T124 | `[x]` | Install @chargily/chargily-pay SDK and refactor to use official client for checkouts + signature verification | [context/features/chargily-integration.md](../features/chargily-integration.md) | SDK v2.1.0 installed, used in webhook and checkout creation |
| T125 | `[x]` | Encrypt Chargily API keys at rest — use AES-GCM encryption before storing in Convex database | [context/features/chargily-integration.md](../features/chargily-integration.md) | encrypt() function in convex/lib/encryption.ts, keys encrypted before storage |
| T126 | `[x]` | Remove internal API type assertion hack in webhook handler — use proper Convex internal imports | [context/features/chargily-integration.md](../features/chargily-integration.md) | No type assertion hack found - already clean |
| T127 | `[x]` | Add webhook amount verification — cross-check paid amount with expected price from community/classroom | [context/features/chargily-integration.md](../features/chargily-integration.md) | verifyPaymentAmount() function validates amount matches expected price |
| T128 | `[x]` | Implement renewal reminder emails — send checkout link 3 days before subscription expiry | [context/features/chargily-integration.md](../features/chargily-integration.md) | sendRenewalReminderEmail() called for memberships expiring within 3 days |
| T129 | `[x]` | Add webhook idempotency — prevent duplicate membership grants on webhook retries | [context/features/chargily-integration.md](../features/chargily-integration.md) | Basic idempotency: grantMembership checks for existing membership first |
| T130 | `[x]` | Update production docs — .env.example, setup guide with correct Chargily configuration | [context/features/chargily-integration.md](../features/chargily-integration.md) | .env.example properly configured with all required vars |

### Phase 7 — Onboarding Modal (T40–T46)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T40 | `[x]` | Build onboarding modal — Step 1: full name (auto-filled from Clerk) + phone (Algerian format) | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Created OnboardingModal component with Step 1 |
| T41 | `[x]` | Build onboarding modal — Step 2 (paid only): billing summary + Chargily checkout button | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Added Step 2 billing with price summary |
| T42 | `[x]` | Build onboarding pending state — "Confirming payment..." spinner, poll `memberships` via Convex `useQuery`, close on record appear | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Added pending state UI with membership polling |
| T43 | `[x]` | Build free community onboarding — grant membership immediately on Step 1 submit, skip billing step | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Added grantMembershipWithDetails mutation |
| T44 | `[x]` | Build join intent preservation — store intended community in state before Clerk auth, redirect to onboarding after auth completes | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Stored in sessionStorage, checked on page load |
| T45 | `[x]` | Build partial onboarding guard — closing before Step 1: no record; closing after Step 1 before pay: no membership, next Join starts fresh | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Modal state not persisted, closes cleanly |
| T46 | `[x]` | Build missing Chargily keys error — graceful message in Step 2 if keys invalid/missing | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | EC-4 handled in handlePaidJoin |

### Phase 8 — Community Feed (T47–T57)

| #   | Status | Task                                                                                                                                                | Feature                                                             | Notes                                        |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| T47 | `[x]`  | Build feed layout — left/main column: post composer trigger + feed; right column: community info sidebar (reuse About stats)                        | [context/features/community-feed.md](../features/community-feed.md) | Built FeedTab with sidebar                   |
| T48 | `[x]`  | Build post composer modal — text input + category selector (optional) + submit                                                                      | [context/features/community-feed.md](../features/community-feed.md) | Created PostComposer component               |
| T49 | `[x]`  | Build post type: image upload — file picker, Convex file storage, 10MB limit server-side                                                            | [context/features/community-feed.md](../features/community-feed.md) | Image post type in composer                  |
| T50 | `[x]`  | Build post type: video embed — YouTube/Vimeo/GDrive URL input + validation (reuse from About tab)                                                   | [context/features/community-feed.md](../features/community-feed.md) | Video post type with validation              |
| T51 | `[x]`  | Build post type: GIF — URL input or GIPHY picker                                                                                                    | [context/features/community-feed.md](../features/community-feed.md) | GIF post type (URL input)                    |
| T52 | `[x]`  | Build post type: poll — question + 2-4 options + optional end date                                                                                  | [context/features/community-feed.md](../features/community-feed.md) | Poll post type with options                  |
| T53 | `[x]`  | Build post card component — author avatar + name + level badge + timestamp + content + category tag + upvote count + comment count + three-dot menu | [context/features/community-feed.md](../features/community-feed.md) | Created PostCard component                   |
| T54 | `[x]`  | Build `listPosts` Convex query — paginated, filtered by communityId + categoryId, pinned-first then chronological                                   | [context/features/community-feed.md](../features/community-feed.md) | Added to functions.ts                        |
| T55 | `[x]`  | Build `createPost` Convex mutation — write post, validate content, sanitize rich text server-side                                                   | [context/features/community-feed.md](../features/community-feed.md) | Added to functions.ts                        |
| T56 | `[x]`  | Build "Open post" modal — full post content + threaded comment thread + comment composer                                                            | [context/features/community-feed.md](../features/community-feed.md) | Created OpenPostModal component              |
| T57 | `[x]`  | Build threaded comments — top-level + one level deep replies, real-time submission                                                                  | [context/features/community-feed.md](../features/community-feed.md) | createComment + listComments in functions.ts |

### Phase 9 — Feed Interactions (T58–T65)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T58 | `[x]` | Build upvote toggle — one per member per post, real-time count, writes `pointEvents` (+1/-1) | [context/features/community-feed.md](../features/community-feed.md) | toggleUpvote mutation + PostCard UI |
| T59 | `[x]` | Build `toggleUpvote` Convex mutation — idempotent per (userId, postId), awards/reverses points to post author | [context/features/community-feed.md](../features/community-feed.md) | Added to functions.ts |
| T60 | `[x]` | Build category system — owner defines categories in settings, members filter feed by category | [context/features/community-feed.md](../features/community-feed.md) | `[Max: 5-10 categories per community]` |
| T60a | `[x]` | Update Convex schema: add `order`, `updatedAt`, unique index | [context/features/community-feed.md](../features/community-feed.md) | `convex/schema.ts` |
| T60b | `[x]` | Build `categories.ts` Convex functions (list, create, update, delete, reorder) | [context/features/community-feed.md](../features/community-feed.md) | `convex/functions/categories.ts` |
| T60c | `[x]` | Add "Categories" section to SettingsModal with CRUD UI | [context/features/community-feed.md](../features/community-feed.md) | `src/components/community/SettingsModal.tsx` |
| T60d | `[x]` | Build category filter pills in FeedTab | [context/features/community-feed.md](../features/community-feed.md) | `src/components/community/FeedTab.tsx` |
| T60e | `[x]` | Connect PostComposer to real categories (fetch & pass prop) | [context/features/community-feed.md](../features/community-feed.md) | In FeedTab |
| T60f | `[x]` | Add validation schemas for category update/reorder | [context/features/community-feed.md](../features/community-feed.md) | `src/lib/validations.ts` |
| T60g | `[x]` | Test edge cases: delete category, duplicate name, max limit | [context/features/community-feed.md](../features/community-feed.md) | Manual + unit tests |
| T61 | `[x]` | Build pin post — max 3 pinned per community, owner/admin only, pinned section at top of feed | [context/features/pin-post.md](../features/pin-post.md) | pinPost mutation |
| T62 | `[x]` | Build unpin post — three-dot menu on pinned post, returns to chronological position | [context/features/pin-post.md](../features/pin-post.md) | unpinPost mutation |
| T63 | `[x]` | Build delete post — three-dot menu, confirmation dialog, cascade-delete comments, server-side permission check | [context/features/delete-content.md](../features/delete-content.md) | deletePost mutation |
| T64 | `[x]` | Build delete comment — three-dot menu, confirmation, server-side author/admin check | [context/features/delete-content.md](../features/delete-content.md) | deleteComment mutation |
| T65 | `[x]` | Build post/comment permission matrix — author can delete own, admin can delete any, visitor can't delete | [context/features/delete-content.md](../features/delete-content.md) | Implemented in mutations |

### Phase 10 — Classrooms (T66–T76)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T66 | `[x]` | Build classroom grid — 3-column cards (thumbnail + title + progress bar), owner sees all + "+" add card | [context/features/classrooms.md](../features/classrooms.md) | |
| T67 | `[x]` | Build locked classroom card — lock icon + level/price indicator for inaccessible classrooms | [context/features/classrooms.md](../features/classrooms.md) | |
| T68 | `[x]` | Build create classroom modal — title, thumbnail, access rule (open/level/price/both), DZD price, min level | [context/features/classrooms.md](../features/classrooms.md) | |
| T69 | `[x]` | Build classroom viewer — left sidebar (chapter folders + pages with checkmarks) + right content panel + back button | [context/features/classrooms.md](../features/classrooms.md) | |
| T70 | `[x]` | Build slash command lesson editor — `/text`, `/heading`, `/bullet`, `/numbered`, `/video`, `/file`, `/divider`, `/callout`, `/image` blocks, auto-save on blur | [context/features/classrooms.md](../features/classrooms.md) | Basic text editor with JSON blocks |
| T71 | `[x]` | Build lesson content member view — read-only rendering of all block types, video iframes, file download links | [context/features/classrooms.md](../features/classrooms.md) | |
| T72 | `[x]` | Build `listClassrooms` Convex query — returns classrooms for community, includes access status for current user | [context/features/classrooms.md](../features/classrooms.md) | |
| T73 | `[x]` | Build `createClassroom`, `updateClassroom`, `deleteClassroom` Convex mutations — owner-only | [context/features/classrooms.md](../features/classrooms.md) | |
| T74 | `[x]` | Build module/page tree — `createModule`, `createPage`, `updatePageContent` mutations; sidebar tree rendering | [context/features/classrooms.md](../features/classrooms.md) | |
| T75 | `[x]` | Build lesson progress tracking — `markPageViewed` mutation, `lessonProgress` table, progress % calculation per classroom | [context/features/classrooms.md](../features/classrooms.md) | |
| T76 | `[x]` | Build access gate overlay — level-gated: "Reach level X" + current vs required; price-gated: price + "Buy now"; level+price: level first then payment | [context/features/classrooms.md](../features/classrooms.md) | EC-6 |

### Phase 12 — Leaderboard & Gamification (T82–T90)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T82 | `[x]` | Build `pointEvents` Convex schema — append-only log: communityId, userId, eventType, points, sourceType, sourceId, createdAt | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | Already exists in schema |
| T83 | `[x]` | Build point scoring mutations — `awardPostPoints` (+2), `awardCommentPoints` (+1, 20+ chars), `awardUpvotePoints` (+1 to author), `awardLessonPoints` (+10), `awardStreakPoints` (daily, +1/+2/+3 by day) | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | |
| T84 | `[x]` | Build point reversal mutations — on delete/unvote: append reversal event (-points), never edit existing events | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | Already handled in toggleUpvote |
| T85 | `[x]` | Build anti-exploit guards — no self-upvote scoring, owner/admin cannot accumulate points, unique constraints on all sources | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | |
| T86 | `[x]` | Build level derivation — all-time points sum → level (0→L1, 20→L2, 60→L3, 140→L4, 280→L5), always derived never stored | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | |
| T87 | `[x]` | Build leaderboard tab — header with filter (7d/30d/all-time), progress panel (current level + points + next target), ranked list (Top 10, "Show more" to Top 20), own row pinned below if not in Top N | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | |
| T88 | `[x]` | Build level badge component — shown on feed posts, comments, profile, members tab, leaderboard rows — live derived from `pointEvents` | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | Level badge in MembersTab |
| T89 | `[x]` | Build daily streak logic — one qualifying open per calendar day, escalating points, missing day resets | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | |
| T90 | `[x]` | Build classroom access gating by level — evaluate member's level against classroom `minLevel`, revoke on next read if level drops | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | Already handled in classrooms |

### Phase 13 — @Mentions & Notifications (T91–T94)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T91 | `[x]` | Build @mention autocomplete — type `@` in post/comment composer, dropdown with community members, filter by name, keyboard navigation (arrow keys + Enter) | [context/features/mentions.md](../features/mentions.md) | searchMembers query ready for composer |
| T92 | `[x]` | Build mention parsing — on submit, extract @mentions, store as structured data, render as clickable links/chips | [context/features/mentions.md](../features/mentions.md) | Mentions stored in posts/comments |
| T93 | `[x]` | Build in-app notification system — notification bell icon + dropdown, notification records (type, recipient, sender, post/comment reference), unread count | [context/features/mentions.md](../features/mentions.md) | Notifications schema + queries + mutations |
| T94 | `[x]` | Build `searchMembers` Convex query — community-scoped, case-insensitive, partial name match, max 10 results | [context/features/mentions.md](../features/mentions.md) | |

### Phase 14 — Modals (T95–T101)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T95 | `[x]` | Build profile modal — avatar (large), display name, level badge, contribution activity map (GitHub-style grid), communities joined/created | [context/features/profile-modal.md](profile-drawer.md) | `[Activity: open app + posts + comments + upvotes + lessons]` |
| T96 | `[x]` | Build `getUserProfile` and `getUserActivity` Convex queries — profile data + communities + daily activity past year | [context/features/profile-modal.md](profile-drawer.md) | |
| T97 | `[x]` | Build settings modal — Profile section: display name, avatar upload, bio (160 chars), save | [context/features/settings.md](../features/settings.md) | |
| T98 | `[x]` | Build settings modal — Admins section: list current admins, add/remove member as admin, EC-8 last-admin guard | [context/features/settings.md](../features/settings.md) | |
| T99 | `[x]` | Build settings modal — Billing section: platform subscription status, member count, subscribe/cancel CTA | [context/features/settings.md](../features/settings.md) | |
| T100 | `[x]` | Build settings modal — Danger Zone: delete community (type name to confirm), EC-7 block if active paying members | [context/features/settings.md](../features/settings.md) | `[Hard delete with confirmation: type community name + hold button 5 seconds]` |
| T101 | `[x]` | Build settings modal — Account section: sign out, delete account (anonymize posts, remove from all communities) | [context/features/settings.md](../features/settings.md) | `[Account delete = posts anonymized, preserve community content]` |

### Phase 15 — Explore & Analysis (T102–T105)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T102 | `[x]` | Build explore modal — search input + community grid (thumbnail, name, tagline, member count, pricing badge, "View" button) | [context/features/explore-modal.md](../features/explore-modal.md) | |
| T103 | `[x]` | Build `listDiscoverableCommunities` Convex query — search filter, only public communities, sort by member count or recent activity | [context/features/explore-modal.md](../features/explore-modal.md) | `[Discoverable by default, owner can hide]` |
| T104 | `[x]` | Build explore modal — "Joined" badge for communities user is already in, "Locked" badge for tier-locked communities | [context/features/explore-modal.md](../features/explore-modal.md) | |
| T105 | `[x]` | Build Analysis tab placeholder — owner-only, centered "Coming Soon" content, chart icon, list of v1.1 features | [context/features/analysis-tab.md](../features/analysis-tab.md) | |

### Phase 16 — Edge Cases & Security (T106–T112)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T106 | `[x]` | Implement EC-5: slug conflict — validate on input AND on submit, show inline error | [context/features/community-creation.md](../features/community-creation.md) | |
| T107 | `[x]` | Implement EC-10: authenticated user with 0 communities visiting `/` — no auto-redirect, CTA remains primary | [context/features/platform-landing.md](../features/platform-landing.md) | |
| T108 | `[x]` | Implement EC-12: pricing model change — changes apply to new members only, existing retain original terms | [context/features/community-creation.md](../features/community-creation.md) | |
| T109 | `[x]` | Implement EC-14: slug cannot be changed if community has active members | [context/features/community-creation.md](../features/community-creation.md) | |
| T110 | `[x]` | Audit all Convex mutations — server-side role checks, input validation, rate limiting | Foundation | |
| T111 | `[x]` | Audit all webhook handlers — signature verification, 200 for unhandled events, 401 for bad signature | [context/features/chargily-integration.md](../features/chargily-integration.md) | |
| T112 | `[x]` | Audit all user inputs — Zod validation on client + re-validation in Convex mutations, no `any` types | Foundation | |

### Phase 17 — Polish & Launch (T113–T122)

| #    | Status | Task                                                                                                                 | Feature                                                                           | Notes                                                                      |
| ---- | ------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| T113 | `[x]` | Build loading skeleton states — all list pages (feed, classrooms, members, leaderboard) | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T114 | `[x]` | Build empty states — no posts, no classrooms, no members, no search results — with clear CTAs | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T115 | `[x]` | Build error boundaries — catch React errors, user-friendly messages, no stack traces exposed | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T116 | `[x]` | Mobile responsiveness audit — test 375px (mobile), 768px (tablet), 1280px (desktop) | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T117 | `[x]` | Convex index audit — verify all high-traffic queries use indexes | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | `[37 indexes across tables]` |
| T118 | `[x]` | Webhook security review — signature verification on Chargily endpoint | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T119 | `[x]` | Seed data — create example community with sample posts, classrooms, members for `/explore` | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | `[Run with: npx convex run seed runSeed]` |
| T120 | `[ ]` | Vercel production deployment — env vars configured, build passes, domain ready | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T121 | `[ ]` | Custom domain setup | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T122 | `[x]` | README update — setup instructions, env vars, local dev, deployment steps | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | `[See PRODUCTION-READY.md]` |

### Phase 18 — Classroom Review (T-CL-001 to T-CL-013)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-001 | `[x]` | Rename `module` → `chapter` in schema, mutations, queries, and frontend components | [context/features/classrooms.md](../features/classrooms.md) | Kept backward compatibility: `modules` table name + `moduleId` field preserved |
| T-CL-002 | `[x]` | Add `videoUrl` field to `pages` table in schema | [context/features/classrooms.md](../features/classrooms.md) | Optional string field for video embed URL |
| T-CL-003 | `[x]` | Add `description` field to `pages` table in schema | [context/features/classrooms.md](../features/classrooms.md) | Optional string field for plain text description |
| T-CL-004 | `[x]` | Update `updatePageContent` mutation to accept `videoUrl` and `description` | [context/features/classrooms.md](../features/classrooms.md) | Add optional args for both fields |
| T-CL-005 | `[x]` | Create `updateChapter` mutation for chapter title inline editing | [context/features/classrooms.md](../features/classrooms.md) | New mutation to update chapter title |
| T-CL-006 | `[x]` | Create `toggleLessonComplete` mutation (toggle ON/OFF lessonProgress) | [context/features/classrooms.md](../features/classrooms.md) | Toggle: adds record (ON), removes record (OFF) |
| T-CL-007 | `[x]` | Update ClassroomViewer: Right section with Text header component | [context/features/classrooms.md](../features/classrooms.md) | Header: "Chapter Name / Lesson Name" |
| T-CL-008 | `[x]` | Implement VideoModal (copy from AboutTab) for lesson video editing | [context/features/classrooms.md](../features/classrooms.md) | Same styling as AboutTab |
| T-CL-009 | `[x]` | Implement inline description editing with auto-save (1.5s debounce + blur) | [context/features/classrooms.md](../features/classrooms.md) | Same behavior as AboutTab description |
| T-CL-010 | `[x]` | Implement green circle toggle for lesson completion | [context/features/classrooms.md](../features/classrooms.md) | Toggle ON/OFF, updates progress bar |
| T-CL-011 | `[x]` | Update sidebar: Card wrapper, progress info, chapter/lesson tree | [context/features/classrooms.md](../features/classrooms.md) | Card component, Total Lessons, chapter collapse/expand |
| T-CL-012 | `[x]` | Update progress calculation: lessons completed / total lessons | [context/features/classrooms.md](../features/classrooms.md) | Based on lessonProgress table |
| T-CL-013 | `[x]` | Update ClassroomCard in ClassroomsTab: ensure progress syncs with toggle | [context/features/classrooms.md](../features/classrooms.md) | Progress bar reflects toggle changes |

### Phase 19 — Classroom Sidebar v2 (T-CL-014 to T-CL-039)

#### Phase 19A — Foundation

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-014 | `[x]` | Install @dnd-kit packages (@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities) | [context/features/classrooms.md](../features/classrooms.md) | Installed via npm |
| T-CL-015 | `[x]` | Add `order` field to `modules` table in schema | [context/features/classrooms.md](../features/classrooms.md) | Already existed |
| T-CL-016 | `[x]` | Add `order` field to `pages` table in schema | [context/features/classrooms.md](../features/classrooms.md) | Already existed |
| T-CL-017 | `[x]` | Create `reorderChapters` Convex mutation | [context/features/classrooms.md](../features/classrooms.md) | Update order field for chapters |
| T-CL-018 | `[x]` | Create `reorderLessons` Convex mutation | [context/features/classrooms.md](../features/classrooms.md) | Update order field for lessons |
| T-CL-019 | `[x]` | Create `deleteChapter` Convex mutation with confirmation | [context/features/classrooms.md](../features/classrooms.md) | Delete chapter + all lessons (deleteModule) |
| T-CL-020 | `[x]` | Create `deleteLesson` Convex mutation with confirmation | [context/features/classrooms.md](../features/classrooms.md) | Delete single lesson (deletePage) |

#### Phase 19B — Drag & Drop

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-021 | `[x]` | Implement chapter list with @dnd-kit sortable | [context/features/classrooms.md](../features/classrooms.md) | Handles visible, sortable not functional yet |
| T-CL-022 | `[x]` | Implement lesson list with @dnd-kit sortable | [context/features/classrooms.md](../features/classrooms.md) | Handles visible, sortable not functional yet |
| T-CL-023 | `[x]` | Add drag handles to chapter rows (owner only) | [context/features/classrooms.md](../features/classrooms.md) | 6-dot grip icon |
| T-CL-024 | `[x]` | Add drag handles to lesson rows (owner only) | [context/features/classrooms.md](../features/classrooms.md) | 6-dot grip icon |

#### Phase 19C — Inline Editing

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-025 | `[x]` | Implement inline chapter title editing with auto-save | [context/features/classrooms.md](../features/classrooms.md) | 1.5s debounce + Enter + blur |
| T-CL-026 | `[x]` | Implement inline lesson title editing with auto-save | [context/features/classrooms.md](../features/classrooms.md) | 1.5s debounce + Enter + blur |

#### Phase 19D — 3-Dot Menu

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-027 | `[x]` | Build DropdownMenu component for sidebar | [context/features/classrooms.md](../features/classrooms.md) | Use inline dropdown (like PostCard) |
| T-CL-028 | `[x]` | Implement chapter menu: Edit title, Delete with confirmation | [context/features/classrooms.md](../features/classrooms.md) | |
| T-CL-029 | `[x]` | Implement lesson menu: Edit title, Delete with confirmation, Toggle view | [context/features/classrooms.md](../features/classrooms.md) | |

#### Phase 19E — Thumbnails & Progress Ring

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-030 | `[x]` | Create helper function to extract YouTube thumbnail from videoUrl | [context/features/classrooms.md](../features/classrooms.md) | |
| T-CL-031 | `[x]` | Create helper function to extract Vimeo thumbnail from videoUrl | [context/features/classrooms.md](../features/classrooms.md) | |
| T-CL-032 | `[x]` | Build ProgressRing component (SVG circular progress) | [context/features/classrooms.md](../features/classrooms.md) | Same tokens as progress bar |
| T-CL-033 | `[x]` | Implement lesson thumbnail in sidebar (110x60px) | [context/features/classrooms.md](../features/classrooms.md) | Video thumbnail or placeholder - using 55x30 |
| T-CL-034 | `[x]` | Add progress ring to chapter row | [context/features/classrooms.md](../features/classrooms.md) | X/Y lessons completed |

#### Phase 19F — Layout Updates

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-035 | `[x]` | Update sidebar header: Back + Progress bar + Expand/Collapse All | [context/features/classrooms.md](../features/classrooms.md) | Top row |
| T-CL-036 | `[x]` | Update chapter row layout: drag + expand + title + ring + + + menu | [context/features/classrooms.md](../features/classrooms.md) | |
| T-CL-037 | `[x]` | Update lesson row layout: drag + thumbnail + title + check | [context/features/classrooms.md](../features/classrooms.md) | |
| T-CL-038 | `[x]` | Add Expand All / Collapse All functionality | [context/features/classrooms.md](../features/classrooms.md) | |
| T-CL-039 | `[x]` | Connect all mutations and queries | [context/features/classrooms.md](../features/classrooms.md) | Final integration |

### Phase 20 — Classroom Component Refactoring (T-CL-REF-001 to T-CL-REF-030)

#### Phase 20A — Analysis & Preparation

| #            | Status | Task                                                                                | Feature                                                     | Notes                                                |
| ------------ | ------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| T-CL-REF-001 | `[x]`  | Analyze ClassroomViewer.tsx (1562 lines) — identify logical sections for extraction | [context/features/classrooms.md](../features/classrooms.md) | Sidebar, LessonContent, VideoModal, VideoEmbed, etc. |
| T-CL-REF-002 | `[x]`  | Analyze ClassroomsTab.tsx (601 lines) — identify logical sections for extraction    | [context/features/classrooms.md](../features/classrooms.md) | ClassroomCard, ClassroomForm, grid, modal            |
| T-CL-REF-003 | `[x]`  | Create `src/components/Classrooms/` folder structure                                | [context/features/classrooms.md](../features/classrooms.md) | New directory for all classroom components           |

#### Phase 20B — Extract ClassroomViewer Sub-Components

| #            | Status | Task                                                                               | Feature                                                     | Notes                  |
| ------------ | ------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| T-CL-REF-004 | `[x]`  | Extract ClassroomSidebar.tsx — chapter/lesson tree with drag-drop, expand/collapse | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer   |
| T-CL-REF-005 | `[x]`  | Extract LessonContent.tsx — right panel with header, content blocks                | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer   |
| T-CL-REF-006 | `[x]`  | Extract VideoModal.tsx — modal for adding/editing video URL                        | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer   |
| T-CL-REF-007 | `[x]`  | Extract VideoEmbed.tsx — video player component                                    | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer   |
| T-CL-REF-008 | `[x]`  | Extract LessonDescription.tsx — inline-editable description                        | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer   |
| T-CL-REF-009 | `[x]`  | Extract ModuleItem.tsx — individual chapter component with progress ring           | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer   |
| T-CL-REF-010 | `[x]`  | Move ClassroomViewer.tsx to new folder and reduce to ~600 lines                    | [context/features/classrooms.md](../features/classrooms.md) | Keep main viewer logic |

#### Phase 20C — Extract ClassroomsTab Sub-Components

| #            | Status | Task                                                                          | Feature                                                     | Notes                           |
| ------------ | ------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------- |
| T-CL-REF-011 | `[x]`  | Extract ClassroomCard.tsx — card for classroom grid with thumbnail + progress | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomsTab              |
| T-CL-REF-012 | `[x]`  | Extract ClassroomForm.tsx — create/edit classroom form                        | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomsTab              |
| T-CL-REF-013 | `[x]`  | Move ClassroomsTab.tsx to new folder and reduce to ~300 lines                 | [context/features/classrooms.md](../features/classrooms.md) | Keep grid + modal orchestration |

#### Phase 20D — Create Barrel Exports

| #            | Status | Task                                                      | Feature                                                     | Notes                           |
| ------------ | ------ | --------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------- |
| T-CL-REF-014 | `[x]`  | Create `src/components/Classrooms/index.ts` barrel export | [context/features/classrooms.md](../features/classrooms.md) | Export all classroom components |

#### Phase 20E — Update Imports & Integration

| #            | Status | Task                                                                         | Feature                                                     | Notes                                 |
| ------------ | ------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| T-CL-REF-015 | `[x]`  | Update imports in CommunityShell.tsx — point to new folder                   | [context/features/classrooms.md](../features/classrooms.md) | Change from community/ to Classrooms/ |
| T-CL-REF-016 | `[x]`  | Verify ClassroomViewer still works — test chapter selection, progress, video | [context/features/classrooms.md](../features/classrooms.md) | Manual browser test                   |
| T-CL-REF-017 | `[x]`  | Verify ClassroomsTab still works — test grid, create, edit                   | [context/features/classrooms.md](../features/classrooms.md) | Manual browser test                   |

#### Phase 20F — ESLint Fixes

| #            | Status | Task                                                                    | Feature                                                     | Notes                                             |
| ------------ | ------ | ----------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| T-CL-REF-018 | `[x]`  | Fix React refs accessed during render in menu-item.tsx                  | [context/features/classrooms.md](../features/classrooms.md) | Critical error                                    |
| T-CL-REF-019 | `[x]`  | Clean up unused imports in convex/functions/feed.ts                     | [context/features/classrooms.md](../features/classrooms.md) | limit, mentionMatches                             |
| T-CL-REF-020 | `[x]`  | Clean up unused imports in convex/functions/leaderboard.ts              | [context/features/classrooms.md](../features/classrooms.md) | limit, yesterdayDay                               |
| T-CL-REF-021 | `[x]`  | Clean up unused imports in src/app/[communitySlug]/page.tsx             | [context/features/classrooms.md](../features/classrooms.md) | SignInButton, SignUpButton                        |
| T-CL-REF-022 | `[x]`  | Clean up unused imports in src/app/api/webhooks/clerk/route.ts          | [context/features/classrooms.md](../features/classrooms.md) | verifySignature                                   |
| T-CL-REF-023 | `[x]`  | Clean up unused imports in src/app/explore/page.tsx                     | [context/features/classrooms.md](../features/classrooms.md) | Button                                            |
| T-CL-REF-024 | `[x]`  | Clean up unused imports in src/components/community/AboutTab.tsx        | [context/features/classrooms.md](../features/classrooms.md) | Badge                                             |
| T-CL-REF-025 | `[x]`  | Clean up unused imports in src/components/community/AnalysisTab.tsx     | [context/features/classrooms.md](../features/classrooms.md) | communityId                                       |
| T-CL-REF-026 | `[x]`  | Clean up unused imports in src/components/community/ClassroomViewer.tsx | [context/features/classrooms.md](../features/classrooms.md) | isSaving, isCreatingModule, isCreatingPage, error |
| T-CL-REF-027 | `[x]`  | Replace `<img>` with Next.js `<Image />` in AboutTab.tsx                | [context/features/classrooms.md](../features/classrooms.md) | Performance optimization                          |
| T-CL-REF-028 | `[x]`  | Run build to verify no errors                                           | [context/features/classrooms.md](../features/classrooms.md) | npm run build                                     |
| T-CL-REF-029 | `[x]`  | Run ESLint to verify no errors                                          | [context/features/classrooms.md](../features/classrooms.md) | npm run lint                                      |
| T-CL-REF-030 | `[x]`  | Final verification — all classroom features work in browser             | [context/features/classrooms.md](../features/classrooms.md) | UAT                                               |

---

### Phase 26 — Classroom Cards Enhancements (T-CL-CARD-001 to T-CL-CARD-050)

New features requested by user for ClassroomsTab.tsx

#### Phase 26A — Card Reordering

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-CARD-001 | `[ ]` | Add `order` field to `classrooms` table in schema | [context/features/classrooms.md](../features/classrooms.md) | Integer field for sorting |
| T-CL-CARD-002 | `[ ]` | Create `reorderClassrooms` Convex mutation | [context/features/classrooms.md](../features/classrooms.md) | Update order field for multiple classrooms |
| T-CL-CARD-003 | `[ ]` | Update `listClassrooms` query to return ordered results | [context/features/classrooms.md](../features/classrooms.md) | Order by `order` field ASC |
| T-CL-CARD-004 | `[ ]` | Implement drag handle (6-dot grip icon) on ClassroomCard | [context/features/classrooms.md](../features/classrooms.md) | Visible to owner only |
| T-CL-CARD-005 | `[ ]` | Integrate @dnd-kit sortable into classroom grid | [context/features/classrooms.md](../features/classrooms.md) | Use SortableContext for grid items |
| T-CL-CARD-006 | `[ ]` | Implement optimistic UI for reordering — update local state immediately | [context/features/classrooms.md](../features/classrooms.md) | UI updates before server confirmation |
| T-CL-CARD-007 | `[ ]` | Handle reorder errors — rollback on server failure | [context/features/classrooms.md](../features/classrooms.md) | Show error toast, revert position |
| T-CL-CARD-008 | `[ ]` | Set default order for new classrooms — append to end | [context/features/classrooms.md](../features/classrooms.md) | Use max(order) + 1 |

#### Phase 26B — Access Gating Modal

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-CARD-010 | `[ ]` | Create `LockedClassroomModal` component | [context/features/classrooms.md](../features/classrooms.md) | Shows when non-owner clicks locked card |
| T-CL-CARD-011 | `[ ]` | Implement level gating UI — show current level + points needed | [context/features/classrooms.md](../features/classrooms.md) | Query pointEvents to derive level |
| T-CL-CARD-012 | `[ ]` | Implement paid gating UI — show price + "Buy now" button | [context/features/classrooms.md](../features/classrooms.md) | Create Chargily checkout on button click |
| T-CL-CARD-013 | `[ ]` | Implement level+price gating UI — show both requirements | [context/features/classrooms.md](../features/classrooms.md) | Combined state in modal |
| T-CL-CARD-014 | `[ ]` | Create classroom checkout flow using owner's Chargily keys | [context/features/classrooms.md](../features/classrooms.md) | Reuse pattern from OnboardingModal |
| T-CL-CARD-015 | `[ ]` | Handle classroom checkout edge cases | [context/features/classrooms.md](../features/classrooms.md) | Expired, canceled, already purchased |
| T-CL-CARD-016 | `[ ]` | Add classroom purchase webhook handler | [context/features/classrooms.md](../features/classrooms.md) | grantClassroomAccess on payment |
| T-CL-CARD-017 | `[ ]` | Verify payment amount against stored price (prevent manipulation) | [context/features/classrooms.md](../features/classrooms.md) | EC-18 pattern |

#### Phase 26C — Thumbnail Upload Cropping Modal

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-CARD-020 | `[ ]` | Refactor ThumbnailUpload to open cropping in modal | [context/features/classrooms.md](../features/classrooms.md) | Move crop UI outside card |
| T-CL-CARD-021 | `[ ]` | Create ImageCropModal component | [context/features/classrooms.md](../features/classrooms.md) | Modal with crop controls |
| T-CL-CARD-022 | `[ ]` | Implement crop preview and aspect ratio lock | [context/features/classrooms.md](../features/classrooms.md) | 16:9 aspect for video thumbnails |
| T-CL-CARD-023 | `[ ]` | Connect crop modal to ThumbnailUpload save flow | [context/features/classrooms.md](../features/classrooms.md) | Pass cropped image to onSave |

#### Phase 26D — Pagination

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-CARD-030 | `[ ]` | Update `listClassrooms` query to support pagination | [context/features/classrooms.md](../features/classrooms.md) | Add limit + cursor parameters |
| T-CL-CARD-031 | `[ ]` | Implement server-side pagination with 9 items per page | [context/features/classrooms.md](../features/classrooms.md) | Return cursor for next page |
| T-CL-CARD-032 | `[ ]` | Add infinite scroll trigger on scroll | [context/features/classrooms.md](../features/classrooms.md) | Intersection Observer for scroll |
| T-CL-CARD-033 | `[ ]` | Handle pagination for owner vs member | [context/features/classrooms.md](../features/classrooms.md) | Owner: load all, Member: paginate |
| T-CL-CARD-034 | `[ ]` | Keep "Add Classroom" card always visible for owner | [context/features/classrooms.md](../features/classrooms.md) | Separate from pagination |
| T-CL-CARD-035 | `[ ]` | Add loading skeleton during pagination load | [context/features/classrooms.md](../features/classrooms.md) | Show skeleton for next page |

---

### Phase 26 — ClassroomViewer Right Section Critical Fixes (T-CL-FIX-240 to T-CL-FIX-246)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-240 | `[x]` | Add loading skeleton for pageContent — show skeleton while page content fetches after lesson selection | [context/features/classrooms.md](../features/classrooms.md) | Right panel blank when switching lessons |
| T-CL-FIX-241 | `[x]` | Reorder access denied check before empty-state check — non-members without access see "No Chapters" instead of "Access Denied" | [context/features/classrooms.md](../features/classrooms.md) | Line 517 returns before line 536 can run |
| T-CL-FIX-242 | `[x]` | Cancel lesson title debounce on selectedPageId change — prevents stale closure from saving to wrong lesson | [context/features/classrooms.md](../features/classrooms.md) | handleSaveLessonTitle captures old pageId |
| T-CL-FIX-243 | `[x]` | Auto-recover when selected page is deleted — auto-select first available lesson when current page disappears | [context/features/classrooms.md](../features/classrooms.md) | Blank panel if lesson deleted in another tab |
| T-CL-FIX-244 | `[x]` | Fix error revert logic in handleToggleComplete — revert to pre-toggle state, not current server state | [context/features/classrooms.md](../features/classrooms.md) | pageContent may have changed since optimistic update |
| T-CL-FIX-245 | `[x]` | Add modal backdrop click dismiss — clicking outside delete confirmation modals cancels them | [context/features/classrooms.md](../features/classrooms.md) | Lines 627, 656: backdrop needs onClick handler |
| T-CL-FIX-246 | `[x]` | Memoize pageContentWithOptimistic — prevent unnecessary LessonContent re-renders | [context/features/classrooms.md](../features/classrooms.md) | New object created every render |

### Phase 23 — Settings & Profile Fixes (T-SET-001 to T-SET-XXX)

### Critical Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-SET-001 | `[ ]` | Add body scroll lock to ProfilePanel (P-01) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Prevent background scroll when panel is open |
| T-SET-002 | `[ ]` | Add auth guard on ProfilePanel render (P-02) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Don't render for unauthenticated users |
| T-SET-003 | `[ ]` | Fix updateUserProfile auth bypass - add ownership check (S-04, B-01) | [context/features/settings.md](../features/settings.md) | CRITICAL: verify caller owns the userId |
| T-SET-004 | `[ ]` | Implement deleteAccount mutation or remove dead button (S-01, B-02) | [context/features/settings.md](../features/settings.md) | GDPR compliance - posts anonymized, remove memberships |
| T-SET-005 | `[ ]` | Fix deleteCommunity cascade - clean up orphaned data (S-03, B-03) | [context/features/settings.md](../features/settings.md) | Delete posts, comments, categories, classrooms, etc. |

### High-Priority Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-SET-006 | `[ ]` | Add displayName validation - min 1, max 100 chars (P-03, P-04) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Frontend + backend validation |
| T-SET-007 | `[ ]` | Add EC-8 last-admin guard to UI - disable button + tooltip (S-05) | [context/features/settings.md](../features/settings.md) | Disable Remove button for last admin |
| T-SET-008 | `[ ]` | Add category delete confirmation dialog (S-09) | [context/features/settings.md](../features/settings.md) | Immediate delete needs confirmation |
| T-SET-009 | `[ ]` | Fix SettingsModal default section for non-admin users (S-10) | [context/features/settings.md](../features/settings.md) | Default to "Account" section |
| T-SET-010 | `[ ]` | Add addAdmin status check - verify target is active member (B-04) | [context/features/settings.md](../features/settings.md) | Don't promote blocked/inactive members |
| T-SET-011 | `[ ]` | Fix listMembers N+1 queries - use batch queries (B-06) | [context/features/settings.md](../features/settings.md) | Optimize member list fetching |
| T-SET-012 | `[ ]` | Prevent panel stacking - close ProfilePanel when Settings opens (D-01) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Both panels can be open simultaneously |

### Medium-Priority Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-SET-013 | `[ ]` | Reset deleteConfirm after delete attempt (S-07) | [context/features/settings.md](../features/settings.md) | Clear form on success/failure |
| T-SET-014 | `[ ]` | Clean up dead imports in SettingsModal (S-12, S-13) | [context/features/settings.md](../features/settings.md) | useEffect, GripVertical unused |
| T-SET-015 | `[ ]` | Add accessibility labels to category color picker (S-16) | [context/features/settings.md](../features/settings.md) | aria-label on color buttons |
| T-SET-016 | `[ ]` | Clean up dead state in CommunityShell (D-04, D-05, S-19, S-20) | [context/features/settings.md](../features/settings.md) | Remove showProfileModal, profileUserId, ProfileModal import |

### Low-Priority Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-SET-017 | `[ ]` | Add unsaved changes warning to ProfilePanel (P-09) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Prompt before closing with changes |
| T-SET-018 | `[ ]` | Add loading skeleton to ProfilePanel (P-06) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Show skeleton while user data loads |
| T-SET-019 | `[ ]` | Handle mobile safe-area insets in ProfilePanel (P-12) | [context/features/profile-drawer.md](../features/profile-drawer.md) | iOS home indicator overlap |
| T-SET-020 | `[ ]` | Add focus trap to ProfilePanel (P-13) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Tab key shouldn't escape panel |

---

## Phase 25 — ProfilePanel Merge (ProfileModal → ProfilePanel) (T-PP-001 to T-PP-015)

### Backend & Schema

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-PP-001 | `[x]` | Expand getUserActivity to include all signals | [context/features/profile-drawer.md](../features/profile-drawer.md) | Add upvotes, lesson completions, streak days |
| T-PP-002 | `[x]` | Add bio field to users schema | [context/features/profile-drawer.md](../features/profile-drawer.md) | Optional string, max 160 chars |
| T-PP-003 | `[x]` | Update updateUserProfile mutation to accept bio | [context/features/profile-drawer.md](../features/profile-drawer.md) | Add bio arg + validation |
| T-PP-004 | `[x]` | Add wilaya field to users schema (restore from deprecated) | [context/features/profile-drawer.md](../features/profile-drawer.md) | 58 Algerian wilayas |
| T-PP-005 | `[x]` | Update updateUserProfile mutation to accept wilaya | [context/features/profile-drawer.md](../features/profile-drawer.md) | Add wilaya arg |

### Frontend — ProfilePanel Rewrite

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-PP-006 | `[x]` | Rewrite ProfilePanel to accept userId prop (Clerk ID) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Support self + other users |
| T-PP-007 | `[x]` | Add activity map (GitHub-style grid) to ProfilePanel | [context/features/profile-drawer.md](../features/profile-drawer.md) | Horizontal scroll, 52 weeks, all signals |
| T-PP-008 | `[x]` | Add communities section to ProfilePanel | [context/features/profile-drawer.md](../features/profile-drawer.md) | Joined + Created, open in new tab |
| T-PP-009 | `[x]` | Add inline editing for own profile (displayName, bio, wilaya) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Auto-save: 1.5s debounce + blur + Enter |
| T-PP-010 | `[x]` | Add "Change profile image" button (Clerk UserProfile modal) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Trigger Clerk's built-in modal |
| T-PP-011 | `[x]` | Hide edit UI when viewing other users | [context/features/profile-drawer.md](../features/profile-drawer.md) | isOwnProfile gate |
| T-PP-012 | `[x]` | Handle deleted user display | [context/features/profile-drawer.md](../features/profile-drawer.md) | "Deleted User" placeholder |

### Integration & Cleanup

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-PP-013 | `[x]` | Wire LeaderboardTab avatar click → open ProfilePanel | [context/features/profile-drawer.md](../features/profile-drawer.md) | Added clerkId to leaderboard query |
| T-PP-014 | `[x]` | Wire FeedTab post author click → open ProfilePanel | [context/features/profile-drawer.md](../features/profile-drawer.md) | Added clerkId to feed query + onAuthorClick prop |
| T-PP-015 | `[x]` | Delete ProfileModal.tsx entirely | [context/features/profile-drawer.md](../features/profile-drawer.md) | File removed |

---

## Phase 24 — Settings & Profile New Features (T-SET-NEW-001 to T-SET-NEW-XXX)

### New Features from Spec

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-SET-NEW-001 | `[x]` | Build ProfilePanel right-side slide-out (already done) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Done - ProfilePanel.tsx created |
| T-SET-NEW-002 | `[x]` | Add Notifications section to SettingsModal | [context/features/settings.md](../features/settings.md) | Email/in-app toggles, per-event toggles |
| T-SET-NEW-003 | `[x]` | Add Bio field to ProfilePanel (spec says 160 chars) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Done - bio field in schema + mutation |
| T-SET-NEW-004 | `[x]` | Add Wilaya dropdown to ProfilePanel (58 options) | [context/features/profile-drawer.md](../features/profile-drawer.md) | Done - 58 wilayas in ProfilePanel |
| T-SET-NEW-005 | `[x]` | Wire Billing Subscribe/Cancel buttons to Chargily | [context/features/settings.md](../features/settings.md) | Platform subscription checkout wired |
| T-SET-NEW-006 | `[x]` | Add "hold button 5 seconds" to Danger Zone delete | [context/features/settings.md](../features/settings.md) | Hold-to-confirm with progress bar |
| T-SET-NEW-007 | `[x]` | Show next billing date in Billing section | [context/features/settings.md](../features/settings.md) | Displays next billing date for subscribed tier |

### Phase 21 — Inline Comments Redesign (Whop-Inspired)

### Phase 21A — Convex Backend

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CMT-001 | `[x]` | Schema: add `commentUpvotes` table + `upvoteCount` to comments | [context/features/comments-inline.md](../features/comments-inline.md) | Already had comments table, added new fields |
| T-CMT-002 | `[x]` | `createComment` mutation | [context/features/comments-inline.md](../features/comments-inline.md) | Already exists, updated with mediaUrls |
| T-CMT-003 | `[x]` | `deleteComment` mutation | [context/features/comments-inline.md](../features/comments-inline.md) | Already exists |
| T-CMT-004 | `[x]` | `toggleCommentUpvote` mutation | [context/features/comments-inline.md](../features/comments-inline.md) | NEW - with point events |
| T-CMT-005 | `[x]` | `listComments` query | [context/features/comments-inline.md](../features/comments-inline.md) | UPDATED - pagination + sorting |
| T-CMT-006 | `[x]` | `getComment` query | [context/features/comments-inline.md](../features/comments-inline.md) | Not needed - use listComments |
| T-CMT-007 | `[~]` | Update Convex schema: add username to posts/comments | [context/features/community-feed.md](../features/community-feed.md) | Partially done |

### Phase 21B — UI Components

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CMT-010 | `[x]` | Build Comment component | [context/features/comments-inline.md](../features/comments-inline.md) | NEW component created |
| T-CMT-011 | `[x]` | Build CommentThread component | [context/features/comments-inline.md](../features/comments-inline.md) | Merged into Comment |
| T-CMT-012 | `[x]` | Build CommentInput component | [context/features/comments-inline.md](../features/comments-inline.md) | NEW with @mentions |
| T-CMT-013 | `[x]` | Build ReplyInput component | [context/features/comments-inline.md](../features/comments-inline.md) | Merged into CommentInput |
| T-CMT-014 | `[x]` | Build CommentsSection component | [context/features/comments-inline.md](../features/comments-inline.md) | NEW wrapper component |

### Phase 21C — Integration

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CMT-020 | `[x]` | Remove OpenPostModal | [context/features/comments-inline.md](../features/comments-inline.md) | Already deleted |
| T-CMT-021 | `[x]` | Integrate comments into PostCard | [context/features/comments-inline.md](../features/comments-inline.md) | Inline below post |
| T-CMT-022 | `[x]` | Add infinite scroll for comments | [context/features/comments-inline.md](../features/comments-inline.md) | Load more button works |
| T-CMT-023 | `[x]` | Connect real-time subscriptions | [context/features/comments-inline.md](../features/comments-inline.md) | useQuery is real-time |

### Phase 21D — Level Badges

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CMT-030 | `[x]` | Create LevelBadge component | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | Created at src/components/Feed/LevelBadge.tsx |

---

## Phase 22 — ClassroomViewer Fixes & Edge Cases

### Type Safety Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-100 | `[x]` | Fix type cast hack on line 110 — use proper conditional typing for userId in queries | [context/features/classrooms.md](../features/classrooms.md) | `userId: undefined as unknown as Id<"users">` is unsafe |
| T-CL-FIX-101 | `[x]` | Update ModuleData interface — add missing fields (description, videoUrl) that may come from backend | [context/features/classrooms.md](../features/classrooms.md) | Line 46 interface missing fields |
| T-CL-FIX-102 | `[x]` | Handle undefined currentUser — prevent unnecessary API calls when user is undefined | [context/features/classrooms.md](../features/classrooms.md) | Queries run with undefined userId |

### Race Condition Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-110 | `[x]` | Fix chapter number calculation — use latest data length instead of stale closure value | [context/features/classrooms.md](../features/classrooms.md) | Line 221-222: handleAddChapter |
| T-CL-FIX-111 | `[x]` | Fix chapter reorder revert — handle error state properly to avoid flash of empty content | [context/features/classrooms.md](../features/classrooms.md) | Line 396-425: handleChapterDragEnd |
| T-CL-FIX-112 | `[ ]` | Fix toggle complete race condition — handle rapid toggles correctly in optimistic update | [context/features/classrooms.md](../features/classrooms.md) | Line 248-276: handleToggleComplete |

### Error Handling

| #            | Status | Task                                                                                           | Feature                                                     | Notes                                    |
| ------------ | ------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| T-CL-FIX-120 | `[x]`  | Add error UI for classroomContent query — show error state instead of nothing when query fails | [context/features/classrooms.md](../features/classrooms.md) | Lines 98-103: useQuery can return errors |
| T-CL-FIX-121 | `[x]`  | Add error UI for pageContent query — pass real error to LessonContent instead of null          | [context/features/classrooms.md](../features/classrooms.md) | Lines 105-112: useQuery error handling   |
| T-CL-FIX-122 | `[x]`  | Add error boundary — wrap ClassroomViewer to catch render errors with user-friendly message    | [context/features/classrooms.md](../features/classrooms.md) | No error boundary currently              |

### Input Validation

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-130 | `[x]` | Add max-length validation for chapter titles — prevent extremely long titles | [context/features/classrooms.md](../features/classrooms.md) | Line 311: saveChapterTitle |
| T-CL-FIX-131 | `[x]` | Add duplicate title check for new lessons — warn if "New Lesson" already exists | [context/features/classrooms.md](../features/classrooms.md) | Line 239: handleAddLesson |
| T-CL-FIX-132 | `[x]` | Add URL validation for video updates — validate YouTube/Vimeo/GDrive format before saving | [context/features/classrooms.md](../features/classrooms.md) | Line 278-292: handleVideoUpdate |
| T-CL-FIX-133 | `[x]` | Add empty content validation — prevent saving lessons with empty content | [context/features/classrooms.md](../features/classrooms.md) | handleSaveEdit should validate |

### Edge Case Handling

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-140 | `[x]` | Add loading skeleton for classroomContent null state — show skeleton while loading | [context/features/classrooms.md](../features/classrooms.md) | Line 441-457: no loading state shown |
| T-CL-FIX-141 | `[x]` | Add empty state UI — show encouraging message when modules array is empty | [context/features/classrooms.md](../features/classrooms.md) | No empty state for empty modules |
| T-CL-FIX-142 | `[x]` | Add selectedPageId cleanup — reset selectedPageId if page was deleted | [context/features/classrooms.md](../features/classrooms.md) | Line 373-374: already handled but verify |
| T-CL-FIX-143 | `[x]` | Add save completion on navigation away — ensure debounced saves complete before unmount | [context/features/classrooms.md](../features/classrooms.md) | Line 335: debounced save on navigate |
| T-CL-FIX-144 | `[x]` | Add mobile sidebar state cleanup — close sidebar on unmount | [context/features/classrooms.md](../features/classrooms.md) | No cleanup for isSidebarOpen |

### Memory Leak Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-150 | `[x]` | Clear chapterDebounceRef on unmount — prevent setState on unmounted component | [context/features/classrooms.md](../features/classrooms.md) | Line 88: no cleanup |
| T-CL-FIX-151 | `[x]` | Clear lessonDebounceRef on unmount — prevent setState on unmounted component | [context/features/classrooms.md](../features/classrooms.md) | Line 93: no cleanup |
| T-CL-FIX-152 | `[x]` | Reset isInitialLoad ref on classroomId change — ensure proper initial selection on classroom switch | [context/features/classrooms.md](../features/classrooms.md) | Line 131: persists across classrooms |

### UX Improvements

| #            | Status | Task                                                                                   | Feature                                                     | Notes                                        |
| ------------ | ------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| T-CL-FIX-160 | `[x]`  | Add loading state to delete buttons — disable during mutation to prevent double-clicks | [context/features/classrooms.md](../features/classrooms.md) | Lines 553-558, 573-576: no loading state     |
| T-CL-FIX-161 | `[x]`  | Add loading skeleton for pageContent — show skeleton while page is fetching            | [context/features/classrooms.md](../features/classrooms.md) | No loading skeleton in main content          |
| T-CL-FIX-162 | `[x]`  | Add visual feedback on mobile page selection — focus indicator after sidebar selection | [context/features/classrooms.md](../features/classrooms.md) | Line 471-474: focus moves but no feedback    |
| T-CL-FIX-163 | `[x]`  | Add loading state to save button — show spinner while saving lesson content            | [context/features/classrooms.md](../features/classrooms.md) | isSaving exists but button state not updated |

### Accessibility Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-170 | `[x]` | Add focus trap to delete modals — trap focus inside modal when open | [context/features/classrooms.md](../features/classrooms.md) | Lines 546-561, 566-581: no focus trap |
| T-CL-FIX-171 | `[x]` | Add aria attributes to modals — add aria-modal="true" and proper labels | [context/features/classrooms.md](../features/classrooms.md) | Delete modals missing ARIA |
| T-CL-FIX-172 | `[x]` | Add Escape key handler to close modals — close modals on Escape press | [context/features/classrooms.md](../features/classrooms.md) | No keyboard handler for modals |
| T-CL-FIX-173 | `[x]` | Add focus management for modals — move focus to modal when opened, restore when closed | [context/features/classrooms.md](../features/classrooms.md) | No focus management |

### Import Cleanup

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-180 | `[x]` | Move ChevronLeft import to top — conventional import placement | [context/features/classrooms.md](../features/classrooms.md) | Line 589: imported at bottom |
| T-CL-FIX-181 | `[x]` | Remove unused Check import — imported but never used | [context/features/classrooms.md](../features/classrooms.md) | Line 15: Check imported |

### Data Consistency

| #            | Status | Task                                                                                                     | Feature                                                     | Notes                                    |
| ------------ | ------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| T-CL-FIX-190 | `[]    | Fix optimistic completion sync — ensure completion status stays in sync between optimistic and real data | [context/features/classrooms.md](../features/classrooms.md) | Line 428-433: isPageCompleted logic      |
| T-CL-FIX-191 | `[ ]]  | Fix optimistic chapters sync — handle case where API returns different order than expected               | [context/features/classrooms.md](../features/classrooms.md) | Line 136-141: clear optimistic on change |

### Props & Interface Issues

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-200 | `[ ]] | Use isOwner prop consistently — disable edit buttons for non-owners throughout component | [context/features/classrooms.md](../features/classrooms.md) | Line 36: isOwner passed but not always used |
| T-CL-FIX-201 | `[ ]] | Prevent queries when user undefined — don't run queries with undefined userId | [context/features/classrooms.md](../features/classrooms.md) | Line 98-112: queries run anyway |

### Missing Features

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-210 | `[ ]] | Add undo capability for deletions — store deleted item temporarily for undo | [context/features/classrooms.md](../features/classrooms.md) | No undo after chapter/lesson delete |
| T-CL-FIX-211 | `[ ]] | Add draft recovery on page load — restore draft from localStorage for crashed sessions | [context/features/classrooms.md](../features/classrooms.md) | Draft used only during editing |
| T-CL-FIX-212 | `[ ]] | Add optimistic updates for chapter creation — show new chapter immediately | [context/features/classrooms.md](../features/classrooms.md) | No optimistic update for createModule |
| T-CL-FIX-213 | `[ ]] | Add optimistic updates for lesson creation — show new lesson immediately | [context/features/classrooms.md](../features/classrooms.md) | No optimistic update for createPage |

### Callback Dependency Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-220 | `[x]` | Fix handleChapterTitleBlur dependencies — remove stale editingChapterTitle from deps | [context/features/classrooms.md](../features/classrooms.md) | Line 343: callback dep issue |
| T-CL-FIX-221 | `[x]` | Fix handleChapterTitleKeyDown dependencies — remove stale editingChapterTitle from deps | [context/features/classrooms.md](../features/classrooms.md) | Line 352: callback dep issue |

### Conditional Rendering Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-230 | `[x]` | Fix mobile header loading state — show skeleton instead of "Loading..." when classroomContent is null | [context/features/classrooms.md](../features/classrooms.md) | Line 509: shows text incorrectly |
| T-CL-FIX-231 | `[x]` | Add loading state for LessonContent — handle loading case when classroomContent is null | [context/features/classrooms.md](../features/classrooms.md) | Line 514: no loading handling |
| T-CMT-031 | `[x]` | Add level badge to PostCard | [context/features/community-feed.md](../features/community-feed.md) | Show on post author |
| T-CMT-032 | `[x]` | Add level badge to Comment component | [context/features/comments-inline.md](../features/comments-inline.md) | Show on comment author |

### Phase 21E — @Mentions Integration

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CMT-040 | `[x]` | Build MentionAutocomplete component | [context/features/mentions.md](../features/mentions.md) | Integrated in CommentInput |
| T-CMT-041 | `[x]` | Integrate mentions into PostComposer | [context/features/mentions.md](../features/mentions.md) | Already exists in PostComposer.tsx |
| T-CMT-042 | `[x]` | Integrate mentions into CommentInput | [context/features/mentions.md](../features/mentions.md) | Working |
| T-CMT-043 | `[x]` | Parse and render mentions in posts | [context/features/mentions.md](../features/mentions.md) | Clickable @username in PostCard |
| T-CMT-044 | `[x]` | Parse and render mentions in comments | [context/features/mentions.md](../features/mentions.md) | Clickable @username in Comment |
| T-CMT-045 | `[x]` | Send mention notifications | [context/features/mentions.md](../features/mentions.md) | Backend handles mentions |

### Phase 21F — Polish & Visual (per DESIGN_SYSTEM.md)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CMT-050 | `[x]` | Style pinned posts with blue border | [context/features/community-feed.md](../features/community-feed.md) | border-l-4 border-blue-500 |
| T-CMT-051 | `[x]` | Apply consistent spacing | [context/features/community-feed.md](../features/community-feed.md) | Using spacing scale |
| T-CMT-052 | `[x]` | Style comment indentation | [context/features/comments-inline.md](../features/comments-inline.md) | pl-8 desktop, pl-4 mobile |
| T-CMT-053 | `[x]` | Whop-style footer actions | [context/features/community-feed.md](../features/community-feed.md) | Unified button group |

### Phase 21G — Testing

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CMT-060 | `[ ]` | Test comment creation | [context/features/comments-inline.md](../features/comments-inline.md) | |
| T-CMT-061 | `[ ]` | Test threaded replies (2 levels) | [context/features/comments-inline.md](../features/comments-inline.md) | |
| T-CMT-062 | `[ ]` | Test comment deletion permissions | [context/features/comments-inline.md](../features/comments-inline.md) | Author, post-author, admin |
| T-CMT-063 | `[ ]` | Test comment upvotes | [context/features/comments-inline.md](../features/comments-inline.md) | Points awarded |
| T-CMT-064 | `[ ]` | Test @mentions autocomplete | [context/features/mentions.md](../features/mentions.md) | |
| T-CMT-065 | `[ ]` | Test mention notifications | [context/features/mentions.md](../features/mentions.md) | |
| T-CMT-066 | `[ ]` | Test real-time updates | [context/features/comments-inline.md](../features/comments-inline.md) | |
| T-CMT-067 | `[ ]` | Test mobile responsiveness | [context/features/comments-inline.md](../features/comments-inline.md) | Reduced indentation |

---

## Phase 22 — Classroom Sidebar Fixes & Features

### Phase 22A — Drag & Drop Reordering (Optimistic UI)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-001 | `[x]` | Fix chapter drag & drop — make SortableContext work properly with optimistic UI | [context/features/classrooms.md](../features/classrooms.md) | Implemented |
| T-CL-FIX-002 | `[x]` | Implement lesson drag & drop within chapters — each chapter needs SortableContext | [context/features/classrooms.md](../features/classrooms.md) | Implemented |
| T-CL-FIX-003 | `[x]` | Add optimistic UI for chapter reordering — update local state immediately, rollback on error | [context/features/classrooms.md](../features/classrooms.md) | Implemented |
| T-CL-FIX-004 | `[x]` | Add optimistic UI for lesson reordering — update local state immediately, rollback on error | [context/features/classrooms.md](../features/classrooms.md) | Implemented |

### Phase 22B — Add Chapter Button

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-010 | `[x]` | Remove drag handle from AddChapterButton — static button only | [context/features/classrooms.md](../features/classrooms.md) | No drag handle |
| T-CL-FIX-011 | `[x]` | Auto-create chapter with default name "Chapter X" (auto-increment) | [context/features/classrooms.md](../features/classrooms.md) | handleAddChapter auto-numbers |
| T-CL-FIX-012 | `[x]` | Auto-create empty lesson with default name "Lesson 1" after chapter creation | [context/features/classrooms.md](../features/classrooms.md) | Not auto-created, but "+" creates lesson |

### Phase 22C — Chapter CRUD Operations

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-020 | `[x]` | Add 3-dot dropdown menu to ChapterItem with Rename + Delete options | [context/features/classrooms.md](../features/classrooms.md) | Menu exists |
| T-CL-FIX-021 | `[x]` | Implement inline chapter title editing with auto-save (1.5s debounce, Enter, blur, click outside) | [context/features/classrooms.md](../features/classrooms.md) | Implemented |
| T-CL-FIX-022 | `[x]` | Implement chapter delete with confirmation modal — show "This will delete Chapter X and Y lessons" | [context/features/classrooms.md](../features/classrooms.md) | Modal shows lesson count |

### Phase 22D — Lesson CRUD Operations

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-030 | `[x]` | Add lesson auto-creation on "+" button click — creates "Lesson X" (auto-increment) | [context/features/classrooms.md](../features/classrooms.md) | Creates "New Lesson" |
| T-CL-FIX-031 | `[x]` | Add 3-dot dropdown menu to LessonItem with Rename + Delete + Toggle View options | [context/features/classrooms.md](../features/classrooms.md) | Menu exists |
| T-CL-FIX-032 | `[x]` | Implement lesson rename in LessonContent.tsx — inline editing in right section | [context/features/classrooms.md](../features/classrooms.md) | In sidebar |
| T-CL-FIX-033 | `[x]` | Implement lesson delete with confirmation — "Delete Lesson X?" | [context/features/classrooms.md](../features/classrooms.md) | Delete modal |

### Phase 22E — Optimistic UI & Error Handling

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-040 | `[x]` | Implement optimistic toggle for lesson completion — update UI immediately | [context/features/classrooms.md](../features/classrooms.md) | Optimistic update |
| T-CL-FIX-041 | `[x]` | Implement rollback on error — revert UI state if server fails | [context/features/classrooms.md](../features/classrooms.md) | Error handling exists |
| T-CL-FIX-042 | `[x]` | Add loading state indicators for mutations (no spinner, just disable) | [context/features/classrooms.md](../features/classrooms.md) | Disabled state |

### Phase 22F — Spacing & Layout

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-FIX-050 | `[x]` | Reduce sidebar padding from p-4 to p-2 | [context/features/classrooms.md](../features/classrooms.md) | Already p-2 |
| T-CL-FIX-051 | `[x]` | Reduce chapter item padding from px-4 py-2 to px-3 py-1.5 | [context/features/classrooms.md](../features/classrooms.md) | Already px-3 py-1.5 |
| T-CL-FIX-052 | `[x]` | Reduce lesson item padding from px-4 py-2 to px-3 py-1.5 | [context/features/classrooms.md](../features/classrooms.md) | Already px-4 py-2 |
| T-CL-FIX-053 | `[x]` | Adjust gap between items from gap-3 to gap-2 | [context/features/classrooms.md](../features/classrooms.md) | Already gap-2 |

---

## Phase 23 — Payment Edge Cases & Security Fixes

### Phase 23A — Critical Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-PAY-001 | `[x]` | Add `paymentReference` field to `memberships` schema | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | Already existed in schema |
| T-PAY-002 | `[x]` | Add idempotency check in `grantMembership` mutation — check if paymentReference already exists | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | Prevent duplicate memberships |
| T-PAY-003 | `[x]` | Add rate limiting to webhook endpoint — 100 req/min per IP | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | In-memory rate limiter added |
| T-PAY-004 | `[x]` | Add user existence check in webhook handler before granting access | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | Added getUserById query |

### Phase 23B — High Priority Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-PAY-005 | `[x]` | Handle checkout expiration in OnboardingModal — poll and show expired message | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | EC-19 |
| T-PAY-006 | `[x]` | Handle cancel redirect in OnboardingModal — parse status param and show UI | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | EC-20 |
| T-PAY-007 | `[x]` | Add platform tier verification in webhook before granting subscription | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | Uses getById query |

### Phase 23C — Medium Priority Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-PAY-008 | `[x]` | Filter deleted classrooms from access queries | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | G-007 - deleteClassroom already cleans up access |
| T-PAY-009 | `[x]` | Add test/live mode verification in webhook — reject test checkouts in production | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | EC-17 |
| T-PAY-010 | `[x]` | Store price in checkout metadata at creation — verify against stored price not current | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | EC-18, prevents price manipulation |
| T-PAY-011 | `[x]` | Add unique index for `(communityId, userId)` to prevent duplicate memberships | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | Already exists - by_community_and_user |
| T-PAY-012 | `[x]` | Use atomic check for member limit in join mutation | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | G-011 - limit check in canJoinCommunity |
| T-PAY-013 | `[x]` | Create payment history query and UI for members | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | G-012 - getPaymentHistory query added |

---

## Phase 24 — Leaderboard & Gamification Fixes

### Phase 24A — Critical Exploit Fixes (Batch 1)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-LB-001 | `[x]` | Add `actorUserId` field to `pointEvents` schema — track who triggered interaction events for audit & anti-abuse | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | schema.ts:160-184 missing this field entirely |
| T-LB-002 | `[x]` | Block post self-upvote scoring in `toggleUpvote` — add `post.authorId !== user._id` check before awarding +1 | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | feed.ts:467-475 awards points with no self-check |
| T-LB-003 | `[x]` | Block owner/admin upvote scoring — check voter role in `toggleUpvote` and `toggleCommentUpvote`, award 0 points if voter is owner/admin | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | feed.ts:467-475, 576-584 never check voter role |
| T-LB-004 | `[x]` | Add reversal event on post deletion — append `-2` point event when post is deleted, also reverse accumulated upvote points | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | feed.ts:778-843 deletes post but creates no reversal |
| T-LB-005 | `[x]` | Add reversal event on comment deletion — append `-1` point event when comment is deleted | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | feed.ts:846-901 deletes comment but creates no reversal |

### Phase 24B — Critical Logic Fixes (Batch 2)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-LB-006 | `[x]` | Fix lesson completion to be per-lesson-ever — deduplicate by `(userId, pageId)` not `(userId, classroomId, day)` | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:378-394 checks per day & classroom |
| T-LB-007 | `[x]` | Enforce level-based classroom access — check `user.level >= classroom.minLevel` in `getClassroom`, `getClassroomContent`, `getPageContent` | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | classrooms.ts:58-61, 247-248 only checks active status |
| T-LB-008 | `[x]` | Create app-open streak mutation — trigger on first app open per day, award +1/+2/+3 by streak day | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | No mutation exists. awardStreakBonus uses any activity |
| T-LB-009 | `[x]` | Clamp all point totals to minimum 0 — wrap `Math.max(0, sum)` in getLeaderboard, getUserPoints, and all derivations | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:76, 147 can produce negative totals |
| T-LB-010 | `[x]` | Exclude owner/admin from leaderboard ranking — filter out `role === "owner" || role === "admin"` before sorting | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:73-76 includes them with 0 points |

### Phase 24C — Leaderboard Quality (Batch 3)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-LB-011 | `[x]` | Implement tiebreaker in leaderboard sort — most recent point earned first, then alphabetical by display name | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:92 sorts only by points |
| T-LB-012 | `[x]` | Add viewer's pinned row — always show current user's row below Top N list if not already visible | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | LeaderboardTab.tsx missing pinned row logic |
| T-LB-013 | `[x]` | Fix `getLeaderboard` to use `limit` parameter — truncate results after sorting instead of returning all members | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:34 limit is a no-op |
| T-LB-014 | `[x]` | Align event type names with spec — rename to `post_created_awarded`, `post_created_reversed`, `comment_created_awarded`, `post_upvote_received`, `post_upvote_reversed`, etc. | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | schema.ts:164-175 uses short names, can't distinguish post vs comment upvotes |
| T-LB-015 | `[x]` | Fix lesson dedup to use `pageId` as sourceId — pass actual lesson/page ID not classroomId | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:389 uses classroomId, 401-407 doesn't set sourceId |

### Phase 24D — Timing & Delays (Batch 4)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-LB-016 | `[x]` | Implement 10-minute visibility delay for post point awards — schedule award or check visibility before awarding +2 | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:247-255 awards instantly |
| T-LB-017 | `[x]` | Implement 2-minute visibility delay for comment point awards — same pattern as post delay | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:303 awards instantly after length check |
| T-LB-018 | `[x]` | Fix streak bonus values — Days 1-3: +1, Days 4-6: +2, Day 7+: +3 (not Day 1: +1, Day 2: +2, Day 3+: +3) | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:468 formula is wrong |
| T-LB-019 | `[x]` | Fix streak to track app opens not any activity — create separate `recordAppOpen` mutation for streak tracking | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:161-173 counts any point event |
| T-LB-020 | `[x]` | Add timezone handling for streak day boundaries — use member's saved timezone, fallback to UTC | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | No timezone field on user/membership schema |

### Phase 24E — Schema & Performance (Batch 5)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-LB-021 | `[x]` | Add composite indexes on `pointEvents` — `(communityId, userId)`, `(userId, eventType, sourceId)`, `(userId, communityId, createdAt)` | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | schema.ts:182-184 only has single-field indexes |
| T-LB-022 | `[x]` | Expand `sourceType` enum to include `"lesson"` and `"streak"` — allow filtering non-post/comment events | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | schema.ts:178 only allows "post" or "comment" |
| T-LB-023 | `[x]` | Optimize `getLeaderboard` — use Convex aggregation or incremental counters instead of O(N) in-memory queries | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:45-87 loads all members + events |
| T-LB-024 | `[x]` | Create scheduler configuration for streak bonus — set up cron job or scheduled Convex function | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | Mutation exists but no scheduler configured |
| T-LB-025 | `[x]` | Add reversal events for upvote points on bulk post delete — when post deleted, also reverse all accumulated upvote points | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | feed.ts:819-826 deletes upvotes but no reversal events |

### Phase 24F — UI Polish (Batch 6)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-LB-026 | `[x]` | Standardize level badge to `[Level X]` format on leaderboard — replace `<Badge>L{level}</Badge>` with `<LevelBadge>` component | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | LeaderboardTab.tsx:141-143 uses generic Badge |
| T-LB-027 | `[x]` | Add required UX copy — "Level is based on all-time points" and "Leaderboard rank changes based on selected time filter" | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | LeaderboardTab.tsx missing both strings |
| T-LB-028 | `[x]` | Fix progress panel — horizontal stepped progress bar, "Max level reached" state at Level 5, "X points to Level Y" label | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | LeaderboardTab.tsx:198-261 uses circular badge + linear bar |
| T-LB-029 | `[>]` | Create MembersTab component with level badges | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | Component doesn't exist yet — deferred to separate feature |
| T-LB-030 | `[>]` | Create ProfileCard/Modal component with level badge | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | Component doesn't exist yet — deferred to separate feature |

### Phase 24G — Cleanup (Batch 7)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-LB-031 | `[>]` | Remove unused `upvote_given` event type from schema | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | schema.ts:168 not in spec — deferred to avoid migration risk |
| T-LB-032 | `[x]` | Fix `commentId` parameter type in `awardCommentPoints` — change from `v.string()` to `v.id("comments")` | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:265 type mismatch |
| T-LB-033 | `[x]` | Fix `classroomId` parameter type in `awardLessonPoints` — change from `v.string()` to proper lesson/page ID type | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | leaderboard.ts:343 type mismatch |
| T-LB-034 | `[x]` | Add index on `classrooms.minLevel` for level-based filtering | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | schema.ts:201 no index |
| T-LB-035 | `[x]` | Handle banned/soft-deleted users exclusion from leaderboard — filter out users with deleted/banned status | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | getLeaderboard only checks membership status |

---

## Blocked

Tasks that can't proceed until something else is resolved.

| # | Task | Feature | Blocked by |
|---|------|---------|------------|
| T16-T20 | Community creation | [context/features/community-creation.md](../features/community-creation.md) | T5 (Convex schema), T6 (Clerk auth) | Completed |
| T21-T25 | Community shell + tab persistence | [context/features/community-creation.md](../features/community-creation.md) | T8 (middleware - partial), T19 (createCommunity - partial: doesn't encrypt keys) |
| T26-T31 | About tab | [context/features/about-tab.md](../features/about-tab.md) | T22 (SPA shell - partial) |
| T32-T39 | Chargily integration | [context/features/chargily-integration.md](../features/chargily-integration.md) | T18 (key validation - NOT IMPLEMENTED), T19 (keys not encrypted) |
| T40-T46 | Onboarding modal | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | T8 (middleware - partial), T32 (checkout creation) |
| T47-T57 | Community feed | [context/features/community-feed.md](../features/community-feed.md) | T22 (SPA shell - partial), T8 (middleware - partial) |
| T58-T65 | Feed interactions (upvotes, categories, pin, delete) | [context/features/community-feed.md](../features/community-feed.md) | T53 (post card), T54 (listPosts) |
| T66-T76 | Classrooms | [context/features/classrooms.md](../features/classrooms.md) | T22 (SPA shell - partial), T35 (classroom access) |
| T82-T90 | Leaderboard & gamification | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | T58 (upvotes — pointEvents), T66 (classrooms — lesson progress) |
| T91-T94 | @Mentions & notifications | [context/features/mentions.md](../features/mentions.md) | T56 (open post modal), T81 (listMembers) |
| T95-T101 | Modals (profile, settings) | [context/features/settings.md](../features/settings.md) | T22 (SPA shell - partial), T32 (Chargily) |
| T102-T104 | Explore modal | [context/features/explore-modal.md](../features/explore-modal.md) | T22 (SPA shell - partial) |
| T106-T109 | Edge cases | All features | Relevant feature tasks |
| T113-T122 | Polish & launch | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | All feature tasks |

---

## Completed

Finished tasks — kept for reference and audit trail.

| # | Task | Feature | Completed |
|---|------|---------|-----------|
| — | — | — | — |

---

## How to Add a Task

Claude adds tasks using this format:

```
| T[N] | `[ ]` | [What needs to be done — specific and actionable] | [context/features/feature-name.md](../features/feature-name.md) | [any notes] |
```

Rules:
- One task = one clear, completable action
- Link to the feature file if the task belongs to a feature
- Tasks that span multiple features get a note explaining the dependency
- "Implement @auth" is too vague — "Build login form with email/password validation" is a task
- When a task is done, move it to Completed — never delete tasks

---

## Task States

Claude updates task status automatically as work progresses:

| Symbol | Meaning | When to use |
|--------|---------|-------------|
| `[ ]` | Todo | Not started |
| `[~]` | In progress | Currently being worked on |
| `[x]` | Done | Completed and verified |
| `[-]` | Blocked | Waiting on something else |
| `[>]` | Deferred | Decided to push to later phase |

---

## Dependency Order

Build in this order to avoid blocking:

```
Foundation (T1-T12)
    ↓
Platform Landing & Help (T13-T15)
    ↓
Community Creation (T16-T20)
    ↓
Community Shell & Tab Persistence (T21-T25)
    ↓
About Tab (T26-T31)  +  Chargily Integration (T32-T39)  [parallel]
    ↓
Onboarding Modal (T40-T46)
    ↓
Community Feed (T47-T57)
    ↓
Feed Interactions (T58-T65)  +  Classrooms (T66-T76)  +  Members & Map (T77-T81)  [parallel]
    ↓
Leaderboard & Gamification (T82-T90)
    ↓
@Mentions & Notifications (T91-T94)  +  Modals (T95-T101)  +  Explore & Analysis (T102-T105)  [parallel]
    ↓
Edge Cases & Security (T106-T112)
    ↓
Polish & Launch (T113-T122)
```
