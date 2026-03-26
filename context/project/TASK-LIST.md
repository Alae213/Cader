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
| T21 | `[x]` | Build `/[communitySlug]` page — route segment, load community by slug, 404 if not found | [context/features/community-creation.md](../features/community-creation.md) | Integrated with Convex getBySlug, loading & 404 states handled |
| T22 | `[x]` | Build SPA shell — top bar, tab navigation, conditional visibility | [context/features/community-creation.md](../features/community-creation.md) | CommunityShell + TabNav with membership-based visibility |
| T23 | `[x]` | Build tab visibility logic — unauthenticated/non-member: only About; member: all tabs; owner: all + Analysis | [context/features/community-creation.md](../features/community-creation.md) | Added getMembershipBySlug query, tabs hidden for non-members |
| T24 | `[x]` | Build `useTabPersistence` hook — localStorage read/write keyed by community slug | [context/features/tab-persistence.md](../features/tab-persistence.md) | Created useTabPersistence hook + TabNav saves preference |
| T25 | `[x]` | Build tab state restoration — validate stored tab against access, fallback appropriately | [context/features/tab-persistence.md](../features/tab-persistence.md) | Page redirects to stored tab on load if member |
| T26 | `[x]` | Build About tab layout — two-column, responsive | [context/features/about-tab.md](../features/about-tab.md) | |
| T27 | `[x]` | Build video embed component — YouTube/Vimeo/GDrive URL validation on blur | [context/features/about-tab.md](../features/about-tab.md) | |
| T28 | `[x]` | Build stats matrix — members, online now, streak (placeholder) | [context/features/about-tab.md](../features/about-tab.md) | Streak is placeholder |
| T29 | `[x]` | Build inline edit mode for owner — click-to-edit, auto-save on blur | [context/features/about-tab.md](../features/about-tab.md) | |
| T30 | `[x]` | Build `getCommunity` Convex query — getBySlug now returns ownerName, ownerAvatar, onlineCount | [context/features/about-tab.md](../features/about-tab.md) | Implicitly completed |
| T31 | `[x]` | Build public/non-member view — top bar shows placeholder avatar, tabs hidden | [context/features/about-tab.md](../features/about-tab.md) | |

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
| T17 | `[x]` | Build community creation modal — Step 2: pricing type (free/monthly/annual/one-time) + DZD price + Chargily keys + Wilaya dropdown | [context/features/community-creation.md](../features/community-creation.md) | |
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
| T25 | `[x]` | Build tab state restoration — on load, validate stored tab against access; fallback to About (unauthenticated) or Community (member) | [context/features/tab-persistence.md](../features/tab-persistence.md) | `[Q: Clear stored tab on logout?]` |

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

### Phase 7 — Onboarding Modal (T40–T46)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T40 | `[x]` | Build onboarding modal — Step 1: full name (auto-filled from Clerk) + phone (Algerian format) + Wilaya dropdown | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Created OnboardingModal component with Step 1 |
| T41 | `[x]` | Build onboarding modal — Step 2 (paid only): billing summary + Chargily checkout button | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Added Step 2 billing with price summary |
| T42 | `[x]` | Build onboarding pending state — "Confirming payment..." spinner, poll `memberships` via Convex `useQuery`, close on record appear | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Added pending state UI with membership polling |
| T43 | `[x]` | Build free community onboarding — grant membership immediately on Step 1 submit, skip billing step | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Added grantMembershipWithDetails mutation |
| T44 | `[x]` | Build join intent preservation — store intended community in state before Clerk auth, redirect to onboarding after auth completes | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Stored in sessionStorage, checked on page load |
| T45 | `[x]` | Build partial onboarding guard — closing before Step 1: no record; closing after Step 1 before pay: no membership, next Join starts fresh | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | Modal state not persisted, closes cleanly |
| T46 | `[x]` | Build missing Chargily keys error — graceful message in Step 2 if keys invalid/missing | [context/features/onboarding-modal.md](../features/onboarding-modal.md) | EC-4 handled in handlePaidJoin |

