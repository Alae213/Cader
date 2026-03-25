# Feature: Explore Modal

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The Explore modal is a lightweight community directory. It lets authenticated users browse
and search communities on the Cader platform. From the Explore modal, a user can click into
any community's About page to learn more or join. This is the primary discovery mechanism
for learners looking for new communities to join.

---

## Users

- **Authenticated user:** Can open Explore from the top bar community dropdown

---

## User Stories

- As a **learner**, I want to **browse all available communities** so that I can discover creators I haven't found yet.
- As a **learner**, I want to **search for a specific community** so that I can find a topic I'm looking for.

---

## Behaviour

### Trigger

- Top bar → community dropdown → "Explore"

### Layout

- Search input (top of modal)
- Community grid/list below the search input
- Each community card shows:
  - Thumbnail
  - Community name
  - Short description / tagline
  - Member count
  - Pricing badge (Free / DZD amount)
  - "View" button → navigates to `/[communitySlug]` (closes modal, navigates)

### Search

- Real-time search (debounced) against community names and descriptions
- Convex query filtered by search term

### Discovery Rules

- Only communities that are publicly discoverable are shown (owner marks community as discoverable — open question: is this a setting or are all communities discoverable by default?)
- Locked communities (hit free tier limit, no platform subscription) are shown but display a "Locked — not accepting new members" badge
- Communities the user is already a member of show a "Joined" badge instead of "View"

---

## Edge Cases & Rules

- Empty search: show all discoverable communities, sorted by member count (most popular first) or by creation date (newest first) — open question
- No results: empty state with message "No communities found for '[query]'"
- Locked communities are visible but cannot be joined until the owner subscribes

---

## Connections

- **Depends on:** Clerk auth (modal is accessible to authenticated users only)
- **Triggers:** Navigation to `/[communitySlug]` (on "View" click)
- **Shares data with:** `communities` table (reads name, slug, description, thumbnail, member count, pricing, locked status)

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|---|---|---|
| Discovery | All public communities | Category/topic filter |
| Sort | Member count or creation date | Trending, newest, most active |
| Map integration | Not in v1 | Filter by Wilaya on map |
| Recommendations | Not in v1 | Personalized based on communities joined |

---

## Security Considerations

- Only publicly discoverable communities are returned by the Convex query — private communities are excluded server-side
- Community data returned: name, slug, description, thumbnail, member count, pricing — no internal fields (Chargily keys, etc.)

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[ ]` | Add `isDiscoverable` field to `communities` schema (or decide all are discoverable by default) |
| T— | `[ ]` | Convex query: `listDiscoverableCommunities` — returns public communities with search filter |
| T— | `[ ]` | Build Explore modal (search input + community grid) |
| T— | `[ ]` | Build community card component for Explore (thumbnail, name, description, count, pricing badge) |
| T— | `[ ]` | Wire "View" button to navigate to `/[communitySlug]` and close modal |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] Are all communities discoverable by default, or does the owner opt in to discoverability?
- [ ] What is the default sort order in Explore — member count, creation date, or most recently active?
- [ ] Should unauthenticated visitors be able to access Explore (from `/`), or is it authenticated-only?
