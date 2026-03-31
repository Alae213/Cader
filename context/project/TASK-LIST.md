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

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CMT-021 | `[x]` | Integrate inline comments into PostCard | [context/features/comments-inline.md](../features/comments-inline.md) | Done - click comment to expand |
| T-CMT-010 | `[x]` | Build Comment component | [context/features/comments-inline.md](../features/comments-inline.md) | Done |
| T-CMT-012 | `[x]` | Build CommentInput with @mentions | [context/features/comments-inline.md](../features/comments-inline.md) | Done |
| T-CMT-004 | `[x]` | toggleCommentUpvote mutation | [context/features/comments-inline.md](../features/comments-inline.md) | Done - with gamification |
| T-CMT-050 | `[x]` | Pinned posts blue border | [context/features/community-feed.md](../features/community-feed.md) | Done |
| T-CMT-030 | `[x]` | LevelBadge component [Level X] | [context/features/leaderboard-gamification.md](../features/leaderboard-gamification.md) | Done |
| T-CMT-043 | `[x]` | Parse/render mentions in posts | [context/features/comments-inline.md](../features/comments-inline.md) | Done |
| T-CMT-044 | `[x]` | Parse/render mentions in comments | [context/features/comments-inline.md](../features/comments-inline.md) | Done |
| T-CL-FIX-001 | `[x]` | Fix chapter drag & drop | [context/features/classrooms.md](../features/classrooms.md) | Done |
| T-CL-FIX-011 | `[x]` | Auto-create chapter with "Chapter X" | [context/features/classrooms.md](../features/classrooms.md) | Done |
| T-CL-FIX-030 | `[x]` | Lesson auto-creation on "+" | [context/features/classrooms.md](../features/classrooms.md) | Done |

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
| T95 | `[x]` | Build profile modal — avatar (large), display name, level badge, contribution activity map (GitHub-style grid), communities joined/created | [context/features/profile-modal.md](../features/profile-modal.md) | `[Activity: open app + posts + comments + upvotes + lessons]` |
| T96 | `[x]` | Build `getUserProfile` and `getUserActivity` Convex queries — profile data + communities + daily activity past year | [context/features/profile-modal.md](../features/profile-modal.md) | |
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

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-REF-001 | `[ ]` | Analyze ClassroomViewer.tsx (1562 lines) — identify logical sections for extraction | [context/features/classrooms.md](../features/classrooms.md) | Sidebar, LessonContent, VideoModal, VideoEmbed, etc. |
| T-CL-REF-002 | `[ ]` | Analyze ClassroomsTab.tsx (601 lines) — identify logical sections for extraction | [context/features/classrooms.md](../features/classrooms.md) | ClassroomCard, ClassroomForm, grid, modal |
| T-CL-REF-003 | `[ ]` | Create `src/components/Classrooms/` folder structure | [context/features/classrooms.md](../features/classrooms.md) | New directory for all classroom components |

#### Phase 20B — Extract ClassroomViewer Sub-Components

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-REF-004 | `[ ]` | Extract ClassroomSidebar.tsx — chapter/lesson tree with drag-drop, expand/collapse | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer |
| T-CL-REF-005 | `[ ]` | Extract LessonContent.tsx — right panel with header, content blocks | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer |
| T-CL-REF-006 | `[ ]` | Extract VideoModal.tsx — modal for adding/editing video URL | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer |
| T-CL-REF-007 | `[ ]` | Extract VideoEmbed.tsx — video player component | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer |
| T-CL-REF-008 | `[ ]` | Extract LessonDescription.tsx — inline-editable description | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer |
| T-CL-REF-009 | `[ ]` | Extract ModuleItem.tsx — individual chapter component with progress ring | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomViewer |
| T-CL-REF-010 | `[ ]` | Move ClassroomViewer.tsx to new folder and reduce to ~600 lines | [context/features/classrooms.md](../features/classrooms.md) | Keep main viewer logic |

#### Phase 20C — Extract ClassroomsTab Sub-Components

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-REF-011 | `[ ]` | Extract ClassroomCard.tsx — card for classroom grid with thumbnail + progress | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomsTab |
| T-CL-REF-012 | `[ ]` | Extract ClassroomForm.tsx — create/edit classroom form | [context/features/classrooms.md](../features/classrooms.md) | From ClassroomsTab |
| T-CL-REF-013 | `[ ]` | Move ClassroomsTab.tsx to new folder and reduce to ~300 lines | [context/features/classrooms.md](../features/classrooms.md) | Keep grid + modal orchestration |

#### Phase 20D — Create Barrel Exports

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-REF-014 | `[ ]` | Create `src/components/Classrooms/index.ts` barrel export | [context/features/classrooms.md](../features/classrooms.md) | Export all classroom components |

