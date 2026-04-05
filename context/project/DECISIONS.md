# Architecture Decision Log

> Log significant decisions here as they are made. Never delete entries — add a "superseded by" note instead.

---

## ADR-001 — Convex over Supabase / PlanetScale

**Decision:** Use Convex as the backend, database, and real-time layer.
**Date:** March 2026
**Context:** Needed a backend that supports real-time updates (feed, leaderboard, gamification) without polling infrastructure, while keeping costs at zero for a solo MVP.
**Options Considered:** Supabase, PlanetScale + tRPC, Firebase
**Rationale:**
- Convex provides real-time reactive queries via `useQuery` — feed posts, leaderboard, and points update live without polling.
- TypeScript-first schema and mutation model eliminates the ORM layer entirely (no Prisma, no Drizzle).
- Convex's free tier is generous for a solo early-stage project.
- Supabase requires managing Postgres schema migrations separately. Convex schema is colocated with code.
- All backend logic (queries, mutations, actions) lives in `convex/`. No separate API server needed.
**Consequences:** Every backend operation goes through Convex. No SQL. No separate migration tooling.

---

## ADR-002 — Clerk over NextAuth / Auth.js

**Decision:** Use Clerk for authentication.
**Date:** March 2026
**Context:** Needed a production-grade auth solution that integrates cleanly with Next.js App Router and Convex.
**Options Considered:** NextAuth v4, Auth.js (NextAuth v5), Supabase Auth
**Rationale:**
- Clerk provides a production-grade sign-in/sign-up modal UI out of the box — no need to build auth screens.
- Clerk's middleware is the simplest way to protect App Router routes.
- The Clerk → Convex sync pattern (webhook on `user.created` → Convex `users` table) is well-documented and reliable.
- Free tier covers early-stage user counts.
**Consequences:** User identity is owned by Clerk. Convex stores a `users` table synced via Clerk webhook. Clerk `userId` is the foreign key throughout the entire data model.

---

## ADR-003 — Chargily Pay as the only payment gateway

**Decision:** Chargily Pay (DZD) is the sole payment gateway. No Stripe. No PayPal.
**Date:** March 2026
**Context:** The entire product exists to solve the payment infrastructure gap for Algerian creators.
**Options Considered:** Stripe (rejected — no DZD/Algerian cards), PayPal (rejected — same reason), manual bank transfer (rejected — no automation)
**Rationale:**
- Stripe and PayPal do not support Algerian CIB or Edahabia bank cards — a hard technical constraint, not a preference.
- Chargily Pay is the only viable automated gateway for this market.
- The creator-owns-their-Chargily-account model means Cader never touches creator funds directly — reduces platform liability.
**Consequences:** All checkout flows are built around Chargily's API. Multi-currency support is permanently out of scope. Any future payment feature must go through Chargily.

---

## ADR-004 — Community-scoped roles only (no platform-level Creator/Student types)

**Decision:** No global role system. Roles (`admin`, `member`) exist only in the `memberships` table, scoped per community.
**Date:** March 2026
**Context:** A user can be an admin of one community and a student in another simultaneously. A platform-level role field cannot represent this.
**Options Considered:** Platform-level `role` column on the `users` table
**Rationale:**
- Community-scoped roles match the actual user model (a person can be an expert in topic A and a beginner in topic B).
- Simplifies auth logic: every permission check queries `memberships` with `(userId, communityId)` — this is the authoritative source.
- Matches Skool's proven model.
**Consequences:** Every permission check must join `memberships` on `(userId, communityId)`. There is no shortcut "isCreator" global flag.

---

## ADR-005 — English only for MVP

**Decision:** The interface is English only for v1. Arabic and French support are deferred to v1.1.
**Date:** March 2026
**Context:** Algeria is trilingual (Arabic, Darija, French); the target tech-savvy creator persona typically operates professionally in French or English.
**Options Considered:** Arabic/French bilingual from day one
**Rationale:**
- Building i18n from scratch adds significant complexity: RTL layout for Arabic, translation management, font support.
- The Algerian tech-savvy creator (primary target) typically uses French or English professionally.
- Currency (DZD, د.ج) is the critical local feature — language localization can follow in v1.1.
**Consequences:** All UI copy, labels, and error messages are in English for v1. The د.ج currency symbol is used for DZD amounts. i18n deferred to v1.1.

---

## ADR-006 — Dark mode only for MVP

**Decision:** Cader ships dark mode only. Light mode is deferred to v1.1.
**Date:** March 2026
**Context:** Community platforms (Discord, Skool) trend dark; the target audience is comfortable with it. Designing both themes in parallel doubles CSS complexity.
**Options Considered:** Light mode default, system-preference-aware toggle from day one
**Rationale:**
- Dark mode first allows a more distinctive, atmospheric aesthetic without maintaining two complete themes.
- All color tokens are defined as CSS custom properties (`--color-bg`, etc.) in `tailwind.config.ts` — light mode can be added by overriding tokens in v1.1 with zero component rework.
**Consequences:** All color tokens are dark-mode values. A token system (not hardcoded hex values) is enforced from day one so light mode can be added by overriding tokens later.

---

## ADR-007 — No native video hosting

