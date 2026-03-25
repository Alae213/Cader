# Feature: Members & Wilaya Map

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The Members tab combines a searchable member directory with an interactive Algeria SVG map
showing all **69** Wilayas . Hovering or clicking a Wilaya on the map
filters the member list to show only members from that location. This is Cader's geo-networking
differentiator — no international community platform can offer this.

---

## Users

- **Owner / Admin:** Full member list + block users + view payment history
- **Member:** Searchable + filterable member list (read-only)
- **Visitor / non-member:** No access — Members tab is hidden

---

## User Stories

- As a **member**, I want to **find other members in my Wilaya** so that I can connect with people near me.
- As a **member**, I want to **search for specific members by name** so that I can find people I know.
- As an **owner**, I want to **view and manage my member list** so that I can understand who is in my community.
- As an **owner**, I want to **block a member** so that I can remove disruptive users.
- As an **owner**, I want to **see payment history** so that I can understand who is an active paying member.

---

## Behaviour

### Layout

- **Left:** Algeria SVG map (interactive)
- **Right:** Member list (filterable, searchable)

### Algeria SVG Map

- SVG of Algeria with all 58 Wilayas rendered as clickable regions
- - and + buttons to zoom in zoom out the map
- Each Wilaya is a distinct SVG path with its Wilaya code or name
- **Hover state:** Wilaya highlights + tooltip shows Wilaya name + member count
- **Click state:** Wilaya becomes "active" — member list on the right filters to show only members from that Wilaya
- **Active Wilaya indicator:** highlighted fill + border on the map
- **Clear filter:** click the active Wilaya again (or "All" button above list) to reset
- Wilayas with zero members in this community are still shown on the map but show "0 members" on hover
- Member count per Wilaya is derived from `memberships` joined with `users.wilayaId`

### Member List

Default state (no filter): all active members, sorted by join date (newest first) 

Each member row shows:
- Avatar
- Display name
- Level badge (1–5)
- Wilaya name
- Member since date (month + year)

**Search:** Real-time search by display name (client-side filter over the current list).

**Wilaya filter:** Set by clicking the map. Shows only members from the selected Wilaya.

**Member profile card:** Clicking a member row opens a small card/popover:
- Avatar + name + level badge
- Wilaya
- Communities in common (if applicable)
- Block action (owner/admin only)

### Owner-Only Actions

**Block user:**
1. Owner clicks member → profile card opens
2. "Block" button → confirmation dialog
3. On confirm: member's `memberships.status` set to `blocked`
4. Blocked member loses tab access immediately (same as inactive — sees About + Join is hidden or shows "access denied" message)
5. Blocked member cannot re-join

**View payment history:**
- Owner view: member row shows payment indicator (paid / free / lapsed)
- Clicking the indicator or a dedicated button shows a payment history panel (Chargily webhook events for that member in this community)

---

## Edge Cases & Rules

- A member who selects their Wilaya during onboarding (via phone number area code or manual selection) appears on the map. If no Wilaya is set, they appear in a "Unspecified" category.
- The map is read-only for members — they cannot edit their Wilaya from this tab (done in Settings → Profile).
- If a member updates their Wilaya in Settings, the map reflects the change immediately via Convex live query.
- Blocked members are excluded from the map and member list entirely.
- Inactive (lapsed subscription) members: TBD — shown as greyed-out or excluded from list? (open question).
- The member list is paginated if community has >100 members (virtual scrolling or load more).

---

## Connections

- **Depends on:** Active membership (tab is membership-gated), user profile (Wilaya field on `users` or `memberships` table)
- **Triggers:** None — read-only for members
- **Shares data with:** Profile modal (member info), Settings (Wilaya update), Leaderboard (level badge data)

---

## MVP vs Full Version

| Aspect            | MVP (v1)                        | Full Version                          |
| ----------------- | ------------------------------- | ------------------------------------- |
| Map               | Static SVG (58 Wilayas)         | Animated, zoom-in on click            |
| Filter            | Click-to-filter by Wilaya       | Multi-select Wilayas, filter by level |
| Member list sort  | Join date or level (one option) | Configurable sort                     |
| Direct messaging  | Not in v1                       | Message member from profile card      |
| Member export     | Not in v1                       | Owner can export member list as CSV   |
| Invite via Wilaya | Not in v1                       | "Share with members in your Wilaya"   |

---

## Security Considerations

- Member list is only accessible to authenticated, active members of this community — server-side membership check.
- Payment history is owner-only — server-side admin role check before returning payment records.
- Member profile cards show only non-sensitive fields (name, level, Wilaya) — no email, phone, or payment details visible to regular members.
- Blocking is a server-side mutation with admin role check.
- The member list query is scoped to `communityId` — never leaks members from other communities.

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[ ]` | Obtain/create Algeria SVG with all 58 Wilayas as individually addressable paths |
| T— | `[ ]` | Build interactive SVG map component (hover tooltip, click-to-filter, active state) |
| T— | `[ ]` | Convex query: `listMembers` — returns active members for communityId with Wilaya data |
| T— | `[ ]` | Convex query: `getMemberCountByWilaya` — returns count per Wilaya for map tooltips |
| T— | `[ ]` | Build member list component (rows, search, Wilaya filter reactive to map click) |
| T— | `[ ]` | Build member profile card / popover |
| T— | `[ ]` | Convex mutation: `blockMember` (admin only) |
| T— | `[ ]` | Owner payment history panel (Chargily webhook event log per member) |
| T— | `[ ]` | Wilaya field on user profile (set during onboarding + editable in Settings) |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] Algeria has 58 Wilayas (48 original + 10 added in 2019). Should the map use 48 or 58? The user flow doc referenced 68 — need to confirm the correct number.
- [ ] Is Wilaya set by the member during onboarding (manual selection) or derived from phone area code?
- [ ] What is the default member list sort order — join date or level?
- [ ] Are inactive (lapsed subscription) members shown in the member list (greyed out) or hidden entirely?
- [ ] Should blocked members receive a notification that they have been blocked?