#### Phase 20E — Update Imports & Integration

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-REF-015 | `[ ]` | Update imports in CommunityShell.tsx — point to new folder | [context/features/classrooms.md](../features/classrooms.md) | Change from community/ to Classrooms/ |
| T-CL-REF-016 | `[ ]` | Verify ClassroomViewer still works — test chapter selection, progress, video | [context/features/classrooms.md](../features/classrooms.md) | Manual browser test |
| T-CL-REF-017 | `[ ]` | Verify ClassroomsTab still works — test grid, create, edit | [context/features/classrooms.md](../features/classrooms.md) | Manual browser test |

#### Phase 20F — ESLint Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-CL-REF-018 | `[ ]` | Fix React refs accessed during render in menu-item.tsx | [context/features/classrooms.md](../features/classrooms.md) | Critical error |
| T-CL-REF-019 | `[ ]` | Clean up unused imports in convex/functions/feed.ts | [context/features/classrooms.md](../features/classrooms.md) | limit, mentionMatches |
| T-CL-REF-020 | `[ ]` | Clean up unused imports in convex/functions/leaderboard.ts | [context/features/classrooms.md](../features/classrooms.md) | limit, yesterdayDay |
| T-CL-REF-021 | `[ ]` | Clean up unused imports in src/app/[communitySlug]/page.tsx | [context/features/classrooms.md](../features/classrooms.md) | SignInButton, SignUpButton |
| T-CL-REF-022 | `[ ]` | Clean up unused imports in src/app/api/webhooks/clerk/route.ts | [context/features/classrooms.md](../features/classrooms.md) | verifySignature |
| T-CL-REF-023 | `[ ]` | Clean up unused imports in src/app/explore/page.tsx | [context/features/classrooms.md](../features/classrooms.md) | Button |
| T-CL-REF-024 | `[ ]` | Clean up unused imports in src/components/community/AboutTab.tsx | [context/features/classrooms.md](../features/classrooms.md) | Badge |
| T-CL-REF-025 | `[ ]` | Clean up unused imports in src/components/community/AnalysisTab.tsx | [context/features/classrooms.md](../features/classrooms.md) | communityId |
| T-CL-REF-026 | `[ ]` | Clean up unused imports in src/components/community/ClassroomViewer.tsx | [context/features/classrooms.md](../features/classrooms.md) | isSaving, isCreatingModule, isCreatingPage, error |
| T-CL-REF-027 | `[ ]` | Replace `<img>` with Next.js `<Image />` in AboutTab.tsx | [context/features/classrooms.md](../features/classrooms.md) | Performance optimization |
| T-CL-REF-028 | `[ ]` | Run build to verify no errors | [context/features/classrooms.md](../features/classrooms.md) | npm run build |
| T-CL-REF-029 | `[ ]` | Run ESLint to verify no errors | [context/features/classrooms.md](../features/classrooms.md) | npm run lint |
| T-CL-REF-030 | `[ ]` | Final verification — all classroom features work in browser | [context/features/classrooms.md](../features/classrooms.md) | UAT |

---

## Phase 21 — Inline Comments Redesign (Whop-Inspired)

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
| T-PAY-001 | `[ ]` | Add `paymentReference` field to `memberships` schema | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | Store Chargily checkout ID for idempotency |
| T-PAY-002 | `[ ]` | Add idempotency check in `grantMembership` mutation — check if paymentReference already exists | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | Prevent duplicate memberships |
| T-PAY-003 | `[ ]` | Add rate limiting to webhook endpoint — 100 req/min per IP | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | Use Upstash or similar |
| T-PAY-004 | `[ ]` | Add user existence check in webhook handler before granting access | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | Graceful handling if user deleted |

### Phase 23B — High Priority Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-PAY-005 | `[ ]` | Handle checkout expiration in OnboardingModal — poll and show expired message | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | EC-19 |
| T-PAY-006 | `[ ]` | Handle cancel redirect in OnboardingModal — parse status param and show UI | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | EC-20 |
| T-PAY-007 | `[ ]` | Add platform tier verification in webhook before granting subscription | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | Verify community exists |

### Phase 23C — Medium Priority Fixes

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T-PAY-008 | `[ ]` | Filter deleted classrooms from access queries | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | G-007 |
| T-PAY-009 | `[ ]` | Add test/live mode verification in webhook — reject test checkouts in production | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | EC-17 |
| T-PAY-010 | `[ ]` | Store price in checkout metadata at creation — verify against stored price not current | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | EC-18, prevents price manipulation |
| T-PAY-011 | `[ ]` | Add unique index for `(communityId, userId)` to prevent duplicate memberships | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | Database-level duplicate prevention |
| T-PAY-012 | `[ ]` | Use atomic check for member limit in join mutation | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | G-011 |
| T-PAY-013 | `[ ]` | Create payment history query and UI for members | [context/features/payment-edge-cases.md](../features/payment-edge-cases.md) | G-012 |

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