### Phase 8 — Community Feed (T47–T57)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T47 | `[x]` | Build feed layout — left/main column: post composer trigger + feed; right column: community info sidebar (reuse About stats) | [context/features/community-feed.md](../features/community-feed.md) | Built FeedTab with sidebar |
| T48 | `[x]` | Build post composer modal — text input + category selector (optional) + submit | [context/features/community-feed.md](../features/community-feed.md) | Created PostComposer component |
| T49 | `[x]` | Build post type: image upload — file picker, Convex file storage, 10MB limit server-side | [context/features/community-feed.md](../features/community-feed.md) | Image post type in composer |
| T50 | `[x]` | Build post type: video embed — YouTube/Vimeo/GDrive URL input + validation (reuse from About tab) | [context/features/community-feed.md](../features/community-feed.md) | Video post type with validation |
| T51 | `[x]` | Build post type: GIF — URL input or GIPHY picker | [context/features/community-feed.md](../features/community-feed.md) | GIF post type (URL input) |
| T52 | `[x]` | Build post type: poll — question + 2-4 options + optional end date | [context/features/community-feed.md](../features/community-feed.md) | Poll post type with options |
| T53 | `[x]` | Build post card component — author avatar + name + level badge + timestamp + content + category tag + upvote count + comment count + three-dot menu | [context/features/community-feed.md](../features/community-feed.md) | Created PostCard component |
| T54 | `[x]` | Build `listPosts` Convex query — paginated, filtered by communityId + categoryId, pinned-first then chronological | [context/features/community-feed.md](../features/community-feed.md) | Added to functions.ts |
| T55 | `[x]` | Build `createPost` Convex mutation — write post, validate content, sanitize rich text server-side | [context/features/community-feed.md](../features/community-feed.md) | Added to functions.ts |
| T56 | `[x]` | Build "Open post" modal — full post content + threaded comment thread + comment composer | [context/features/community-feed.md](../features/community-feed.md) | Created OpenPostModal component |
| T57 | `[x]` | Build threaded comments — top-level + one level deep replies, real-time submission | [context/features/community-feed.md](../features/community-feed.md) | createComment + listComments in functions.ts |

### Phase 9 — Feed Interactions (T58–T65)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T58 | `[x]` | Build upvote toggle — one per member per post, real-time count, writes `pointEvents` (+1/-1) | [context/features/community-feed.md](../features/community-feed.md) | toggleUpvote mutation + PostCard UI |
| T59 | `[x]` | Build `toggleUpvote` Convex mutation — idempotent per (userId, postId), awards/reverses points to post author | [context/features/community-feed.md](../features/community-feed.md) | Added to functions.ts |
| T60 | `[ ]` | Build category system — owner defines categories in settings, members filter feed by category | [context/features/community-feed.md](../features/community-feed.md) | `[Q: Max categories per community?]` |
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

### Phase 11 — Members & Wilaya Map (T77–T81)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T77 | `[x]` | Build Algeria SVG map — 58 Wilayas as clickable/hoverable regions, zoom controls, tooltip (name + member count) | [context/features/members-wilaya-map.md](../features/members-wilaya-map.md) | Using grid layout (simplified from full SVG) |
| T78 | `[x]` | Build member list — search by display name (real-time), filter by Wilaya (reactive to map click), rows with avatar + name + level + Wilaya + join date | [context/features/members-wilaya-map.md](../features/members-wilaya-map.md) | |
| T79 | `[x]` | Build member profile popover — click member row → avatar, name, level, Wilaya, communities in common | [context/features/members-wilaya-map.md](../features/members-wilaya-map.md) | Shows basic info + block action for admins |
| T80 | `[x]` | Build block member — owner action in popover, confirmation, `memberships.status = blocked`, immediate access revoke | [context/features/members-wilaya-map.md](../features/members-wilaya-map.md) | |
| T81 | `[x]` | Build `listMembers` and `getMemberCountByWilaya` Convex queries — active members with Wilaya data, live counts | [context/features/members-wilaya-map.md](../features/members-wilaya-map.md) | |

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
| T91 | `[ ]` | Build @mention autocomplete — type `@` in post/comment composer, dropdown with community members, filter by name, keyboard navigation (arrow keys + Enter) | [context/features/mentions.md](../features/mentions.md) | |
| T92 | `[ ]` | Build mention parsing — on submit, extract @mentions, store as structured data, render as clickable links/chips | [context/features/mentions.md](../features/mentions.md) | |
| T93 | `[ ]` | Build in-app notification system — notification bell icon + dropdown, notification records (type, recipient, sender, post/comment reference), unread count | [context/features/mentions.md](../features/mentions.md) | `[Q: Notification bell in v1? Or just @mention inline + Chargily flow?]` |
| T94 | `[ ]` | Build `searchMembers` Convex query — community-scoped, case-insensitive, partial name match, max 10 results | [context/features/mentions.md](../features/mentions.md) | |