**Decision:** Video content in lessons and the About tab is embedded only (YouTube, Vimeo, Google Drive URL). No file upload or video hosting.
**Date:** March 2026
**Context:** Video hosting (transcoding, storage, CDN bandwidth) is expensive and complex infrastructure at any scale.
**Options Considered:** Mux, Cloudflare Stream, direct S3/Convex storage upload
**Rationale:**
- Video hosting is not a free-tier problem to solve for a solo MVP.
- Convex storage is not designed for large video files.
- The target creator already uses YouTube or Google Drive for video distribution.
- Embedding covers the use case cleanly and keeps infrastructure free.
**Consequences:** The lesson video field and About VSL field accept a URL only. Validated as a YouTube, Vimeo, or Google Drive URL on save. Native video upload is a v2 consideration.

---

## ADR-008 — Points as append-only event log

**Decision:** Points are stored as an append-only `pointEvents` table, not as a running `totalPoints` field on the `memberships` record.
**Date:** March 2026
**Context:** The leaderboard and level system need to support time-windowed aggregations (7d / 30d / all-time) and potential future changes to level thresholds.
**Options Considered:** `totalPoints: number` column on `memberships`, updated in-place
**Rationale:**
- Append-only log is audit-friendly — every point event (upvote, un-upvote) is fully traceable.
- Un-upvoting is handled by appending a `-1` event rather than a decrement that could race.
- Level thresholds can be changed and the new level recalculated from the full event history without any data migration.
- Convex's real-time aggregation makes `SUM(pointEvents)` fast enough for leaderboard queries.
**Consequences:** `currentLevel` and `totalPoints` are always derived at read time — never stored. No migration needed when level thresholds change. All leaderboard queries aggregate from the `pointEvents` table directly.

---

## ADR-009 — Three routes only (`/`, `/[communitySlug]`, `/help`)

**Decision:** The entire application uses exactly three URL routes. `/[communitySlug]` is a SPA — the URL never changes for tab switches, modal opens, or classroom navigation.
**Date:** March 2026
**Context:** Community platforms benefit from a single persistent URL — it reduces confusion about navigation and eliminates browser back/forward complexity for tab state.
**Options Considered:** Sub-routes per tab (e.g. `/[slug]/community`, `/[slug]/classrooms`), hash-based navigation
**Rationale:**
- A fixed URL for the community SPA means the browser never navigates away — tab switching is instant (no Next.js route transition).
- Tab state in localStorage is sufficient for UX continuity without URL reflection.
- Keeps the route structure trivially simple to reason about.
- Modals (classroom viewer, settings, profile) are overlays — they never need their own URLs.
**Consequences:** Tab state is localStorage-only. Deep linking to a specific tab is not possible in v1 (deferred). All modal and classroom navigation is client-side state only.

---

## ADR-010 — Client-side tabs vs routing-based tabs

**Decision:** Use client-side (state-based) tabs instead of routing-based tabs for the community SPA.

**Date:** March 2026

**Context:** Refactoring TabNav to use the reusable Tabs.tsx component. This is a deliberate architectural choice to align with the component library while meeting the same UX goals as ADR-009.

**Options Considered:** Routing-based tabs (separate URL per tab), hash-based navigation

**Rationale:**
- The Tabs.tsx component provides a consistent, reusable UI pattern that can be used across the application.
- Client-side tabs offer instant switching without page reloads — better perceived performance.
- localStorage persistence (ADR-009) is preserved and works identically with client-side tabs.
- Removes the need for multiple route files per tab — simpler file structure.
- SEO impact is minimal since the community page is behind auth anyway (Clerk middleware protects it).

**Short-term Consequences:**
- All tab content must be loaded or render conditionally within the same page component.
- Placeholder tab components needed for tabs without full implementations yet.
- Tab content bundle size increases (all tabs load on page init) — mitigated with lazy loading if needed.

**Long-term Consequences:**
- Deep linking to specific tabs requires adding optional route params (e.g., `?tab=classrooms`) — deferred to v1.1.
- If tab content grows significantly, may need to revisit lazy loading strategy.
- The pattern is consistent across the app — easy to extend to other multi-tab interfaces.

---

## ADR-011 — SofizPay over Chargily Pay

**Decision:** Replace Chargily Pay with SofizPay as the payment provider.
**Date:** April 2026
**Context:** Complete migration from Chargily to SofizPay for all payment processing.

| Aspect | Decision |
|--------|----------|
| Migration Type | Complete replacement (all at once) |
| Payment Method | CIB hosted (user redirected to SofizPay page via `makeCIBTransaction`) |
| Currency | DZD only (no XLM/crypto exposure) |
| Minimum Amount | 1000 DZD (block below) |
| Refunds | No refunds (T&C policy) |
| Chargebacks | Owner bears risk (platform not liable) |
| Existing Members | Keep access (no re-payment required) |

**Options Considered:** Keep Chargily + add SofizPay (dual system)
**Rationale:**
- SofizPay provides similar CIB card payment flow
- Complete replacement is simpler than maintaining dual systems
- No users yet (MVP), so migration has no disruption
- DZD-only avoids crypto complexity for users

**Consequences:**
- All checkout flows rebuilt around SofizPay SDK
- Schema changes: remove `chargilyApiKey`, `chargilyWebhookSecret`, add `sofizpayPublicKey`
- Webhook endpoint changes from `/api/webhooks/chargily` to `/api/webhooks/sofizpay`
- Cleanup of deprecated Chargily files after testing
