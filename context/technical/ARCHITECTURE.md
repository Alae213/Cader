# Architecture

> Stub — populate during build.
> See context/project/DECISIONS.md for architectural decision rationale.

---

## System Overview

Cader is a Next.js 14+ App Router application with Convex as the backend, database, and
real-time layer. Clerk handles authentication. Chargily Pay (via creator-owned accounts)
handles all community and classroom payments. Vercel hosts the frontend.

```
Browser (Next.js + React)
  ↕ Convex useQuery (live, WebSocket)
  ↕ Convex useMutation (writes)
  ↕ Clerk (auth, JWT)

Next.js Route Handlers
  /api/webhooks/clerk     ← Syncs Clerk users to Convex
  /api/webhooks/chargily  ← Processes payment events, grants/revokes membership

Convex Backend
  queries/      ← Read operations (live-reactive)
  mutations/    ← Write operations
  actions/      ← External API calls (Chargily checkout creation)
  schema.ts     ← All table definitions and indexes

External Services
  Clerk          ← Identity provider
  Chargily Pay   ← DZD payment gateway (one per community, creator-owned)
  Vercel         ← Hosting + Edge middleware (Clerk auth)
  YouTube/Vimeo/GDrive ← Video hosting (embed only)
```

---

## Data Flow

### Key flow: Student joins a paid community
<!-- Populate during build -->

### Key flow: Owner creates a community
<!-- Populate during build -->

### Key flow: Chargily webhook grants membership
<!-- Populate during build -->

---

## Key Design Decisions

See `context/project/DECISIONS.md` for the full ADR log.

Summary:
- ADR-001: Convex (not Supabase/PlanetScale)
- ADR-002: Clerk (not NextAuth)
- ADR-003: Chargily Pay only (hard constraint — Algerian market)
- ADR-004: Community-scoped roles only
- ADR-005: English only for MVP
- ADR-006: Dark mode only for MVP
- ADR-007: No native video hosting
- ADR-008: Points as append-only event log
- ADR-009: Three routes only; `/[communitySlug]` is a SPA