### Phase 14 — Modals (T95–T101)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T95 | `[ ]` | Build profile modal — avatar (large), display name, level badge, Wilaya, contribution activity map (GitHub-style grid), communities joined/created | [context/features/profile-modal.md](../features/profile-modal.md) | `[Q: Activity = posts only, or posts + comments + upvotes + lessons?]` |
| T96 | `[ ]` | Build `getUserProfile` and `getUserActivity` Convex queries — profile data + communities + daily activity past year | [context/features/profile-modal.md](../features/profile-modal.md) | |
| T97 | `[ ]` | Build settings modal — Profile section: display name, avatar upload, bio (160 chars), Wilaya dropdown, save | [context/features/settings.md](../features/settings.md) | |
| T98 | `[ ]` | Build settings modal — Admins section: list current admins, add/remove member as admin, EC-8 last-admin guard | [context/features/settings.md](../features/settings.md) | |
| T99 | `[ ]` | Build settings modal — Billing section: platform subscription status, member count, subscribe/cancel CTA | [context/features/settings.md](../features/settings.md) | |
| T100 | `[ ]` | Build settings modal — Danger Zone: delete community (type name to confirm), EC-7 block if active paying members | [context/features/settings.md](../features/settings.md) | `[Q: Soft delete (30-day retention) or hard delete?]` |
| T101 | `[ ]` | Build settings modal — Account section: sign out, delete account (anonymize posts, remove from all communities) | [context/features/settings.md](../features/settings.md) | `[Q: Account delete = posts removed or anonymized?]` |

### Phase 15 — Explore & Analysis (T102–T105)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T102 | `[ ]` | Build explore modal — search input (debounced) + community grid (thumbnail, name, tagline, member count, pricing badge, "View" button) | [context/features/explore-modal.md](../features/explore-modal.md) | |
| T103 | `[ ]` | Build `listDiscoverableCommunities` Convex query — search filter, only public communities, sort by member count or recent activity | [context/features/explore-modal.md](../features/explore-modal.md) | `[Q: All communities discoverable by default or opt-in?]` |
| T104 | `[ ]` | Build explore modal — "Joined" badge for communities user is already in, "Locked" badge for tier-locked communities | [context/features/explore-modal.md](../features/explore-modal.md) | |
| T105 | `[ ]` | Build Analysis tab placeholder — owner-only, centered "Coming Soon" content, chart icon, list of v1.1 features | [context/features/analysis-tab.md](../features/analysis-tab.md) | |

### Phase 16 — Edge Cases & Security (T106–T112)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T106 | `[ ]` | Implement EC-5: slug conflict — validate on input AND on submit, show inline error | [context/features/community-creation.md](../features/community-creation.md) | |
| T107 | `[ ]` | Implement EC-10: authenticated user with 0 communities visiting `/` — no auto-redirect, CTA remains primary | [context/features/platform-landing.md](../features/platform-landing.md) | |
| T108 | `[ ]` | Implement EC-12: pricing model change — changes apply to new members only, existing retain original terms | [context/features/community-creation.md](../features/community-creation.md) | |
| T109 | `[ ]` | Implement EC-14: slug cannot be changed if community has active members | [context/features/community-creation.md](../features/community-creation.md) | |
| T110 | `[ ]` | Audit all Convex mutations — server-side role checks, input validation, rate limiting | Foundation | |
| T111 | `[ ]` | Audit all webhook handlers — signature verification, 200 for unhandled events, 401 for bad signature | [context/features/chargily-integration.md](../features/chargily-integration.md) | |
| T112 | `[ ]` | Audit all user inputs — Zod validation on client + re-validation in Convex mutations, no `any` types | Foundation | |

### Phase 17 — Polish & Launch (T113–T122)

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T113 | `[ ]` | Build loading skeleton states — all list pages (feed, classrooms, members, leaderboard) | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T114 | `[ ]` | Build empty states — no posts, no classrooms, no members, no search results — with clear CTAs | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T115 | `[ ]` | Build error boundaries — catch React errors, user-friendly messages, no stack traces exposed | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T116 | `[ ]` | Mobile responsiveness audit — test 375px (mobile), 768px (tablet), 1280px (desktop) | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T117 | `[ ]` | Convex index audit — verify all high-traffic queries use indexes (communityId, userId, lessonId, membershipStatus) | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T118 | `[ ]` | Webhook security review — signature verification on all endpoints, no sensitive data in logs, keys encrypted at rest | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T119 | `[ ]` | Seed data — create example community with sample posts, classrooms, members for `/explore` | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | `[Q: Full sample courses/posts/members or basic info only?]` |
| T120 | `[ ]` | Vercel production deployment — env vars configured, build passes, domain ready | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |
| T121 | `[ ]` | Custom domain setup | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | `[Q: Custom domain for production?]` |
| T122 | `[ ]` | README update — setup instructions, env vars, local dev, deployment steps | [context/features/phase-9-polish-launch.md](../features/phase-9-polish-launch.md) | |

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
| T77-T81 | Members & Wilaya map | [context/features/members-wilaya-map.md](../features/members-wilaya-map.md) | T22 (SPA shell - partial) |
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
